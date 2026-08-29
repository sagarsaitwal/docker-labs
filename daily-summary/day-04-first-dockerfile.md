# Day 4 — Writing a first Dockerfile

**Date:** ____
**Goal:** Build your own image instead of only consuming other people's.
**Status:** Not started

---

## Plan

1. Write a minimal app and a Dockerfile for it.
2. Understand build time vs run time for every instruction.
3. Learn what the trailing `.` in `docker build -t x .` actually means.

## Starting point

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
USER 10001
CMD ["python", "app.py"]
```

## Commands to practise

```bash
docker build -t myapp:1.0 .
docker build -f Dockerfile.dev -t myapp:dev .
docker build --progress=plain -t myapp:1.0 .
docker run --rm myapp:1.0
docker image history myapp:1.0
docker run --rm -it --entrypoint sh myapp:1.0
```

## Drill

- Containerise a 5-line script of your own and run it.
- Change `CMD` to the exec form and the shell form; observe how signals and
  `docker stop` behave differently.
- Explain what `EXPOSE 8080` does and does not do.

---

## What I did

## Mistakes made

## What I learned

## Keep in mind
