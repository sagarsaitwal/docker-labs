# Day 7 — Bind mounts and live-reload development

**Date:** 7 Sep 2026 (started)
**Goal:** Edit code on the host and see it change inside a running container.
**Status:** In progress - paused for a real-world reason, not a Docker one:
mobile data recharge expired mid-session, and Block A needs network (`pip
install flask` inside the container, possibly the base image pull too).
Nothing has been run yet - the concept walkthrough and Block A's task were
given, but no real output has been reported back, so nothing below is
confirmed hands-on yet.

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

## What I did (so far)

Covered conceptually, not yet run:

- The distinction from Day 6: a named volume is Docker-managed and opaque;
  a bind mount names an exact host path and gives the container the literal
  same files, no copy step - which is why it's the standard tool for a
  local dev loop.
- The disambiguation rule for `-v LEFT:RIGHT`: `LEFT` containing a `/` means
  a host path (bind mount), otherwise it's treated as a named volume name -
  same footgun shape as Day 6's silent-typo trap. `--mount
  type=bind,source=...,target=...` is the unambiguous but more verbose
  alternative.
- Block A task given: a one-route Flask app (`app.py`), run via
  `docker run --rm -it -p 5000:5000 -v "$PWD":/app -w /app python:3.12-slim
  sh -c "pip install flask -q && flask --app app run --host=0.0.0.0 --debug"`,
  then edit `app.py` on the host (no `docker` command at all) and curl again
  without restarting anything - to see whether the bind mount alone is
  enough, or whether `--debug`'s reloader is the piece actually making the
  running process notice the change.

**Blocked here:** internet connectivity dropped before this was run. Resume
by actually running Block A, reporting the real `curl` output before and
after the edit, and whether Flask's terminal printed anything on its own
when the file was saved.

## Mistakes made

## What I learned

## Keep in mind
