# Day 10 — Multi-service stack with healthchecks

**Date:** ____
**Goal:** Build project 01 (Node/Python API + Postgres) properly.
**Status:** Not started - paused before any hands-on work began.

**Brief:** `projects/01-node-postgres/README.md` - work to its acceptance criteria.

**Progress note (11 Sep 2026):** the concept walkthrough was given - the
healthcheck block field by field (`test`/`interval`/`timeout`/`retries`/
`start_period`, and why `pg_isready` via `CMD-SHELL`), `depends_on:
condition: service_healthy` as the actual fix for Day 9's startup race, and
why the app still needs its own connection retry logic even with a
healthcheck in place (it only gates the *initial* start order, not what
happens if `db` restarts later while `api` is already connected).
`examples/first-stack/compose.yaml` was pointed to as the reference pattern
to study, not copy. No commands have been run and no files in
`projects/01-node-postgres/` have been touched yet - resume there.

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
