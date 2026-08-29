<h1 align="center">docker-labs</h1>

<p align="center">
  Learning Docker properly â€” from first container to production-shaped images.<br>
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
hand, every stack was run locally, and every failure is recorded in
[`JOURNAL.md`](JOURNAL.md) with its root cause.

Continuous integration lints and builds every image on each push, so the badge
above reflects the real state of the code rather than a claim about it.

**Environment:** Docker Engine 29.7.2 + Compose v5.5.0 on Fedora Linux 44 under
WSL2 â€” a standard Linux daemon and socket, not Docker Desktop.

---

## Progress

| Day | Topic | Status | Evidence |
|:--:|---|:--:|---|
| 0 | Engine install, daemon, socket permissions | âœ… | [journal](JOURNAL.md#day-0--environment-setup-fedora-44-on-wsl2) |
| 1 | Containers: `run`, `ps`, `logs`, `exec`, `rm` | âœ… | [journal](JOURNAL.md#day-1--containers-run-inspect-exec-destroy) |
| 2 | Environment variables, `--rm`, restart policies | â¬œ | |
| 3 | Images, tags, digests, registries | â¬œ | |
| 4 | Writing a first Dockerfile | â¬œ | |
| 5 | Layer caching and `.dockerignore` | â¬œ | |
| 6 | Named volumes and data persistence | â¬œ | |
| 7 | Bind mounts and live-reload development | â¬œ | |
| 8 | Networks and container DNS | â¬œ | |
| 9 | Docker Compose | â¬œ | [example](examples/first-stack/) |
| 10 | Multi-service stack with healthchecks | â¬œ | [project 01](projects/01-node-postgres/) |
| 11 | Debugging: exit codes, logs, `inspect` | â¬œ | |
| 12 | Multi-stage builds and image size | â¬œ | [project 03](projects/03-react-multistage/) |
| 13 | Publishing to a registry | â¬œ | |
| 14 | Production hardening: non-root, limits, scanning | â¬œ | |

---

## What I can explain, not just run

Updated as I go â€” each line is something I have demonstrated in this repo.

- **Why a container is not a VM.** My host is Fedora; `cat /etc/os-release`
  inside an `nginx` container reports Debian. The image ships its own userland
  and shares the host kernel.
- **Why an edit inside a running container disappears.** It lands in the
  container's thin writable layer, which is destroyed by `docker rm`. Persistence
  requires a volume or a bind mount.
- **Tag versus digest.** `nginx:1.27` is a movable label; `sha256:6784fb08â€¦` is
  the immutable identity. Only one of the two makes a deployment reproducible.
- **Why `EXPOSE` publishes nothing.** It is metadata. `-p host:container` is what
  creates the mapping.
- **Why the `docker` group matters.** The daemon socket is `root:docker` mode
  `srw-rw----`, so group membership â€” not sudo â€” is what grants access, and it
  is effectively root-equivalent on the host.

---

## Layout

```text
.
â”œâ”€â”€ cheatsheets/          Reference notes written while learning
â”‚   â”œâ”€â”€ docker-from-scratch.md        Concepts, mental models, debugging flow
â”‚   â””â”€â”€ docker-complete-cheatsheet.md Full command reference
â”œâ”€â”€ examples/
â”‚   â””â”€â”€ first-stack/      Minimal correct Compose stack (nginx + Postgres)
â”œâ”€â”€ projects/             Three builds of increasing difficulty
â”‚   â”œâ”€â”€ 01-node-postgres/     Compose, service DNS, volumes, healthchecks
â”‚   â”œâ”€â”€ 02-python-redis/      Non-root, caching, resource limits
â”‚   â””â”€â”€ 03-react-multistage/  Multi-stage builds and image size reduction
â”œâ”€â”€ .github/workflows/    CI: hadolint, Compose validation, image builds
â””â”€â”€ JOURNAL.md            What I built, what broke, what I learned
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
| **Validate Compose files** | `docker compose config` renders each file â€” catches syntax and interpolation errors before runtime |
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
