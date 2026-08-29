# Day 7 — Bind mounts and live-reload development

**Date:** ____
**Goal:** Edit code on the host and see it change inside a running container.
**Status:** Not started

---

## Plan

1. Mount a host directory into a container.
2. Set up a dev loop where saving a file restarts the app.
3. Learn where bind mounts differ from named volumes.

## Commands to practise

```bash
docker run --rm -it -p 3000:3000 \
  -v "$PWD":/app -w /app node:20-alpine npm run dev

docker run -d -v "$PWD/config":/etc/myapp:ro myapp:1.0

docker run -it --mount type=bind,source="$PWD",target=/app ubuntu bash
```

Disambiguation rule: if the left side of `-v` contains a `/`, it is a host path
(bind mount). Otherwise it is a named volume.

## WSL note

Keep the project in the Linux filesystem (`~/...`), not `/mnt/d/...`. Files under
`/mnt` cross the Windows boundary and bind mounts there are slow.

## Drill

- Live-reload a small Node or Flask app from the host.
- Mount a config file read-only and prove the container cannot write to it.
- Compare `ls -l` inside vs outside; explain any UID mismatch.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
