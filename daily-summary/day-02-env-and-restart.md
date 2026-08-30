# Day 2 — Environment variables, --rm, restart policies

**Date:** 30-31 Aug 2026
**Goal:** Configure a container from outside the image, and control what happens
when it dies.
**Outcome:** Complete. All six review questions answered correctly; four
additional findings verified directly against the local engine.

---

## 1. What we did

### Block 0 — warm-up cleanup

Six containers from Day 1's exit-code exercise were still present after 23 hours,
still holding their exit codes and writable layers.

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}'
docker rm t0 t1 t126 t127 t143 t137
docker system df
```

Before cleanup:

```text
TYPE            TOTAL     ACTIVE    SIZE       RECLAIMABLE
Images          3         2         370MB      74.47MB (20%)
Containers      6         0         176.1kB    176.1kB (100%)
```

Lesson reinforced: **exited containers persist until removed.** They are not
garbage-collected.

---

### Block A — environment variables

Configuration that differs between environments must come from outside the
image, otherwise you would rebuild for every environment.

```bash
docker run --rm alpine env                              # image defaults
docker run --rm -e GREETING=hello alpine printenv GREETING
docker run --rm -e APP_ENV=production -e PORT=3000 alpine env
```

#### The pass-through form

`-e NAME` with no `=value` takes the value from the host shell:

```bash
export MY_TOKEN=abc123
docker run --rm -e MY_TOKEN alpine printenv MY_TOKEN
```

Useful in CI, where a secret already exists in the runner's environment and
should never appear on the command line.

#### From a file

```bash
printf 'APP_ENV=dev\nPORT=3000\n# comments are allowed\n' > app.env
docker run --rm --env-file app.env alpine env
```

#### The quoting gotcha

```bash
printf 'QUOTED="hello"\n' >> app.env
docker run --rm --env-file app.env alpine printenv QUOTED
```

Output:

```text
"hello"
```

The quotes are **part of the value**. An `--env-file` is not a shell script:
no quote stripping, no `$VAR` expansion, no `export`.

#### Image variables and overrides

```bash
docker image inspect nginx:1.27 --format '{{json .Config.Env}}'
docker run --rm -e NGINX_VERSION=OVERRIDDEN nginx:1.27 printenv NGINX_VERSION
```

#### Environment is fixed at creation time

```bash
docker run -d --name envtest -e MODE=one nginx:1.27
docker exec envtest printenv MODE            # one

docker exec -e MODE=two envtest printenv MODE  # two  - only inside THIS exec
docker exec envtest printenv MODE              # one  - container unchanged

docker rm -f envtest
docker run -d --name envtest -e MODE=two nginx:1.27
docker exec envtest printenv MODE            # two
```

**You replace containers, you do not reconfigure them.** This is the reason
Compose exists - it makes replacement a single command.

#### Why environment variables are not a secret store

```bash
docker inspect envtest --format '{{json .Config.Env}}'
docker rm -f envtest
```

Readable by anyone in the `docker` group.

---

### Block B — `--rm`

```bash
docker run alpine echo "this leaves a corpse"
docker run --rm alpine echo "this cleans up"
docker ps -a --filter ancestor=alpine        # one container, not two
```

`--rm` deletes the container the instant it exits. Right for one-off commands and
interactive shells; wrong for anything whose logs or exit code you may want to
read afterwards.

Docker rejects this combination outright:

```bash
docker run -d --rm --restart always alpine sleep 60
# Conflicting options: --restart and --rm
```

The two instructions contradict each other: `--rm` says delete on exit,
`--restart` says keep it and start it again.

---

### Block C — restart policies

Four values: `no` (default), `on-failure[:N]`, `always`, `unless-stopped`.

```bash
docker run -d --name r1 --restart on-failure:3 alpine sh -c 'sleep 2; exit 1'
docker inspect -f 'policy={{.HostConfig.RestartPolicy.Name}} max={{.HostConfig.RestartPolicy.MaximumRetryCount}}' r1

# after ~20 seconds
docker inspect -f 'restarts={{.RestartCount}} status={{.State.Status}}' r1
docker rm -f r1
```

`RestartCount` climbs to the limit and then Docker gives up. Retries are not a
tight loop - the delay doubles between attempts.

#### `always` vs `unless-stopped` - the experiment

```bash
docker run -d --name a1 --restart always         nginx:1.27
docker run -d --name u1 --restart unless-stopped nginx:1.27

docker stop a1 u1
docker ps -a --format 'table {{.Names}}\t{{.Status}}'    # both Exited

sudo systemctl restart docker
docker ps -a --format 'table {{.Names}}\t{{.Status}}'
docker rm -f a1 u1
```

**Result:** `a1` came back. `u1` stayed stopped.

Both policies restart on crash and both start on daemon startup. They differ in
exactly one case - a container the user stopped manually:

```text
always          -> ignores the previous manual stop after a daemon restart
unless-stopped  -> remembers and respects the manual stop
```

---

## 2. Review questions and answers

**Q1. What did `printenv QUOTED` print, and what does it say about `--env-file`?**
`"hello"`, with the quotes included in the value. `--env-file` is not parsed by a
shell: no quote stripping, no variable expansion, no `export`.

**Q2. Why can `--rm` and `--restart` not be combined?**
They are contradictory. `--rm` deletes the container on exit; `--restart` keeps it
and starts it again. Docker cannot restart a container it has been told to
delete, so it refuses the combination.

**Q3. After the daemon restart, which of `a1` and `u1` came back?**
`a1` (`--restart always`) came back; `u1` (`--restart unless-stopped`) did not.
`always` ignores a previous manual stop; `unless-stopped` respects it.

**Q4. How do you change a running container's `LOG_LEVEL`?**
You cannot change it in place. Recreate the container with the new value:

```bash
docker rm -f myapp
docker run -d --name myapp -e LOG_LEVEL=debug myapp:1.0
```

`docker exec -e LOG_LEVEL=debug myapp ...` affects only that exec process, not
the container.

**Q5. Why is `-e DB_PASSWORD=...` poor for a production secret?**
The value is stored in the container configuration and readable with
`docker inspect myapp --format '{{json .Config.Env}}'`. Fine for `LOG_LEVEL`,
`APP_ENV`, `PORT`; wrong for `DB_PASSWORD`, `API_TOKEN`, `PRIVATE_KEY`.

**Q6. Which policy for a nightly backup, a web API, a database on a laptop?**

```text
nightly backup   -> on-failure:3     retry a failure a limited number of times
web API          -> unless-stopped   recover from crashes, respect manual stops
laptop database  -> unless-stopped   comes back after reboot, respects a stop
```

All six answered correctly.

---

## 3. Additional findings (verified on this machine)

### 3.1 `docker update` - the exception to "recreate to reconfigure"

Q4's principle is right for environment variables, but the boundary is narrower
than "nothing can change". `docker update` alters a few host-side runtime
constraints on a live container:

```text
--restart                                  restart policy
--cpus, --cpuset-cpus, --cpu-quota, --cpu-period
-m/--memory, --memory-reservation, --memory-swap
--pids-limit, --blkio-weight
```

```bash
docker run -d --name svc --restart no nginx:1.27
docker update --restart unless-stopped svc
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' svc
docker rm -f svc
```

**The rule:** `docker update` changes only host-side runtime constraints.
Anything fixed into the container's identity at creation - environment, ports,
mounts, image, command, name - still requires replacement.

### 3.2 Environment precedence, measured

```bash
printf 'V=from-file\n' > p.env
docker run --rm --env-file p.env -e V=from-flag alpine printenv V
# from-flag
```

Lowest to highest priority:

```text
image ENV   ->   --env-file   ->   -e
```

Later `-e` flags also override earlier ones. Useful pattern: a file of defaults
plus a couple of per-run overrides.

### 3.3 Restart policies are not a scheduler

Docker restarts **immediately**, with a doubling backoff measured in seconds. It
has no concept of "nightly". A scheduled job belongs to cron or a systemd timer:

```bash
# cron entry or systemd timer
docker run --rm --name backup myapp:1.0 /usr/local/bin/backup.sh
```

`--rm`, restart policy `no`, and the scheduler owns the timing.

- Use `on-failure:N` for immediate retries after a transient failure.
- Use a timer for "at 02:00 daily".

Mixing them means a failed backup retries three times at 02:00:01 and then not
again until the next day.

### 3.4 Other ways environment variables leak

`docker inspect` is the obvious one. Also:

```bash
docker exec svc env                   # anyone who can exec
docker exec svc cat /proc/1/environ   # the process's own environment
history | grep DB_PASSWORD            # host shell history, if typed with -e
```

Child processes inherit the environment, and crash reporters often dump it.

`--env-file` is a real improvement - it keeps the value out of shell history and
the host process list - but the value still lands in `.Config.Env`, so
`docker inspect` still exposes it. Better hygiene, not a secret store.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Config comes from outside the image | Same image, different `-e` values, different environments. No rebuild. |
| `-e NAME` pass-through | With no `=value`, Docker copies the value from the host shell. Keeps secrets off the command line in CI. |
| `--env-file` is not a shell script | No quote stripping, no `$VAR` expansion, no `export`. `KEY=VALUE` and `#` comments only. |
| Precedence | image `ENV` < `--env-file` < `-e`. |
| Environment is fixed at creation | There is no command to change a running container's env. `docker exec -e` affects only that exec process. |
| Replacement, not reconfiguration | Change config -> destroy and recreate from the same image. This is what Compose automates. |
| `docker update` | Changes restart policy and resource limits live; not env, ports, mounts, image, or command. |
| `--rm` | Deletes the container the moment it exits. Conflicts with `--restart` by definition. |
| Four restart policies | `no`, `on-failure[:N]`, `always`, `unless-stopped`. |
| `always` vs `unless-stopped` | Differ only for a container the user stopped manually before a daemon restart. |
| Restart backoff | Delay doubles between attempts; `RestartCount` records how many happened. |
| Env vars are not secrets | Visible via `inspect`, `exec env`, `/proc/1/environ`, and shell history. |

---

## 5. Keep in mind

- **Change configuration = replace the container.** Same image, new settings.
  The container is the disposable part.
- **`docker exec -e` is a trap.** It sets the variable for that one process, not
  for the container. The container's env is unchanged.
- **`--env-file` values are literal.** `QUOTED="hello"` gives you `"hello"` with
  the quotes. Never quote values in an env file.
- **`-e` beats `--env-file`.** Defaults in the file, overrides on the flag.
- **`unless-stopped` is the sane default for a service.** It recovers from
  crashes and reboots but respects a deliberate stop. Use `always` only when a
  manual stop should never survive a daemon restart.
- **Restart policy is not a scheduler.** Use cron or a systemd timer with `--rm`.
- **Never put a real secret in `-e` or an env file.** Anyone with `docker inspect`
  can read it. Use Docker/Swarm secrets or a secrets manager.
- **`--rm` for one-off commands, not for anything you may need to debug.** Once
  it exits, the logs and exit code are gone with it.
- **Exited containers are not garbage-collected.** They persist until `docker rm`.

---

## 6. Commands used

```bash
# Environment
docker run --rm -e KEY=value alpine printenv KEY
docker run --rm -e KEY alpine printenv KEY          # pass through from host
docker run --rm --env-file app.env alpine env
docker inspect <c> --format '{{json .Config.Env}}'
docker image inspect <image> --format '{{json .Config.Env}}'
docker exec -e KEY=value <c> printenv KEY           # this exec only

# Lifecycle / cleanup
docker run --rm alpine echo hi
docker rm t0 t1 t126 t127
docker system df
docker ps -a --filter ancestor=alpine

# Restart policies
docker run -d --restart on-failure:3 --name r1 alpine sh -c 'sleep 2; exit 1'
docker run -d --restart unless-stopped --name u1 nginx:1.27
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' <c>
docker inspect -f '{{.HostConfig.RestartPolicy.MaximumRetryCount}}' <c>
docker inspect -f '{{.RestartCount}}' <c>
docker update --restart unless-stopped <c>
sudo systemctl restart docker
```

---

## 7. State at end of day

```text
Images     : alpine, nginx:1.27, nginx:1.27-alpine
Containers : cleaned up
Next       : Day 3 - images, tags, digests, registries
```
