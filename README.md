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
| 2 | Environment variables, `--rm`, restart policies | Not started | |
| 3 | Images, tags, digests, registries | Not started | |
| 4 | Writing a first Dockerfile | Not started | |
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
- **Why the `docker` group matters.** The daemon socket is `root:docker` mode
  `srw-rw----`, so group membership - not sudo - is what grants access, and it
  is effectively root-equivalent on the host.

---

## Layout

```text
.
├── cheatsheets/          Reference notes written while learning
│   ├── docker-from-scratch.md        Concepts, mental models, debugging flow
│   └── docker-complete-cheatsheet.md Full command reference
├── daily-summary/        Long-form notes, one file per day
│   ├── day-00-environment-setup.md   Engine, daemon, socket permissions
│   ├── day-01-containers.md          Lifecycle, ports, exit codes, signals
│   └── day-02 ... day-14             Prepared: plan, commands, drill
├── examples/
│   └── first-stack/      Minimal correct Compose stack (nginx + Postgres)
├── projects/             Three builds of increasing difficulty
│   ├── 01-node-postgres/     Compose, service DNS, volumes, healthchecks
│   ├── 02-python-redis/      Non-root, caching, resource limits
│   └── 03-react-multistage/  Multi-stage builds and image size reduction
├── .github/workflows/    CI: hadolint, Compose validation, image builds
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
