# Day 12 — Multi-stage builds and image size

**Date:** ____
**Goal:** Ship a production image that contains no build tools.
**Status:** Not started

**Brief:** `projects/03-react-multistage/README.md`

---

## Plan

1. Split the Dockerfile into a build stage and a runtime stage.
2. `COPY --from=build` only the compiled output.
3. Measure the size difference and record the numbers.

## Pattern

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Commands to practise

```bash
docker build --target build -t app:build .
docker build -t app:prod .
docker image ls | grep app
docker run --rm -it --entrypoint sh app:prod
  # which node   -> should be NOT FOUND
docker image history app:prod
```

## Drill

- Record both image sizes; aim for at least a 70% reduction.
- Prove the toolchain is absent from the final image.
- Explain why this matters for security, not just for disk space.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
