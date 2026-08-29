# Day 3 — Images, tags, digests, registries

**Date:** ____
**Goal:** Understand what an image actually is and how to refer to one precisely.
**Status:** Not started

---

## Plan

1. Read image naming as `registry/namespace/name:tag`.
2. See the difference between a tag and a digest.
3. Inspect layers and understand what created each one.

## Commands to practise

```bash
docker pull nginx:1.27
docker pull nginx:1.27-alpine
docker image ls

docker image inspect nginx:1.27 --format '{{.Os}}/{{.Architecture}}'
docker image inspect nginx:1.27 --format '{{json .Config.Cmd}}'
docker image inspect nginx:1.27 --format '{{index .RepoDigests 0}}'
docker image history nginx:1.27

docker image save -o nginx.tar nginx:1.27
docker image load -i nginx.tar

docker image rm nginx:1.27-alpine
docker image prune
```

## Drill

- Compare `nginx:1.27` and `nginx:1.27-alpine`: size, layer count, base OS.
  Write down the numbers.
- Pull an image **by digest** and explain why that is safer for production.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
