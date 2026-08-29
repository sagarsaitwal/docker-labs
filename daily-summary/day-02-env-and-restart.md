# Day 2 — Environment variables, --rm, restart policies

**Date:** ____
**Goal:** Configure a container from outside the image, and control what happens
when it dies.
**Status:** Not started

---

## Plan

1. Pass config in with `-e` and `--env-file` instead of baking it into an image.
2. Understand why `--rm` keeps a learning machine clean.
3. Learn the four restart policies and when each applies.

## Commands to practise

```bash
docker run --rm -e GREETING=hello alpine printenv GREETING
docker run --rm -e A=1 -e B=2 alpine env

printf 'APP_ENV=dev\nPORT=3000\n' > .env
docker run --rm --env-file .env alpine env

docker run -d --name pg -e POSTGRES_PASSWORD=secret postgres:17-alpine
docker inspect -f '{{json .Config.Env}}' pg

docker run -d --restart unless-stopped --name web nginx:1.27
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web
```

Policies: `no` (default), `on-failure[:N]`, `always`, `unless-stopped`.

## Drill

- Start a container that deliberately exits with code 1 and `--restart on-failure:3`.
  Watch `docker inspect -f '{{.RestartCount}}'` climb, then stop.
- Explain the difference between `always` and `unless-stopped` after a daemon restart.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
