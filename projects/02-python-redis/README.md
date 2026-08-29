# Project 02 — Python API + Redis

**Goal:** a cache-backed API that demonstrates you can make a container
production-shaped, not just runnable.

Target: after Day 11 of the plan.

## Requirements

1. A Flask/FastAPI service with:
   - `GET /health`
   - `GET /count` → increments and returns a counter stored in Redis
2. A `Dockerfile` that:
   - uses `python:3.12-slim`, pinned
   - copies `requirements.txt` and installs **before** copying the source
   - uses `pip install --no-cache-dir`
   - creates and switches to a non-root user with `USER`
   - sets `PYTHONUNBUFFERED=1` so logs actually reach `docker logs`
3. A `compose.yaml` with `api` + `redis:7-alpine`, a named volume for Redis
   persistence, and `restart: unless-stopped` on both
4. A `.dockerignore` excluding `__pycache__`, `.venv`, `.git`, `.env`

## Acceptance criteria

- [ ] `curl localhost:5000/count` increments on every call
- [ ] `docker compose restart redis` → the count survives (persistence works)
- [ ] `docker logs` shows output **immediately**, not buffered until exit
- [ ] `docker compose exec api whoami` is not `root`
- [ ] `docker stats --no-stream` — you can state the memory footprint of each service
- [ ] You set a memory limit and observed what happens when it's exceeded
      (hint: exit code 137)
- [ ] CI passes

## Stretch

- Add `deploy.resources.limits` (memory/CPU) in Compose and explain the effect.
- Compare `python:3.12-slim` against `python:3.12-alpine`: build time, final
  image size, and any C-extension pain you hit. Write the result in the JOURNAL —
  "I measured it" is a much stronger claim than "I read that alpine is smaller".
