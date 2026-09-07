# Day 7 — Bind mounts and live-reload development

**Date:** 7 Sep 2026
**Goal:** Edit code on the host and see it change inside a running container,
and understand exactly how a bind mount differs from a named volume.
**Outcome:** Complete. One piece - proving the no-`--debug` counter-test by
actually running it - is a correctly reasoned prediction, not an independently
confirmed run; flagged honestly below rather than claimed as verified.

Session was interrupted mid-way by a mobile data recharge expiring (not a
Docker problem); resumed once connectivity was back.

---

## 1. What we did

### Task 1 — proving a bind mount is the literal file, not a copy

```bash
mkdir -p ~/docker-lab/day7/proof && cd ~/docker-lab/day7/proof
echo "from host" > note.txt
docker run --rm -v "$PWD":/data alpine cat /data/note.txt
docker run --rm -v "$PWD":/data alpine sh -c 'echo "from container" >> /data/note.txt'
cat note.txt
```

`-v "$PWD":/data` - the left side is an absolute host path (contains `/`), so
Docker treats this as a bind mount: `/data` inside the container *is*
`~/docker-lab/day7/proof` on the host, no copy step, no Docker-managed
storage in between. A container reading `/data/note.txt` reads the literal
host file; a container appending to it writes to the same host file. Run and
confirmed complete; the exact two-line content of `note.txt` afterward wasn't
captured before cleanup, but `note.txt`'s existence and the task being run
without error is confirmed.

### Task 2 — the disambiguation rule, proven not just read

```bash
docker run --rm -v myvol:/data alpine sh -c 'echo hi > /data/x'
docker volume ls

docker run --rm -v "$PWD/relpath":/data alpine sh -c 'echo hi > /data/x'
ls ~/docker-lab/day7/proof
```

`-v myvol:/data` - left side `myvol` has no `/`, so Docker reads it as a
*named volume* reference and auto-creates one. `-v "$PWD/relpath":/data` -
left side now contains `/`, so Docker treats it as a bind mount and creates
`relpath` as a real host directory instead.

**Confirmed, not just predicted:** `docker volume ls` showed `myvol` as a
tracked Docker volume before cleanup. `relpath/x` showed up as an ordinary
file in `~/docker-lab/day7/proof` - and turned out to matter a lot more than
expected (see Task 4).

### Task 3 — `:ro` is enforced by the mount, not file permissions

```bash
mkdir -p ~/docker-lab/day7/config && echo "setting=1" > ~/docker-lab/day7/config/app.conf
docker run --rm -v ~/docker-lab/day7/config:/etc/myapp:ro alpine sh -c 'cat /etc/myapp/app.conf; echo changed > /etc/myapp/app.conf'
```

Real output (run twice, identical both times):

```text
setting=1
sh: can't create /etc/myapp/app.conf: Read-only file system
```

`cat` succeeds (reads are always fine on a `ro` mount) and prints
`setting=1`. The write then fails with **"Read-only file system," not
"Permission denied."** That distinction is the actual lesson: the `ro` mount
option blocks the write at the kernel/mount level, before Unix file
permission bits are ever consulted - `chmod 777` on the host file would not
have changed the outcome. The `cat` running despite the later failure is the
same `sh -c 'a; b'` behavior found in Day 2 (`;` doesn't stop at a failure the
way `&&` would).

### Task 4 — the UID mismatch, discovered rather than staged

The plan called for a synthetic `touch`-and-`ls -ln` comparison. What actually
happened was more convincing: cleaning up at the end of the day,
`rm -rf ~/docker-lab/day7` failed outright:

```text
rm: cannot remove '/home/sagar/docker-lab/day7/proof/relpath/x': Permission denied
```

Checked why, rather than reaching straight for `sudo`:

```bash
ls -ln ~/docker-lab/day7/proof/relpath/x
# -rw-r--r-- 1 0 0 3 Sep  7 12:00 .../relpath/x
id -u
# 1000
```

`relpath/x` was created in Task 2 by an `alpine` container process running as
root, with no `--user` flag and no user-namespace remapping on this engine.
Across a bind mount there is no UID translation at all - "root inside the
container" and "root on the host" are the literal same UID 0. The file landed
on disk owned by UID 0; `sagar` is UID 1000, so a plain `rm` failed exactly
like it would for any other file owned by a different user. `sudo rm -rf`
cleared it.

This is a better result than the originally planned demo: it's a real
consequence encountered while doing something else, not a staged proof - and
it directly explains why containerized build tools that write into a
bind-mounted output directory routinely leave root-owned files that a
non-root host user can't clean up without `sudo` or `--user $(id -u):$(id -g)`.

### Task 5 — live-reload: what actually makes it work

```bash
cd ~/docker-lab/day7
# app.py: a one-route Flask app
docker run --rm -it -p 5000:5000 -v "$PWD":/app -w /app python:3.12-slim \
  sh -c "pip install flask -q && flask --app app run --host=0.0.0.0 --debug"
```

**Mistake made first:** ran this exact command before `app.py` existed in
the directory. Result: `Error: Could not import 'app'.` No traceback, because
there was nothing to fail on - Flask's `--app app` looks for a module named
`app` in the current directory and found nothing at all. Root cause was
simply skipping the "write the file" step, not a Flask or Docker problem.

**Also hit, resolved on its own:** the first `pip install flask` attempt
failed completely:

```text
SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED]
certificate verify failed: unable to get local issuer certificate ...'))
```

five retries, then `ERROR: No matching distribution found for flask`. The
identical command, run again immediately after with no configuration change,
succeeded with no SSL error at all. Left as an open, unexplained finding
(see section 3) rather than a false explanation - the signature (certificate
verify failed reaching PyPI) is consistent with a network path that does TLS
inspection, but that wasn't independently confirmed.

**Once `app.py` existed:** confirmed live via real `curl` output.

```text
curl localhost:5000  ->  Docker Day 7 - Flask App v1
```

Then, without touching Docker at all, edited the route's return string on
the host and saved:

```text
curl localhost:5000  ->  Docker Day 7 - Flask App New
```

The edit was picked up with no restart command from the host side. Correct
reasoning given for *why*, confirmed against the mechanism rather than
accepted as magic: a bind mount only makes the new file content visible on
disk inside the container - it does nothing to a process already running,
which loaded the old code into memory once at startup. What actually reacts
to the change is Werkzeug's `--debug` reloader, a background thread that
polls the source files and, on a change, kills and re-execs the whole Python
process.

**What's confirmed vs. predicted-but-unrun:** a follow-up run was set up to
capture proof via `docker run ... | tee flask-debug.log`, intending to (a)
see a `* Detected change in '/app/app.py', reloading` line in the log after
an edit, and (b) run the identical setup *without* `--debug` as a counter-test
and confirm a stale response. Neither half of that follow-up actually
completed: the container that produced `flask-debug.log` was still on its
very first startup when checked (log shows only the initial `* Restarting
with stat` that Werkzeug always prints once at launch, no `Detected change`
line), and the no-`--debug` counter-test was never started before the
terminal running it was closed. The prediction for that counter-test - the
second `curl` would return the old text, not the new one, because nothing
would be watching for the change - is recorded as reasoning, not as a
confirmed result. Queued for next time.

---

## 2. Review questions and answers

**Q1. Why does the second `curl` in Task 1 show both lines, not just the
container's append?**
Because a bind mount has no copy step - the container process and the host
shell are opening the literal same file through two different path names.
There was only ever one file to begin with.

**Q2. `-v myvol:/data` and `-v "$PWD/relpath":/data` use the identical flag.
Why do they behave completely differently?**
Docker's parser branches purely on whether the left side contains a `/`. No
slash means "named volume name" (auto-created if it doesn't exist); a path
containing `/` means "bind mount to this exact host directory."

**Q3. Why did `rm -rf ~/docker-lab/day7` fail, and what actually fixed it?**
A file inside it (`relpath/x`, from Task 2) was created by a container
process running as root with no UID remapping, so it's owned by UID 0 on the
host. `sagar` (UID 1000) has no permission to remove it; `sudo rm -rf` (root)
does.

**Q4. Is a bind mount alone enough for live-reload, or is something else
doing the work?**
The bind mount is necessary (it's what makes the new content visible inside
the container) but not sufficient. Werkzeug's `--debug` reloader is what
actually notices the change and restarts the process; without it, a running
`python app.py` would keep serving the old code from memory indefinitely,
same bind mount or not. Answered correctly, including the specific
counter-test prediction; the run to confirm it directly wasn't completed this
session (see section 1, Task 5).

---

## 3. Additional findings

### 3.1 Transient SSL failure reaching PyPI, self-resolved

First `pip install flask -q` inside the container failed completely with
`SSLCertVerificationError: unable to get local issuer certificate` against
`pypi.org`, retried five times, then failed outright. The identical command
run again moments later succeeded with zero SSL errors, no configuration
changed in between. Left unexplained rather than guessed at - worth
rechecking `docker version`/network path if this recurs, since "certificate
verify failed... unable to get local issuer certificate" is the standard
signature of a TLS-inspecting proxy sitting between the container and the
public internet, but that wasn't independently confirmed here.

### 3.2 Cleanup accidentally became Task 4's real proof

Not planned this way: the actual UID-mismatch lesson arrived as a genuine
obstacle during end-of-day cleanup (`rm -rf` failing) rather than the
scripted `touch`-then-compare demo. Kept as the primary record for Task 4
instead of also running the originally planned synthetic version, since the
real failure is stronger evidence, not weaker.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Bind mount = zero indirection | No Docker-managed storage, no copy - the container and host access the literal same inode through two different paths. |
| The `-v` disambiguation rule | Left side has `/` -> bind mount to that host path. No `/` -> named volume (auto-created if missing). One typo silently changes which one you get. |
| `:ro` blocks at the mount, not the file | A read-only mount fails writes with "Read-only file system," not "Permission denied" - the check happens before file permission bits are ever consulted. |
| No UID translation across a bind mount | A container process running as root (no `--user`, no user namespaces) writes files owned by UID 0 on the host - identical to host root, not a separate namespace. |
| Bind mount != live-reload | The mount only makes new content visible on disk. A running process needs something actively watching and restarting it - here, Werkzeug's `--debug` reloader - to actually pick up the change. |
| `sh -c 'a; b'` semantics (again) | `;` runs `b` regardless of whether `a` succeeded - saw this in Task 3's failed write not stopping the earlier `cat`, same as Day 2's crash-loop finding. |
| A vague CLI error can mean "nothing exists yet" | `Error: Could not import 'app'.` with no traceback meant no file, not a bug in one. |

---

## 5. Keep in mind

- **A bind mount is the literal host file, not a synced copy.** Reasoning
  about it as "Docker keeps a copy in sync" will produce wrong predictions -
  there is no copy.
- **Check for a `/` before trusting a `-v` argument.** A missing leading `./`
  on a path silently becomes a new named volume instead of an error - the
  same footgun shape as Day 6's typo'd volume name.
- **"Read-only file system" vs "Permission denied" are different failure
  layers.** The first means a mount option blocked it; the second means Unix
  permissions did. Diagnose accordingly - `chmod` fixes one, not the other.
- **Containerized tools writing into a bind-mounted directory can leave
  root-owned files.** Expect to need `sudo` to clean them up, or add
  `--user $(id -u):$(id -g)` up front to avoid the problem entirely.
- **A live-reload dev loop needs two ingredients, not one.** The bind mount
  (visibility) and a reloader (reaction) are separate mechanisms - don't
  credit the bind mount alone.
- **A blank, traceback-free CLI error is often "input doesn't exist," not
  "input is broken."** Check for the file before debugging the tool.

---

## 6. Commands used

```bash
# Bind mount basics
docker run --rm -v "$PWD":/data alpine cat /data/note.txt
docker run --rm -v "$PWD":/data alpine sh -c 'echo "x" >> /data/note.txt'

# Named volume vs bind mount disambiguation
docker run --rm -v myvol:/data alpine sh -c 'echo hi > /data/x'
docker run --rm -v "$PWD/relpath":/data alpine sh -c 'echo hi > /data/x'
docker volume ls

# Read-only bind mount
docker run --rm -v ~/path/config:/etc/myapp:ro alpine sh -c 'cat /etc/myapp/app.conf; echo x > /etc/myapp/app.conf'

# UID mismatch diagnosis
ls -ln <path>          # numeric owner, no /etc/passwd lookup needed
id -u                  # host user's own UID for comparison
sudo rm -rf <path>     # force-remove a root-owned file from a non-root shell

# Live-reload dev loop
docker run --rm -it -p 5000:5000 -v "$PWD":/app -w /app python:3.12-slim \
  sh -c "pip install flask -q && flask --app app run --host=0.0.0.0 --debug"
docker run ... | tee flask-debug.log     # capture reloader output for later review
```

---

## 7. State at end of day

```text
Containers : cleaned up (day7 container removed)
Volumes    : cleaned up (myvol removed)
Images     : alpine, python:3.12-slim (left cached, reusable)
Lab folder : ~/docker-lab/day7 removed entirely
Open item  : the no-`--debug` counter-test (Task 5) is a correctly reasoned
             prediction, not a confirmed run - queued for whenever it's
             convenient, not blocking Day 8
Next       : Day 8 - networks and container DNS
```
