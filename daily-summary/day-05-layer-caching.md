# Day 5 — Layer caching and .dockerignore

**Date:** ____
**Goal:** Make builds fast and images small by controlling the cache.
**Status:** Not started

---

## Plan

1. Understand that a cached layer is reused only if it AND everything before it
   is unchanged.
2. Order instructions from least-changing to most-changing.
3. Write a `.dockerignore` and measure the difference in build context size.

## The core comparison

```dockerfile
# SLOW - any source edit reinstalls dependencies
COPY . .
RUN npm install

# FAST - dependencies cached until the manifest changes
COPY package*.json ./
RUN npm install
COPY . .
```

## Commands to practise

```bash
time docker build -t app:1 .
time docker build -t app:1 .          # second build: mostly CACHED
docker build --no-cache -t app:1 .
docker build --pull -t app:1 .
docker builder prune
```

## Drill

- Build twice, edit one source file, build again. Record the three timings.
- Add `.dockerignore` with `node_modules`, `.git`, `.env`. Compare the
  "transferring context" size before and after.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
