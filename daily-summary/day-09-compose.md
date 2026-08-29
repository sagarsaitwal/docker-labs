# Day 9 — Docker Compose

**Date:** ____
**Goal:** Replace a pile of `docker run` flags with one declarative file.
**Status:** Not started

---

## Plan

1. Convert Day 8's two containers into a `compose.yaml`.
2. Learn the lifecycle: `up`, `ps`, `logs`, `exec`, `down`, `down -v`.
3. Understand that Compose creates the network for you.

## Reference

See `examples/first-stack/compose.yaml` in the repo - every line is commented.

## Commands to practise

```bash
docker compose up -d
docker compose up -d --build
docker compose ps
docker compose logs -f api
docker compose exec api sh
docker compose run --rm api <one-off command>
docker compose config             # render the merged file
docker compose down               # containers + network
docker compose down -v            # ALSO deletes volumes
```

## Drill

- Convert Day 8 into Compose and bring it up with one command.
- Break an env var deliberately and find it with `docker compose config`.
- Explain the difference between `down` and `down -v` in one sentence.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
