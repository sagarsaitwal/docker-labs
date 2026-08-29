# Day 14 — Production hardening

**Date:** ____
**Goal:** Turn a working image into one you would actually deploy.
**Status:** Not started

---

## Checklist to apply to your own image

- [ ] Pinned base image tag, ideally a digest
- [ ] Non-root `USER`
- [ ] No secrets in `ENV`, `ARG`, or any layer
- [ ] `HEALTHCHECK` defined
- [ ] `.dockerignore` present
- [ ] Multi-stage build; no compilers in the final image
- [ ] Logs to stdout/stderr
- [ ] Explicit restart policy
- [ ] Memory and CPU limits set
- [ ] Image scanned for CVEs

## Commands to practise

```bash
docker run -d --name app \
  --restart unless-stopped \
  -m 512m --cpus 1.5 \
  -u 10001 \
  myapp:1.0

docker inspect -f '{{.Config.User}}' app
docker inspect -f '{{.HostConfig.Memory}}' app
docker stats --no-stream app

docker scout quickview myapp:1.0
docker scout cves myapp:1.0
```

## Drill

- Set a memory limit deliberately too low and observe exit code 137.
- Run `whoami` inside and confirm it is not root.
- Fix one real CVE that the scan reports, by moving to a newer base image.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
