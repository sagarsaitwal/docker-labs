# Day 8 — Networks and container DNS

**Date:** 10 Sep 2026
**Goal:** Make two containers talk to each other by name, and understand
exactly why `localhost` never works for that.
**Outcome:** Complete. All four tasks run and confirmed with real output;
three bonus network modes (`--network host`, `--network none`, cross-network
isolation) covered as reference material, not run hands-on.

---

## 1. What we did

### Task 1 — the default bridge has no name resolution

```bash
docker run -d --name db1 -e POSTGRES_PASSWORD=secret postgres:17-alpine
docker run --rm -it alpine sh
# apk add --no-cache bind-tools
# getent hosts db1
```

Neither container specified `--network`, so both landed on the default
bridge. `getent hosts db1` returned **nothing at all** - not an error message,
just silent empty output (a failed `getent` lookup prints nothing and exits
non-zero; confirmed with `getent hosts db1; echo "exit code: $?"` separately).
Root cause: the default bridge is Docker's original networking mode and
never got an embedded DNS resolver added to it - it only ever supported the
old, deprecated `--link` flag for name-based communication.

### Task 2 — a user-defined network resolves names, once the setup is actually right

```bash
docker network create app-net
docker network inspect app-net
docker run -d --name db2 --network app-net -e POSTGRES_PASSWORD=secret postgres:17-alpine
docker run --rm -it --network app-net alpine sh
# apk add --no-cache bind-tools
# getent hosts db2
```

**Two real mistakes on the way here**, both instructive:

1. `--network appnet` (missing the hyphen) - Docker rejected it outright:
   `network appnet not found`. Self-evident, fixed immediately.
2. `-e POSTGRESS_PASSWORD=screte` (extra `S`) - this one was silent and much
   more interesting. The container started (`docker run -d` doesn't surface
   startup failures), but `getent hosts db2` came back empty even though
   `app-net` genuinely has DNS. `docker network inspect app-net` showed
   `"Containers": {}` - completely empty, despite `db2` supposedly running
   there. `docker ps -a` revealed why: `db2   Exited (1)`. `docker logs db2`
   had the exact reason:
   ```text
   Error: Database is uninitialized and superuser password is not specified.
          You must specify POSTGRES_PASSWORD to a non-empty value ...
   ```
   Docker never validates `-e` variable names (Day 2 finding) - it set
   `POSTGRESS_PASSWORD` exactly as typed. Postgres's own startup script
   checks for `POSTGRES_PASSWORD` specifically, never saw it, and refused to
   start. Same species of mistake as Day 6's `pgdatta`/`pgdata` typo: no
   error at the Docker layer, a silent failure one layer up.

Fixed (`docker rm db2` + recreate with the correct variable name), confirmed
`Up`, and re-ran the test:

```text
getent hosts db2  ->  172.18.0.2  db2  db2
```

A real resolution this time - Docker's embedded DNS mapped the name to
`db2`'s actual IP on `app-net`'s `172.18.0.0/16` subnet.

### Task 3 — why `localhost` never reaches a sibling container

Still on `app-net`, from a fresh alpine shell:

```bash
apk add --no-cache curl
curl -v telnet://localhost:5432
curl -v telnet://db2:5432
```

Real output:

```text
* Trying [::1]:5432...
* connect to ::1 port 5432 ... failed: Connection refused
* Trying 127.0.0.1:5432...
* connect to 127.0.0.1 port 5432 ... failed: Connection refused
```
```text
*   Trying 172.18.0.2:5432...
* Established connection to db2 (172.18.0.2 port 5432) from 172.18.0.3 port 48612
```

Both loopback addresses (IPv6 and IPv4) refused the connection - not a
network fault, but the correct behavior: every container gets its own
network namespace, including its own private loopback. `localhost` is
hard-wired by the kernel to mean *this exact namespace*, never a sibling
container, no matter how "close" it is on the same Docker network. `db2:5432`
succeeded because DNS resolved it to a genuinely different endpoint
(`172.18.0.2`, reached from this container's own address `172.18.0.3`) -
two real IPs connected over the bridge's virtual switch, not the same
loopback pretending to be two machines.

### Task 4 — network membership is live-changeable, unlike most container config

```bash
docker network connect app-net db1
docker run --rm -it --network app-net alpine sh -c "apk add --no-cache bind-tools -q && getent hosts db1"
# 172.18.0.3  db1  db1   <- resolves, no container recreation needed

docker network disconnect app-net db1
docker run --rm -it --network app-net alpine sh -c "apk add --no-cache bind-tools -q && getent hosts db1"
# (empty)   <- back to Task 1's behavior, same running container throughout
```

`db1` was created on the default bridge only, back in Task 1. Connecting and
disconnecting it from `app-net` changed its DNS resolvability twice, with
zero recreation - the exact same `db1` container, same process, the entire
time. This sits alongside Day 2's `docker update` as one of the few genuine
exceptions to "change config = replace the container": network membership is
addable and removable live.

### Bonus reference (not run hands-on) — three more network modes

- **`--network host`** removes network namespace isolation entirely - a
  container shares the host's real network stack, `localhost` really does
  reach the host, and `-p` becomes meaningless (nothing left to map through).
- **`--network none`** - zero interfaces except loopback, not even DNS.
  `ip addr` shows only `lo`.
- **Two separate user-defined networks don't talk to each other at all** by
  default - not just DNS, `ping` by IP fails too, identical isolation to
  Task 1's default-bridge case. `docker network connect` is the fix, same
  mechanism as Task 4.

---

## 2. Review questions and answers

**Q1. Why did `getent hosts db1` return nothing on the default bridge?**
The default bridge never got an embedded DNS resolver - it's Docker's
original networking mode, predating that feature, and only ever supported
the deprecated `--link` flag for name resolution.

**Q2. `db2` was created with `--network app-net` yet didn't resolve and
`network inspect` showed no containers attached - why?**
It never actually started. A typo'd env var (`POSTGRESS_PASSWORD` instead of
`POSTGRES_PASSWORD`) meant Postgres's own startup script never saw the
required superuser password and exited immediately. Docker doesn't validate
`-e` variable names; the app's own script does its own checking.

**Q3. Why does `localhost:5432` fail while `db2:5432` succeeds, from the same
alpine container, same network?**
Every container has its own network namespace, including its own private
loopback interface. `localhost` always means "this namespace, right here" -
never a sibling container. `db2` resolves to a genuinely different IP,
reached over the bridge network, not the loopback.

**Q4. After `docker network disconnect app-net db1`, does `db1` still
resolve on `app-net`?**
No - confirmed. DNS resolution tracks live network membership, not anything
fixed about the container itself.

---

## 3. Additional findings

### 3.1 `getent`'s failure is silent by design

A failed `getent hosts` lookup produces no output at all and a non-zero exit
code - not an error message. Worth checking `$?` explicitly
(`getent hosts name; echo $?`) rather than assuming empty output always means
"still starting up."

### 3.2 `docker network inspect`'s `Containers` field only reflects live attachment

An exited container disappears from a network's `Containers` list even
though `docker ps -a` still shows it existing. Don't read an empty
`Containers` field as "never attached" - check `docker ps -a` for the
container's actual status before concluding anything about the network.

### 3.3 IP addresses are reused from a free pool, not fixed per name

The alpine client container in Task 3 held `172.18.0.3` on `app-net`; after
it exited (`--rm`), `db1` picked up that exact same address in Task 4. Not a
bug - Docker's IPAM hands out addresses from the subnet's free pool as
containers join and leave.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Default bridge vs. user-defined network | Only user-defined networks (`docker network create`) ship Docker's embedded DNS. The default bridge predates that feature entirely. |
| `-v`-style disambiguation applies to networks too | No Docker validation of `-e` names extends the same silent-failure pattern here: a typo'd env var can starve an app of required config with zero Docker-level error. |
| `localhost` = this namespace only | Never a sibling container, regardless of shared network. Two loopback addresses (`::1`, `127.0.0.1`), both private to the container. |
| Network membership is live-changeable | `docker network connect`/`disconnect` change a running container's DNS resolvability with no recreation - alongside `docker update`, one of the few genuine live-reconfiguration exceptions. |
| `--network host` | Removes network namespace isolation entirely; `-p` becomes meaningless. |
| `--network none` | Zero interfaces beyond loopback - deliberate total isolation. |
| Cross-network isolation is real, not cosmetic | Two separate user-defined networks share zero connectivity by default, at both the DNS and IP level. |

---

## 5. Keep in mind

- **`getent hosts` fails silently.** Check the exit code if the output being
  empty is ambiguous, rather than assuming a name simply hasn't propagated
  yet.
- **A container that "should" be attached to a network but isn't listed in
  `docker network inspect` is probably not running at all.** Check
  `docker ps -a` and `docker logs` before suspecting the network.
- **`localhost` inside a container is never a way to reach another
  container**, no matter how tightly networked they are. Address siblings by
  name (DNS, on a user-defined network) or IP - never `localhost`.
- **Network membership is genuinely live-editable.** `docker network
  connect`/`disconnect` work on a running container with no replacement
  needed - remember this alongside Day 2's `docker update` as the short list
  of real exceptions to "change config = replace the container."
- **`--network host` and `--network none` are the two extremes** worth
  knowing exist, even without using them daily: full namespace removal
  versus total isolation.
- **A typo in an env var name is a silent failure, not a loud one**, exactly
  like Day 6's volume-name typo. Docker only complains about its own flags
  (`--network`, image names); an app's own required configuration is the
  app's problem to validate, and it may fail in a way that only shows up in
  `docker logs`.

---

## 6. Commands used

```bash
# Networks
docker network create <name>
docker network ls
docker network inspect <name>
docker network connect <name> <container>
docker network disconnect <name> <container>
docker network rm <name>

# DNS / connectivity testing from inside a container
apk add --no-cache bind-tools        # getent, nslookup, dig
apk add --no-cache curl
getent hosts <name>; echo "exit code: $?"
curl -v telnet://<host>:<port>       # quick "is anything listening" check, no client needed

# Diagnosing a container that silently didn't start
docker ps -a --format "table {{.Names}}\t{{.Status}}"
docker logs <container>

# Reference only (not run this session)
docker run --network host ...
docker run --network none ...
```

---

## 7. State at end of day

```text
Containers : cleaned up (db1, db2 removed)
Networks   : app-net removed; only bridge/host/none remain
Volumes    : 2 anonymous postgres volumes left behind (orphaned - postgres:17-alpine
             declares a VOLUME for /var/lib/postgresql/data; db1/db2 each got one,
             neither pruned yet, `docker volume prune` would reclaim them)
Images     : alpine, python:3.12-slim, postgres:17-alpine (all left cached)
Next       : Day 9 - Docker Compose
```
