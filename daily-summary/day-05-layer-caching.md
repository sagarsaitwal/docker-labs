# Day 5 — Layer caching and .dockerignore

**Date:** 6 Sep 2026
**Goal:** Make builds fast by controlling what invalidates the cache.
**Outcome:** Complete, with one gap left open on purpose rather than papered
over. Block A cleanly confirmed the ordering rule with real timings - a
source-only edit cost `Dockerfile.slow` a full `pip install` (1.1s -> 4.8s)
while `Dockerfile.fast` barely moved (1.1s -> 1.5s). Block B only got half-run
- the "this is fine" half (`Dockerfile.fast` is immune to an unrelated 5MB
file) was confirmed, but the actual "here's the failure `.dockerignore`
fixes" half (the same file added to `Dockerfile.slow`, then excluded) was
never executed this session. Block C confirmed `--no-cache` and `--pull`
solve different problems.

---

## 1. What we did

### Block A — the core comparison

```bash
docker rmi day4-app:1.0 day4-app:exec day4-app:shell day4-app:copyall
# all four: "No such image" - already cleaned up from Day 4, harmless
mkdir -p ~/docker-lab/day5 && cd ~/docker-lab/day5

echo 'requests==2.31.0' > requirements.txt
echo 'import requests; print("build:", requests.__version__)' > app.py
```

```dockerfile
# Dockerfile.slow
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "app.py"]
```

```dockerfile
# Dockerfile.fast
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Baseline - build each twice before changing anything:

```bash
time docker build -f Dockerfile.slow -t app:slow .
time docker build -f Dockerfile.slow -t app:slow .   # nothing changed
time docker build -f Dockerfile.fast -t app:fast .
time docker build -f Dockerfile.fast -t app:fast .   # nothing changed
```

```text
slow, build 1:  real 5.650s   COPY . . 0.1s (fresh) + RUN pip install 3.0s (fresh)
slow, build 2:  real 1.108s   WORKDIR/COPY/RUN all CACHED
fast, build 1:  real 1.729s   WORKDIR/COPY requirements.txt/RUN pip install already CACHED,
                              only COPY . . fresh (0.1s)
fast, build 2:  real 1.086s   everything CACHED
```

`fast`'s very first build in this fresh directory already showed most steps
`CACHED` - see section 3.1 for why that isn't a bug.

Then the actual test - edit only `app.py`, never touch `requirements.txt`:

```bash
echo 'print("edited")' >> app.py
time docker build -f Dockerfile.slow -t app:slow .
time docker build -f Dockerfile.slow -t app:slow --progress=plain . 2>&1 | grep -i 'CACHED\|pip install'
time docker build -f Dockerfile.fast -t app:fast .
time docker build -f Dockerfile.fast -t app:fast --progress=plain . 2>&1 | grep -i 'CACHED\|pip install'
```

```text
slow after edit:  real 4.824s   COPY . . fresh, RUN pip install fresh (2.6s, NOT cached)
slow, rebuilt again (no further edit): real 1.192s, RUN pip install now CACHED

fast after edit:  real 1.457s   COPY requirements.txt / RUN pip install both stayed CACHED,
                                only the final COPY . . went fresh (0.1s)
fast, rebuilt again (no further edit): real 1.087s, everything CACHED
```

One-line edit to `app.py`, and `slow` paid for a real `pip install` it didn't
need while `fast` barely moved. See section 2, Q4 for the mechanism.

### Block B — an irrelevant file and `.dockerignore` (only half-run)

```bash
dd if=/dev/zero of=scratch.log bs=1M count=5
time docker build -f Dockerfile.fast -t app:fast .
```

```text
real 1.493s   COPY requirements.txt / RUN pip install both stayed CACHED
              only COPY . . went fresh (context now 5.24MB, copy itself 0.1s)
```

Confirms `Dockerfile.fast` is immune to noise in the directory, for the same
reason it's immune to `app.py` edits - `COPY . .` is last, nothing sits after
it to cascade into.

**Not run:** the same `scratch.log` added while `Dockerfile.slow` is the one
being built (where `COPY . .` sits *before* `pip install`, so the file should
force a real reinstall), and the follow-up with `.dockerignore` excluding
`scratch.log` to show the fix. Both are queued for next session - see
section 7.

### Block C — `--no-cache`, `--pull`, `docker builder prune`

```bash
docker build --no-cache -f Dockerfile.fast -t app:fast .
docker build --pull -f Dockerfile.fast -t app:fast .
docker builder prune
```

```text
--no-cache: 7.1s total. COPY requirements.txt (0.6s), RUN pip install (2.4s),
            COPY . . (0.1s) all reran for real. (WORKDIR still printed
            CACHED - see section 3.2, it's a metadata no-op, not a
            contradiction.)
--pull:     0.7s total. Rechecked the registry for python:3.12-slim, found
            nothing newer, so every one of your own layers stayed CACHED.
builder prune: reclaimed 82.42MB of dangling cache across ~15 entries,
               confirmed with the removal prompt.
```

---

## 2. Review questions and answers

**Q1. State the general rule: order instructions from ______-changing to
______-changing.**

Answer: least-changing to most-changing. Put the base image and dependency
installation before application source code, so Docker reuses the earlier
cached layers. **Correct.**

**Q2. You inherit `COPY . .` before `RUN npm install`. What's the fix, and why
does it matter even with `.dockerignore` already present?**

Answer: split it into `COPY package*.json .` -> `RUN npm install` -> `COPY .
.`. `.dockerignore` shrinks the build context; it does not fix instruction
order. If a non-ignored source file changes, a leading `COPY . .` still
invalidates everything after it regardless of what `.dockerignore` excludes.
**Correct** - the two problems (context size vs. cache order) are genuinely
separate, and the answer keeps them separate.

**Q3. Does reordering two `RUN` instructions invalidate only the one that
changed, or every layer below the change?**

Answer given: "the affected instruction and dependent downstream layers *may*
need to be rebuilt... a layer's cache depends on the instruction AND the
state it receives from previous layers." The stated principle is exactly
right, but the "may" undersells it: swapping `RUN command1`/`RUN command2`
**guarantees** both miss, deterministically, not probabilistically. A cache
lookup matches on the exact pair (parent layer, this instruction). After the
swap, `command2` sits on a parent (the base image) it has never been cached
against before, and `command1` afterward sits on a parent (`command2`'s new
layer) it has also never seen - neither lookup can possibly hit. **Correct
principle, answer softened it to a "may" where it should have been a "will."**

**Q4. Which Dockerfile reruns `pip install` when only `app.py` changes?**

Answer: `Dockerfile.slow`, because `app.py` is swept up in its single `COPY .
.`, which sits before `RUN pip install` and invalidates it on any change.
`Dockerfile.fast` isolates `RUN pip install` behind a narrow `COPY
requirements.txt .`, so only the later `COPY . .` (nothing after it) is
affected. **Correct**, and Block A's real timings (4.824s vs 1.457s after the
identical one-line edit) now back this up directly rather than as prediction.

**Q5. Why can a file `pip install` never reads still invalidate the cache?**

Answer: Docker's cache decision is based on the declared inputs to an
instruction, not on whether the command actually reads every file in them.
For `COPY . .`, the input is the whole named context; if anything in it
changes, the output changes, and everything downstream inherits a different
parent state. Docker isn't asking "did `pip install` read `scratch.log`" -
it's asking "is this build step's input state identical to the cached run."
**Correct.**

**Q6. Why does `.dockerignore` matter for caching, not just size?**

Answer: `.dockerignore` removes files from the build context *before* Docker
computes the input hash for `COPY`. An excluded file's changes never reach
`COPY . .`'s cache key at all, so downstream layers stay reusable. Without it,
an unrelated file's churn can still poison the cache even though it never
affects the transferred byte count in a way you'd notice. **Correct** - this
is exactly the mechanism Block B set out to demonstrate, though only half of
it got tested hands-on (see section 1).

**Q7. Difference between `--no-cache` and `--pull`?**

Answer: `--no-cache` forces every instruction to rerun regardless of any
existing cache. `--pull` checks the registry for a newer base image matching
the `FROM` tag, independent of whether your own instructions get cached.
**Correct**, and Block C's real numbers confirm the independence directly -
`--pull` finished in 0.7s with everything `CACHED` because the base image
hadn't changed, while `--no-cache` took 7.1s specifically because it ignored
cache regardless of the base image being identical. Worth adding: `--no-cache`
alone never checks the registry for a newer base image if one with that tag
already exists locally - only `--pull` (or a manual `docker pull` first) does
that.

---

## 3. Additional findings (verified on this machine)

### 3.1 The build cache lives in the daemon, not the shell

`Dockerfile.fast`'s very first build in the brand-new `~/docker-lab/day5`
directory already showed `WORKDIR`, `COPY requirements.txt .`, and `RUN pip
install` as `CACHED` - before anything had supposedly been built there yet.
This isn't cross-Dockerfile cache sharing; it's simpler: BuildKit's cache
store is kept by the Docker daemon on disk and survives across shell
sessions. Clearing bash history (`i cleared it out`, this session) wipes the
record of which commands ran - it does nothing to the daemon's build cache.
Whatever had been built in an earlier, since-cleared session left real cache
behind, and this "fresh" run inherited it. `history -c` and `docker builder
prune` are unrelated operations; only the second one touches build cache.

### 3.2 `WORKDIR` prints `CACHED` even under `--no-cache`

During Block C, `docker build --no-cache` reran `COPY requirements.txt .`,
`RUN pip install`, and `COPY . .` for real, but the progress output still
labeled `WORKDIR /app` as `CACHED`. Not a contradiction of `--no-cache` -
`WORKDIR` is a metadata-only instruction (same category as `EXPOSE`/`CMD`
from Day 4's `docker image history`, both 0B). There's no real filesystem
work to redo, so BuildKit's progress renderer doesn't have a "rebuilt" state
to report for it either way.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Layer cache key | A hash of the instruction itself plus, for `COPY`/`ADD`, the content of the files it names - plus the parent layer. Not a timestamp check. |
| Cache misses cascade forward | Once one layer misses, every layer after it reruns too, even if that later layer's own inputs never changed - because its cached key includes the (now different) parent. |
| Ordering rule | Least-changing to most-changing: base image, dependency manifest, dependency install, then source code. |
| `.dockerignore` and caching | Excluded files are invisible to the context *before* the hash is computed - it's cache-key hygiene, not just a smaller transfer. |
| Build cache scope | Lives in the Docker daemon, persists across shell sessions and history clears - entirely separate from bash history. |
| `--no-cache` vs `--pull` | `--no-cache` ignores your own build cache for every instruction. `--pull` only rechecks the registry for a newer base image. Independent knobs, often combined for a genuinely from-scratch build. |
| `docker builder prune` | Reclaims dangling build cache not referenced by any current image - 82.42MB freed this session. |

---

## 5. Keep in mind

- **Put the dependency manifest COPY and install before the source-code
  COPY.** This one reorder is the entire lesson, confirmed with real timings:
  4.824s vs 1.457s for the identical one-line edit.
- **`.dockerignore` protects cache stability, not just build-context size** -
  an unrelated file (a log, a scratch file, `node_modules`) sitting inside a
  broad `COPY .` can force an expensive layer to rerun for reasons that have
  nothing to do with real dependencies. (The failure case for `Dockerfile.slow`
  specifically hasn't been demonstrated hands-on yet - see the gap below.)
- **Don't assume a "first ever" build in a new directory is truly cold.**
  Docker's build cache is daemon-side and outlives shell history entirely.
- **`--no-cache` and `--pull` are not the same "make it fresh" button** -
  combine them when you need both your own layers *and* the base image
  actually reverified.
- **When a lesson has a symmetric slow/fast comparison, run both halves
  before treating it as settled** - Block B only proved the safe half this
  session. The failure-and-fix half is still open; don't cite it in the
  public repo as demonstrated until it's actually been run.

---

## 6. Commands used

```bash
# Baseline - build twice each, nothing changed
time docker build -f Dockerfile.slow -t app:slow .
time docker build -f Dockerfile.fast -t app:fast .

# The core test - edit source only, never the manifest
echo 'print("edited")' >> app.py
time docker build -f Dockerfile.slow -t app:slow --progress=plain . 2>&1 | grep -i 'CACHED\|pip install'
time docker build -f Dockerfile.fast -t app:fast --progress=plain . 2>&1 | grep -i 'CACHED\|pip install'

# Irrelevant-file noise
dd if=/dev/zero of=scratch.log bs=1M count=5

# Cache-busting knobs
docker build --no-cache -f Dockerfile.fast -t app:fast .
docker build --pull -f Dockerfile.fast -t app:fast .
docker builder prune
```

---

## 7. State at end of day

```text
Repo change : none yet - all experiments ran in ~/docker-lab/day5, nothing
              copied into examples/ this time
Build cache : 82.42MB of dangling cache reclaimed via docker builder prune
Gap         : Block B only half-run. Still to do next session, in
              ~/docker-lab/day5:
                time docker build -f Dockerfile.slow -t app:slow .
                echo 'scratch.log' > .dockerignore
                dd if=/dev/zero of=scratch.log bs=1M count=1
                time docker build -f Dockerfile.slow -t app:slow \
                  --progress=plain . 2>&1 | grep -i 'CACHED\|pip install'
              Predict first: does scratch.log alone force slow's pip install
              to rerun, and does .dockerignore fix it.
Next        : Day 6 - named volumes and data persistence
```
