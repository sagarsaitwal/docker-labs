# Day 6 — Named volumes and data persistence

**Date:** 6 Sep 2026
**Goal:** Make data outlive the container. This is the fix for Day 1's
disappearing edit.
**Outcome:** Complete. All three predictions confirmed against real output -
a container's writable layer and a named volume have genuinely independent
lifecycles, `docker volume rm` (not `docker rm`) is the operation that
actually destroys data, and a typo'd volume name fails silently rather than
erroring.

---

## 1. What we did

### Block A — a named volume outliving a container

```bash
docker inspect pgdata
```

```json
[
    {
        "CreatedAt": "2026-09-06T23:14:39+05:30",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/pgdata/_data",
        "Name": "pgdata",
        "Options": null,
        "Scope": "local"
    }
]
```

Used the generic `docker inspect` (not `docker volume inspect`) and it
resolved `pgdata` correctly anyway - see section 3.1.

```bash
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine
```

First pull of `postgres:17-alpine` on this machine - 12 layers downloaded.

Getting the first write in took three tries, all instructive rather than
wasted - see section 3.2 for why each one failed:

```bash
docker exec -it psql -U postgre -c '...'              # forgot the container name
# Error response from daemon: No such container: psql

docker exec -it db psql -U postgre -c '...'           # typo'd role name
# FATAL: role "postgre" does not exist

docker exec -it db psql -U postgres -c 'CREATE TABLE demo(id int); INSERT INTO demo VALUES (1);'
# CREATE TABLE
# INSERT 0 1
```

Then the actual test:

```bash
docker rm -f db
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine

docker exec -it db psql -U postgres -c 'CREATE TABLE demo(id int); INSERT INTO demo VALUES (1);'
# ERROR:  relation "demo" already exists
```

That error is itself proof of persistence - a brand-new container, same
volume, and Postgres already knows the table exists before a single `SELECT`
was even run. Confirmed directly afterward:

```bash
docker exec -it db psql -U postgres -d postgres -c 'select * from demo'
#  id
# ----
#   1
# (1 row)
```

The row survived `docker rm -f` + full container recreation.

### Block B — destroying the volume itself

```bash
docker rm -f db
docker volume rm pgdata
docker volume ls
# DRIVER    VOLUME NAME        <- empty, pgdata gone

docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine

docker exec -it db psql -U postgres -c 'select * from demo'
# ERROR:  relation "demo" does not exist

docker exec -it db psql -U postgres -c '\dt'
# Did not find any relations.
```

Identical `docker run` command as Block A, same volume name - but this time
the table and row are simply gone, because `docker volume rm` deleted the
actual storage, not just the container that had been attached to it.

### Block C — the silent-typo trap

```bash
docker rm -f db
docker run -d --name db2 -e POSTGRES_PASSWORD=secret \
  -v pgdatta:/var/lib/postgresql/data postgres:17-alpine     # typo: pgdatta

docker exec -it db2 psql -U postgres -c 'SELECT * FROM demo;'
# ERROR:  relation "demo" does not exist

docker volume ls
# DRIVER    VOLUME NAME
# local     pgdata
# local     pgdatta
```

No error on the `docker run` itself - Docker silently created a brand-new,
empty volume under the misspelled name and mounted it without complaint.
`docker volume ls` afterward shows both `pgdata` (recreated empty in Block B)
and `pgdatta` (created fresh by the typo) sitting side by side.

### Drill

```bash
docker inspect -f '{{json .Mounts}}' db2
```

```json
[{"Type":"volume","Name":"pgdatta","Source":"/var/lib/docker/volumes/pgdatta/_data","Destination":"/var/lib/postgresql/data","Driver":"local","Mode":"z","RW":true,"Propagation":""}]
```

```bash
docker rm -f db db2 && docker volume rm pgdata pgdatta
docker volume prune
```

```text
WARNING! This will remove anonymous local volumes not used by at least one container.
Total reclaimed space: 0B
```

---

## 2. Review questions and answers

**Q1. What exactly does `-v pgdata:/var/lib/postgresql/data` connect, and
which side does `docker rm -f` destroy versus leave alone?**

Answer: it mounts the Docker-managed named volume `pgdata` at
`/var/lib/postgresql/data` inside the container. `docker rm -f` destroys the
container and its writable layer, but leaves the named volume `pgdata` and
its data untouched. **Correct.**

**Q2. Why did `docker volume prune` report `0B` - nothing needed cleaning, or
something more specific about what it's willing to touch?**

Answer: it removes only unused anonymous volumes by default; `pgdata` and
`pgdatta` were named, so they weren't candidates for removal by that command.
**Correct on the mechanism** - `docker volume prune`'s default scope really is
anonymous-only, confirmed directly by its own warning text. One thing worth
sharpening: in this specific run, `pgdata` and `pgdatta` weren't just skipped
for being named - they no longer existed at all by the time `prune` ran,
having already been deleted by `docker volume rm pgdata pgdatta` the line
before. The `0B` here is doubly explained: nothing was left over, and even if
something had been, prune wouldn't have touched a named volume anyway.

---

## 3. Additional findings (verified on this machine)

### 3.1 `docker inspect` isn't just for containers

`docker inspect pgdata` (the generic command, not `docker volume inspect`)
returned the volume's JSON directly - no error, no need to specify what kind
of resource `pgdata` is. `docker inspect` resolves a name/ID across
containers, images, volumes, and networks automatically; `docker volume
inspect` is only useful when you specifically want to restrict the lookup to
volumes (or need volume-specific flags).

### 3.2 What user `docker exec` runs psql as, and why it matters

Three real failed attempts before the first successful write, each teaching
something different about `docker exec` + `psql`:

```text
docker exec -it psql -U postgre -c '...'
  -> No such container: psql
     Forgot the container name entirely - Docker read "psql" as the
     container to exec into, not the command to run.

docker exec -it db psql -U postgre -c '...'
  -> FATAL: role "postgre" does not exist
     Right shape, typo'd role name - Postgres treats -U as an exact role
     name, no fuzzy matching.

docker exec -it db psql postgres -c 'select * from demo'   (later, Block A)
  -> FATAL: role "root" does not exist
     Omitted -U entirely. docker exec with no -u flag runs as the
     container's default user, which for this image is root. psql with no
     -U falls back to authenticating as whatever OS/exec user is running
     it - so it tried to log in as a Postgres role literally named "root",
     which was never created.
```

The working form needed both flags explicit: `psql -U postgres -d postgres`
- specifying the role *and* the database, rather than relying on either
defaulting to something that happens to exist.

### 3.3 `Mode: "z"` on a plain named-volume mount - unexplained, flagged not fixed

`docker inspect -f '{{json .Mounts}}' db2` showed `"Mode":"z"` on a mount
that never had `:z` typed on the `-v` flag. `z` is normally an SELinux
relabel option, and `CLAUDE.md` section 3 records SELinux as disabled on
this machine. Not chased down this session - noted here so it isn't
mistaken for "obviously fine" if it comes up again later.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Writable layer vs. volume | The writable layer belongs to the container object (Day 1); a named volume belongs to nothing but itself, and both can hold different data for the same logical path at different times. |
| What `docker rm -f` actually destroys | The container and its writable layer only. A mounted named volume is never touched by it. |
| What actually deletes volume data | `docker volume rm` (or `docker volume prune --all`) - a distinct, more destructive operation than removing a container. |
| Reattaching by name | `-v <name>:<path>` doesn't distinguish "reattach to existing data" from "start fresh" - it just mounts whatever currently exists under that name, silently creating an empty one if it doesn't. |
| `docker volume prune` default scope | Anonymous volumes only, confirmed by its own warning text - named volumes need `--all` even when unused. |
| `docker inspect` | Resolves containers, images, volumes, and networks by name generically - not container-only. |
| `docker exec` default user | Runs as the container's default user (root, here) unless `-u` is given - relevant because `psql` with no `-U` tries to authenticate using that same name as a Postgres role. |

---

## 5. Keep in mind

- **A typo in a volume name is a silent failure, not a loud one.** Docker
  creates a fresh empty volume rather than erroring - the only way to catch
  it is noticing the data isn't there, or checking `docker volume ls` for an
  unexpected extra entry.
- **`docker rm -f` and `docker volume rm` are not the same kind of
  destructive.** The first is routine and expected during normal container
  replacement; the second is the one that actually needs care.
- **Always pass both `-U` and `-d` to `psql` inside `docker exec`** rather
  than relying on defaults - the default role/database resolution depends on
  what user `docker exec` happens to run as, not on anything Postgres-specific.
- **`docker volume prune` alone will not clean up named volumes** - reach for
  `--all` deliberately when that's actually what's needed, since the
  conservative default exists specifically to avoid nuking something like a
  database volume by accident.

---

## 6. Commands used

```bash
# Provision and inspect
docker volume create pgdata
docker volume ls
docker inspect pgdata                 # generic inspect resolves it fine

# Mount into a database
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine
docker exec -it db psql -U postgres -d postgres -c 'select * from demo'

# The persistence test
docker rm -f db
docker run -d --name db ... -v pgdata:/var/lib/postgresql/data postgres:17-alpine

# The destructive test
docker volume rm pgdata

# The silent-typo trap
docker run -d --name db2 ... -v pgdatta:/var/lib/postgresql/data postgres:17-alpine

# Inspecting the mount
docker inspect -f '{{json .Mounts}}' db2

# Cleanup
docker rm -f db db2 && docker volume rm pgdata pgdatta
docker volume prune
```

---

## 7. State at end of day

```text
Repo change : none - all experiments ran in ~/docker-lab/day6
Volumes     : pgdata and pgdatta both removed by end of session; prune left
              nothing to reclaim
Open item   : "Mode":"z" on a plain named-volume mount, unexplained -
              SELinux is disabled on this machine, so it wasn't expected
Next        : Day 7 - bind mounts and live-reload development
```
