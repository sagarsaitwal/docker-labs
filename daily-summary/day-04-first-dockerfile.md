# Day 4 — Writing a first Dockerfile

**Date:** 4 Sep 2026
**Goal:** Build your own image instead of only consuming other people's.
**Outcome:** Complete. The headline result was not what the lesson plan
predicted - both `CMD` forms failed to respond to `SIGTERM` for the same
underlying reason (PID 1 signal semantics), and `.dockerignore` initially
looked like it did nothing until the real variable (a broad `COPY`) was
isolated. Both findings were chased down empirically rather than accepted at
face value.

---

## 1. What we did

### Block A — minimal app and first Dockerfile

```bash
mkdir -p ~/docker-lab/day4 && cd ~/docker-lab/day4
```

`app.py` - a one-file HTTP server, no dependencies:

```python
import http.server
import socketserver

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Hello from my own image\n")

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"serving on {PORT}")
    httpd.serve_forever()
```

`Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
EXPOSE 8080
CMD ["python", "app.py"]
```

```bash
docker build -t day4-app:1.0 .
docker image history day4-app:1.0
```

Predicted which instructions create a layer versus pure metadata, then
confirmed against the real output - see section 2, Q1.

```bash
docker run -d --name day4 -p 8080:8080 day4-app:1.0
curl localhost:8080
docker logs day4
```

### Block B — build context and `.dockerignore`

```bash
dd if=/dev/zero of=bigfile.bin bs=1M count=50
echo 'bigfile.bin' > .dockerignore
```

First attempt compared context size with `COPY app.py .` (the actual
Dockerfile) before and after removing `.dockerignore` - both came back **28B**,
no difference. That contradicted the expectation, so the variable was
isolated - see section 3.1 for the full investigation and the corrected
Dockerfile that proved the real effect.

### Block C — exec form vs shell form, and the PID 1 finding

```bash
cat > Dockerfile.exec <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
EXPOSE 8080
CMD ["python", "app.py"]
EOF

cat > Dockerfile.shell <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
EXPOSE 8080
CMD python app.py
EOF

docker build -f Dockerfile.exec  -t day4-app:exec  .
docker build -f Dockerfile.shell -t day4-app:shell .
```

Building the shell form produced a warning from BuildKit itself:

```text
JSONArgsRecommended: JSON arguments recommended for CMD to prevent unintended
behavior related to OS signals (line 5)
```

```bash
docker run -d --name d-exec  -p 8081:8080 day4-app:exec
docker run -d --name d-shell -p 8082:8080 day4-app:shell
docker ps
```

`docker ps` already showed the structural difference in the COMMAND column:

```text
d-exec    "python app.py"          <- python is PID 1 directly
d-shell   "/bin/sh -c 'python …"   <- wrapped in a shell
```

Confirmed both were serving (`curl localhost:8081`, `curl localhost:8082`),
then timed the stop - see section 2, Q2 and section 3.2 for the full result,
which was not what a naive reading of "exec form = fast" would predict.

### Block D — `EXPOSE` vs `-P`

```bash
docker run -d --name noexpose day4-app:1.0
curl localhost:8080          # fails - nothing published
docker exec noexpose python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8080').read())"
docker rm -f noexpose

docker run -d --name randport -P day4-app:1.0
docker port randport
curl localhost:$(docker port randport 8080/tcp | cut -d: -f2)
docker rm -f randport
```

---

## 2. Review questions and answers

**Q1. Which Dockerfile instructions create a layer, which are pure metadata?**

Predicted `FROM`/`WORKDIR`/`COPY` create layers, `EXPOSE`/`CMD` do not.
Confirmed against `docker image history day4-app:1.0`:

```text
CMD ["python" "app.py"]      0B    <- metadata only, no layer
EXPOSE [8080/tcp]             0B    <- metadata only, no layer
COPY app.py .              12.3kB   <- real layer
WORKDIR /app                8.19kB  <- real layer
```

Prediction confirmed exactly.

**Q2. Exec form vs shell form under `docker stop` - what actually happened?**

First run, without `--init`:

```text
d-exec   real 0m10.500s   exit 137 (SIGKILL)
d-shell  real 0m10.471s   exit 137 (SIGKILL)
```

**Both** took the full ~10 second grace period and were force-killed. The naive
prediction - "exec form makes Python PID 1, so SIGTERM reaches it directly and
it stops fast" - was wrong. Both forms failed identically. The real mechanism
is section 3.2 below.

**Q3. Why does `curl` from the host fail without `-p`/`-P`, while `docker exec`
succeeds?**

`EXPOSE` only documents a port; it publishes nothing. Without `-p`, no route
exists from the host into the container's network namespace, so `curl` from
the host gets nothing. `docker exec` runs *inside* that same namespace, so
`localhost:8080` there is the container's own loopback - it works regardless
of any publishing.

**Q4. What does `-P` actually do?**

Auto-publishes every `EXPOSE`d port to a random host port. Confirmed:
`docker port randport` showed container port 8080 mapped to a host port in the
ephemeral range (32768+), and `curl` against that random port succeeded.

**Drill - one-sentence differences, all confirmed correct:**

- `ARG` is available only at build time; `ENV` is stored in the image and
  available to containers at runtime.
- `COPY` copies files/directories as-is; `ADD` additionally extracts local tar
  archives and can fetch remote URLs.
- `ENTRYPOINT` is the main executable and normally cannot be replaced without
  `--entrypoint`; `CMD` supplies default arguments/command that `docker run`
  can override directly.

**Drill - the trailing `.` in `docker build -t x .`:**

It is the **build context**, not part of the image name - the directory whose
files are available to `COPY`/`ADD`. Proved by building from a different
working directory with an explicit context path:

```bash
cd ~/docker-lab
docker build -f day4/Dockerfile -t x day4
```

---

## 3. Additional findings (verified on this machine)

### 3.1 `.dockerignore` only matters when `COPY` would otherwise reach the file

First test - context size before and after removing `.dockerignore`, with the
actual Dockerfile (`COPY app.py .`):

```text
without .dockerignore:  #3 (ignore file) 2B    #4 (build context) 28B
with .dockerignore:     #3 (ignore file) 52B   #4 (build context) 28B
```

**No difference in the actual context transferred.** The 50MB `bigfile.bin`
was never sent, `.dockerignore` present or not. That contradicted the
expectation that removing `.dockerignore` would balloon the transfer to ~50MB.

Root cause: modern BuildKit (the default builder, Docker 23+) does not
necessarily tar the entire build directory the way the legacy builder did. It
can transfer only the files a `COPY`/`ADD` instruction actually names. Since
`COPY app.py .` never references `bigfile.bin`, BuildKit skipped it regardless
of `.dockerignore`.

Isolated the real variable by testing a Dockerfile with `COPY . .` instead:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
```

```text
COPY . .  without .dockerignore:  52.44MB transferred   (bigfile.bin included)
COPY . .  with .dockerignore:        254B transferred   (bigfile.bin excluded)
```

~200,000x difference - `.dockerignore` works exactly as expected once `COPY`
is actually broad enough to reach the excluded file.

**The corrected lesson:** `.dockerignore` matters most with a broad `COPY .
.`. A narrow, explicit `COPY` may already exclude everything unnamed under
BuildKit - but that is an optimization detail, not a guarantee, and it should
never be relied on as a substitute for `.dockerignore`. A later change from
`COPY app.py .` to `COPY . .` would silently reintroduce anything sitting in
that directory, `.env` files included.

### 3.2 PID 1 inside a container does not get normal signal defaults

The core finding of the day. Outside a container, an unhandled `SIGTERM`
terminates a process by default. **A process running as PID 1 inside a Linux
namespace is special-cased**: any signal it has not explicitly registered a
handler for is *ignored* instead of applying the normal default action - the
only exceptions are `SIGKILL` and `SIGSTOP`, which can never be blocked.

`app.py` never calls `signal.signal(SIGTERM, ...)`. Consequence:

- `d-exec`: Python **is** PID 1. Unhandled `SIGTERM`, as PID 1, means ignored.
  The process kept running.
- `d-shell`: `sh` is PID 1, also has no handler, also ignores it - and even if
  it didn't, shell form does not forward the signal to the child by default.

Either way nothing reacted, Docker waited out the grace period, then sent
`SIGKILL` (unblockable), and everything died at once: exit 137 for both.

**Verified the fix, not just the diagnosis** - re-ran the exec-form image with
`docker run --init`:

```bash
docker run -d --init --name d-exec-init -p 8083:8080 day4-app:exec
time docker stop d-exec-init
docker inspect -f '{{.State.ExitCode}}' d-exec-init
```

```text
without --init:  real 0m10.500s   exit 137 (SIGKILL)
with --init:     real 0m0.427s    exit 143 (SIGTERM, = 128 + 15)
```

`--init` inserts `tini` as PID 1. `tini` has a real `SIGTERM` handler and
forwards the signal to Python. Python still has no handler of its own, but it
is no longer PID 1 - so the ordinary default (terminate on unhandled SIGTERM)
applies to it as a child process. 25x faster stop, and the exit code itself
changed character: force-killed (137) versus properly signal-terminated (143).

This is the documented reason production images run an init process
(`tini`/`dumb-init`, or `docker run --init`) rather than the application
directly as PID 1 - not a style preference. It is also what the KodeKloud
`result/Dockerfile` referenced in `CLAUDE.md` section 9 does, previewing this
same mechanism.

### 3.3 A startup race, correctly diagnosed and ruled out

```bash
docker run -d --init --name probe -p 8084:8080 day4-app:exec
curl localhost:8084
# curl: (56) Recv failure: Connection reset by peer
```

`curl` ran within milliseconds of `docker run -d` returning, before Python had
finished importing `http.server` and binding the socket. Retested with a
one-second pause and it succeeded:

```bash
docker run -d --init --name probe -p 8084:8080 day4-app:exec
sleep 1
curl localhost:8084   # Hello from my own image
```

Confirmed as a startup race, not a defect in `--init` or the image itself.

### 3.4 hadolint passed clean on the shipped Dockerfile

```bash
docker run --rm -v "$PWD:/work" -w /work hadolint/hadolint:2.12.0-alpine hadolint examples/day-04-hello-app/Dockerfile
# exit=0, no output
```

Run against the exec-form Dockerfile before committing - the shell-form
variant is the one that triggered `JSONArgsRecommended` during Block C.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Layer vs metadata | `FROM`, `WORKDIR`, `COPY`, `RUN` write layers with real size. `EXPOSE`, `CMD`, `ENTRYPOINT`, `LABEL` are 0B metadata entries. |
| Build context | Everything under the build path is a *candidate* for transfer, whether or not the Dockerfile ever uses it. |
| BuildKit is selective | Unlike the legacy builder, BuildKit can transfer only the files a `COPY`/`ADD` actually names - `.dockerignore`'s visible effect depends on how broad those instructions are. |
| PID 1 signal semantics | A process at PID 1 in a container does not get normal default signal handling. Unhandled signals (other than SIGKILL/SIGSTOP) are ignored, not fatal. |
| Exec vs shell form | Exec form (`["cmd","arg"]`) makes the app PID 1 directly. Shell form (`cmd arg`) inserts `/bin/sh -c` as PID 1 instead. Neither fixes the PID-1-ignores-signals problem by itself. |
| `--init` / tini | Installs a minimal real init process as PID 1, which has proper signal handling and forwards signals to the real app - now safely a non-PID-1 child. |
| Exit code as diagnosis | 137 (SIGKILL, forced) vs 143 (SIGTERM, handled) tells you whether a container shut down cleanly or was given up on. |
| `EXPOSE` | Metadata only. Publishing requires `-p` (explicit mapping) or `-P` (auto-map every EXPOSEd port to a random host port). |
| hadolint catches this | `JSONArgsRecommended` flags shell-form `CMD` specifically because of its signal-handling implications - not a style nag. |

---

## 5. Keep in mind

- **Always use exec-form `CMD`/`ENTRYPOINT`** (`["cmd", "arg"]`), and still run
  with `--init` (or build `tini` into the image) for anything long-running.
  Exec form alone does not fix PID 1 signal semantics - it only avoids adding
  an unnecessary shell layer on top of the same underlying problem.
- **A slow `docker stop` (~10s, exit 137) on a container you expected to exit
  fast is a signal-handling bug, not normal behavior.** Check what's PID 1 with
  `docker top`, and check whether it or an init process actually handles
  `SIGTERM`.
- **Don't trust "no visible difference" from a build-context experiment without
  checking what `COPY` actually names.** BuildKit's laziness can mask a
  `.dockerignore` problem that would still bite with a broader `COPY`.
- **`.dockerignore` is not optional just because today's `COPY` is narrow.**
  Future edits widen `COPY` far more often than they narrow it.
- **`EXPOSE` documents, `-p`/`-P` publishes.** Confirmed hands-on, not just
  read: `docker exec` reaches an unpublished port because it's inside the same
  network namespace; the host is not.
- **hadolint's `JSONArgsRecommended` warning is worth fixing, not suppressing** -
  it is catching a real, demonstrated signal-handling defect.

---

## 6. Commands used

```bash
# Build and inspect layers
docker build -t day4-app:1.0 .
docker image history day4-app:1.0

# Build context experiments
docker build -t x --progress=plain . 2>&1 | grep -i transferring
mv .dockerignore .dockerignore.bak   # temporarily disable to compare

# Exec vs shell form
docker build -f Dockerfile.exec  -t day4-app:exec  .
docker build -f Dockerfile.shell -t day4-app:shell .
docker top <container>
time docker stop <container>
docker inspect -f '{{.State.ExitCode}}' <container>

# The fix
docker run -d --init --name <c> <image>

# EXPOSE vs publishing
docker run -d -P <image>
docker port <container>

# Preflight before committing
docker run --rm -v "$PWD:/work" -w /work hadolint/hadolint:2.12.0-alpine hadolint <path/to/Dockerfile>
```

---

## 7. State at end of day

```text
Repo change : examples/day-04-hello-app/ added (app.py, Dockerfile, README.md)
              - first Dockerfile this repository has ever contained
hadolint    : clean, exit 0
Local images: cleaned up (day4-app:1.0/exec/shell/copyall removed)
Next        : Day 5 - layer caching and .dockerignore ordering
```
