# Docker Commands --- Comprehensive Reference

> Practical Docker command reference with syntax, examples, and common
> use cases.
>
> **Scope:** Docker CLI commands for day-to-day development,
> troubleshooting, images, containers, networks, volumes, Compose,
> registries, BuildKit/buildx, system cleanup, and debugging.
>
> **Note:** Docker is version-dependent. Some commands/options may vary
> by Docker release. Run `docker --help` or `docker <command> --help` on
> your host for the exact installed version.

------------------------------------------------------------------------

## Table of Contents

1.  [Docker CLI Basics](#1-docker-cli-basics)
2.  [Docker Info and Version](#2-docker-info-and-version)
3.  [Images](#3-images)
4.  [Containers](#4-containers)
5.  [Container Lifecycle](#5-container-lifecycle)
6.  [Running Commands Inside
    Containers](#6-running-commands-inside-containers)
7.  [Logs and Inspection](#7-logs-and-inspection)
8.  [Copying Files](#8-copying-files)
9.  [Docker Exec and Attach](#9-docker-exec-and-attach)
10. [Port Publishing](#10-port-publishing)
11. [Environment Variables](#11-environment-variables)
12. [Volumes](#12-volumes)
13. [Bind Mounts](#13-bind-mounts)
14. [Networks](#14-networks)
15. [Dockerfile and Builds](#15-dockerfile-and-builds)
16. [Build Cache and BuildKit](#16-build-cache-and-buildkit)
17. [Registries](#17-registries)
18. [Docker Hub / Registry Image
    Workflow](#18-docker-hub--registry-image-workflow)
19. [Docker Compose](#19-docker-compose)
20. [Docker Contexts](#20-docker-contexts)
21. [Docker Plugins](#21-docker-plugins)
22. [Docker Events](#22-docker-events)
23. [Docker Stats](#23-docker-stats)
24. [Docker System Cleanup](#24-docker-system-cleanup)
25. [Docker Checkpoint](#25-docker-checkpoint)
26. [Docker Trust / Content Trust](#26-docker-trust--content-trust)
27. [Docker Manifest](#27-docker-manifest)
28. [Docker Scout](#28-docker-scout)
29. [Docker Buildx](#29-docker-buildx)
30. [Docker Swarm](#30-docker-swarm)
31. [Secrets and Configs in Swarm](#31-secrets-and-configs-in-swarm)
32. [Docker Service](#32-docker-service)
33. [Docker Stack](#33-docker-stack)
34. [Docker Node](#34-docker-node)
35. [Docker Swarm Troubleshooting](#35-docker-swarm-troubleshooting)
36. [Common Troubleshooting
    Commands](#36-common-troubleshooting-commands)
37. [Production-Safe Inspection
    Commands](#37-production-safe-inspection-commands)
38. [Useful One-Liners](#38-useful-one-liners)
39. [Dockerfile Quick Reference](#39-dockerfile-quick-reference)
40. [Docker Compose Quick Reference](#40-docker-compose-quick-reference)
41. [Command Selection Cheat Sheet](#41-command-selection-cheat-sheet)

------------------------------------------------------------------------

# 1. Docker CLI Basics

## `docker`

Shows the Docker CLI help.

``` bash
docker
```

**Use case:** Discover available top-level commands.

------------------------------------------------------------------------

## `docker --help`

``` bash
docker --help
```

**Use case:** Get command syntax and options.

------------------------------------------------------------------------

## `docker <command> --help`

``` bash
docker run --help
docker build --help
docker network --help
```

**Use case:** Check the exact syntax supported by your installed Docker
version.

------------------------------------------------------------------------

## `docker version`

``` bash
docker version
```

**Use case:** Check both Docker Client and Docker Server/Engine
versions.

------------------------------------------------------------------------

## `docker info`

``` bash
docker info
```

**Use case:** Inspect Docker Engine configuration, storage driver,
container count, image count, CPUs, memory, registries, and runtime
information.

------------------------------------------------------------------------

# 2. Docker Info and Version

## `docker version --format`

``` bash
docker version --format '{{.Server.Version}}'
```

**Use case:** Extract a specific version in scripts.

------------------------------------------------------------------------

## `docker info --format`

``` bash
docker info --format '{{.ServerVersion}}'
```

**Use case:** Programmatically retrieve Engine version.

------------------------------------------------------------------------

# 3. Images

Images are immutable templates from which containers are created.

## `docker images`

``` bash
docker images
```

**Use case:** List local images.

------------------------------------------------------------------------

## `docker image ls`

``` bash
docker image ls
```

**Use case:** Modern equivalent of `docker images`.

------------------------------------------------------------------------

## Filter images

``` bash
docker image ls --filter reference=nginx
```

``` bash
docker image ls --filter dangling=true
```

**Use case:** Find matching or dangling images.

------------------------------------------------------------------------

## Show all images including intermediate images

``` bash
docker image ls -a
```

**Use case:** Troubleshoot build layers and unused images.

------------------------------------------------------------------------

## `docker pull`

``` bash
docker pull nginx:latest
```

**Use case:** Download an image from a registry.

------------------------------------------------------------------------

## Pull a specific version

``` bash
docker pull nginx:1.27
```

**Best practice:** Prefer immutable version tags or digests in
production rather than `latest`.

------------------------------------------------------------------------

## `docker push`

``` bash
docker push myregistry.example.com/myapp:1.0
```

**Use case:** Upload an image to a registry.

------------------------------------------------------------------------

## `docker tag`

``` bash
docker tag myapp:latest myregistry.example.com/myapp:1.0
```

**Use case:** Add a registry/repository/tag reference to an existing
image.

------------------------------------------------------------------------

## `docker image inspect`

``` bash
docker image inspect nginx:latest
```

**Use case:** Inspect image metadata, layers, architecture, environment,
entrypoint, command, and configuration.

------------------------------------------------------------------------

## Extract image architecture

``` bash
docker image inspect nginx:latest --format '{{.Architecture}}'
```

------------------------------------------------------------------------

## Extract image OS

``` bash
docker image inspect nginx:latest --format '{{.Os}}'
```

------------------------------------------------------------------------

## `docker image history`

``` bash
docker image history nginx:latest
```

**Use case:** See image layers and the commands that created them.

------------------------------------------------------------------------

## `docker image rm`

``` bash
docker image rm myapp:latest
```

**Use case:** Delete a local image.

------------------------------------------------------------------------

## Force-remove image

``` bash
docker image rm -f myapp:latest
```

**Use case:** Remove an image even when Docker reports dependencies.

**Warning:** Use carefully.

------------------------------------------------------------------------

## Remove dangling images

``` bash
docker image prune
```

``` bash
docker image prune -f
```

**Use case:** Reclaim space from untagged/dangling images.

------------------------------------------------------------------------

## Remove unused images

``` bash
docker image prune -a
```

**Use case:** Remove images not used by existing containers.

**Warning:** Review before using on build hosts.

------------------------------------------------------------------------

## `docker image save`

``` bash
docker image save -o nginx.tar nginx:latest
```

**Use case:** Export an image to a tar archive for offline transfer.

------------------------------------------------------------------------

## `docker image load`

``` bash
docker image load -i nginx.tar
```

**Use case:** Import an image tar archive.

------------------------------------------------------------------------

## `docker image import`

``` bash
docker image import rootfs.tar myimage:1.0
```

**Use case:** Create an image from a filesystem archive.

**Difference:** `load` restores an image created by `save`; `import`
creates an image from a root filesystem archive.

------------------------------------------------------------------------

# 4. Containers

## `docker ps`

``` bash
docker ps
```

**Use case:** List running containers.

------------------------------------------------------------------------

## List all containers

``` bash
docker ps -a
```

**Use case:** Include stopped/exited containers.

------------------------------------------------------------------------

## `docker container ls`

``` bash
docker container ls
```

**Use case:** Modern command equivalent to `docker ps`.

------------------------------------------------------------------------

## Container IDs only

``` bash
docker ps -q
```

**Use case:** Feed container IDs into scripts.

------------------------------------------------------------------------

## Filter containers

``` bash
docker ps --filter status=exited
```

``` bash
docker ps --filter name=web
```

**Use case:** Find containers by state or name.

------------------------------------------------------------------------

## `docker create`

``` bash
docker create --name web nginx
```

**Use case:** Create a container without starting it.

------------------------------------------------------------------------

## `docker run`

``` bash
docker run nginx
```

**Use case:** Create and start a container.

------------------------------------------------------------------------

## Run in detached mode

``` bash
docker run -d --name web nginx
```

**Use case:** Run a background service.

------------------------------------------------------------------------

## Run interactively

``` bash
docker run -it ubuntu bash
```

**Use case:** Start a temporary interactive shell.

------------------------------------------------------------------------

## Run and remove automatically

``` bash
docker run --rm alpine echo "hello"
```

**Use case:** One-off jobs and testing.

------------------------------------------------------------------------

## Assign a container name

``` bash
docker run -d --name my-nginx nginx
```

**Use case:** Easier management than generated container names.

------------------------------------------------------------------------

## Set hostname

``` bash
docker run --hostname app01 nginx
```

**Use case:** Applications that depend on hostname.

------------------------------------------------------------------------

## Set restart policy

``` bash
docker run -d --restart unless-stopped nginx
```

Common policies:

``` text
no
on-failure
on-failure:N
always
unless-stopped
```

**Use case:** Automatically restart services after failures or Docker
Engine restarts.

------------------------------------------------------------------------

# 5. Container Lifecycle

## `docker start`

``` bash
docker start web
```

**Use case:** Start an existing stopped container.

------------------------------------------------------------------------

## Start attached

``` bash
docker start -a web
```

**Use case:** Start and attach to container output.

------------------------------------------------------------------------

## Start interactively

``` bash
docker start -ai web
```

------------------------------------------------------------------------

## `docker stop`

``` bash
docker stop web
```

**Use case:** Gracefully stop a container.

------------------------------------------------------------------------

## Stop immediately

``` bash
docker kill web
```

**Use case:** Force-stop a container when graceful shutdown is not
working.

------------------------------------------------------------------------

## `docker restart`

``` bash
docker restart web
```

**Use case:** Restart a container.

------------------------------------------------------------------------

## Restart with timeout

``` bash
docker restart -t 30 web
```

**Use case:** Give the application up to 30 seconds to exit gracefully.

------------------------------------------------------------------------

## `docker pause`

``` bash
docker pause web
```

**Use case:** Freeze processes in a container temporarily.

------------------------------------------------------------------------

## `docker unpause`

``` bash
docker unpause web
```

------------------------------------------------------------------------

## `docker rename`

``` bash
docker rename old-name new-name
```

**Use case:** Rename a container.

------------------------------------------------------------------------

## `docker rm`

``` bash
docker rm web
```

**Use case:** Delete a stopped container.

------------------------------------------------------------------------

## Force remove a running container

``` bash
docker rm -f web
```

**Use case:** Stop and remove in one command.

------------------------------------------------------------------------

## Remove all stopped containers

``` bash
docker container prune
```

``` bash
docker container prune -f
```

**Use case:** Clean up stopped containers.

------------------------------------------------------------------------

# 6. Running Commands Inside Containers

## `docker exec`

``` bash
docker exec web ls -la
```

**Use case:** Execute a command in a running container.

------------------------------------------------------------------------

## Interactive shell

``` bash
docker exec -it web bash
```

If Bash does not exist:

``` bash
docker exec -it web sh
```

------------------------------------------------------------------------

## Execute as root

``` bash
docker exec -u 0 -it web sh
```

**Use case:** Troubleshoot permissions or system configuration.

------------------------------------------------------------------------

## Execute as a specific user

``` bash
docker exec -u 1000 web id
```

------------------------------------------------------------------------

## Set environment variables for exec command

``` bash
docker exec -e DEBUG=true web env
```

------------------------------------------------------------------------

# 7. Logs and Inspection

## `docker logs`

``` bash
docker logs web
```

**Use case:** View application output written to stdout/stderr.

------------------------------------------------------------------------

## Follow logs

``` bash
docker logs -f web
```

**Use case:** Live troubleshooting.

------------------------------------------------------------------------

## Last 100 lines

``` bash
docker logs --tail 100 web
```

------------------------------------------------------------------------

## Logs since a time

``` bash
docker logs --since 30m web
```

------------------------------------------------------------------------

## Logs with timestamps

``` bash
docker logs -t web
```

------------------------------------------------------------------------

## Combine options

``` bash
docker logs -f --tail 100 --timestamps web
```

------------------------------------------------------------------------

## `docker inspect`

``` bash
docker inspect web
```

**Use case:** Inspect complete container configuration and runtime
state.

------------------------------------------------------------------------

## Inspect container state

``` bash
docker inspect -f '{{.State.Status}}' web
```

------------------------------------------------------------------------

## Inspect exit code

``` bash
docker inspect -f '{{.State.ExitCode}}' web
```

------------------------------------------------------------------------

## Inspect IP address

``` bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
```

------------------------------------------------------------------------

## Inspect mounts

``` bash
docker inspect -f '{{json .Mounts}}' web
```

------------------------------------------------------------------------

## Inspect environment

``` bash
docker inspect -f '{{json .Config.Env}}' web
```

------------------------------------------------------------------------

# 8. Copying Files

## `docker cp`

Copy from host to container:

``` bash
docker cp ./config.yml web:/app/config.yml
```

Copy from container to host:

``` bash
docker cp web:/var/log/app.log ./app.log
```

**Use case:** Transfer files for troubleshooting or data extraction.

**Best practice:** Don't treat `docker cp` as the primary configuration
mechanism for production. Prefer images, volumes, configs, or mounted
configuration.

------------------------------------------------------------------------

# 9. Docker Exec and Attach

## `docker attach`

``` bash
docker attach web
```

**Use case:** Attach your terminal to the container's main process.

**Important:** `Ctrl+C` can send a signal to the main process. For
troubleshooting, `docker exec -it` is usually safer.

------------------------------------------------------------------------

## Detach from attached container

Usually:

``` text
Ctrl-p Ctrl-q
```

------------------------------------------------------------------------

# 10. Port Publishing

## Publish host port to container port

``` bash
docker run -d -p 8080:80 nginx
```

Meaning:

``` text
HOST:CONTAINER
8080:80
```

**Use case:** Access an HTTP service in the container through host port
8080.

------------------------------------------------------------------------

## Bind to a specific host IP

``` bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

**Use case:** Make the service accessible only from the local host.

------------------------------------------------------------------------

## Publish UDP

``` bash
docker run -d -p 5353:53/udp dns-server
```

------------------------------------------------------------------------

## Publish all Dockerfile EXPOSE ports

``` bash
docker run -P nginx
```

**Use case:** Automatically map exposed ports to random host ports.

------------------------------------------------------------------------

## View port mappings

``` bash
docker port web
```

------------------------------------------------------------------------

# 11. Environment Variables

## Set one variable

``` bash
docker run -e APP_ENV=production myapp:1.0
```

------------------------------------------------------------------------

## Set multiple variables

``` bash
docker run \
  -e APP_ENV=production \
  -e LOG_LEVEL=info \
  myapp:1.0
```

------------------------------------------------------------------------

## Read environment variables from file

``` bash
docker run --env-file .env myapp:1.0
```

**Use case:** Supply configuration without putting every variable in the
command line.

**Security note:** `.env` files are not automatically secure secret
stores.

------------------------------------------------------------------------

# 12. Volumes

Docker volumes are Docker-managed persistent storage.

## `docker volume ls`

``` bash
docker volume ls
```

**Use case:** List Docker volumes.

------------------------------------------------------------------------

## `docker volume create`

``` bash
docker volume create app-data
```

**Use case:** Create persistent storage.

------------------------------------------------------------------------

## Mount a volume

``` bash
docker run -d \
  --name db \
  -v app-data:/var/lib/mysql \
  mysql:8
```

------------------------------------------------------------------------

## Read-only volume

``` bash
docker run -d \
  -v app-data:/data:ro \
  myapp
```

------------------------------------------------------------------------

## `docker volume inspect`

``` bash
docker volume inspect app-data
```

**Use case:** Find volume metadata and mountpoint.

------------------------------------------------------------------------

## `docker volume rm`

``` bash
docker volume rm app-data
```

------------------------------------------------------------------------

## Remove unused volumes

``` bash
docker volume prune
```

``` bash
docker volume prune -f
```

**Warning:** This permanently deletes unused volumes and their data.

------------------------------------------------------------------------

# 13. Bind Mounts

## Bind mount current directory

Linux/macOS:

``` bash
docker run -it \
  --mount type=bind,source="$PWD",target=/app \
  ubuntu bash
```

Short form:

``` bash
docker run -it -v "$PWD":/app ubuntu bash
```

**Use case:** Development workflows where host source code is mounted
into a container.

------------------------------------------------------------------------

## Read-only bind mount

``` bash
docker run \
  --mount type=bind,source="$PWD/config",target=/etc/myapp,readonly \
  myapp
```

**Use case:** Prevent the container from modifying host configuration.

------------------------------------------------------------------------

## Named volume vs bind mount

``` text
Named volume:
-v app-data:/data

Bind mount:
-v /host/path:/container/path
```

**Rule of thumb:** - Use named volumes for Docker-managed persistent
application data. - Use bind mounts for development/source/configuration
integration.

------------------------------------------------------------------------

# 14. Networks

## `docker network ls`

``` bash
docker network ls
```

**Use case:** List Docker networks.

------------------------------------------------------------------------

## `docker network create`

``` bash
docker network create app-net
```

**Use case:** Create an isolated application network.

------------------------------------------------------------------------

## Create a bridge network with subnet

``` bash
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  app-net
```

------------------------------------------------------------------------

## Run container on network

``` bash
docker run -d --name web --network app-net nginx
```

------------------------------------------------------------------------

## Connect an existing container

``` bash
docker network connect app-net web
```

------------------------------------------------------------------------

## Disconnect container

``` bash
docker network disconnect app-net web
```

------------------------------------------------------------------------

## Inspect network

``` bash
docker network inspect app-net
```

**Use case:** Troubleshoot container membership, IPs, gateways, and
network configuration.

------------------------------------------------------------------------

## Remove network

``` bash
docker network rm app-net
```

------------------------------------------------------------------------

## Remove unused networks

``` bash
docker network prune
```

------------------------------------------------------------------------

## Container-to-container DNS

If both containers are on the same user-defined network:

``` bash
docker run -d --name db --network app-net postgres
docker run -it --rm --network app-net alpine sh
```

Inside the Alpine container:

``` sh
ping db
```

**Use case:** Containers can normally resolve each other by
container/service name on user-defined networks.

------------------------------------------------------------------------

# 15. Dockerfile and Builds

## `docker build`

``` bash
docker build -t myapp:1.0 .
```

**Use case:** Build an image using the Dockerfile in the current
directory.

------------------------------------------------------------------------

## Specify Dockerfile

``` bash
docker build -f Dockerfile.prod -t myapp:prod .
```

------------------------------------------------------------------------

## Pass build arguments

Dockerfile:

``` dockerfile
ARG APP_VERSION
RUN echo "$APP_VERSION"
```

Build:

``` bash
docker build \
  --build-arg APP_VERSION=1.2.3 \
  -t myapp:1.2.3 .
```

**Important:** Do not use `ARG` for secrets.

------------------------------------------------------------------------

## Build without cache

``` bash
docker build --no-cache -t myapp:latest .
```

**Use case:** Troubleshoot stale build layers.

------------------------------------------------------------------------

## Pull newer base images

``` bash
docker build --pull -t myapp:latest .
```

------------------------------------------------------------------------

## Tag during build

``` bash
docker build -t registry.example.com/team/myapp:1.0 .
```

------------------------------------------------------------------------

## Build from stdin

``` bash
docker build -t myapp - < Dockerfile
```

------------------------------------------------------------------------

## Show build progress

``` bash
docker build --progress=plain -t myapp .
```

**Use case:** Detailed CI/build troubleshooting.

------------------------------------------------------------------------

## Build with a specific target

Dockerfile:

``` dockerfile
FROM node:22 AS build
# ...

FROM nginx:alpine AS production
# ...
```

Build:

``` bash
docker build --target production -t myapp:prod .
```

**Use case:** Multi-stage builds and debugging individual stages.

------------------------------------------------------------------------

# 16. Build Cache and BuildKit

Modern Docker builds generally use BuildKit.

## Inspect builder

``` bash
docker buildx ls
```

------------------------------------------------------------------------

## Build using BuildKit/buildx

``` bash
docker buildx build -t myapp:latest .
```

------------------------------------------------------------------------

## Build and load into local Docker images

``` bash
docker buildx build \
  --load \
  -t myapp:latest .
```

**Use case:** Use a buildx-built image immediately with `docker run`.

------------------------------------------------------------------------

## Build and push directly

``` bash
docker buildx build \
  --push \
  -t registry.example.com/team/myapp:1.0 .
```

**Use case:** CI/CD pipelines and multi-platform builds.

------------------------------------------------------------------------

## Remove build cache

``` bash
docker builder prune
```

``` bash
docker builder prune -a
```

**Use case:** Reclaim build cache disk space.

------------------------------------------------------------------------

# 17. Registries

## `docker login`

``` bash
docker login
```

**Use case:** Authenticate to a container registry.

------------------------------------------------------------------------

## Login to a specific registry

``` bash
docker login registry.example.com
```

------------------------------------------------------------------------

## `docker logout`

``` bash
docker logout registry.example.com
```

------------------------------------------------------------------------

## Registry image naming

``` text
registry.example.com/namespace/repository:tag
```

Example:

``` text
ghcr.io/company/web:1.4.0
```

------------------------------------------------------------------------

# 18. Docker Hub / Registry Image Workflow

Typical workflow:

``` bash
docker build -t myuser/myapp:1.0 .
docker login
docker push myuser/myapp:1.0
```

Pull elsewhere:

``` bash
docker pull myuser/myapp:1.0
```

Run:

``` bash
docker run -d myuser/myapp:1.0
```

------------------------------------------------------------------------

# 19. Docker Compose

Modern Docker uses the `docker compose` command.

## Start services

``` bash
docker compose up
```

------------------------------------------------------------------------

## Start in background

``` bash
docker compose up -d
```

------------------------------------------------------------------------

## Build and start

``` bash
docker compose up -d --build
```

------------------------------------------------------------------------

## Stop services

``` bash
docker compose stop
```

------------------------------------------------------------------------

## Stop and remove containers/networks

``` bash
docker compose down
```

------------------------------------------------------------------------

## Remove volumes too

``` bash
docker compose down -v
```

**Warning:** This deletes Compose-managed volumes.

------------------------------------------------------------------------

## Remove images

``` bash
docker compose down --rmi local
```

------------------------------------------------------------------------

## List services

``` bash
docker compose ps
```

------------------------------------------------------------------------

## View logs

``` bash
docker compose logs
```

------------------------------------------------------------------------

## Follow logs

``` bash
docker compose logs -f
```

------------------------------------------------------------------------

## Logs for one service

``` bash
docker compose logs -f api
```

------------------------------------------------------------------------

## Build services

``` bash
docker compose build
```

------------------------------------------------------------------------

## Pull service images

``` bash
docker compose pull
```

------------------------------------------------------------------------

## Restart services

``` bash
docker compose restart
```

------------------------------------------------------------------------

## Execute command in service

``` bash
docker compose exec api sh
```

------------------------------------------------------------------------

## Run one-off service command

``` bash
docker compose run --rm api python manage.py migrate
```

**Use case:** Run administrative jobs without changing the long-running
service.

------------------------------------------------------------------------

## Scale a service

``` bash
docker compose up -d --scale worker=3
```

**Note:** Compose scaling has limitations compared with an orchestrator
such as Kubernetes.

------------------------------------------------------------------------

## Validate Compose configuration

``` bash
docker compose config
```

**Use case:** Render/validate the merged Compose configuration and
troubleshoot interpolation.

------------------------------------------------------------------------

## Use a specific Compose file

``` bash
docker compose -f docker-compose.prod.yml up -d
```

------------------------------------------------------------------------

## Use multiple Compose files

``` bash
docker compose \
  -f compose.yml \
  -f compose.prod.yml \
  up -d
```

------------------------------------------------------------------------

# 20. Docker Contexts

Contexts let the Docker CLI communicate with different Docker
daemons/endpoints.

## List contexts

``` bash
docker context ls
```

------------------------------------------------------------------------

## Create a context

``` bash
docker context create remote \
  --docker "host=ssh://user@server"
```

------------------------------------------------------------------------

## Switch context

``` bash
docker context use remote
```

------------------------------------------------------------------------

## Inspect context

``` bash
docker context inspect remote
```

------------------------------------------------------------------------

## Remove context

``` bash
docker context rm remote
```

**Use case:** Manage remote Docker hosts without repeatedly changing
environment variables.

------------------------------------------------------------------------

# 21. Docker Plugins

## List plugins

``` bash
docker plugin ls
```

------------------------------------------------------------------------

## Inspect plugin

``` bash
docker plugin inspect PLUGIN
```

------------------------------------------------------------------------

## Install plugin

``` bash
docker plugin install PLUGIN
```

**Use case:** Add Docker Engine plugin functionality such as certain
volume/network drivers.

------------------------------------------------------------------------

## Enable plugin

``` bash
docker plugin enable PLUGIN
```

------------------------------------------------------------------------

## Disable plugin

``` bash
docker plugin disable PLUGIN
```

------------------------------------------------------------------------

## Remove plugin

``` bash
docker plugin rm PLUGIN
```

------------------------------------------------------------------------

# 22. Docker Events

## Stream Docker events

``` bash
docker events
```

**Use case:** Real-time troubleshooting of container/image/network
lifecycle events.

------------------------------------------------------------------------

## Filter events

``` bash
docker events --filter type=container
```

``` bash
docker events --filter event=stop
```

``` bash
docker events --filter container=web
```

------------------------------------------------------------------------

# 23. Docker Stats

## Live resource usage

``` bash
docker stats
```

**Use case:** Monitor CPU, memory, network I/O, and block I/O.

------------------------------------------------------------------------

## Specific container

``` bash
docker stats web
```

------------------------------------------------------------------------

## One-time stats output

``` bash
docker stats --no-stream web
```

**Use case:** Scripts and quick resource snapshots.

------------------------------------------------------------------------

# 24. Docker System Cleanup

## Disk usage

``` bash
docker system df
```

**Use case:** Understand Docker disk consumption.

------------------------------------------------------------------------

## Detailed disk usage

``` bash
docker system df -v
```

------------------------------------------------------------------------

## Remove unused containers/networks/images

``` bash
docker system prune
```

------------------------------------------------------------------------

## Aggressive cleanup including unused images

``` bash
docker system prune -a
```

------------------------------------------------------------------------

## Include unused volumes

``` bash
docker system prune -a --volumes
```

**Warning:** This can remove significant amounts of data. Always inspect
before running on production hosts.

------------------------------------------------------------------------

# 25. Docker Checkpoint

Checkpoint functionality depends on runtime/platform support.

## List checkpoints

``` bash
docker checkpoint ls CONTAINER
```

------------------------------------------------------------------------

## Create checkpoint

``` bash
docker checkpoint create CONTAINER checkpoint1
```

------------------------------------------------------------------------

## Start from checkpoint

``` bash
docker start --checkpoint checkpoint1 CONTAINER
```

**Use case:** Checkpoint/restore workflows where supported.

------------------------------------------------------------------------

# 26. Docker Trust / Content Trust

These commands relate to Docker Content Trust / Notary-based image
signing and availability can depend on the Docker release/environment.

## Sign/push with trust enabled

Linux/macOS:

``` bash
export DOCKER_CONTENT_TRUST=1
docker push myuser/myapp:1.0
```

------------------------------------------------------------------------

## Disable for current shell

``` bash
export DOCKER_CONTENT_TRUST=0
```

**Use case:** Verify/sign images using content-trust workflows.

------------------------------------------------------------------------

# 27. Docker Manifest

## Inspect manifest

``` bash
docker manifest inspect nginx:latest
```

**Use case:** Inspect image manifests and multi-platform image
information.

------------------------------------------------------------------------

## Create a manifest list

``` bash
docker manifest create \
  myuser/myapp:latest \
  myuser/myapp:amd64 \
  myuser/myapp:arm64
```

------------------------------------------------------------------------

## Push manifest list

``` bash
docker manifest push myuser/myapp:latest
```

**Use case:** Publish a multi-architecture image reference.

**Note:** Buildx is generally the preferred modern approach for
multi-platform builds.

------------------------------------------------------------------------

# 28. Docker Scout

Docker Scout is used for image analysis, recommendations, and
supply-chain/security insights where available.

Common commands on installations that include Scout:

``` bash
docker scout quickview myapp:1.0
```

``` bash
docker scout cves myapp:1.0
```

``` bash
docker scout recommendations myapp:1.0
```

**Use case:** Identify vulnerabilities and image improvement
opportunities.

------------------------------------------------------------------------

# 29. Docker Buildx

## List builders

``` bash
docker buildx ls
```

------------------------------------------------------------------------

## Inspect current builder

``` bash
docker buildx inspect
```

------------------------------------------------------------------------

## Create builder

``` bash
docker buildx create --name multiarch --use
```

------------------------------------------------------------------------

## Use builder

``` bash
docker buildx use multiarch
```

------------------------------------------------------------------------

## Bootstrap builder

``` bash
docker buildx inspect --bootstrap
```

------------------------------------------------------------------------

## Multi-platform build

``` bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/myapp:1.0 \
  --push .
```

**Use case:** Publish one tag that supports multiple CPU architectures.

------------------------------------------------------------------------

## Build for a single platform

``` bash
docker buildx build \
  --platform linux/amd64 \
  --load \
  -t myapp:amd64 .
```

------------------------------------------------------------------------

## Remove builder

``` bash
docker buildx rm multiarch
```

------------------------------------------------------------------------

# 30. Docker Swarm

Swarm provides Docker's built-in orchestration functionality.

## Initialize Swarm

``` bash
docker swarm init
```

------------------------------------------------------------------------

## View Swarm status

``` bash
docker info
```

Look for:

``` text
Swarm: active
```

------------------------------------------------------------------------

## Join a worker

Manager provides a command similar to:

``` bash
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

------------------------------------------------------------------------

## Leave Swarm

Worker:

``` bash
docker swarm leave
```

Manager:

``` bash
docker swarm leave --force
```

**Warning:** `--force` is destructive to that node's Swarm membership.

------------------------------------------------------------------------

## Get join token

``` bash
docker swarm join-token worker
```

``` bash
docker swarm join-token manager
```

------------------------------------------------------------------------

## Rotate join token

``` bash
docker swarm join-token --rotate worker
```

------------------------------------------------------------------------

# 31. Secrets and Configs in Swarm

## Create secret

``` bash
printf 'supersecret' | docker secret create db_password -
```

------------------------------------------------------------------------

## List secrets

``` bash
docker secret ls
```

------------------------------------------------------------------------

## Inspect secret metadata

``` bash
docker secret inspect db_password
```

**Note:** Secret contents are not returned by `inspect`.

------------------------------------------------------------------------

## Remove secret

``` bash
docker secret rm db_password
```

------------------------------------------------------------------------

## Create config

``` bash
docker config create app_config ./app.conf
```

------------------------------------------------------------------------

## List configs

``` bash
docker config ls
```

------------------------------------------------------------------------

## Inspect config

``` bash
docker config inspect app_config
```

------------------------------------------------------------------------

## Remove config

``` bash
docker config rm app_config
```

**Use case:** Swarm secrets/configs provide better separation from
ordinary environment variables and image contents.

------------------------------------------------------------------------

# 32. Docker Service

## Create a service

``` bash
docker service create \
  --name web \
  --publish 8080:80 \
  nginx
```

------------------------------------------------------------------------

## List services

``` bash
docker service ls
```

------------------------------------------------------------------------

## Inspect service

``` bash
docker service inspect web
```

------------------------------------------------------------------------

## Pretty-print service inspection

``` bash
docker service inspect --pretty web
```

------------------------------------------------------------------------

## List service tasks

``` bash
docker service ps web
```

**Use case:** See which nodes are running service tasks.

------------------------------------------------------------------------

## Service logs

``` bash
docker service logs web
```

``` bash
docker service logs -f web
```

------------------------------------------------------------------------

## Scale service

``` bash
docker service scale web=5
```

**Use case:** Run five replicas.

------------------------------------------------------------------------

## Update service image

``` bash
docker service update \
  --image nginx:1.28 \
  web
```

------------------------------------------------------------------------

## Roll back service

``` bash
docker service rollback web
```

------------------------------------------------------------------------

## Remove service

``` bash
docker service rm web
```

------------------------------------------------------------------------

# 33. Docker Stack

## Deploy stack

``` bash
docker stack deploy \
  -c compose.yml \
  myapp
```

**Use case:** Deploy a multi-service application to Swarm.

------------------------------------------------------------------------

## List stacks

``` bash
docker stack ls
```

------------------------------------------------------------------------

## List stack services

``` bash
docker stack services myapp
```

------------------------------------------------------------------------

## List stack tasks

``` bash
docker stack ps myapp
```

------------------------------------------------------------------------

## Stack config

``` bash
docker stack config -c compose.yml
```

**Use case:** Render the stack configuration before deployment.

------------------------------------------------------------------------

## Remove stack

``` bash
docker stack rm myapp
```

------------------------------------------------------------------------

# 34. Docker Node

## List Swarm nodes

``` bash
docker node ls
```

------------------------------------------------------------------------

## Inspect node

``` bash
docker node inspect NODE
```

------------------------------------------------------------------------

## Pretty node inspection

``` bash
docker node inspect --pretty NODE
```

------------------------------------------------------------------------

## Promote worker

``` bash
docker node promote NODE
```

------------------------------------------------------------------------

## Demote manager

``` bash
docker node demote NODE
```

------------------------------------------------------------------------

## Drain node

``` bash
docker node update --availability drain NODE
```

**Use case:** Prevent new tasks from running on a node and move
supported workloads elsewhere.

------------------------------------------------------------------------

## Make node active

``` bash
docker node update --availability active NODE
```

------------------------------------------------------------------------

## Remove node

``` bash
docker node rm NODE
```

------------------------------------------------------------------------

# 35. Docker Swarm Troubleshooting

Useful commands:

``` bash
docker node ls
docker service ls
docker service ps <service>
docker service inspect <service>
docker service logs <service>
docker stack ps <stack>
docker network ls
docker network inspect <network>
```

**Typical workflow:**

1.  Check node health.
2.  Check desired vs actual service replicas.
3.  Inspect failed tasks.
4.  Review service logs.
5.  Check overlay network connectivity.
6.  Verify image availability and registry authentication.
7.  Check resource constraints and placement rules.

------------------------------------------------------------------------

# 36. Common Troubleshooting Commands

## Why did a container exit?

``` bash
docker ps -a
docker inspect <container> --format '{{.State.Status}}'
docker inspect <container> --format '{{.State.ExitCode}}'
docker logs <container>
```

------------------------------------------------------------------------

## Check restart count

``` bash
docker inspect <container> \
  --format '{{.RestartCount}}'
```

------------------------------------------------------------------------

## Check container health

``` bash
docker inspect <container> \
  --format '{{json .State.Health}}'
```

------------------------------------------------------------------------

## Check image command

``` bash
docker image inspect <image> \
  --format '{{json .Config.Cmd}}'
```

------------------------------------------------------------------------

## Check entrypoint

``` bash
docker image inspect <image> \
  --format '{{json .Config.Entrypoint}}'
```

------------------------------------------------------------------------

## Check container command and entrypoint

``` bash
docker inspect <container> \
  --format 'Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}'
```

------------------------------------------------------------------------

## Check mounts

``` bash
docker inspect <container> \
  --format '{{json .Mounts}}'
```

------------------------------------------------------------------------

## Check networks

``` bash
docker inspect <container> \
  --format '{{json .NetworkSettings.Networks}}'
```

------------------------------------------------------------------------

## Check published ports

``` bash
docker port <container>
```

------------------------------------------------------------------------

## Test DNS from a container

``` bash
docker exec <container> getent hosts <other-container>
```

If `getent` is unavailable, use an appropriate diagnostic image/tool.

------------------------------------------------------------------------

## Test HTTP connectivity

``` bash
docker exec <container> curl -v http://api:8080/health
```

If `curl` is not installed, use an image/tool that provides it.

------------------------------------------------------------------------

## Check processes

``` bash
docker top <container>
```

**Use case:** View processes running inside a container.

------------------------------------------------------------------------

## Check resource usage

``` bash
docker stats <container>
```

------------------------------------------------------------------------

## Check daemon events

``` bash
docker events
```

------------------------------------------------------------------------

# 37. Production-Safe Inspection Commands

These are generally read-only and useful before making changes.

``` bash
docker version
docker info
docker ps -a
docker image ls
docker volume ls
docker network ls
docker system df
docker stats --no-stream
docker inspect <container>
docker image inspect <image>
docker network inspect <network>
docker volume inspect <volume>
docker logs --tail 200 <container>
```

**Recommended incident sequence:**

``` text
1. docker ps -a
2. docker logs <container>
3. docker inspect <container>
4. docker stats --no-stream <container>
5. docker network inspect <network>
6. docker image inspect <image>
7. docker events
```

------------------------------------------------------------------------

# 38. Useful One-Liners

## List all containers with useful status fields

``` bash
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

------------------------------------------------------------------------

## List only running container names

``` bash
docker ps --format '{{.Names}}'
```

------------------------------------------------------------------------

## List container IDs and names

``` bash
docker ps -a --format '{{.ID}} {{.Names}}'
```

------------------------------------------------------------------------

## Find containers that exited

``` bash
docker ps -a --filter status=exited
```

------------------------------------------------------------------------

## Find containers exited with code 1

``` bash
docker ps -aq --filter status=exited | \
xargs -r docker inspect --format '{{.Name}} {{.State.ExitCode}}' | \
awk '$2 == 1'
```

------------------------------------------------------------------------

## Remove all stopped containers

``` bash
docker container prune -f
```

------------------------------------------------------------------------

## Remove dangling images

``` bash
docker image prune -f
```

------------------------------------------------------------------------

## Remove unused networks

``` bash
docker network prune -f
```

------------------------------------------------------------------------

## Show Docker disk usage

``` bash
docker system df -v
```

------------------------------------------------------------------------

## Follow logs for multiple containers

``` bash
docker logs -f container1
```

For multi-service applications:

``` bash
docker compose logs -f
```

------------------------------------------------------------------------

## Get container IP

``` bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>
```

------------------------------------------------------------------------

## Get container PID on host

``` bash
docker inspect -f '{{.State.Pid}}' <container>
```

**Use case:** Advanced Linux host-level troubleshooting.

------------------------------------------------------------------------

## Get container image

``` bash
docker inspect -f '{{.Config.Image}}' <container>
```

------------------------------------------------------------------------

## Get container restart count

``` bash
docker inspect -f '{{.RestartCount}}' <container>
```

------------------------------------------------------------------------

## Get container creation time

``` bash
docker inspect -f '{{.Created}}' <container>
```

------------------------------------------------------------------------

# 39. Dockerfile Quick Reference

## `FROM`

``` dockerfile
FROM python:3.12-slim
```

**Use:** Select base image.

------------------------------------------------------------------------

## `RUN`

``` dockerfile
RUN apt-get update && apt-get install -y curl
```

**Use:** Execute commands while building the image.

------------------------------------------------------------------------

## `COPY`

``` dockerfile
COPY . /app
```

**Use:** Copy files from build context into image.

------------------------------------------------------------------------

## `ADD`

``` dockerfile
ADD app.tar.gz /app/
```

**Use:** Copy files with additional archive/URL semantics.

**Best practice:** Prefer `COPY` unless `ADD`'s special behavior is
actually required.

------------------------------------------------------------------------

## `WORKDIR`

``` dockerfile
WORKDIR /app
```

**Use:** Set working directory for subsequent instructions and default
runtime working directory.

------------------------------------------------------------------------

## `ENV`

``` dockerfile
ENV APP_ENV=production
```

**Use:** Define runtime environment variables.

**Security:** Do not put secrets in `ENV`.

------------------------------------------------------------------------

## `ARG`

``` dockerfile
ARG APP_VERSION=1.0
```

**Use:** Build-time variable.

**Security:** Do not use `ARG` for secrets.

------------------------------------------------------------------------

## `EXPOSE`

``` dockerfile
EXPOSE 8080
```

**Use:** Document the intended container listening port. It does not
publish the port to the host.

------------------------------------------------------------------------

## `USER`

``` dockerfile
USER 1000
```

**Use:** Run the application as a non-root user.

------------------------------------------------------------------------

## `ENTRYPOINT`

``` dockerfile
ENTRYPOINT ["./server"]
```

**Use:** Define the main executable.

------------------------------------------------------------------------

## `CMD`

``` dockerfile
CMD ["--port", "8080"]
```

**Use:** Default arguments/command.

------------------------------------------------------------------------

## `HEALTHCHECK`

``` dockerfile
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:8080/health || exit 1
```

**Use:** Tell Docker how to determine application health.

------------------------------------------------------------------------

## `LABEL`

``` dockerfile
LABEL org.opencontainers.image.title="myapp"
```

**Use:** Add image metadata.

------------------------------------------------------------------------

## `SHELL`

``` dockerfile
SHELL ["/bin/bash", "-c"]
```

**Use:** Change the shell used by shell-form instructions.

------------------------------------------------------------------------

## `STOPSIGNAL`

``` dockerfile
STOPSIGNAL SIGTERM
```

**Use:** Customize the signal Docker sends when stopping the container.

------------------------------------------------------------------------

## Multi-stage build

``` dockerfile
FROM golang:1.24 AS build

WORKDIR /src
COPY . .
RUN go build -o /out/app .

FROM debian:bookworm-slim

COPY --from=build /out/app /usr/local/bin/app

USER 10001
ENTRYPOINT ["/usr/local/bin/app"]
```

**Use case:** Keep compilers/build tools out of the production image.

------------------------------------------------------------------------

# 40. Docker Compose Quick Reference

Example:

``` yaml
services:
  web:
    image: nginx:1.27
    ports:
      - "8080:80"
    environment:
      APP_ENV: production
    volumes:
      - web-data:/data
    networks:
      - app

  api:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - db
    networks:
      - app

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app

volumes:
  web-data:
  db-data:

networks:
  app:
```

Common commands:

``` bash
docker compose up -d
docker compose ps
docker compose logs -f
docker compose exec api sh
docker compose build
docker compose pull
docker compose restart
docker compose stop
docker compose down
docker compose down -v
docker compose config
```

------------------------------------------------------------------------

# 41. Command Selection Cheat Sheet

  Goal                          Command
  ----------------------------- -----------------------------------------------
  Check Docker version          `docker version`
  Check Engine info             `docker info`
  List running containers       `docker ps`
  List all containers           `docker ps -a`
  Start container               `docker start NAME`
  Stop container                `docker stop NAME`
  Restart container             `docker restart NAME`
  Force kill container          `docker kill NAME`
  Remove container              `docker rm NAME`
  Run new container             `docker run ...`
  Execute inside container      `docker exec -it NAME sh`
  View logs                     `docker logs NAME`
  Follow logs                   `docker logs -f NAME`
  Inspect container             `docker inspect NAME`
  Copy files                    `docker cp ...`
  Show processes                `docker top NAME`
  Monitor resources             `docker stats`
  List images                   `docker image ls`
  Pull image                    `docker pull IMAGE`
  Build image                   `docker build -t IMAGE .`
  Remove image                  `docker image rm IMAGE`
  Inspect image                 `docker image inspect IMAGE`
  Image history                 `docker image history IMAGE`
  Export image                  `docker image save`
  Import saved image            `docker image load`
  List volumes                  `docker volume ls`
  Create volume                 `docker volume create NAME`
  Inspect volume                `docker volume inspect NAME`
  Remove volume                 `docker volume rm NAME`
  List networks                 `docker network ls`
  Create network                `docker network create NAME`
  Inspect network               `docker network inspect NAME`
  Connect container             `docker network connect NET CONTAINER`
  Remove network                `docker network rm NAME`
  Disk usage                    `docker system df -v`
  Clean unused Docker objects   `docker system prune`
  Start Compose stack           `docker compose up -d`
  Stop Compose stack            `docker compose down`
  Compose logs                  `docker compose logs -f`
  Compose shell                 `docker compose exec SERVICE sh`
  List contexts                 `docker context ls`
  Switch context                `docker context use NAME`
  List Swarm nodes              `docker node ls`
  List Swarm services           `docker service ls`
  Deploy Swarm stack            `docker stack deploy -c compose.yml STACK`
  List builders                 `docker buildx ls`
  Multi-platform build          `docker buildx build --platform ... --push .`

------------------------------------------------------------------------

# Production Docker Command Principles

## 1. Prefer immutable image versions

Prefer:

``` bash
docker pull nginx:1.27.5
```

or, when appropriate:

``` text
image@sha256:<digest>
```

over:

``` bash
docker pull nginx:latest
```

------------------------------------------------------------------------

## 2. Don't store secrets in images

Avoid:

``` dockerfile
ENV DB_PASSWORD=SuperSecret
```

and:

``` dockerfile
ARG DB_PASSWORD=SuperSecret
```

Use a proper secret mechanism instead.

------------------------------------------------------------------------

## 3. Run as non-root

Example:

``` dockerfile
USER 10001
```

------------------------------------------------------------------------

## 4. Use health checks

A health check helps distinguish:

``` text
container is running
```

from:

``` text
application is actually healthy
```

------------------------------------------------------------------------

## 5. Keep images small

Use:

-   Minimal suitable base images
-   Multi-stage builds
-   `.dockerignore`
-   Fewer unnecessary packages
-   Cleanup of package-manager caches where appropriate

------------------------------------------------------------------------

## 6. Avoid unnecessary `--privileged`

This:

``` bash
docker run --privileged ...
```

gives a container substantially more host access.

Use only when the workload genuinely requires it.

------------------------------------------------------------------------

## 7. Treat destructive cleanup commands carefully

Especially:

``` bash
docker system prune -a --volumes
```

This can remove unused images, containers, networks, and volumes.

------------------------------------------------------------------------

# Fast Troubleshooting Flow

When a container is not working:

``` bash
docker ps -a
```

Then:

``` bash
docker logs <container>
```

Then:

``` bash
docker inspect <container>
```

Check:

``` bash
docker stats --no-stream <container>
```

Check networking:

``` bash
docker network ls
docker network inspect <network>
```

Check image:

``` bash
docker image inspect <image>
docker image history <image>
```

If the container exits immediately:

``` bash
docker inspect <container> \
  --format 'Status={{.State.Status}} ExitCode={{.State.ExitCode}} Error={{.State.Error}}'
```

Then inspect:

``` bash
docker inspect <container> \
  --format 'Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}'
```

Finally, reproduce interactively:

``` bash
docker run --rm -it <image> sh
```

or:

``` bash
docker run --rm -it --entrypoint sh <image>
```

------------------------------------------------------------------------

# Important Distinctions

## `docker run` vs `docker start`

``` text
docker run
= create a NEW container + start it

docker start
= start an EXISTING stopped container
```

## `docker exec` vs `docker run`

``` text
docker exec
= execute a command inside an existing RUNNING container

docker run
= create and start a NEW container
```

## `docker stop` vs `docker kill`

``` text
docker stop
= graceful shutdown attempt

docker kill
= immediate signal/termination
```

## `docker rm` vs `docker rmi`

``` text
docker rm
= remove container

docker rmi / docker image rm
= remove image
```

## Volume vs bind mount

``` text
Volume
= Docker-managed storage

Bind mount
= explicit host filesystem path mounted into container
```

## `EXPOSE` vs `-p`

``` text
EXPOSE 8080
= documents intended container port

-p 8080:8080
= publishes the port from container to host
```

## `CMD` vs `ENTRYPOINT`

``` text
ENTRYPOINT
= primary executable

CMD
= default command/arguments that can normally be overridden
```

------------------------------------------------------------------------

# Recommended Learning Order

If you are preparing for real-world DevOps/Cloud engineering work, learn
the commands in this order:

``` text
1. docker version
2. docker info
3. docker pull
4. docker image ls
5. docker build
6. docker run
7. docker ps
8. docker stop / start / restart
9. docker rm
10. docker logs
11. docker exec
12. docker inspect
13. docker cp
14. docker stats
15. docker network
16. docker volume
17. Dockerfile
18. docker compose
19. registries
20. buildx / multi-platform builds
21. security and image scanning
22. Swarm
23. Kubernetes
```

------------------------------------------------------------------------

# Command Syntax Reminder

Most Docker commands follow this pattern:

``` text
docker [global options] COMMAND [command options] [arguments]
```

Examples:

``` bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
docker build [OPTIONS] PATH | URL | -
docker exec [OPTIONS] CONTAINER COMMAND [ARG...]
docker inspect [OPTIONS] NAME|ID [NAME|ID...]
```

For the authoritative syntax on your installed version:

``` bash
docker COMMAND --help
```
