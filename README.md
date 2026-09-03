<h1 align="center">docker-labs</h1>

<p align="center">
  Learning Docker properly - from first container to production-shaped images.<br>
  Hands-on labs, real builds, and an honest log of everything that broke.
</p>

<p align="center">
  <a href="https://github.com/sagarsaitwal/docker-labs/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/sagarsaitwal/docker-labs/actions/workflows/ci.yml/badge.svg">
  </a>
  <img alt="Docker" src="https://img.shields.io/badge/Docker-29.7-2496ED?logo=docker&logoColor=white">
  <img alt="Fedora" src="https://img.shields.io/badge/Fedora%2044-WSL2-51A2DA?logo=fedora&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green.svg">
</p>

---

## What this is

A working repository, not a tutorial copy. Every Dockerfile here was written by
hand, every stack was run locally, and every failure is recorded with its root
cause - briefly in [`JOURNAL.md`](JOURNAL.md), and in full in
[`daily-summary/`](daily-summary/), one file per day.

Continuous integration lints and builds every image on each push, so the badge
above reflects the real state of the code rather than a claim about it.

**Environment:** Docker Engine 29.7.2 + Compose v5.5.0 on Fedora Linux 44 under
WSL2 - a standard Linux daemon and socket, not Docker Desktop.

---

## Progress

| Day | Topic | Status | Evidence |
|:--:|---|---|---|
| 0 | Engine install, daemon, socket permissions | **Complete** | [journal](JOURNAL.md#day-0--environment-setup-fedora-44-on-wsl2) &middot; [notes](daily-summary/day-00-environment-setup.md) |
| 1 | Containers: lifecycle, ports, exit codes, signals | **Complete** | [journal](JOURNAL.md#day-1--containers-run-inspect-exec-destroy) &middot; [notes](daily-summary/day-01-containers.md) |
| 2 | Environment variables, `--rm`, restart policies | **Complete** | [journal](JOURNAL.md#day-2--configuration-from-outside-the-image) &middot; [notes](daily-summary/day-02-env-and-restart.md) |
| 3 | Images, tags, digests, registries | **Complete** | [journal](JOURNAL.md#day-3--images-tags-digests) &middot; [notes](daily-summary/day-03-images-tags-digests.md) |
| 4 | Writing a first Dockerfile | **Complete** | [journal](JOURNAL.md#day-4--writing-a-first-dockerfile) &middot; [notes](daily-summary/day-04-first-dockerfile.md) |
| 5 | Layer caching and `.dockerignore` | Not started | |
| 6 | Named volumes and data persistence | Not started | |
| 7 | Bind mounts and live-reload development | Not started | |
| 8 | Networks and container DNS | Not started | |
| 9 | Docker Compose | Not started | [example](examples/first-stack/) |
| 10 | Multi-service stack with healthchecks | Not started | [project 01](projects/01-node-postgres/) |
| 11 | Debugging: exit codes, logs, `inspect` | Not started | |
| 12 | Multi-stage builds and image size | Not started | [project 03](projects/03-react-multistage/) |
| 13 | Publishing to a registry | Not started | |
| 14 | Production hardening: non-root, limits, scanning | Not started | |

Status values: **Complete** / In progress / Not started.

---

## What I can explain, not just run

Updated as I go - each line is something I have demonstrated in this repo.

- **Why a container is not a VM.** My host is Fedora; `cat /etc/os-release`
  inside an `nginx` container reports Debian. The image ships its own userland
  and shares the host kernel.
- **When an edit inside a container survives, and when it doesn't.** Changes land
  in the container's thin writable layer, which belongs to the *container object*
  - so they survive `stop`/`start`/`restart` and are destroyed only by `rm`.
  Persistence beyond that requires a volume or a bind mount.
- **Tag versus digest.** `nginx:1.27` is a movable label; `sha256:6784fb08...` is
  the immutable identity. Only one of the two makes a deployment reproducible.
  A tag is a pointer, not a thing: `docker tag` creates a second name for the
  same image ID and costs no disk, and `docker image rm` prints `Untagged:`
  rather than `Deleted:` until the last reference goes.
- **Why image sizes never add up.** `docker image ls` bills every shared layer
  to each image that uses it. On my machine three nginx images appear to total
  705.5MB while the disk holds 426.7MB - the 278.8MB gap is one Debian base
  shared by two of them. `docker system df -v` splits it into SHARED and UNIQUE,
  and RECLAIMABLE is the sum of the UNIQUE column, because shared layers cannot
  be freed while another image needs them.
- **One tag is many images.** `nginx:1.27` is a *manifest list* indexing amd64,
  arm64, s390x and others; Docker picks by host architecture, which is why the
  same command works on a laptop and an ARM server. The `unknown/unknown`
  entries in it are attestation manifests, not broken platforms.
- **Why `EXPOSE` publishes nothing.** It is metadata. `-p host:container` is what
  creates the mapping.
- **Why only host ports must be unique.** Each container has its own network
  namespace, so any number of containers can listen on port 80 internally; the
  collision (`port is already allocated`) is always on the host side of `-p`.
- **What a container's exit code is telling me.** 126 found-but-not-executable,
  127 not-found, 137 SIGKILL (check `.State.OOMKilled` before blaming a human),
  143 SIGTERM. The `128 + N` rule applies only when a process is *terminated by*
  a signal - one that handles it and shuts down cleanly exits 0. Verified this by
  finding that `docker stop` on nginx returns 0, because the image sets
  `STOPSIGNAL=SIGQUIT` and nginx exits gracefully.
- **Why changing configuration means replacing the container.** A container's
  environment is fixed at creation; `docker exec -e` affects only that exec
  process. `docker update` is the narrow exception - it changes restart policy
  and resource limits on a live container, never environment, ports or mounts.
- **`always` versus `unless-stopped`.** Both restart on crash and on daemon
  startup. They differ in one case only: a container stopped by hand. `always`
  overrides that decision on the next daemon restart, `unless-stopped` respects
  it - which makes it the sensible default for a service.
- **Restart backoff has a real ceiling.** The delay before each retry doubles,
  but caps at roughly 60 seconds - confirmed by streaming `docker events` on an
  unlimited `on-failure` container for nearly an hour and watching the
  start-die cycle hold at a steady ~60s the entire time. The doubling itself
  finishes in about ten attempts, too fast to see by polling every few seconds.
- **Why environment variables are not secrets.** The value lands in
  `.Config.Env`, readable by `docker inspect`, `docker exec env`, and
  `/proc/1/environ`. `--env-file` keeps it out of shell history and the host
  process list, but does not hide it from anyone in the `docker` group.
- **Why a slow `docker stop` can happen even with exec-form `CMD`.** A process
  at PID 1 inside a container does not get normal signal defaults - an
  unhandled `SIGTERM` is *ignored*, not fatal, unlike everywhere else. Built the
  same app as `CMD ["python","app.py"]` and `CMD python app.py`; both took the
  full ~10s grace period and were force-killed (exit 137), because neither
  Python nor `sh` had a handler and PID 1 status made the signal a no-op either
  way. `docker run --init` fixed it - `tini` becomes PID 1, actually handles
  `SIGTERM`, and forwards it to Python, now a normal child: stop dropped to
  0.4s with exit 143 (properly signal-terminated) instead of 137.
- **Why `.dockerignore` can look like it does nothing.** Modern BuildKit only
  transfers files a `COPY`/`ADD` instruction actually names, so a narrow
  `COPY app.py .` skipped a 50MB test file with or without `.dockerignore` -
  28B transferred either way. Rebuilding with `COPY . .` isolated the real
  effect: 52.44MB without the ignore file, 254B with it. The file matters most
  exactly when `COPY` is broad, and should never be skipped just because
  today's `COPY` happens to be narrow.
- **Why the `docker` group matters.** The daemon socket is `root:docker` mode
  `srw-rw----`, so group membership - not sudo - is what grants access, and it
  is effectively root-equivalent on the host.

---

## Layout

```text
.
├── cheatsheets/          Reference notes written while learning
│   ├── docker-from-scratch.md        Concepts, mental models, debugging flow
│   ├── docker-complete-cheatsheet.md Practical daily reference, 23 sections
│   ├── docker-commands.md            Exhaustive command reference, 41 sections
│   └── docker-cheatsheet.md          Print-friendly one-page summary
├── daily-summary/        Long-form notes, one file per day
│   ├── day-00-environment-setup.md   Engine, daemon, socket permissions
│   ├── day-01-containers.md          Lifecycle, ports, exit codes, signals
│   ├── day-02-env-and-restart.md     Runtime config, restart policies
│   ├── day-03-images-tags-digests.md Tags, digests, layers, manifest lists
│   ├── day-04-first-dockerfile.md    PID 1 signals, build context, layers
│   └── day-05 ... day-14             Prepared: plan, commands, drill
├── examples/
│   ├── first-stack/      Minimal correct Compose stack (nginx + Postgres)
│   └── day-04-hello-app/ First Dockerfile - PID 1 signal handling, --init
├── projects/             Three builds of increasing difficulty
│   ├── 01-node-postgres/     Compose, service DNS, volumes, healthchecks
│   ├── 02-python-redis/      Non-root, caching, resource limits
│   └── 03-react-multistage/  Multi-stage builds and image size reduction
├── .github/workflows/    CI: hadolint, Compose validation, image builds
├── CLAUDE.md             Project context for Claude Code sessions
└── JOURNAL.md            What I built, what broke, what I learned
```

---

## Quick start

```bash
git clone https://github.com/sagarsaitwal/docker-labs.git
cd docker-labs

docker compose -f examples/first-stack/compose.yaml up -d
curl localhost:8080
docker compose -f examples/first-stack/compose.yaml down -v
```

Every project folder has its own README with a brief and acceptance criteria.

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push:

| Job | What it checks |
|---|---|
| **Lint Dockerfiles** | `hadolint` on every `Dockerfile` in the repo |
| **Validate Compose files** | `docker compose config` renders each file, catching syntax and interpolation errors before runtime |
| **Build images** | Builds every Dockerfile against its own directory |

All three jobs discover their inputs rather than hardcoding paths, so the
pipeline covers new work automatically as it is added.

---

## References

- [Docker documentation](https://docs.docker.com/)
- [hadolint rules](https://github.com/hadolint/hadolint#rules)
- [Compose file specification](https://docs.docker.com/reference/compose-file/)

## License

[MIT](LICENSE)
