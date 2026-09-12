# Day 10 — Multi-service stack with healthchecks

**Date:** 11-13 Sep 2026
**Goal:** Build project 01 (Node API + Postgres) properly.
**Outcome:** Complete. `projects/01-node-postgres/` now has a working
`inventory-api` + Postgres stack, built independently (own table, own naming,
own port) rather than copied from the reference. Every acceptance-criteria
item achievable with Day 0-9 techniques passed; the image-size target is
honestly left open for Day 12. Three real, unplanned problems surfaced and
got chased down properly rather than patched blind: an IPv6/musl healthcheck
failure, a confounded persistence test, and a Compose project-name collision.

**Brief:** `projects/01-node-postgres/README.md` - worked to its acceptance criteria.

---

## 1. What we did

### Concept walkthrough (11 Sep)

Covered before any hands-on work: the healthcheck block field by field
(`test`/`interval`/`timeout`/`retries`/`start_period`, and why `pg_isready`
via `CMD-SHELL`), `depends_on: condition: service_healthy` as the fix for Day
9's startup race, and why the app still needs its own connection retry logic
anyway - a healthcheck only gates the *initial* start order, not a later `db`
restart while `api` is already connected. Session paused here on 11 Sep with
nothing built yet.

### A worked reference first (13 Sep)

Never having built a multi-file app project before, a full reference stack
was requested and given: a `notes` app (Express + `pg`, `node:20-alpine`,
healthcheck, non-root user) built at `~/docker-lab/projects/01-node-postgres`
- deliberately a different domain than the brief's `items`, so it stayed
unmistakably a study reference rather than the actual submission.

Building it surfaced the first real bug: the `HEALTHCHECK`'s
`wget http://localhost:.../health` failed with `Connection refused` from
*inside* the container, even though `curl` to the same endpoint from the
*host* worked fine. Diagnosed properly rather than assumed - see section 3.1.

### Building the real thing independently

With the mechanism understood, a second, independent build -
`~/docker-lab/projects/01-node-postgres-items` - used entirely different
naming: service `database` (not `db`), an `inventory-api` on port `4500`
(published `4580`), an `items` table with `name`/`quantity` columns, a
`postgres:16-alpine` + `node:22-alpine` pairing.

Hit the exact same `localhost` vs `127.0.0.1` healthcheck mistake again -
this time diagnosed and fixed without help, real confirmation the lesson had
actually transferred rather than just been patched once.

Verified acceptance criteria one at a time:

```bash
docker compose exec api whoami                       # node - confirmed non-root
docker compose exec api getent hosts database         # resolved by service name
docker inspect -f '{{json .State.Health}}' <container> # read real check logs, not guessed
```

The first persistence check gave a misleading result - see section 3.2 - and
was redone properly with a real marker row before being trusted.

Renamed the custom `/status` endpoint to the brief's exact `GET /health` /
`{"status":"ok"}` contract (a deliberate choice, not an oversight - the
alternative of keeping `/status` and noting the deviation was also on the
table).

Copied the finished six files (`package.json`, `server.js`, `Dockerfile`,
`.dockerignore`, `compose.yaml`, `init.sql`) into the tracked
`projects/01-node-postgres/`, validated with `hadolint` (clean) and
`docker compose config` (validated). The first `docker compose up -d --build`
from that location failed - see section 3.3 - fixed by tearing down two
stale stacks left running from earlier in the session.

Final state: both services `healthy`, `GET /health` -> `{"status":"ok"}`,
`GET /items` -> the three seeded rows, from the actual tracked directory.

---

## 2. Review questions and answers

None as a separate drill this time - the entire session was the hands-on
project build and debugging itself, which covered more ground than a
question-and-answer pass would have.

---

## 3. Additional findings (verified on this machine)

### 3.1 A container-internal healthcheck failing while the host reaches the same endpoint fine

`wget -q -O- http://localhost:.../health` failed from inside the container
with `Connection refused`, 48 times in a row (`FailingStreak: 48` in
`docker inspect -f '{{json .State.Health}}'`), while `curl` to the same route
from the host worked immediately. Root cause, confirmed rather than guessed:

- `/etc/hosts` inside the (Alpine/musl) container listed `localhost` against
  *both* `127.0.0.1` and `::1`.
- `server.js`'s `app.listen(port, '0.0.0.0', ...)` only opens an IPv4 socket
  - nothing is listening on `::1` at all.
- `wget` resolving `localhost` apparently tried the IPv6 entry first, got a
  hard refusal (nothing bound there), and never fell back to the IPv4
  address that would have worked.
- The host's `curl` never went through any of this - Docker's port-publish
  step (`0.0.0.0:PORT->...`, `[::]:PORT->...` in `docker ps`) is dual-stack by
  design and forwards either family straight to the container's real
  address, regardless of what "localhost" resolves to on the host.

Confirmed directly: `wget -q -O- http://127.0.0.1:.../health` succeeded where
`localhost` failed, with `/etc/hosts` read to prove both addresses existed.
**Fix:** point any container-internal healthcheck at `127.0.0.1` explicitly,
never the bare name `localhost`, unless the app is confirmed to listen on
both address families.

### 3.2 A persistence test that proved nothing, caught before being trusted

First attempt: `docker compose down` (no `-v`) then `up -d`, then separately
`down -v` then `up -d` - both times `curl .../items` returned the *identical*
three rows. That looked like "persistence survived even `-v`," which would
have been wrong and alarming. The actual cause: `init.sql` inserts the same
three fixed rows every time it runs on a genuinely fresh volume, so "wiped
and re-seeded from scratch" and "never touched" produce indistinguishable
output. Redone properly with a row `init.sql` never creates (`INSERT INTO
items VALUES ('MARKER', 999)` via an interactive `psql` session) - that row
survived a plain `down`/`up` and was correctly gone after `down -v`/`up`,
which is the real proof the mechanism from Day 6 still holds in a live
multi-service stack.

### 3.3 Compose's project name is the directory's basename, not its full path

`docker compose up -d --build` from the newly-copied
`/mnt/d/Docker/projects/01-node-postgres` failed two ways at once:

```text
WARN: Found orphan containers (01-node-postgres-db-1) for this project
Error: Bind for 0.0.0.0:4580 failed: port is already allocated
```

Cause: Compose derives a project's name from the directory's basename alone.
`~/docker-lab/projects/01-node-postgres` (the original `notes` reference) and
`/mnt/d/Docker/projects/01-node-postgres` (the tracked copy) share that same
basename - `01-node-postgres` - so Compose treated a container from the
*former*, still running, as an orphan of *this* project. Separately, the
`01-node-postgres-items` stack (a different project name, but the identical
port mapping) was also still running from earlier testing, so port `4580`
was already taken. Fixed by tearing down both stale stacks from their own
directories, then the partial state the failed attempt itself had already
created (a lone `database` container + network), before retrying cleanly.

### 3.4 A Docker healthcheck only needs one success to become `healthy`, but `retries` consecutive failures to become `unhealthy`

Watching `.State.Health.Log` directly: a container flipped to `healthy` after
its very first successful check, not after accumulating several - asymmetric
with the failure path, which genuinely needs `retries` consecutive failures
before the container is marked `unhealthy`. Confirms `retries` is a
failure-debounce, not a success-confirmation count.

### 3.5 Image size is dominated by the base image, not applied technique

`docker history` on the finished `01-node-postgres-items-api` image showed
~174MB of its ~255MB total coming from `node:22-alpine`'s own layers
(installing Node's runtime, npm, and yarn) - the actual application layers
(`WORKDIR`, `COPY package*.json`, `RUN npm install`, `COPY . .`) totaled under
20MB combined. Correct Dockerfile practice (dependency-first ordering, a
narrow final copy) was not the problem; shrinking the base-image cost further
is exactly what Day 12 (multi-stage builds) exists to teach, so the brief's
<200MB target was left open rather than solved with an out-of-sequence
technique.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Healthcheck fields | `test` (the command), `interval` (how often), `timeout` (per-attempt cutoff), `retries` (consecutive failures before `unhealthy`), `start_period` (grace window that doesn't count against `retries`). |
| `depends_on: condition: service_healthy` | Gates initial start order only - fixes Day 9's race, but the app still needs its own retry logic for anything after startup. |
| `localhost` inside a minimal container is not safe to assume | Alpine/musl can resolve it to `::1` first; an app bound only to the IPv4 wildcard has nothing listening there. Use `127.0.0.1` explicitly for container-internal checks. |
| Docker's published ports are dual-stack | `0.0.0.0:PORT` and `[::]:PORT` are both set up at the host boundary regardless of what the app inside actually binds to - this is why host access can work while container-internal access to the same "hostname" fails. |
| A persistence test needs a marker the seed script doesn't create | Otherwise "wiped and re-seeded identically" and "never touched" are indistinguishable from the output alone. |
| Compose project naming | Defaults to the directory's basename, not the full path - two unrelated directories with the same folder name collide on containers, networks, and orphan detection. |
| `docker history` for size debugging | Separates what the base image already costs from what your own Dockerfile actually adds - the fix belongs wherever the size actually is. |

---

## 5. Keep in mind

- **Never point a container-internal healthcheck (or anything else running
  inside the container) at the bare name `localhost`** - use `127.0.0.1`
  unless the app is confirmed to listen on both IPv4 and IPv6.
- **A seed script that always inserts the same fixed rows makes "data
  survived" and "data was wiped and re-seeded" look identical.** Add a
  marker the seed script never creates before trusting a persistence test's
  result.
- **Two Compose projects with the same folder basename will collide**, even
  in completely unrelated directories - clean up scratch stacks
  (`docker compose down`) before starting the same-named project elsewhere.
- **`docker history` before guessing at image-size fixes.** The 200MB target
  here was blown almost entirely by the base image itself, not anything
  written in the Dockerfile - the correct next step was recognizing that and
  parking it for Day 12, not forcing a workaround early.
- **A `HEALTHCHECK` line has to be kept in sync with the app's own routes.**
  Renaming an endpoint in `server.js` without updating the Dockerfile's
  `HEALTHCHECK` to match silently reintroduces an `unhealthy` container.

---

## 6. Commands used

```bash
# Build and verify
docker compose up -d --build
docker compose ps
docker inspect -f '{{json .State.Health}}' <container>

# Diagnosing the healthcheck failure
docker exec <container> cat /etc/hosts
docker exec <container> sh -c 'wget -q -O- http://127.0.0.1:PORT/health; echo EXIT=$?'

# Acceptance-criteria checks
docker compose exec api whoami
docker compose exec api getent hosts database
docker image ls | grep <image>
docker history <image>

# The corrected persistence test
docker compose exec database sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
# INSERT INTO items (name, quantity) VALUES ('MARKER', 999);
docker compose down            && docker compose up -d   # marker survives
docker compose down -v         && docker compose up -d   # marker gone

# Cleaning up a project-name collision
docker ps
docker compose down            # run from each stale project's own directory

# Preflight before treating it as done
docker run --rm -v /path/to/project:/work -w /work hadolint/hadolint:2.12.0-alpine hadolint Dockerfile
docker compose config
```

---

## 7. State at end of day

```text
Repo change : projects/01-node-postgres/ now has package.json, server.js,
              Dockerfile, .dockerignore, compose.yaml, init.sql alongside
              its existing README.md
hadolint    : clean, exit 0
Verified    : GET /health -> {"status":"ok"}; GET /items -> 3 seeded rows;
              non-root confirmed; service-name DNS confirmed; real
              marker-row persistence test confirmed both ways
Open item   : image size (255MB) over the brief's 200MB target - the
              dominant cost is node:22-alpine's own base layers, not the
              app; revisit properly at Day 12 (multi-stage builds)
Next        : Day 11 - debugging: exit codes, logs, inspect
```
