# Project 03 — Multi-stage build for a front-end

**Goal:** prove you understand why production images should not contain build
tools. This is the project that visibly demonstrates skill.

Target: after Day 12 of the plan.

## Requirements

1. Any front-end that has a build step (React, Vite, Svelte — a scaffolded
   starter app is fine; the app itself is not the point)
2. A **single** `Dockerfile` with two stages:
   - **Stage 1 (`build`)**: `node:20-alpine`, install deps, run the production build
   - **Stage 2 (runtime)**: `nginx:1.27-alpine`, `COPY --from=build` only the
     compiled output. No Node, no npm, no source code, no `node_modules`.
3. Serve on port 80, published to 8080 on the host

## Acceptance criteria

- [ ] `docker build --target build -t app:build .` and the full build both work
- [ ] `docker image ls` shows the final image is **at least 70% smaller** than
      the build stage — record both numbers in the JOURNAL
- [ ] `docker run --rm -it --entrypoint sh app:prod` then `which node` → **not found**
      (proof the toolchain didn't ship)
- [ ] `docker image history app:prod` — you can explain what each layer is
- [ ] Changing one source file rebuilds without re-running `npm install`
- [ ] CI passes

## Why this one matters on a CV

Anyone can run `docker run nginx`. A correct multi-stage build shows you
understand image layers, build-time versus runtime, and attack surface. The
size numbers make it concrete and verifiable — put them in the README of this
folder when you're done.
