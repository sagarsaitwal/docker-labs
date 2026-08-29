# Example: first Compose stack

A two-service stack (nginx + PostgreSQL) using only official images. Read
[`compose.yaml`](compose.yaml) — every line is commented with *why*.

## Run it

```bash
cd examples/first-stack
docker compose up -d
docker compose ps
```

`docker compose ps` shows `db` as `(healthy)` before `web` starts. That's
`depends_on: condition: service_healthy` doing its job.

Open <http://localhost:8080>.

## Things to try

Prove the service name is a DNS name:

```bash
docker compose exec web getent hosts db
```

Prove the volume persists data across a container's whole lifetime:

```bash
docker compose exec db psql -U appuser -d appdb -c 'CREATE TABLE demo(id int);'
docker compose down          # containers destroyed, volume kept
docker compose up -d
docker compose exec db psql -U appuser -d appdb -c '\dt'    # demo table is still there
```

Then prove how you lose it:

```bash
docker compose down -v       # the -v also deletes the volume
docker compose up -d
docker compose exec db psql -U appuser -d appdb -c '\dt'    # "Did not find any relations."
```

Change the published port without editing the file:

```bash
WEB_PORT=9090 docker compose up -d
```

## Clean up

```bash
docker compose down -v
```
