# 🐳 DOCKER — DAILY CHEAT SHEET

> **Print & stick beside your monitor** • Docker CLI quick reference • Use `docker COMMAND --help` for version-specific options.

---

## 🐳 CONTAINERS

| Command | What it does |
|---|---|
| `docker ps` | Running containers |
| `docker ps -a` | All containers |
| `docker run -d --name web nginx` | Create + start |
| `docker run --rm -it ubuntu bash` | Temporary interactive container |
| `docker start web` | Start stopped container |
| `docker stop web` | Graceful stop |
| `docker restart web` | Restart |
| `docker kill web` | Force stop |
| `docker rm web` | Remove stopped container |
| `docker rm -f web` | Force remove |
| `docker exec -it web sh` | Shell inside running container |
| `docker exec -it web bash` | Bash shell |
| `docker exec web CMD` | Run command inside |
| `docker cp web:/app/log.txt .` | Copy container → host |
| `docker cp ./config.yml web:/app/` | Copy host → container |
| `docker top web` | Processes |
| `docker stats` | Live CPU/memory/I/O |
| `docker inspect web` | Full container config/state |

### Run patterns

```bash
docker run -d --name web -p 8080:80 nginx
docker run -d --restart unless-stopped --name api myapp:1.0
docker run --rm -it --env-file .env myapp:1.0 sh
docker run -d -v app-data:/data myapp:1.0
docker run -d --network app-net --name api myapp:1.0
```

---

## 🖼️ IMAGES

| Command | What it does |
|---|---|
| `docker image ls` | List images |
| `docker pull nginx:1.27` | Download image |
| `docker build -t app:1.0 .` | Build image |
| `docker tag app:1.0 repo/app:1.0` | Tag image |
| `docker push repo/app:1.0` | Push image |
| `docker image inspect app:1.0` | Image details |
| `docker image history app:1.0` | Image layers |
| `docker image rm app:1.0` | Delete image |
| `docker image prune` | Remove dangling images |
| `docker image prune -a` | Remove unused images |
| `docker image save -o app.tar app:1.0` | Export image |
| `docker image load -i app.tar` | Import saved image |

### Build patterns

```bash
docker build -t myapp:1.0 .
docker build -f Dockerfile.prod -t myapp:prod .
docker build --no-cache -t myapp .
docker build --pull -t myapp .
docker build --build-arg VERSION=1.2 -t myapp .
docker build --target production -t myapp:prod .
docker build --progress=plain -t myapp .
```

---

## 🔨 DOCKERFILE — MUST KNOW

```dockerfile
FROM          # Base image
RUN           # Execute during build
COPY          # Copy files
ADD           # Copy + special archive/URL behavior
WORKDIR       # Working directory
ENV           # Runtime environment variable
ARG           # Build-time variable
EXPOSE        # Document container port
USER          # Runtime user
ENTRYPOINT    # Main executable
CMD           # Default command/arguments
HEALTHCHECK   # Container health
LABEL         # Image metadata
VOLUME        # Declare volume
```

### Golden pattern

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER 10001
EXPOSE 8080
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
ENTRYPOINT ["python"]
CMD ["app.py"]
```

### Remember

```text
EXPOSE 8080       ≠ publish port
-p 8080:8080      = publish port

ENTRYPOINT        = executable
CMD               = default args/command

ARG               = build time
ENV               = runtime

COPY              = preferred for normal file copies
ADD               = use only when its extra behavior is needed
```

---

## 🌐 NETWORKING

| Command | What it does |
|---|---|
| `docker network ls` | List networks |
| `docker network create app-net` | Create network |
| `docker network inspect app-net` | Inspect network |
| `docker network connect app-net web` | Connect container |
| `docker network disconnect app-net web` | Disconnect |
| `docker network rm app-net` | Delete network |
| `docker network prune` | Remove unused networks |
| `docker port web` | Published ports |

### Typical app network

```bash
docker network create app-net

docker run -d --name db \
  --network app-net postgres:17

docker run -d --name api \
  --network app-net myapi:1.0
```

Inside `api`, connect to:

```text
db:5432
```

**User-defined Docker networks provide container-name DNS.**

---

## 💾 VOLUMES & STORAGE

| Command | What it does |
|---|---|
| `docker volume ls` | List volumes |
| `docker volume create app-data` | Create volume |
| `docker volume inspect app-data` | Inspect volume |
| `docker volume rm app-data` | Delete volume |
| `docker volume prune` | Remove unused volumes |

### Named volume

```bash
docker run -d \
  --name db \
  -v app-data:/var/lib/postgresql/data \
  postgres:17
```

### Bind mount

```bash
docker run -it \
  --mount type=bind,source="$PWD",target=/app \
  ubuntu bash
```

```text
-v volume:/container/path       → named volume
-v /host/path:/container/path   → bind mount
:ro                             → read-only
```

---

## 📋 LOGS & TROUBLESHOOTING

### First 5 commands when a container fails

```bash
docker ps -a
docker logs <container>
docker inspect <container>
docker stats --no-stream <container>
docker image inspect <image>
```

### Logs

```bash
docker logs web
docker logs -f web
docker logs --tail 100 web
docker logs --since 30m web
docker logs -t web
```

### Inspect useful fields

```bash
docker inspect web --format '{{.State.Status}}'
docker inspect web --format '{{.State.ExitCode}}'
docker inspect web --format '{{.RestartCount}}'
docker inspect web --format '{{.State.Error}}'
docker inspect web --format '{{.State.Pid}}'
docker inspect web --format '{{.Config.Image}}'
docker inspect web --format '{{json .Mounts}}'
docker inspect web --format '{{json .NetworkSettings.Networks}}'
```

### Check entrypoint / command

```bash
docker inspect web \
  --format 'Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}'
```

### Processes / resources

```bash
docker top web
docker stats --no-stream web
```

### Network test

```bash
docker exec web getent hosts db
docker exec web curl -v http://api:8080/health
```

### Reproduce interactively

```bash
docker run --rm -it <image> sh
docker run --rm -it --entrypoint sh <image>
```

---

## 🧩 DOCKER COMPOSE

```bash
docker compose up -d
docker compose up -d --build

docker compose ps
docker compose logs -f
docker compose logs -f api

docker compose exec api sh
docker compose run --rm api <command>

docker compose build
docker compose pull
docker compose restart
docker compose stop

docker compose config
docker compose down
docker compose down -v
```

### Compose file selection

```bash
docker compose -f compose.prod.yml up -d

docker compose \
  -f compose.yml \
  -f compose.prod.yml \
  up -d
```

### Quick lifecycle

```text
up       → create/start
stop     → stop containers
restart  → restart
down     → remove containers + networks
down -v  → also remove Compose volumes
```

---

## 📦 REGISTRY

```bash
docker login
docker login registry.example.com
docker logout registry.example.com

docker build -t registry.example.com/team/app:1.0 .
docker push registry.example.com/team/app:1.0
docker pull registry.example.com/team/app:1.0
```

### Image naming

```text
REGISTRY/NAMESPACE/IMAGE:TAG

ghcr.io/company/api:1.2.0
registry.example.com/team/web:prod
```

**Production:** Prefer versioned tags and/or immutable digests over `latest`.

---

## 🏗️ BUILDX / MULTI-ARCH

```bash
docker buildx ls
docker buildx inspect
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/app:1.0 \
  --push .
```

### Local image

```bash
docker buildx build \
  --load \
  -t app:1.0 .
```

```text
--load   → load result into local Docker images
--push   → push result directly to registry
--platform → target CPU/OS platforms
```

---

## 🧹 CLEANUP — CAREFUL!

### See disk usage first

```bash
docker system df
docker system df -v
```

### Safe-ish targeted cleanup

```bash
docker container prune
docker image prune
docker network prune
docker volume prune
```

### Broad cleanup

```bash
docker system prune
```

### Aggressive

```bash
docker system prune -a
```

### VERY destructive

```bash
docker system prune -a --volumes
```

> ⚠️ **Never run the last command blindly on a production host.**
> Unused Docker volumes may contain important persistent data.

---

## ⚡ POWER ONE-LINERS

### Container list

```bash
docker ps -a \
  --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

### Container names

```bash
docker ps --format '{{.Names}}'
```

### Container IP

```bash
docker inspect -f \
'{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>
```

### Container PID

```bash
docker inspect -f '{{.State.Pid}}' <container>
```

### Restart count

```bash
docker inspect -f '{{.RestartCount}}' <container>
```

### Exit code

```bash
docker inspect -f '{{.State.ExitCode}}' <container>
```

### Image entrypoint

```bash
docker image inspect <image> \
  --format '{{json .Config.Entrypoint}}'
```

### Image CMD

```bash
docker image inspect <image> \
  --format '{{json .Config.Cmd}}'
```

### All stopped containers

```bash
docker ps -aq --filter status=exited
```

---

# 🚨 60-SECOND INCIDENT FLOW

```text
CONTAINER DOWN?
     │
     ▼
docker ps -a
     │
     ▼
docker logs <container>
     │
     ├── Exit code?
     │      └─ docker inspect -f '{{.State.ExitCode}}' <container>
     │
     ├── Restarting?
     │      └─ docker inspect -f '{{.RestartCount}}' <container>
     │
     ├── Config issue?
     │      └─ docker inspect <container>
     │
     ├── Network issue?
     │      └─ docker network inspect <network>
     │
     ├── Resource issue?
     │      └─ docker stats --no-stream <container>
     │
     └── Image issue?
            └─ docker image inspect <image>
```

---

# 🧠 THE 20 COMMANDS TO MEMORIZE

```bash
docker ps
docker ps -a
docker run
docker start
docker stop
docker restart
docker rm
docker exec -it
docker logs -f
docker inspect
docker stats
docker cp

docker image ls
docker pull
docker build
docker push
docker image rm

docker network ls
docker network inspect
docker volume ls
docker compose up -d
docker compose down
```

---

# 🔐 PRODUCTION RULES

```text
✓ Pin image versions
✓ Prefer immutable digests for critical production deployments
✓ Run containers as non-root where possible
✓ Never bake secrets into Dockerfiles/images
✓ Use health checks
✓ Use least privilege
✓ Avoid --privileged unless genuinely required
✓ Review cleanup commands before execution
✓ Use multi-stage builds
✓ Keep images minimal
✓ Scan images for vulnerabilities
✓ Log to stdout/stderr for container-native logging
✓ Set CPU/memory limits where appropriate
✓ Use explicit restart policies for standalone services
```

---

## 🔑 COMMAND MEMORY MAP

```text
CONTAINER
run → start → stop → restart → rm
             ↓
          logs / exec / inspect / stats

IMAGE
pull → build → tag → push
        ↓
     inspect / history / rm

NETWORK
create → connect → inspect → disconnect → rm

VOLUME
create → mount → inspect → rm

COMPOSE
up → ps → logs → exec → restart → stop → down

REGISTRY
login → pull / push

CLEANUP
system df → prune
```

**Golden rule:** When troubleshooting, **inspect before changing**.
