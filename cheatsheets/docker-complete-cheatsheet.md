# Docker Complete Cheat Sheet

This is a practical Docker reference for daily use, development, debugging, and production workflows.

---

## 1) Docker basics

### What is Docker?

Docker packages an application and all its dependencies into a lightweight, portable container.

- Image = blueprint
- Container = running instance of an image
- Dockerfile = recipe to build an image
- Volume = persistent storage
- Network = communication between containers
- Registry = remote image repository (Docker Hub, GHCR, etc.)

### Install check

```bash
docker --version
docker version
docker info
```

### Common top-level help

```bash
docker --help
docker run --help
docker build --help
docker compose --help
```

---

## 2) Docker lifecycle quickstart

### Pull an image

```bash
docker pull nginx:latest
docker pull postgres:16
docker pull node:20-alpine
```

### List local images

```bash
docker images
docker image ls
```

### Run a container

```bash
docker run -d --name web -p 8080:80 nginx:latest
```

### List running containers

```bash
docker ps
docker ps -a
```

### Stop / start / restart

```bash
docker stop web
docker start web
docker restart web
```

### Restart policies

```text
no               default - never auto-restart
on-failure       retry only on a non-zero exit
on-failure:N     retry up to N times, then give up for good
always           restart on crash AND after a daemon restart, even if stopped by hand
unless-stopped   like always, but respects a manual stop across a daemon restart
```

```bash
docker run -d --restart unless-stopped --name api myapp:1.0
```

Backoff between retries starts small and doubles, but caps at roughly 60
seconds - expect a steady one-per-minute cadence for a long-running crash loop,
not a delay that visibly climbs.

### Reconfigure a live container

```bash
docker update --restart unless-stopped -m 512m web
```

Live, no recreation - but the flag list is short and fixed:

```text
--restart, --cpus, --cpu-shares, --cpu-period, --cpu-quota, --cpuset-cpus,
--cpuset-mems, --cpu-rt-period, --cpu-rt-runtime, -m/--memory,
--memory-reservation, --memory-swap, --pids-limit, --blkio-weight
```

No `-e`/`--env`, no `-p`, no `--mount`, no image, no name. Anything that is
part of a container's identity requires replacing it, not updating it.

### Remove container

```bash
docker rm web
docker rm -f web
```

### Remove image

```bash
docker rmi nginx:latest
```

---

## 3) Container commands

### One-off interactive container

```bash
docker run --rm -it ubuntu bash
docker run --rm -it alpine sh
```

### Run in detached mode

```bash
docker run -d --name app myapp:1.0
```

### Run with environment variables

```bash
docker run -d --name app \
  -e NODE_ENV=production \
  -e PORT=3000 \
  myapp:1.0
```

### Run with host port mapping

```bash
docker run -d -p 8080:80 --name web nginx
```

### Run with bind mount

```bash
docker run -d -v "$PWD":/app -w /app node:20-alpine node server.js
```

### Run with named volume

```bash
docker run -d -v app-data:/data myapp:1.0
```

### Run on a custom network

```bash
docker network create app-net
docker run -d --name db --network app-net postgres:16
docker run -d --name api --network app-net myapp:1.0
```

### Inspect container

```bash
docker inspect web
docker inspect -f '{{.State.Status}}' web
docker inspect -f '{{.NetworkSettings.IPAddress}}' web
```

### Container process list

```bash
docker top web
```

### Resource usage

```bash
docker stats
docker stats --no-stream web
```

### Attach to container

```bash
docker attach web
```

### Execute shell inside running container

```bash
docker exec -it web bash
docker exec -it web sh
```

### Execute command in container

```bash
docker exec web ls -la
docker exec web env
```

### Copy files in/out of container

```bash
docker cp web:/var/log/app.log ./app.log
docker cp ./config.yml web:/app/config.yml
```

---

## 4) Images

### Build image

```bash
docker build -t myapp:latest .
docker build -t myapp:1.0 -f Dockerfile.prod .
```

### Build with no cache

```bash
docker build --no-cache -t myapp:latest .
```

### Build with build args

```bash
docker build --build-arg APP_VERSION=1.2.3 -t myapp:1.2.3 .
```

### Build with target stage

```bash
docker build --target production -t myapp:prod .
```

### Tag image

```bash
docker tag myapp:latest myrepo/myapp:1.0
```

### Push image

```bash
docker push myrepo/myapp:1.0
```

### Pull image

```bash
docker pull myrepo/myapp:1.0
```

### Save image to tar

```bash
docker save -o myapp.tar myapp:1.0
```

### Load image from tar

```bash
docker load -i myapp.tar
```

### Image details

```bash
docker image inspect myapp:1.0
docker image history myapp:1.0
```

### Remove image

```bash
docker image rm myapp:1.0
```

### Prune unused images

```bash
docker image prune
docker image prune -a
```

---

## 5) Logs and debugging

### View logs

```bash
docker logs web
docker logs -f web
docker logs --tail 100 web
docker logs --since 30m web
docker logs -t web
```

### Inspect exit code

```bash
docker inspect -f '{{.State.ExitCode}}' web
```

### Inspect status

```bash
docker inspect -f '{{.State.Status}}' web
```

### Inspect restart count

```bash
docker inspect -f '{{.RestartCount}}' web
```

### Inspect network IPs

```bash
docker inspect -f '{{json .NetworkSettings.Networks}}' web
```

### Inspect mounts

```bash
docker inspect -f '{{json .Mounts}}' web
```

### Resource usage

```bash
docker stats
docker stats --no-stream web
```

### Check process inside container

```bash
docker top web
```

### Debug with shell

```bash
docker run --rm -it --entrypoint sh myapp:1.0
```

### Reproduce startup issue interactively

```bash
docker run --rm -it --entrypoint bash myapp:1.0
```

### System health overview

```bash
docker system df
docker system df -v
```

### Watch live engine events

```bash
docker events
docker events --filter container=web
docker events --filter container=web --since 10m
```

Useful for watching a restart loop or a stop/start sequence happen in real
time instead of polling `docker ps` repeatedly.

---

## 6) Port publishing and networking

### Publish port

```bash
docker run -d -p 8080:80 nginx
```

### Publish to host IP

```bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

### Publish UDP port

```bash
docker run -d -p 5353:53/udp dns-server
```

### Publish random host port

```bash
docker run -P nginx
```

### Show port mappings

```bash
docker port web
```

### List networks

```bash
docker network ls
```

### Create network

```bash
docker network create app-net
```

### Inspect network

```bash
docker network inspect app-net
```

### Remove network

```bash
docker network rm app-net
```

### Connect container to network

```bash
docker network connect app-net web
```

### Disconnect container from network

```bash
docker network disconnect app-net web
```

### Remove unused networks

```bash
docker network prune
```

### Container-to-container DNS resolution

```bash
docker network create app-net
docker run -d --name db --network app-net postgres:16
docker run -it --rm --network app-net alpine sh
```

Inside the second container:

```bash
ping db
curl http://db:5432
```

### Useful network commands

```bash
docker exec web getent hosts db
```

---

## 7) Volumes and persistent data

### List volumes

```bash
docker volume ls
```

### Create volume

```bash
docker volume create app-data
```

### Mount named volume

```bash
docker run -d --name db -v app-data:/var/lib/postgresql/data postgres:16
```

### Inspect volume

```bash
docker volume inspect app-data
```

### Remove volume

```bash
docker volume rm app-data
```

### Prune unused volumes

```bash
docker volume prune
```

### Bind mount local folder

```bash
docker run -it --mount type=bind,source="$(pwd)",target=/app ubuntu bash
```

### Bind mount read-only

```bash
docker run -d --mount type=bind,source="$(pwd)/config",target=/etc/myapp,readonly myapp
```

### Volume examples

```bash
docker run -d -v app-data:/data myapp:1.0
docker run -d -v /host/path:/container/path myapp:1.0
```

> Use named volumes for persistent data. Use bind mounts for local development and configuration.

---

## 8) Environment variables and config

### Pass one variable

```bash
docker run -e APP_ENV=production myapp:1.0
```

### Pass multiple variables

```bash
docker run \
  -e APP_ENV=production \
  -e PORT=3000 \
  -e DB_HOST=db \
  myapp:1.0
```

### Load environment from file

```bash
docker run --env-file .env myapp:1.0
```

An `--env-file` is not a shell script: no quote stripping, no `$VAR`
expansion, no `export`. `QUOTED="hello"` in the file becomes the literal value
`"hello"`, quotes included.

### Precedence when the same variable is set more than one way

```text
image ENV  <  --env-file  <  -e
```

Confirmed with all three at once: an image built with `ENV V=from-image`,
overridden by `--env-file` (`V=from-file`), overridden again by `-e V=from-flag`
on the same command - the container sees `from-flag`. Later `-e` flags also
beat earlier ones.

### Use secrets via Compose or external secret manager

```yaml
services:
  app:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
```

### Best practice

- Avoid hardcoding secrets into Dockerfiles
- Prefer runtime environment injection
- Use secret management tools in production

---

## 9) Dockerfile quick reference

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
ENV APP_ENV=production
CMD ["python", "app.py"]
```

### Common Dockerfile instructions

```dockerfile
FROM
RUN
COPY
ADD
WORKDIR
ENV
ARG
EXPOSE
USER
ENTRYPOINT
CMD
HEALTHCHECK
LABEL
VOLUME
```

### ENTRYPOINT vs CMD

```dockerfile
ENTRYPOINT ["python"]
CMD ["app.py"]
```

- ENTRYPOINT = main executable
- CMD = default argument or command override

### HEALTHCHECK example

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

### Multi-stage build

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Non-root user

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app
```

### Best Dockerfile patterns

- Use small official base images
- Copy only needed files
- Keep layers cached efficiently
- Remove package manager cache in the same layer
- Use `.dockerignore`
- Prefer `COPY` over `ADD` unless needed
- Pin dependency versions

---

## 10) Docker Compose quick reference

### Start services

```bash
docker compose up
docker compose up -d
```

### Start with rebuild

```bash
docker compose up -d --build
```

### Stop services

```bash
docker compose stop
docker compose down
```

### Remove containers and volumes

```bash
docker compose down -v
```

### View services

```bash
docker compose ps
```

### Logs

```bash
docker compose logs
docker compose logs -f
```

### Follow a specific service

```bash
docker compose logs -f api
```

### Exec into service

```bash
docker compose exec api sh
```

### Run one-off command

```bash
docker compose run --rm api python manage.py migrate
```

### Build service images

```bash
docker compose build
```

### Pull images

```bash
docker compose pull
```

### Restart services

```bash
docker compose restart
```

### Validate config

```bash
docker compose config
```

### Example Compose file

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DB_HOST: db
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

---

## 11) Compose networking and volumes

### Use custom network name

```yaml
networks:
  app-net:
    driver: bridge
```

### Attach service to network

```yaml
services:
  api:
    networks:
      - app-net
```

### Named volumes in Compose

```yaml
volumes:
  db_data:
```

### Bind mount in Compose

```yaml
volumes:
  - .:/app
```

### Read-only mount

```yaml
volumes:
  - ./config:/etc/myapp:ro
```

---

## 12) Registries and image publishing

### Login

```bash
docker login
docker login ghcr.io
```

### Logout

```bash
docker logout ghcr.io
```

### Tag and push

```bash
docker tag myapp:latest myuser/myapp:1.0
docker push myuser/myapp:1.0
```

### Pull from registry

```bash
docker pull myuser/myapp:1.0
```

### Registry image naming

```text
registry.example.com/team/app:1.0
ghcr.io/username/project:latest
```

### Production tip

Prefer immutable tags or digests instead of `latest`.

---

## 13) Docker BuildKit / buildx

### List builders

```bash
docker buildx ls
```

### Build with buildx

```bash
docker buildx build -t myapp:latest .
```

### Load into local Docker daemon

```bash
docker buildx build --load -t myapp:latest .
```

### Push to registry

```bash
docker buildx build --push -t registry.example.com/app:1.0 .
```

### Multi-platform build

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/app:1.0 \
  --push .
```

### Show build progress cleanly

```bash
docker build --progress=plain -t myapp:latest .
```

---

## 14) Cleanup and maintenance

### Show disk usage

```bash
docker system df
docker system df -v
```

### Remove stopped containers

```bash
docker container prune
docker container prune -f
```

### Remove unused images

```bash
docker image prune
docker image prune -a
```

### Remove unused networks

```bash
docker network prune
```

### Remove unused volumes

```bash
docker volume prune
```

### Clean everything safely

```bash
docker system prune
```

### Clean everything aggressively

```bash
docker system prune -a --volumes
```

> Warning: this can delete useful data. Use carefully, especially on production hosts.

---

## 15) Troubleshooting workflow

### Basic check

```bash
docker ps -a
docker logs <container>
docker inspect <container>
docker stats --no-stream <container>
```

### If container exits immediately

```bash
docker logs <container>
docker inspect -f '{{.State.ExitCode}}' <container>
```

### If ports are not available

```bash
docker port <container>
docker ps -a
ss -tulpn | grep 8080
```

### If app cannot connect to database

```bash
docker network inspect app-net
docker exec -it api sh
docker exec -it api getent hosts db
```

### If file permissions fail

```bash
docker exec -it app sh
id
ls -l
```

### If the image build is stale

```bash
docker build --no-cache -t myapp:latest .
```

---

## 16) Useful one-liners

### List all container names

```bash
docker ps --format '{{.Names}}'
```

### View container IPs

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>
```

### View all running container IDs

```bash
docker ps -q
```

### View exit code

```bash
docker inspect -f '{{.State.ExitCode}}' <container>
```

### View restart count

```bash
docker inspect -f '{{.RestartCount}}' <container>
```

### View PID

```bash
docker inspect -f '{{.State.Pid}}' <container>
```

### Get image entrypoint

```bash
docker image inspect <image> --format '{{json .Config.Entrypoint}}'
```

### Get image CMD

```bash
docker image inspect <image> --format '{{json .Config.Cmd}}'
```

### Kill all containers

```bash
docker kill $(docker ps -q)
```

### Remove all stopped containers

```bash
docker rm $(docker ps -a -q)
```

### Remove all images

```bash
docker rmi $(docker images -q)
```

### Check Docker daemon resources

```bash
docker system info
```

---

## 17) Best practices

- Prefer official images
- Use small base images
- Pin versions for reproducibility
- Use `.dockerignore`
- Keep containers single-purpose
- Store data in volumes, not in containers
- Avoid secrets in Dockerfiles or commit history
- Use multi-stage builds for production
- Document container ports with `EXPOSE`
- Use healthchecks for critical services
- Keep runtime user non-root when possible
- Use Compose for local multi-service apps
- Use registry tags and digests in production
- Prefer stdout/stderr for logs
- Limit CPU and memory when needed

---

## 18) Real-world examples

### Example: Nginx web server

```bash
docker run -d --name web -p 8080:80 nginx:latest
```

### Example: PostgreSQL database

```bash
docker run -d --name db \
  -e POSTGRES_DB=appdb \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16
```

### Example: Redis cache

```bash
docker run -d --name cache -p 6379:6379 redis:7-alpine
```

### Example: Node.js app

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t my-node-app .
docker run -d -p 3000:3000 --name my-node-app my-node-app
```

### Example: Python app

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

---

## 19) Docker command combinations by use case

### Development workflow

```bash
docker build -t myapp:dev .
docker run --rm -it -p 3000:3000 -v "$PWD":/app myapp:dev
```

### Database + app workflow

```bash
docker network create app-net
docker run -d --name db --network app-net postgres:16
docker run -d --name app --network app-net -p 3000:3000 myapp:1.0
```

### Debugging workflow

```bash
docker ps -a
docker logs app
docker exec -it app sh
docker inspect app
```

### Production release workflow

```bash
docker build -t registry.example.com/team/app:1.0 .
docker push registry.example.com/team/app:1.0
docker run -d --name app -p 8080:8080 registry.example.com/team/app:1.0
```

---

## 20) Quick command map

```text
Images:
  docker pull
  docker build
  docker tag
  docker push
  docker image ls
  docker image rm

Containers:
  docker run
  docker ps
  docker logs
  docker exec -it
  docker stop
  docker rm

Networks:
  docker network ls
  docker network create
  docker network inspect
  docker network connect

Volumes:
  docker volume create
  docker volume ls
  docker volume inspect
  docker volume prune

Compose:
  docker compose up
  docker compose logs
  docker compose exec
  docker compose down

Cleanup:
  docker system prune
  docker image prune
  docker volume prune
```

---

## 21) Production safety checklist

- Pin image versions
- Use `.dockerignore`
- Keep images minimal
- Run as non-root if possible
- Use secrets from secure management sources
- Set restart policies
- Add health checks
- Use logs to stdout/stderr
- Use volumes for persistence
- Use multi-stage builds
- Avoid `latest` in production
- Verify image scanning results
- Limit port exposure
- Set memory and CPU constraints where necessary

---

## 22) Common mistakes to avoid

- Using `latest` in production
- Leaving secrets in Dockerfiles
- Running containers as root unnecessarily
- Storing important state in container filesystem instead of volumes
- Exposing all ports without need
- Forgetting to inspect logs before changing config
- Not using `.dockerignore`
- Copying too much into the build context
- Reusing the same tag with different images unexpectedly

---

## 23) Useful aliases for shell

```bash
alias dps='docker ps'
alias dpsa='docker ps -a'
alias dlog='docker logs -f'
alias dimg='docker images'
alias dclean='docker system prune -f'
alias dcomp='docker compose'
```

---

## Final quick reference

```bash
docker version
docker info
docker pull nginx
docker run -d -p 8080:80 --name web nginx
docker ps
docker logs web
docker exec -it web bash
docker stop web
docker rm web
docker rmi nginx
docker build -t myapp:latest .
docker run -d -p 3000:3000 --name myapp myapp:latest
docker compose up -d
docker compose logs -f
docker compose down -v
docker system prune -a
```

---

If you want a shorter “one-page” cheat sheet version, keep only the sections for:
- Basic commands
- Images and containers
- Networking and volumes
- Dockerfile and Compose
- Debugging and cleanup
