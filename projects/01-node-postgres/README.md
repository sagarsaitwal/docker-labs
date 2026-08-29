# Project 01 — Node API + PostgreSQL

**Goal:** a two-service stack where an HTTP API reads and writes a real
database, started with a single `docker compose up -d`.

Target: after Day 9 of the plan.

## Requirements

1. A small Node (or any language) HTTP API with two endpoints:
   - `GET /health` → `200` with `{"status":"ok"}`
   - `GET /items` → rows from a `items` table in Postgres
2. A `Dockerfile` for the API that:
   - starts from a pinned, slim base image (e.g. `node:20-alpine`)
   - copies the dependency manifest **before** the source, so dependency
     installation stays cached when only source changes
   - runs as a **non-root** user
   - declares a `HEALTHCHECK`
3. A `compose.yaml` with:
   - the `api` service built from your Dockerfile
   - a `db` service using a pinned `postgres` image
   - a **named volume** for the database data
   - a `healthcheck` on `db`, and `depends_on: condition: service_healthy` on `api`
   - the database password supplied from the environment, never hardcoded
4. A `.dockerignore` that excludes `node_modules`, `.git`, and `.env`

## Acceptance criteria

Verify each of these yourself:

- [ ] `docker compose up -d` from a clean state brings both services up
- [ ] `curl localhost:3000/health` returns 200
- [ ] `docker compose exec api getent hosts db` resolves — the API reaches the
      database by **service name**, never by IP or `localhost`
- [ ] `docker compose down` then `up -d` → your data is still there
- [ ] `docker compose down -v` then `up -d` → your data is gone (you understand
      exactly why)
- [ ] `docker compose exec api whoami` does **not** print `root`
- [ ] Editing one source file and rebuilding does **not** re-run `npm install`
- [ ] `docker image ls` — your image is under 200 MB
- [ ] CI passes (hadolint + compose validation + build)

## Hints for where you'll get stuck

- The API must listen on `0.0.0.0`, not `127.0.0.1`, or the published port
  reaches nothing.
- `depends_on` does not wait for Postgres to accept connections unless you use
  `condition: service_healthy`. Your app still needs connection retry logic —
  a container can restart faster than a database can initialise.
- The connection host is `db` (the service name), and the port is the
  **container** port `5432`, regardless of anything you published to the host.
