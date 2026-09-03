# Example: first Dockerfile

The Day 4 exercise - a minimal Python HTTP server, containerized from scratch.
This is the first Dockerfile this repository has ever contained, and the
commit that added it was the one that switched CI from a no-op to actually
running `hadolint` and a real build.

## Run it

```bash
docker build -t day4-hello-app .
docker run -d --init --name hello -p 8080:8080 day4-hello-app
curl localhost:8080
docker rm -f hello
```

## Why `--init`

`CMD ["python", "app.py"]` makes Python **PID 1** inside the container. `app.py`
never registers a `SIGTERM` handler, and a process running as PID 1 in a Linux
namespace does not get the normal default disposition for an unhandled signal
(terminate) - it gets ignored, except for `SIGKILL`/`SIGSTOP`. Without
`--init`, `docker stop` on this image waits out the full ~10 second grace
period and force-kills it (exit 137). With `--init`, a real init process
(`tini`) becomes PID 1, actually handles `SIGTERM`, and forwards it to Python -
now a normal child process, so it terminates immediately (exit 143).

Verified on this machine; the full writeup with timings is in
[`daily-summary/day-04-first-dockerfile.md`](../../daily-summary/day-04-first-dockerfile.md)
(local notes, not tracked in this repo).

## Why this Dockerfile looks the way it does

```dockerfile
FROM python:3.12-slim   # pinned, small base
WORKDIR /app             # everything after this is relative to /app
COPY app.py .             # only what's needed - not "COPY . ."
EXPOSE 8080               # documentation only - does not publish the port
CMD ["python", "app.py"]  # exec form: python becomes PID 1 directly
```

`CMD` uses exec form (`["python", "app.py"]`), not shell form (`python app.py`).
hadolint flags the shell form directly:
`JSONArgsRecommended: JSON arguments recommended for CMD to prevent unintended
behavior related to OS signals`.
