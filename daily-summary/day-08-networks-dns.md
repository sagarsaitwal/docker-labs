# Day 8 — Networks and container DNS

**Date:** ____
**Goal:** Make two containers talk to each other by name.
**Status:** Not started

---

## Plan

1. Separate the two problems: host -> container (`-p`) and container -> container
   (a user-defined network).
2. Create a network and prove name resolution works on it.
3. Prove it does NOT work on the default bridge.

## Commands to practise

```bash
docker network create app-net
docker network ls
docker network inspect app-net

docker run -d --name db  --network app-net postgres:17-alpine
docker run -d --name api --network app-net -p 8080:8080 myapi:1.0

docker exec api getent hosts db
docker exec api curl -v http://db:5432

docker network connect app-net web
docker network disconnect app-net web
docker network prune
```

## Drill

- Run two containers on `app-net`; ping one from the other by name.
- Repeat without `--network` (default bridge) and observe the name failing.
- Explain why `localhost:5432` inside the API container does not reach the DB.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
