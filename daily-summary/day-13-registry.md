# Day 13 — Publishing to a registry

**Date:** ____
**Goal:** Push an image and pull it back somewhere else.
**Status:** Not started

---

## Plan

1. Log in to Docker Hub or GHCR.
2. Tag correctly: `registry/namespace/name:tag`.
3. Push, then pull by digest.

## Commands to practise

```bash
docker login
docker login ghcr.io

docker tag myapp:1.0 sagarsaitwal/myapp:1.0
docker push sagarsaitwal/myapp:1.0

docker image rm sagarsaitwal/myapp:1.0
docker pull sagarsaitwal/myapp:1.0

docker image inspect sagarsaitwal/myapp:1.0 --format '{{index .RepoDigests 0}}'
docker logout
```

## Drill

- Push one image under two tags (`1.0` and `latest`) and explain the risk of
  reusing `latest`.
- Pull by digest and confirm you get a byte-identical image.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
