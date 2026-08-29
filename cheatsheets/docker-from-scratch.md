# Docker From Scratch — The Learning Cheat Sheet

> A **teaching** cheat sheet, not just a command dump.
> Read top to bottom once. Then use it as a reference forever.
>
> Companion file: `docker-complete-cheatsheet.md` (full command reference).
>
> Every command here is safe to run on your own machine. Commands marked ⚠️
> delete data — read the warning before running them.

---

## 0) Before you type anything: the 4 ideas

You only need four ideas to understand 90% of Docker.

| Idea | One-line definition | Real-world analogy |
|---|---|---|
| **Image** | A read-only, frozen filesystem + default startup command | A **recipe with prepped ingredients**, vacuum-sealed |
| **Container** | A running (or stopped) *instance* of an image, with a thin writable layer on top | The **cake you baked** from it |
| **Dockerfile** | A text file describing how to build an image | The **written recipe steps** |
| **Registry** | A server that stores and serves images | **Git remote**, but for images |

The single most important consequence:

```text
Images are immutable.        -> You never "edit" an image. You build a new one.
Containers are disposable.   -> Deleting one is normal. Losing its data is not.
Anything you want to keep    -> must live in a VOLUME or a BIND MOUNT.
```

If you internalise only that box, you will avoid the top three beginner disasters.

### The mental picture

```text
        Dockerfile                    Registry (Docker Hub / GHCR)
            |                                  ^        |
        docker build                     docker push  docker pull
            |                                  |        v
            v                                  |
        +---------+   docker run   +-----------------------+
        |  IMAGE  | -------------> |      CONTAINER        |
        | (frozen)|                | image layers (RO)     |
        +---------+   (many        | + writable layer (RW) | <- LOST on rm
                       containers  +-----------------------+
                       from one          |          |
                       image)         VOLUME     NETWORK
                                    (persists)   (talks to other
                                                  containers)
```

---

## 1) Your first 10 minutes

```bash
docker --version          # is the CLI installed?
docker info               # is the ENGINE actually running? (most important check)
docker run hello-world    # end-to-end smoke test: pull + create + start + exit
```

If `docker info` errors with "cannot connect to the Docker daemon", Docker Desktop
isn't running. Start it. The CLI and the engine are two separate things.

Now run something real:

```bash
docker run -d --name web -p 8080:80 nginx:1.27
```

Open <http://localhost:8080>. You just ran a web server without installing nginx.

Read that command as an English sentence:

```text
docker run    -d        --name web       -p 8080:80          nginx:1.27
   |          |            |                  |                  |
 create &  detached    call it "web"   host 8080 -> container 80  which image
 start                                                            (+ version!)
```

Then explore and clean up:

```bash
docker ps                 # it's running
docker logs web           # what did it print?
docker exec -it web sh    # get a shell INSIDE it (leave with: exit)
docker stop web           # graceful stop
docker rm web             # delete the container
```

**Drill:** do the same with `httpd:2.4` on port 8081 without looking.

---

## 2) The lifecycle — the state machine to memorise

```text
                 docker create
   [ image ] ---------------------> [ Created ]
       |                                 |
       |  docker run (= create + start)  | docker start
       |                                 v
       +-----------------------------> [ Running ]
                                        |   |   ^
                        docker pause    |   |   | docker start / restart
                                 v      |   |   |
                            [ Paused ]  |   |   |
                             (unpause)  |   |   |
                                        |   v   |
                       docker stop (SIGTERM, then SIGKILL after ~10s)
                       docker kill (SIGKILL immediately)
                                        |
                                        v
                                    [ Exited ] --- docker rm ---> gone
                                                                  (writable
                                                                   layer
                                                                   destroyed)
```

```bash
docker ps          # RUNNING only  <- the #1 beginner confusion
docker ps -a       # ALL, including Exited  <- where your "missing" container is
```

Key distinctions people get wrong for months:

```text
docker run    = NEW container from an image      (run twice = two containers)
docker start  = restart an EXISTING stopped one

docker exec   = run a command in an ALREADY RUNNING container
docker run    = create and start a brand-new container

docker stop   = ask nicely (SIGTERM), then force after a grace period
docker kill   = force immediately (SIGKILL)

docker rm     = remove a CONTAINER
docker rmi    = remove an IMAGE  (modern form: docker image rm)
```

Flags that keep your machine tidy while learning:

```bash
docker run --rm -it ubuntu bash    # --rm = auto-delete on exit
                                   # -it  = interactive + TTY (so the shell works)
```

**`-it` decoded:** `-i` keeps stdin open, `-t` allocates a terminal. Without them,
`docker run ubuntu bash` starts bash, sees no input, and exits instantly. That is
why "my ubuntu container won't stay up".

---

## 3) Anatomy of `docker run` — the flags that matter

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARGS...]
```

| Flag | Meaning | Learn it on |
|---|---|---|
| `-d` | Detached (background) | Day 1 |
| `-it` | Interactive shell | Day 1 |
| `--rm` | Delete container on exit | Day 1 |
| `--name X` | Stable name instead of `nostalgic_tesla` | Day 1 |
| `-p 8080:80` | Publish **host:container** port | Day 1 |
| `-e KEY=val` | Environment variable | Day 2 |
| `--env-file .env` | Env vars from a file | Day 2 |
| `-v name:/path` | Named volume (persistence) | Day 3 |
| `-v "$PWD":/app` | Bind mount (live code) | Day 3 |
| `-w /app` | Working directory inside | Day 3 |
| `--network net` | Join a user-defined network | Day 4 |
| `--restart unless-stopped` | Auto-restart policy | Day 5 |
| `-u 1000` | Run as a non-root user | Day 6 |
| `-m 512m --cpus 1.5` | Memory / CPU limits | Day 6 |
| `--entrypoint sh` | Override the entrypoint (debugging gold) | Day 7 |

Anything after the image name **replaces the image's default command**:

```bash
docker run nginx                  # runs nginx (the image's CMD)
docker run nginx echo hi          # runs `echo hi` instead - container exits at once
```

---

## 4) Images: naming is a skill

```text
        registry.example.com / team / api : 1.4.0
        |__________________|   |__|  |_|   |___|
             registry        namespace name  tag
          (default:                          (default: latest)
        docker.io/library)
```

```bash
docker pull nginx            # => docker.io/library/nginx:latest
docker pull nginx:1.27       # pinned - do this instead
docker image ls
docker image inspect nginx:1.27 --format '{{.Os}}/{{.Architecture}}'
docker image history nginx:1.27      # see the layers and what created them
docker image rm nginx:1.27
```

> **`latest` is not "the newest".** It is just the default tag name — a label like
> any other, and it can point at anything. Pin versions from day one.

Move images without a registry:

```bash
docker image save -o nginx.tar nginx:1.27      # export
docker image load -i nginx.tar                 # import elsewhere
```

---

## 5) Build your own image

`app.py`:

```python
print("hello from a container")
```

`Dockerfile`:

```dockerfile
FROM python:3.12-slim          # 1. start from an existing image
WORKDIR /app                   # 2. cd /app (creating it) for everything after
COPY requirements.txt .        # 3. copy the deps list FIRST (cache trick, see 6)
RUN pip install --no-cache-dir -r requirements.txt   # 4. install at BUILD time
COPY . .                       # 5. now copy the source code
EXPOSE 8080                    # 6. documentation only - publishes nothing
USER 10001                     # 7. drop root
CMD ["python", "app.py"]       # 8. what to run at START time
```

```bash
docker build -t myapp:1.0 .        # the "." is the BUILD CONTEXT, not the Dockerfile
docker run --rm myapp:1.0
```

### Every instruction, in one table

| Instruction | Runs at | What it does | Beginner trap |
|---|---|---|---|
| `FROM` | build | Base image | Always pin a tag |
| `RUN` | **build** | Executes a command, creates a layer | Not for starting your app |
| `COPY` | build | Copies from build context into image | Can't copy from outside the context |
| `ADD` | build | COPY + auto-extract tars + URLs | Prefer `COPY` unless you need the magic |
| `WORKDIR` | build+run | Sets the current directory | Use it instead of `RUN cd` (which doesn't stick) |
| `ENV` | **run** | Env var baked into the image | Never put secrets here |
| `ARG` | **build only** | Build-time variable | Not visible at runtime; never for secrets |
| `EXPOSE` | metadata | Documents a port | Does **not** publish it — `-p` does |
| `USER` | run | Sets the runtime user | Set it *after* installs |
| `ENTRYPOINT` | run | The executable | Use exec form `["..."]` |
| `CMD` | run | Default args / command | Overridden by anything you append to `docker run` |
| `HEALTHCHECK` | run | How to test app health | "running" is not "healthy" |
| `LABEL` | metadata | Metadata | Great for ownership info |
| `VOLUME` | run | Declares a mount point | Surprising side effects; prefer `-v` / Compose |

### ENTRYPOINT vs CMD, finally explained

```dockerfile
ENTRYPOINT ["python"]     # fixed part
CMD ["app.py"]            # default, replaceable part
```

```bash
docker run myapp                 # -> python app.py
docker run myapp other.py        # -> python other.py     (CMD replaced)
docker run --entrypoint sh myapp # -> sh                  (ENTRYPOINT replaced)
```

Rule of thumb: `ENTRYPOINT` = *what this image is*. `CMD` = *how it's used by default*.

### `.dockerignore` — write it before your first build

```text
.git
node_modules
__pycache__
*.log
.env
dist
```

Everything in the build context is uploaded to the engine. Without this file your
400 MB `node_modules` is sent on every single build, and your `.env` may end up
inside the image.

---

## 6) Layer caching — what separates beginners from pros

Each instruction creates a **layer**. Docker reuses a cached layer only if that
instruction *and every instruction before it* is unchanged.

```text
SLOW (re-installs dependencies on every code change):
  COPY . .
  RUN npm install          <- invalidated by ANY source file edit

FAST (dependencies cached until the manifest changes):
  COPY package*.json ./
  RUN npm install          <- only reruns when package.json changes
  COPY . .
```

That is the entire reason `COPY requirements.txt` / `COPY package*.json` comes
before `COPY . .` in every good Dockerfile. **Order layers from least-changing to
most-changing.**

Related:

```bash
docker build --no-cache -t myapp:1.0 .   # force a full rebuild (debug stale layers)
docker build --pull -t myapp:1.0 .       # also refresh the base image
docker build --progress=plain -t myapp . # full, unfolded build output
```

### Multi-stage builds — small, safe production images

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine                       # final image: no node, no npm, no source
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

The compiler, dev dependencies and source code stay in the `build` stage and never
ship. Smaller image, smaller attack surface.

```bash
docker build --target build -t myapp:debug .   # build only the first stage
```

---

## 7) Data: volumes vs bind mounts

**Nothing written inside a container survives `docker rm`.** Pick a mount type:

| | Named volume | Bind mount |
|---|---|---|
| Syntax | `-v app-data:/var/lib/postgresql/data` | `-v "$PWD":/app` |
| Stored | Docker-managed area on the host | An exact host path you choose |
| Use for | Databases, uploads, real persistent state | Live-reloading source, config files |
| Portable | Yes | No (host-path specific) |
| Speed on Windows/macOS | Fast | Slower (crosses the VM boundary) |

```bash
docker volume create app-data
docker volume ls
docker volume inspect app-data
docker volume rm app-data          # ⚠️ deletes the data
```

A database, done correctly:

```bash
docker run -d --name db \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:17
```

Delete and recreate that container all day — the data lives in `pgdata`. Delete
the volume and it's gone.

Live-reload development:

```bash
docker run --rm -it -p 3000:3000 -v "$PWD":/app -w /app node:20-alpine npm run dev
```

Read-only mount (great for config):

```bash
docker run -d -v "$PWD/config":/etc/myapp:ro myapp:1.0
```

> **The disambiguation rule:** if the left side of `-v` contains a `/` or `\`,
> Docker treats it as a host path (bind mount). Otherwise it's a named volume.
> A typo'd volume name silently creates a new empty volume — that's why "my
> database is suddenly empty".

---

## 8) Networking: ports and container DNS

### Two completely different problems

```text
Problem A: my laptop -> container       =>  -p 8080:80  (publish a port)
Problem B: container -> container       =>  user-defined network + names
```

### A. Publishing

```bash
docker run -d -p 8080:80 nginx           # HOST:CONTAINER - never mix these up
docker run -d -p 127.0.0.1:8080:80 nginx # bind to localhost only (safer)
docker run -d -P nginx                   # publish EXPOSEd ports on random host ports
docker port web                          # what got mapped?
```

The container port must be the port your app **actually listens on**. If your app
binds to `127.0.0.1` inside the container it is unreachable no matter what you
publish — it must listen on `0.0.0.0`.

### B. Container-to-container

```bash
docker network create app-net
docker run -d --name db  --network app-net postgres:17
docker run -d --name api --network app-net -p 8080:8080 myapi:1.0
```

Inside `api`, the database is reachable at **`db:5432`** — the container name is
its DNS name. This works on *user-defined* networks only, not the default bridge.

```bash
docker network ls
docker network inspect app-net           # who's connected, which IPs
docker network connect app-net web       # attach a running container
docker exec api getent hosts db          # does the name resolve?
docker exec api curl -v http://db:8080   # can I actually reach it?
```

> **`localhost` inside a container means the container itself.** Your API cannot
> reach the database at `localhost:5432`. Use the container/service name. To reach
> a service running on your *host*, use `host.docker.internal` (Docker Desktop on
> Windows/macOS).

---

## 9) Compose: stop typing long `run` commands

Compose turns a pile of `docker run` flags into one declarative file. Learn it
right after networking — it's how you'll actually work every day.

`compose.yaml`:

```yaml
services:
  api:
    build: .                      # build from ./Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DB_HOST: db                 # <- the service name IS the hostname
    volumes:
      - .:/app                    # bind mount for live reload
      - /app/node_modules         # keep the image's node_modules
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

volumes:
  db-data:
```

```bash
docker compose up -d                    # create network + volumes + containers
docker compose up -d --build            # rebuild images first
docker compose ps
docker compose logs -f api              # follow one service
docker compose exec api sh              # shell into a running service
docker compose run --rm api npm test    # one-off task in a fresh container
docker compose config                   # render the merged config (debug variables)
docker compose down                     # remove containers + network (volumes SURVIVE)
docker compose down -v                  # ⚠️ also delete the volumes (data gone)
```

Notes that save hours:

- Compose creates a network automatically — **you don't need a `networks:` block**
  for services to talk to each other. `db` just works.
- The `version:` key at the top of the file is obsolete. Delete it.
- `depends_on` without `condition: service_healthy` only waits for *start*, not
  readiness. Your app still needs connection retry logic.
- `docker compose down` is safe; `down -v` is the destructive one.

---

## 10) Debugging: the flow that finds 95% of problems

```text
Something's wrong
   |
   v
docker ps -a  ---------------------------> Is it even there? What's the STATUS?
   |
   +-- Exited (0)   -> the process finished. Your CMD wasn't a long-running server.
   +-- Exited (1)   -> the app crashed.        -> docker logs
   +-- Exited (125) -> the DOCKER command was wrong (bad flag).
   +-- Exited (126) -> command found but not executable (chmod / CRLF endings).
   +-- Exited (127) -> command NOT FOUND (typo, or missing in a slim/alpine image).
   +-- Exited (137) -> SIGKILL - usually OUT OF MEMORY, or `docker kill`.
   +-- Exited (143) -> SIGTERM - a normal `docker stop`.
   +-- Restarting   -> crash loop.             -> docker logs + RestartCount
   |
   v
docker logs --tail 100 <name>          # what did it say before dying?
   |
   v
docker inspect <name> --format 'Status={{.State.Status}} Exit={{.State.ExitCode}} Err={{.State.Error}}'
   |
   v
docker run --rm -it --entrypoint sh <image>    # walk in and look around yourself
```

Everyday probes:

```bash
docker logs -f --tail 100 -t web             # live logs with timestamps
docker stats --no-stream web                 # CPU / memory right now
docker top web                               # processes inside
docker inspect -f '{{.RestartCount}}' web    # is it crash-looping?
docker inspect -f '{{json .Mounts}}' web     # did my volume actually mount?
docker inspect -f '{{json .Config.Env}}' web # are my env vars really set?
docker diff web                              # which files changed since start?
docker events                                # live engine event stream
```

### Top beginner errors, and what's really happening

| Symptom | Actual cause | Fix |
|---|---|---|
| Container exits instantly | The main process ended (nothing long-running in the foreground) | Run the server in the foreground; don't daemonize inside a container |
| `docker run -it ubuntu` exits | No command / no TTY | `docker run --rm -it ubuntu bash` |
| `port is already allocated` | Another process or container owns that host port | Change the host side: `-p 8081:80` |
| Can't reach the app on localhost:8080 | App listens on `127.0.0.1` inside the container | Bind to `0.0.0.0` in your app config |
| App can't reach the DB at `localhost` | `localhost` = the container itself | Use the service/container name |
| Name resolution fails | Containers are on the default bridge | Create a user-defined network |
| Code changes don't appear | Code was baked in with `COPY` and you didn't rebuild | Rebuild, or bind-mount for dev |
| Database empty after restart | Data was in the container layer, or the volume name was typo'd | Use a named volume; verify with `inspect` |
| `not found` for a binary that exists | Wrong CPU architecture, or CRLF line endings in an entrypoint script | Match `--platform`; convert the file to LF |
| Build can't find a file | It's outside the build context or is ignored | Fix the context path / `.dockerignore` |
| Disk full | Old images, build cache, dangling volumes | `docker system df`, then targeted prunes |
| `permission denied` on a mounted file | Container user does not match the host file owner | `-u $(id -u):$(id -g)` or fix ownership |

---

## 11) Cleanup — safe to dangerous

```bash
docker system df           # ALWAYS look first
docker system df -v        # per-object detail
```

```bash
docker container prune     # remove stopped containers        (safe)
docker image prune         # remove dangling images           (safe)
docker builder prune       # remove build cache               (safe, frees a LOT)
docker network prune       # remove unused networks           (safe)

docker system prune        # all of the above in one go       (mostly safe)
docker image prune -a      # remove ALL unused images         (re-download needed)

docker volume prune                # ⚠️ deletes unused volumes = DATA LOSS
docker system prune -a --volumes   # ⚠️⚠️ nuclear. never on a shared or prod host
```

> Rule: prune **images and build cache** freely. Treat **volumes** like a database
> backup — check `docker volume ls` and know what each one holds first.

---

## 12) Windows / PowerShell notes

Most tutorials assume bash. Translations:

| Bash | PowerShell | CMD |
|---|---|---|
| `-v "$PWD":/app` | `-v "${PWD}:/app"` | `-v "%cd%":/app` |
| `$(pwd)` | `${PWD}` | `%cd%` |
| `docker rm $(docker ps -aq)` | `docker rm @(docker ps -aq)` | — |
| `export VAR=1` | `$env:VAR = "1"` | `set VAR=1` |

Portable everywhere, no shell quoting at all:

```bash
docker run --rm -it --mount type=bind,source=D:\Docker,target=/app ubuntu bash
```

Other Windows specifics:

- Docker Desktop runs Linux containers inside a **WSL2 VM**. Bind mounts cross a
  VM boundary and are slow — keep hot project files inside WSL, or use named
  volumes for heavy I/O.
- Line endings matter. A shell script copied in with CRLF fails with a confusing
  `not found` or `exec format error`. Add `* text=auto eol=lf` to `.gitattributes`.
- Paths *inside* containers are always Linux-style: `/app`, never `D:\app`.

---

## 13) A 14-day learning path, with drills

| Day | Learn | Drill — do it without copy-pasting |
|---|---|---|
| 1 | `run`, `ps`, `logs`, `stop`, `rm` | Run nginx on 8080, watch its access log live, remove it |
| 2 | `exec`, `-it`, `--rm`, env vars | Shell into alpine and `echo $MY_VAR` that you passed with `-e` |
| 3 | Images, tags, `pull`, `inspect` | Pull two versions of redis; diff their `history` output |
| 4 | Your first Dockerfile | Containerise a 5-line script and run it |
| 5 | Layer caching, `.dockerignore` | Reorder your COPY lines; time both builds |
| 6 | Volumes | Run postgres with a volume, `rm -f` it, recreate — verify data survived |
| 7 | Bind mounts | Live-reload a Node or Flask app from your host folder |
| 8 | Networking + DNS | Two containers on one network; `curl` one from the other by name |
| 9 | Compose basics | Convert day 8 into a `compose.yaml` |
| 10 | A real Compose stack | app + db + healthcheck + volume, `up -d` from scratch |
| 11 | Debugging | Deliberately break it three ways; diagnose using only section 10 |
| 12 | Multi-stage builds | Shrink one image by >70%; compare `docker image ls` |
| 13 | Registries | Push to Docker Hub or GHCR, pull it back under a new tag |
| 14 | Production hygiene | Add a non-root user, healthcheck, pinned digest, resource limits |

After day 14: buildx / multi-arch builds, image scanning (`docker scout cves`),
then Kubernetes. Learn Swarm only if your workplace already uses it.

---

## 14) Production rules — learn the reason, not just the rule

| Rule | Why |
|---|---|
| Pin versions (`nginx:1.27.5`, or a `@sha256:` digest) | `latest` makes builds unreproducible and breaks silently |
| Never bake secrets into images | Image layers are permanent and readable by anyone who pulls |
| Run as non-root (`USER 10001`) | A container escape starts with whatever privileges you granted |
| One concern per container | Independent scaling, restarts and logs |
| Log to stdout/stderr | The engine collects it; log files inside a container vanish |
| Add a `HEALTHCHECK` | "Process alive" and "app working" are different things |
| Set a `--restart` policy and resource limits | Survive crashes; stop one container starving the host |
| Multi-stage builds + slim bases | Less to download, less to patch, less to exploit |
| Scan images (`docker scout cves`) | Base images accumulate CVEs over time |
| Use `.dockerignore` | Prevents leaking `.env` / `.git` and bloating the context |

---

## 15) The 25 commands worth memorising

```bash
# inspect the world
docker ps                       docker ps -a
docker images                   docker logs -f <container>
docker inspect <container>      docker stats
docker system df

# lifecycle
docker run -d --name X -p HOST:CONTAINER image
docker run --rm -it image sh
docker exec -it <container> sh
docker start / stop / restart <container>
docker rm -f <container>

# images
docker pull image:tag           docker build -t name:tag .
docker tag src dst              docker push repo/name:tag
docker image rm image           docker image prune -a

# data and networking
docker volume create / ls / inspect / rm
docker network create app-net
docker network inspect app-net

# compose
docker compose up -d --build
docker compose logs -f
docker compose exec service sh
docker compose down
```

---

## 16) Glossary

| Term | Meaning |
|---|---|
| **Layer** | One filesystem diff produced by a Dockerfile instruction; shared and cached between images |
| **Build context** | The directory sent to the engine when you run `docker build .` |
| **Dangling image** | An untagged image left behind after a rebuild (`<none>:<none>`) |
| **Digest** | `sha256:...` — an immutable content hash; the only truly fixed image reference |
| **Bridge network** | The default network driver for containers on a single host |
| **Daemon / Engine** | The background service that actually runs containers |
| **BuildKit / buildx** | The modern build engine: parallel stages, cache mounts, multi-arch output |
| **OCI** | The open standard that Docker images and runtimes conform to |
| **Orchestrator** | Runs containers across many machines (Kubernetes, Swarm) |

---

## The one-card summary

```text
BUILD    Dockerfile --docker build--> image --docker push--> registry
RUN      image --docker run--> container --docker stop/rm--> gone
KEEP     volumes (data)  |  bind mounts (code and config)
TALK     -p host:container (outside in)  |  network + names (inside)
GROUP    compose.yaml + docker compose up -d
FIX      ps -a  ->  logs  ->  inspect  ->  exec / --entrypoint sh
CLEAN    system df  ->  targeted prune (volumes last, and carefully)
```

**Golden rule:** when something breaks, **inspect before you change anything**.
Nearly every Docker bug is answered by `docker ps -a`, `docker logs`, and
`docker inspect` — in that order.
