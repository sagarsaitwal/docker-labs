# Projects

Three builds of increasing difficulty. Each folder currently holds a **brief**,
not a solution — the point is to build it yourself and commit the result.

| # | Project | Skills it forces you to learn | Target day |
|---|---|---|---|
| 01 | [Node + Postgres API](01-node-postgres/) | Compose, service DNS, named volumes, healthchecks, env config | Day 9–10 |
| 02 | [Python API + Redis](02-python-redis/) | Non-root user, `.dockerignore`, layer caching, restart policies | Day 11–12 |
| 03 | [React multi-stage build](03-react-multistage/) | Multi-stage builds, image size reduction, static serving | Day 12–13 |

## How to work through one

1. Read the brief and the acceptance criteria.
2. Build it. Get it wrong first — that's the useful part.
3. Make CI pass (hadolint has opinions; read its output rather than silencing it).
4. Commit, and add a short "what broke and how I fixed it" note to
   [`../JOURNAL.md`](../JOURNAL.md).

Solutions are not provided on purpose. A repo full of copied code shows nothing;
a repo showing your own iterations shows how you think.
