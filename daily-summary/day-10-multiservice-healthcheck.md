# Day 10 — Multi-service stack with healthchecks

**Date:** ____
**Goal:** Build project 01 (Node/Python API + Postgres) properly.
**Status:** Not started

**Brief:** `projects/01-node-postgres/README.md` - work to its acceptance criteria.

---

## Plan

1. Add a `healthcheck` to the database service.
2. Use `depends_on: condition: service_healthy` on the API.
3. Understand why the app still needs retry logic anyway.

## Commands to practise

```bash
docker compose up -d
docker compose ps                 # look for (healthy)
docker inspect -f '{{json .State.Health}}' <container>
docker compose logs -f db
```

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
  interval: 5s
  timeout: 3s
  retries: 5
  start_period: 10s
```

## Drill

- Watch `docker compose ps` transition `starting` -> `healthy`.
- Remove the healthcheck and observe the API racing the database on startup.
- Confirm the API reaches the DB by service name, never by IP.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
