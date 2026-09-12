# Journal

A running log of what I built, what broke, and what I learned. Newest last.

The failures are kept in deliberately — the debugging is the skill.

---

## Day 0 — Environment setup (Fedora 44 on WSL2)

Installed Docker Engine inside Fedora Linux 44 running on WSL2, rather than
using Docker Desktop, so that I work against a normal Linux daemon.

**Verified the setup:**

```bash
systemctl is-active docker      # active
systemctl is-enabled docker     # enabled - survives reboots
docker run hello-world          # worked (with sudo)
```

**Problem:** every Docker command failed without `sudo`:

```text
permission denied while trying to connect to the docker API
at unix:///var/run/docker.sock
```

**Diagnosis:** the socket is owned by `root:docker` with mode `srw-rw----`, and
my user wasn't in the `docker` group:

```bash
ls -l /var/run/docker.sock      # srw-rw---- 1 root docker
getent group docker             # docker:x:994:   <- empty
id                              # no 994 in my groups
```

**First fix attempt failed.** I ran `sudo usermod -aG docker $USER` from a root
shell, so `$USER` expanded to `root` — the group ended up as `docker:x:994:root`,
which changes nothing since root already had access.

**Actual fix:** name the user explicitly, then restart WSL so the login session
picks up the new group (closing the terminal is not enough — group membership is
attached at login):

```bash
sudo usermod -aG docker sagar
sudo gpasswd -d root docker     # undo the mistaken entry
# then, from PowerShell on Windows:
wsl --shutdown
```

**Lessons:**
- `$USER` inside a `sudo su` shell is `root`, not you. Shell variables are
  evaluated by the shell you're standing in.
- Group changes need a new login session, not a new terminal window.
- Membership of the `docker` group is effectively root access on the host —
  acceptable on a personal machine, not on a shared server.

---

## Day 1 — Containers: run, inspect, exec, destroy

```bash
docker run -d --name web -p 8080:80 nginx:1.27
```

**Observations:**

- I never ran `docker pull`. `run` found no local copy and fetched it — each
  `Pull complete` line is one **layer** of the image.
- The output ended with a digest, `sha256:6784fb08...`. The tag `1.27` is a
  movable label; the digest is the immutable identity of that exact image.
- `docker ps` showed `0.0.0.0:8080->80/tcp, [::]:8080->80/tcp` — published on
  both IPv4 and IPv6.
- The page was reachable at `http://localhost:8080` from the **Windows** browser
  with no configuration: WSL2 forwards localhost into the distro automatically.

**Mistake made:** ran `docker -it web sh` and got `unknown shorthand flag: 'i'`.
`-it` belongs to the `exec` subcommand, not to `docker` itself. The grammar is:

```text
docker [global options] COMMAND [command options] [arguments]
```

**Inside the container:**

```bash
docker exec -it web sh
cat /etc/os-release   # Debian GNU/Linux 12 (bookworm)
hostname              # b1744e5faded - the short container ID
```

My host is Fedora, but the container is Debian. The image ships its own
userland; only the kernel is shared. That single fact is what makes Docker
different from a VM.

**The writable layer, demonstrated:**

```bash
docker exec web sh -c 'echo "<h1>Sagar was here</h1>" > /usr/share/nginx/html/index.html'
curl http://localhost:8080     # my text
docker rm -f web
docker run -d --name web -p 8080:80 nginx:1.27
curl http://localhost:8080     # default nginx page - the edit is gone
```

The second `run` started instantly — no pull, because the image was already
local. But it produced a **new container** with a fresh writable layer.

**Conclusion I want to remember:** containers are disposable by design.
Anything that must survive has to live in a volume or a bind mount. This is the
reason `docker compose down -v` is dangerous while `docker compose down` is not.

---

## Day 2 — Configuration from outside the image

Same image, different behaviour, no rebuild. That is the whole point of runtime
configuration.

```bash
docker run --rm -e GREETING=hello alpine printenv GREETING
docker run --rm -e MY_TOKEN alpine printenv MY_TOKEN     # value taken from host
docker run --rm --env-file app.env alpine env
```

**Gotcha found:** an `--env-file` is not a shell script. Writing
`QUOTED="hello"` produces the value `"hello"` — quotes and all. No quote
stripping, no `$VAR` expansion, no `export`. Precedence, measured:
image `ENV` < `--env-file` < `-e`.

**The important limit:** a container's environment is fixed at creation. There
is no command to change it on a running container, and `docker exec -e` only
affects that one exec process:

```bash
docker exec -e MODE=two envtest printenv MODE  # two  - inside this exec only
docker exec envtest printenv MODE              # one  - container unchanged
```

So changing configuration means **replacing the container**, not reconfiguring
it. This is exactly the chore Compose automates.

The exception, which I checked rather than assumed: `docker update` can change
restart policy and resource limits (CPU, memory, pids) on a live container. It
cannot touch environment, ports, mounts, image, command or name.

**Restart policies.** Ran the experiment rather than reading the answer:

```bash
docker run -d --name a1 --restart always         nginx:1.27
docker run -d --name u1 --restart unless-stopped nginx:1.27
docker stop a1 u1
sudo systemctl restart docker
docker ps -a
```

`a1` came back; `u1` stayed down. Both restart on crash and on daemon startup —
they differ in exactly one case, a container the user stopped by hand. `always`
overrides that decision, `unless-stopped` respects it. That makes
`unless-stopped` the sensible default for a service you sometimes take down.

Also worth recording: restart policies are **not a scheduler**. Docker retries
immediately with a doubling backoff. "Nightly" belongs to cron or a systemd
timer running `docker run --rm`.

**Security note:** environment variables are not secrets. `docker inspect`,
`docker exec env`, `/proc/1/environ`, and shell history all expose them.
`--env-file` keeps values out of history and the process list, which is better
hygiene, but the value still lands in `.Config.Env`.

---

## Day 3 — Images, tags, digests

A tag is a pointer, not a thing. That single sentence covers most of today.

```bash
docker tag nginx:1.27 my-nginx:experiment
docker image ls          # two names, ONE image ID, no extra disk
docker image rm my-nginx:experiment
# Untagged: ...    <- not "Deleted:", because other names still point there
```

`nginx:1.27` and `nginx:1.27.5` currently resolve to the same ID. They will not
forever: `1.27` moves when `1.27.6` ships, `1.27.5` never does. That is the real
argument for pinning — a rebuild weeks later can produce a different image with
nothing in git to explain it.

**Layer sharing, seen rather than read about.** Pulling `nginx:1.27-perl` printed
`Already exists` for nearly every layer, downloading only the Perl additions.

**The sizes in `docker image ls` do not add up, and shouldn't.**

```text
image ls apparent total   705.5MB
system df actual disk     426.7MB
```

The 278.8MB gap is the Debian base shared by `1.27` and `1.27-perl`. `image ls`
bills it to both images; the disk stores it once. `docker system df -v` splits
it properly into SHARED and UNIQUE columns. Trust `system df`.

That also explained a number that looked wrong: `RECLAIMABLE` read 147.3MB with
no containers running. Summing the UNIQUE column gives 147.33MB exactly —
reclaimable counts only bytes unique to an image, since shared layers stay for
whoever else needs them.

**`nginx:1.27` is not an image.** It is a manifest list indexing amd64, arm/v5,
arm/v7, arm64/v8, 386, mips64le, ppc64le and s390x. Docker matched my host
(`x86_64 / linux`) and pulled amd64. The `unknown/unknown` entries in the list
are attestation manifests — build provenance and SBOM — not broken platforms.

**Checked rather than assumed:** the EXTRA column in `docker image ls` is
undocumented in `--help`, so I tested it — started a container, `U` appeared
next to that image; removed the container, `U` vanished. `U` means *in Use*, and
an image without it is what `docker image prune -a` will delete.

Also worth recording for other machines: here the image ID *is* the manifest
digest, because this engine uses the containerd image store. On the older
storage driver the ID is a separate config hash and will not match
`RepoDigests`.

---

## Day 4 — Writing a first Dockerfile

Built and ran the first Dockerfile in this repo — a one-file Python HTTP
server. `docker image history` confirmed the prediction cleanly: `FROM`,
`WORKDIR`, `COPY` write real layers; `EXPOSE` and `CMD` are 0B metadata.

The rest of the day didn't go how the lesson plan expected, in a good way.

**`.dockerignore` first looked like it did nothing.** Removing it made zero
difference to the build context size — 28B either way, 50MB test file never
transferred. Turned out the Dockerfile only had `COPY app.py .`, and modern
BuildKit only sends files a `COPY`/`ADD` actually names — `.dockerignore` had
nothing to prove either way. Rebuilt with `COPY . .` instead and the real
effect appeared: 52.44MB without the ignore file, 254B with it. Lesson:
`.dockerignore` matters most exactly when `COPY` is broad, and should never be
skipped just because today's `COPY` happens to be narrow — the day someone
widens it, an untracked `.dockerignore` bites.

**The bigger finding: exec-form `CMD` didn't fix the signal problem I expected
it to fix.** Built the same app two ways — `CMD ["python", "app.py"]` and
`CMD python app.py` — expecting exec form (Python as PID 1) to stop fast under
`docker stop`, since it receives `SIGTERM` directly. Both took the full ~10s
grace period and got force-killed (exit 137). Root cause, checked rather than
guessed: **a process running as PID 1 inside a container doesn't get the
normal default signal behavior.** An unhandled signal is *ignored*, not fatal,
for PID 1 specifically — the only exceptions are SIGKILL and SIGSTOP. My
`app.py` never registered a `SIGTERM` handler, so whether Python or `sh` sat
at PID 1, the signal did nothing either way.

Verified the actual fix rather than just the diagnosis:

```bash
docker run -d --init --name d-exec-init -p 8083:8080 day4-app:exec
time docker stop d-exec-init
```

```text
without --init:  10.500s   exit 137 (SIGKILL)
with --init:       0.427s  exit 143 (SIGTERM)
```

`--init` puts `tini` at PID 1, which actually handles `SIGTERM` and forwards
it — and now Python isn't PID 1 anymore, so ordinary default signal handling
applies to it as a child. 25x faster stop, and the exit code itself changes
character: force-killed versus cleanly terminated. This is the real reason
production images run an init process instead of the app directly as PID 1 —
not a style convention.

`examples/day-04-hello-app/` is now in the repo — the first Dockerfile
`docker-labs` has ever contained. hadolint passed clean on it before the
commit that will flip CI's `dockerfile-lint` and `build-images` jobs from a
no-op to doing real work for the first time.

---

## Day 5 — Layer caching and .dockerignore

Two Dockerfiles, one difference: whether `COPY requirements.txt .` and
`RUN pip install` come before or after the broad `COPY . .`.

```dockerfile
# slow: COPY . . then RUN pip install
# fast: COPY requirements.txt . , RUN pip install, then COPY . .
```

Built both twice to establish a cached baseline (~1.1s each), then edited
only `app.py` - never `requirements.txt` - and rebuilt both:

```text
slow:  1.108s -> 4.824s   (pip install reran for real, 2.6s of that)
fast:  1.086s -> 1.457s   (pip install stayed CACHED)
```

Same one-line edit, and `slow` paid for a network reinstall it didn't need
because `app.py` sat in the same `COPY . .` as `requirements.txt` -
invalidating that layer cascades to everything after it, whether or not the
later layer's own inputs actually changed.

**Found something before I could explain it:** the very first build of the
"fast" Dockerfile in a brand-new directory already showed most of its layers
`CACHED`. Turned out clearing my bash history doesn't touch Docker's build
cache at all - that lives in the daemon, on disk, completely separate from
shell history. A "first ever" build isn't necessarily a cold one.

**Left a gap on purpose rather than fake it:** Block B was supposed to prove
`.dockerignore` protects the cache, not just the transfer size, by adding an
irrelevant 5MB `scratch.log` and comparing before/after `.dockerignore`. I
only tested the half that was already expected to be fine (`fast` ignores
the noise regardless). The half that actually demonstrates the failure -
`scratch.log` breaking `slow`'s cache, then `.dockerignore` fixing it -
didn't get run this session. It's queued for next time; full notes in
[`daily-summary/day-05-layer-caching.md`](daily-summary/day-05-layer-caching.md).

Also confirmed `--no-cache` and `--pull` solve different problems: `--no-cache`
forced every instruction to rerun (7.1s) while `--pull` only rechecked the
registry for a newer base image, found nothing new, and left every layer of
mine `CACHED` (0.7s). `docker builder prune` reclaimed 82.42MB of dangling
cache built up across the session.

## Day 6 — Named volumes and data persistence

The direct fix for Day 1's disappearing edit. A container's writable layer
belongs to the container object and dies with it; a named volume belongs to
nothing but itself.

```bash
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine
```

Wrote a row, `docker rm -f`'d the container entirely, recreated it against
the same volume - the row was still there. In fact the recreated container's
first `CREATE TABLE demo` didn't even get that far: `ERROR: relation "demo"
already exists`, proof of persistence before a single `SELECT` ran.

Then destroyed the volume instead of the container:

```bash
docker volume rm pgdata
```

Recreated the identical container against the same volume name - and this
time the table was genuinely gone. Same `docker run` command both times;
the only thing that decided whether the data survived was which object got
deleted.

**The trap that matters most in practice:** typo'd the volume name
(`pgdatta` instead of `pgdata`) and the container started up with no error
at all. Docker just silently created a new, empty volume under the
misspelled name. `docker volume ls` afterward showed both volumes sitting
side by side - the only way to catch this mistake is noticing the data
isn't there or spotting the extra entry, never a loud failure.

Also picked up a smaller, real lesson along the way: `docker exec` runs as
the container's default user (root, for this image) unless told otherwise,
and `psql` with no `-U` tries to authenticate using that same name as a
Postgres role - which is how `FATAL: role "root" does not exist` happened.
Always pass `-U` and `-d` explicitly. Full write-up in
[`daily-summary/day-06-volumes.md`](daily-summary/day-06-volumes.md).

## Day 7 — Bind mounts and the UID mismatch

A bind mount has zero indirection: `-v "$PWD":/data` means the container and
the host are opening the literal same file through two different paths, no
copy, no Docker-managed storage in between. Proved it directly - a container
appending to a bind-mounted file, then `cat`-ing it from the host, showed
both the host's original line and the container's append.

```bash
docker run --rm -v myvol:/data alpine sh -c 'echo hi > /data/x'
docker run --rm -v "$PWD/relpath":/data alpine sh -c 'echo hi > /data/x'
```

Same flag, one character of difference (`/` on the left side or not) decides
named volume versus bind mount. `myvol` became a tracked Docker volume;
`relpath` became an ordinary directory on disk.

**That ordinary directory came back to bite cleanup at the end of the day.**
`rm -rf` on the lab folder failed outright - `relpath/x` had been created by
a root process inside the container, and across a bind mount there's no UID
translation at all: root inside the container *is* UID 0 on the host,
identical to any other root-owned file. `sagar` (UID 1000) couldn't remove
it without `sudo`. Better proof than the synthetic demo I'd planned, because
it's exactly the kind of thing that actually happens with containerized
build tools writing into a bind-mounted output directory.

**The live-reload piece needed correcting before it was right.** The
instinct is to credit the bind mount for a running Flask app picking up a
host-side edit with no `docker` command involved. That's only half true: the
mount just makes the new content visible on disk - a running process has no
reason to notice unless something is actively watching for it. That
something is Werkzeug's `--debug` reloader, which polls the source and
restarts the whole process on a change. Confirmed the edit propagating live;
the deliberate no-`--debug` counter-test to fully nail it down is still
queued rather than run.

Also hit, and left honestly unexplained: `pip install flask` failed
completely on the first attempt with a TLS certificate verification error
reaching PyPI, then succeeded moments later with the identical command and
no changes made. The failure signature matches a TLS-inspecting network path,
but that wasn't independently confirmed.

## Day 8 — Networks and container DNS

Two containers, no `--network` flag on either, both landed on the default
bridge - and `getent hosts` came back completely empty. Not a fluke: the
default bridge predates Docker's embedded DNS resolver and never got one
added. Create a real network instead and the exact same lookup works:

```bash
docker network create app-net
docker run -d --name db2 --network app-net -e POSTGRES_PASSWORD=secret postgres:17-alpine
docker run --rm -it --network app-net alpine sh -c "apk add --no-cache bind-tools -q && getent hosts db2"
```

**Except it didn't work the first time**, and the reason was more
interesting than the network. `db2` had actually exited immediately -
`-e POSTGRESS_PASSWORD=secret` (one typo'd letter) meant Postgres's own
startup script never saw the `POSTGRES_PASSWORD` it requires and refused to
start. Docker doesn't validate `-e` names at all; it set the misspelled
variable exactly as typed, same as any other silent-failure typo this repo
has hit. `docker network inspect` showing an empty `Containers` list was the
tell - not a networking bug, just a container that was never actually there.

Fixed the spelling, confirmed `db2` running, and got a real resolution:
`172.18.0.2 db2 db2`. Then proved the thing that trips people up constantly:

```bash
curl -v telnet://localhost:5432   # Connection refused
curl -v telnet://db2:5432         # Established connection to db2 (172.18.0.2)
```

Same network, wildly different results, because every container gets its
own private loopback. `localhost` inside a container only ever means "this
exact container" - never a sibling, no matter how close the two are on the
same Docker network.

Last piece: `docker network connect`/`disconnect` change a running
container's DNS resolvability with zero recreation - watched `db1` go from
unresolvable (default bridge only) to resolvable (connected to `app-net`) and
back to unresolvable (disconnected), same container, same process the whole
time. A genuine exception to "change config = replace the container,"
alongside Day 2's `docker update`.

## Day 9 — Docker Compose

Converted Day 8's two ad-hoc containers into one `compose.yaml`, and the
first real lesson arrived before the file even parsed: `vi`'s default Tab
key inserts a literal tab, and YAML forbids tabs for indentation entirely.
`cat -te` made the invisible whitespace visible (tabs show as `^I`) and
confirmed the fix.

Once valid, `docker compose config` rendered the network Compose creates
automatically for every project - no `networks:` block written anywhere,
yet the render showed `day9_default` right there. That's the actual
mechanism behind something that looked like magic: Compose is doing Day 8's
`docker network create` step for you, silently.

```bash
docker compose config    # renders the resolved config - starts nothing
```

Used that same command to catch a deliberately typo'd `POSTGRESS_PASSWORD`
before ever running `up` - same mistake as Day 8, this time caught by
reading a render instead of debugging a crash afterward.

**The volume-persistence test needed a redo, and the reason why was the real
lesson.** First attempt: `compose.yaml` had no `volumes:` block at all, so a
`CREATE TABLE` didn't survive `down`/`up` - not proof that named volumes
don't persist, just proof there wasn't one to test. Added
`volumes: - db-data:/var/lib/postgresql/data`, matching
`examples/first-stack/compose.yaml`'s actual pattern, and the identical
`CREATE TABLE` → `down` → `up` cycle preserved the table cleanly. `down -v`
then destroyed it, with the CLI's own `Volume ... Removed` /
`Volume ... Created` lines as direct proof.

Also hit, twice: running a command immediately after `up -d` can race
Postgres's own startup (`depends_on` without a healthcheck only waits for
"started," not "ready"), producing a connection failure that looks like data
loss but isn't. Checking `docker compose logs` for the readiness line fixed
it - full treatment of that problem is Day 10.

## Day 10 — Multi-service stack with healthchecks

Built `projects/01-node-postgres/` for real: an `inventory-api` (Node/Express
+ `pg`) reading an `items` table from Postgres, `depends_on: condition:
service_healthy` fixing the exact startup race Day 9 first exposed. Never
having built a multi-file app project before, worked from a fully worked
reference first (a `notes` app, deliberately a different domain so it stayed
a study copy, not the deliverable), then built the real thing independently
with entirely different naming - own table, own columns, own port.

Hit the same real bug twice, which mattered more than fixing it once: a
container-internal `HEALTHCHECK` calling `wget http://localhost/...` failed
with `Connection refused`, while `curl` to the same route from the host
worked fine. Root cause, chased down rather than guessed: Alpine's `/etc/hosts`
lists `localhost` against both `127.0.0.1` and `::1`; the app only binds the
IPv4 wildcard, so nothing is listening on the IPv6 address, and `wget`
apparently tries that one first with no fallback. `curl` from the host never
hits this at all - Docker publishes ports as dual-stack at the host boundary,
regardless of what the app inside actually binds to. Fix: point
container-internal checks at `127.0.0.1` explicitly. First time, this needed
help to diagnose; second time, in the independently-built project, it was
caught and fixed without any.

**A persistence test proved nothing on the first pass, and catching that
mattered more than the test itself.** `down`/`up` and `down -v`/`up` both
returned identical seeded rows - not proof persistence survived `-v`, just
proof the seed script (`init.sql`) inserts the same fixed rows either way,
making "wiped and reseeded" indistinguishable from "never touched." Redone
with a real marker row inserted by hand: it survived a plain `down`/`up` and
was genuinely gone after `down -v`/`up` - the actual proof, not a coincidence
that looked like one.

Copying the finished files into the tracked `projects/01-node-postgres/`
surfaced one more real thing: `docker compose up` failed there with an
orphan-container warning and a port conflict, because Compose names a
project after its directory's *basename* only - and an old scratch build at
`~/docker-lab/projects/01-node-postgres` happened to share that exact name.
Two unrelated directories, same project identity, real collision. Cleaned up
both stale stacks and it came up cleanly.

Left one thing open on purpose: the image came in at 255MB against the
brief's 200MB target. `docker history` showed ~174MB of that is `node:22-alpine`'s
own base layers (installing Node's runtime, npm, yarn) - not anything in the
Dockerfile, which was already following every rule taught so far. Shrinking
that further is exactly Day 12's subject (multi-stage builds), so it's
recorded honestly as unfinished rather than solved early with a technique
that hasn't been taught yet. Full write-up in
[`daily-summary/day-10-multiservice-healthcheck.md`](daily-summary/day-10-multiservice-healthcheck.md).

## Day 11 — _next up_

<!-- Template for each entry:
## Day N — Topic
What I built:
What broke:
Root cause:
What I'd do differently:
-->
