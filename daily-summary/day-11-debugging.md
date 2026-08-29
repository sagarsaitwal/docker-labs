# Day 11 — Debugging: exit codes, logs, inspect

**Date:** ____
**Goal:** Diagnose a broken container without guessing.
**Status:** Not started

---

## The flow

```text
docker ps -a  ->  docker logs  ->  docker inspect  ->  --entrypoint sh
```

## Exit codes worth memorising

```text
0    process finished normally (your CMD was not a long-running server)
1    the application crashed
125  the docker command itself was wrong
126  command found but not executable (chmod / CRLF line endings)
127  command NOT FOUND (typo, or absent from a slim image)
137  SIGKILL - usually OUT OF MEMORY
143  SIGTERM - a normal docker stop
```

## Commands to practise

```bash
docker ps -a
docker logs --tail 100 -t <c>
docker inspect <c> --format 'Status={{.State.Status}} Exit={{.State.ExitCode}} Err={{.State.Error}}'
docker inspect -f '{{.RestartCount}}' <c>
docker inspect -f '{{json .Mounts}}' <c>
docker inspect -f '{{json .Config.Env}}' <c>
docker diff <c>
docker events
docker run --rm -it --entrypoint sh <image>
```

## Drill

Break your Day 10 stack three ways on purpose and diagnose each using only the
flow above:

1. Wrong database password
2. App bound to `127.0.0.1` instead of `0.0.0.0`
3. A typo in `CMD`

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
