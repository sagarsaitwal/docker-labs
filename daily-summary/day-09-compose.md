# Day 9 — Docker Compose

**Date:** 10 Sep 2026
**Goal:** Replace a pile of `docker run` flags with one declarative file, and
understand exactly what Compose is doing automatically that Day 8 required
by hand.
**Outcome:** Complete. All four tasks run and confirmed with real output,
including a mid-task correction after noticing a gap in the test setup
rather than accepting a misleading result.

---

## 1. What we did

### Task 1 — reading `examples/first-stack/compose.yaml`

Three questions, graded honestly rather than just confirmed:

1. *Why no `networks:` block, yet `web` reaches `db` by name?* First answer
   ("local bridge network") was too close to Day 8's default bridge, which
   explicitly has **no** DNS - the real mechanism is that Compose creates its
   **own** project-scoped network automatically, and because it's a
   user-defined network (not the default bridge), it has embedded DNS.
   Confirmed directly in Task 2 via `docker compose config`'s own render.
2. *What does `${POSTGRES_PASSWORD:-devsecret}` do?* First answer guessed an
   interactive prompt - wrong. It's a silent shell-style substitution: use
   the host's value if set, otherwise fall back to `devsecret`. No pause, no
   question, ever.
3. *Why does `db-data` survive `down` but not `down -v`?* First answer didn't
   address the actual mechanism. Correct answer: `db-data` is a genuine named
   volume declared in the file's top-level `volumes:` block - it exists
   independently of any container, the same as Day 6's `pgdata`. `down` only
   removes containers and the network; `down -v` additionally deletes every
   volume the file declares.

### Task 2 — converting Day 8 into a real `compose.yaml`

**Real mistakes made getting the file valid**, all instructive:

1. `vi`'s default Tab key inserts a literal tab character - YAML forbids
   tabs for indentation entirely, spaces only. Result:
   `go-yaml load error ... found character that cannot start any token at
   L2.C1` - the parser choked on the very first indented line. Diagnosed
   with `cat -te compose.yaml`, which displays tabs visibly as `^I` - a
   genuinely useful way to confirm invisible whitespace rather than trust an
   editor's rendering.
2. `environment: POSTGRES_PASSWORD: postgres` on one line - invalid YAML for
   a nested map; needs `environment:` on its own line with the key indented
   underneath.
3. `command :["sleep", "infinity"]` (space before the colon) and misindented
   `command`/`depends_on` lines that landed outside the `api:` block
   entirely - both self-evident once the file was viewed with visible
   whitespace.

Once fixed (confirmed via `cat -te` showing clean 2-space indentation, no
`^I` anywhere), `docker compose config` rendered cleanly and proved Task 1's
Q1 directly:

```yaml
    networks:
      default: null
...
networks:
  default:
    name: day9_default
```

`docker compose up -d` created `day9_default` and started both containers.
`docker compose logs db` showed the real Postgres bootstrap sequence.
`docker compose exec api sh` then:

```sh
apk add --no-cache bind-tools
getent hosts db
# 172.18.0.2  db  db
```

Resolved with zero `docker network create` step anywhere - the entire point
of Task 1, confirmed hands-on.

### Task 3 — catching a config mistake without starting anything

Deliberately typo'd `POSTGRESS_PASSWORD` (same mistake as Day 8, this time in
a file) and ran `docker compose config` **without** `up`. The render showed
the typo literally, exactly as written, no error, no validation - Compose
doesn't know or care what environment variables Postgres actually needs, the
identical lesson as Day 8's `-e` finding. The difference that matters: this
was caught by reading a render, zero containers ever started, versus Day 8's
version of this same mistake which only surfaced after a real crash and a
trip through `docker logs`.

### Task 4 — `down` vs `down -v`, corrected mid-experiment

**First attempt exposed a real gap rather than a clean result.** The
original `compose.yaml` had no `volumes:` block for `db` at all. `CREATE
TABLE demo` succeeded, `docker compose down` removed everything, `up -d`
recreated it, and `\dt` failed outright:

```text
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432"
failed: No such file or directory
```

Not data loss - a **race condition**. `depends_on: - db` with no
`condition:` only waits for the container to *start*, never for Postgres to
actually be ready, and Postgres's own startup runs a full initialize
-shutdown-restart sequence that takes a few seconds. `docker compose exec`
ran immediately after `up -d` returned, before the Unix socket existed.
Confirmed by checking `docker compose logs db` for `database system is
ready to accept connections` and retrying: `\dt` then correctly reported "Did
not find any relations" - the table really was gone, because there was no
*named* volume for Compose to reattach to, only the image's built-in
anonymous one for `/var/lib/postgresql/data` (same mechanism as Day 8's
orphaned volumes).

**Added the missing piece** - `volumes: - db-data:/var/lib/postgresql/data`
on `db`, plus a top-level `volumes: db-data:` - matching
`examples/first-stack/compose.yaml`'s actual pattern. Re-ran the test
properly this time: `CREATE TABLE demo` against the container with `db-data`
already mounted, `down`, `up -d`, waited for the ready log line (only ~2
seconds this time - a fast reattach, not a fresh `initdb`), then:

```text
\dt  ->  public | demo | table | postgres
```

Confirmed surviving. Then the destructive half:

```text
docker compose down -v
  ✔ Volume day9_db-data  Removed
docker compose up -d
  ✔ Volume day9_db-data  Created
```

The CLI's own volume lifecycle messages were the proof here, even more
direct than checking `\dt` - and the logs showed the full first-time
bootstrap sequence again, confirming genuinely empty, not reattached.

---

## 2. Review questions and answers

**Q1. Why does a service in a Compose file resolve a sibling by name with no
`networks:` block written anywhere?**
Compose creates a project-scoped network automatically and joins every
service to it - confirmed directly via `docker compose config`'s render
showing the implicit `day9_default` network. It behaves like Day 8's
`app-net` (real DNS), not the default bridge (no DNS), even though neither
was declared explicitly.

**Q2. What does `${VAR:-default}` actually do, and what happens if `VAR` is
never set?**
Silent shell-style fallback substitution - use `VAR`'s value if set, `default`
otherwise. No prompt, no pause, no error; the initial guess that it asks
interactively was wrong.

**Q3. Why did the first `down`/`up` cycle lose the data, and the second one
didn't?**
The first `compose.yaml` had no named volume at all - only the image's
built-in anonymous one, which doesn't survive a full container teardown.
Adding an explicit named volume (matching the reference file) gave Compose
something stable to reattach to across `down`/`up`; only `down -v` then
destroys it.

**Q4. Why did `psql` fail right after `up -d`, twice, in a way that had
nothing to do with volumes?**
`depends_on` without a `condition:` only waits for the container process to
start, not for Postgres to actually be ready - and Postgres's own startup
takes a few seconds even in the fast case. Running a command immediately
after `up -d` races that startup. Confirmed the fix: check `docker compose
logs` for the "ready to accept connections" line before assuming a
connection failure means something is broken.

---

## 3. Additional findings

### 3.1 Postgres's startup timing is itself a diagnostic signal

A brand-new/empty volume triggers the full bootstrap sequence (`running
bootstrap script`, locale warning, `initdb` chain) and takes noticeably
longer; a reused volume with existing data just does a quick shutdown/restart
consistency check (~2 seconds). Worth checking `docker compose logs`
duration as a cheap way to guess whether a volume was fresh or reattached,
before even querying table contents.

### 3.2 Day 8's open item closed

The two orphaned anonymous `postgres:17-alpine` volumes left over from Day
8's `db1`/`db2` (flagged in that day's write-up as never pruned) were
cleared today via `docker volume prune` during end-of-day cleanup, along
with a third anonymous volume from this session's own first (no-named-volume)
attempt. 121.6MB reclaimed total.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Compose auto-creates a network | Every project gets its own user-defined network with real DNS - the mechanism Day 8 required `docker network create` for, done automatically. |
| `${VAR:-default}` is a silent fallback | Not a prompt. No `VAR` set means the default is used with zero indication anything was missing. |
| `docker compose config` renders, never runs | The single best tool for catching a config typo (Task 3) or seeing Compose's implicit behavior made explicit (Task 1) - zero containers involved either way. |
| YAML forbids tabs | Indentation must be spaces only; `cat -te` reveals tabs as `^I` when an editor's own rendering can't be trusted. |
| A named volume must actually be declared | The image's own built-in (anonymous) volume for Postgres data does not survive a full container teardown - only an explicit named volume in the Compose file's `volumes:` block does, and only `down -v` then destroys it. |
| `depends_on` alone only waits for "started"| Not "ready." A command run immediately after `up -d` can race a service's own startup - full treatment of the fix (`condition: service_healthy`) is Day 10. |

---

## 5. Keep in mind

- **`docker compose config` before `docker compose up`, when unsure.** It
  catches a typo'd env var, a bad key name, or a malformed value before any
  container exists - strictly better than debugging a crash afterward.
- **A missing `volumes:` block is a missing safety net, not a visible
  error.** Compose (and Docker) will happily run a stateful service with
  only an anonymous, unreattachable volume underneath it - check the file,
  don't assume persistence exists just because the service "has a database."
- **A connection failure right after `up -d` is not automatically "the data
  is gone."** Check `docker compose logs` for a real readiness signal before
  concluding anything about persistence - Day 10's healthchecks exist
  specifically to make this check automatic instead of manual.
- **`cat -te` (or `cat -A`) reveals tabs and line-ending characters an
  editor might hide.** Reach for it before assuming a YAML/indentation error
  is something more exotic.
- **When a test gives a confusing result, check whether the setup itself
  was actually correct before trusting the result** - the first `down`/`up`
  persistence test looked like "named volumes don't work," and the real
  answer was "there was no named volume to test in the first place."

---

## 6. Commands used

```bash
# Compose lifecycle
docker compose up -d
docker compose ps
docker compose logs <service>
docker compose logs <service> | tail -5
docker compose exec <service> sh
docker compose down
docker compose down -v
docker compose config              # render only - never starts anything

# Diagnosing a YAML file
cat -te compose.yaml               # tabs show as ^I, line endings as $

# DNS check from inside a Compose service (same as Day 8)
apk add --no-cache bind-tools
getent hosts <service-name>
```

---

## 7. State at end of day

```text
Containers : cleaned up (day9-db-1, day9-api-1 removed)
Networks   : day9_default removed; only bridge/host/none remain
Volumes    : day9_db-data removed, plus Day 8's 2 orphaned anonymous
             postgres volumes and 1 from this session's own first
             attempt - 121.6MB reclaimed via `docker volume prune`
Lab folder : ~/docker-lab/day9 removed entirely
Not tried  : `docker compose run --rm api <command>` - minor, not blocking
Next       : Day 10 - multi-service stack with healthchecks
```
