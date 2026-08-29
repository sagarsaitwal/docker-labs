# Day 6 — Named volumes and data persistence

**Date:** ____
**Goal:** Make data outlive the container. This is the fix for Day 1's
disappearing edit.
**Status:** Not started

---

## Plan

1. Create a named volume and mount it into a database.
2. Destroy and recreate the container; confirm the data survives.
3. Destroy the volume; confirm the data does not.

## Commands to practise

```bash
docker volume create pgdata
docker volume ls
docker volume inspect pgdata

docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres:17-alpine

docker exec -it db psql -U postgres -c 'CREATE TABLE demo(id int);'
docker rm -f db
# recreate with the same -v and check the table is still there

docker inspect -f '{{json .Mounts}}' db
docker volume rm pgdata          # destructive
docker volume prune              # destructive
```

## Drill

- Write a row, `rm -f` the container, recreate, read the row back.
- Then `docker volume rm` and repeat — be able to explain exactly what was lost
  and why.
- Deliberately typo the volume name and observe that Docker silently creates a
  new empty volume rather than erroring.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
