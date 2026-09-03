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

## Day 5 — _next up_

<!-- Template for each entry:
## Day N — Topic
What I built:
What broke:
Root cause:
What I'd do differently:
-->
