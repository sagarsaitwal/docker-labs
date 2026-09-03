# Project context

Context for Claude Code sessions on this repository. Loaded automatically from
the repo root, so it travels with a `git clone` to any machine.

---

## 1. What this is

A Docker learning repository belonging to **Sagar Saitwal**, worked through as a
structured 14-day plan. The goal is genuine competence plus a public artefact
worth showing on LinkedIn - not a tutorial copy.

Public repo: <https://github.com/sagarsaitwal/docker-labs>

The learning is real and in progress. Treat Sagar as a capable beginner: explain
the mechanism, not just the command, and never assume a concept from a later day
has been covered yet.

---

## 2. Current status

| Day | Topic | Status |
|:--:|---|---|
| 0 | Engine install, daemon, socket permissions | Complete |
| 1 | Containers: lifecycle, ports, exit codes, signals | Complete |
| 2 | Environment variables, `--rm`, restart policies | Complete |
| 3 | Images, tags, digests, registries | Complete |
| 4 | Writing a first Dockerfile | Complete |
| 5 | Layer caching and `.dockerignore` | **Next** |
| 6-14 | See the README progress table | Not started |

`README.md` holds the authoritative progress table. Update it whenever a day is
finished.

### Session handoff - read this first

**Last session ended:** 4 Sep 2026. Day 4 is complete and written up in
`daily-summary/day-04-first-dockerfile.md`. `examples/day-04-hello-app/` is the
first Dockerfile this repo has ever contained, and the commit adding it is
expected to flip CI's `dockerfile-lint` and `build-images` jobs from a no-op to
doing real work for the first time - verify that run went green after pushing
(preflighted locally with hadolint 2.12.0-alpine first, clean, exit 0, so it
should pass, but confirm rather than assume).

Day 4 produced two findings that overturned the lesson plan's own predictions -
both worth citing directly rather than re-deriving:

- **A process at PID 1 in a container does not get normal signal defaults.**
  Built the same app as exec-form and shell-form `CMD`, expecting exec form to
  stop fast under `docker stop`. Both took the full ~10s grace period and were
  force-killed (exit 137) - PID 1 status makes an unhandled `SIGTERM` *ignored*,
  not fatal, regardless of which form wraps it. `docker run --init` (tini as
  PID 1) fixed it: stop dropped to 0.4s with exit 143. See section 6 below.
- **`.dockerignore` looked like it did nothing** until the variable was
  isolated - BuildKit only transfers files a `COPY` actually names, so a narrow
  `COPY app.py .` skipped a 50MB test file whether `.dockerignore` existed or
  not. Rebuilding with `COPY . .` showed the real effect: 52.44MB vs 254B.

Both were chased down empirically after the first result contradicted
expectation, rather than accepted or explained away - keep that standard for
Day 5, which is exactly the topic (layer caching, `.dockerignore` ordering)
these findings feed into directly.

Nothing is pending. Start at **Day 5 - layer caching and `.dockerignore`**,
using the plan in `daily-summary/day-05-layer-caching.md`. Given the Day 4
`.dockerignore` finding, it's worth having Sagar predict the BuildKit
selective-transfer behavior *before* running the drill, rather than presenting
it as new information.


---

## 3. Environment

```text
Host        Windows 11 Pro
WSL         WSL2, distro FedoraLinux-44 (only distro)
Docker      Engine 29.7.2 client + server, Compose v5.5.0
            Installed INSIDE Fedora. Not Docker Desktop.
User        sagar - in groups sagar, wheel, docker (994)
systemd     enabled via /etc/wsl.conf [boot] systemd=true
Service     docker is active + enabled
SELinux     Disabled - no :z / :Z bind-mount labels needed
Repo path   D:\Docker on the Windows side (/mnt/d/Docker from Fedora)
Lab path    ~/docker-lab inside Fedora
```

Docker commands run **inside Fedora**, not from Windows. To run one from a
Windows shell:

```bash
wsl.exe -d FedoraLinux-44 -- bash -lc 'docker ps'
```

Ports published inside WSL are reachable at `localhost` from the Windows browser
automatically.

**Bind-mount performance:** keep working files in `~` inside Fedora, not under
`/mnt/d`. Paths under `/mnt` cross the Windows boundary and are slow.

---

## 4. How Sagar works - read this before giving commands

**Give concrete commands with real values. Never placeholders.**
Commands get pasted verbatim. Two real incidents came from placeholders:

- `sudo usermod -aG docker $USER` run from a root shell added `root` to the
  docker group, not `sagar`.
- `git config --global user.email "the-email-on-your-github-account"` was
  executed literally and required a `git reset --hard` to recover.

Real values: user `sagar`, GitHub `sagarsaitwal`, email
`sagar.saitwal@outlook.com`, distro `FedoraLinux-44`.

**Never suggest PowerShell 5.1 text-replacement pipelines.**

```powershell
# NEVER - corrupted 61 characters in README.md once already
(Get-Content file.md) -replace 'a','b' | Set-Content -Encoding utf8 file.md
```

Windows PowerShell 5.1 reads a BOM-less UTF-8 file as Windows-1252, so every
multi-byte character becomes mojibake and is written back permanently. Edit files
with the Edit/Write tools or in VSCode instead. After editing any Markdown file,
check with `grep -c 'â\|Ã\|Â' <file>` - the answer must be 0.

**Verify claims against the live engine rather than asserting from memory.**
This has repeatedly paid off, and Sagar values it. When a result contradicts an
expectation, chase down why.

**Sagar answers review questions in detail and is usually right.** Grade honestly,
say when he is correct, and say plainly when a mistake in the question or lesson
was yours.

**Give tasks, don't run the lab exercises yourself.** Said directly on 31 Aug
2026: *"I am learning the docker and you suppose to give me tasks, not complete
by yourself."* For anything that is the actual point of a day's practice - the
`docker run`/`inspect`/`update`/etc. commands the lesson is built around - write
the commands, what to predict or observe, and let Sagar run them in his own
Fedora terminal and report back. Diagnostic checks (confirming environment
state, verifying a fix worked) are fine to run directly; the hands-on exercises
are not.

---

## 5. Repo conventions

### File roles

```text
README.md            Public front page. Progress table + "What I can explain".
JOURNAL.md           Short narrative entry per day. Newest last.
CLAUDE.md            This file.
daily-summary/       Long-form notes, one file per day, 7 fixed sections.
cheatsheets/         Four references, distinct scopes (see README layout).
examples/first-stack/  Working nginx + Postgres Compose stack.
projects/01..03/     Briefs with acceptance criteria. Sagar builds these himself
                     - do NOT write the solutions for him.
.github/workflows/   CI: hadolint, Compose validation, image builds.
```

### `daily-summary/day-NN-*.md` structure

Days 3-14 already exist as templates with a plan, commands to practise, and a
drill. When a day is finished, rewrite the file with these seven sections:

```text
1. What we did            blocks, with the commands actually run
2. Review questions       the questions and Sagar's answers
3. Additional findings    verified extras, marked as verified
4. What I learned         concept table
5. Keep in mind           rules to carry forward
6. Commands used          grouped by purpose
7. State at end of day
```

Record what **actually happened**, including failures, and keep the distinction
between a tooling failure and real Docker behaviour explicit. Never invent
results that were not reported.

### Finishing a day - checklist

1. Rewrite `daily-summary/day-NN-*.md` with the seven sections.
2. Add a `## Day N — Topic` entry to `JOURNAL.md`, and move the
   `## Day N+1 — _next up_` placeholder down.
3. Mark the day **Complete** in the `README.md` progress table with links to
   both the journal anchor and the notes file.
4. Add any new bullets to README "What I can explain, not just run".
5. Update `daily-summary/README.md` index row and its "Days 0-N" line.
6. Update section 2 of this file.
7. Check encoding, then commit.

### Writing style

Plain ASCII in Markdown bodies where practical - hyphens rather than em dashes.
The box-drawing characters in the README layout tree are deliberate; leave them.

---

## 6. Established findings - do not re-derive

Verified on this machine. Cite rather than re-test unless something changed.

- **`docker stop` does not always give exit 143.** `nginx:1.27` sets
  `STOPSIGNAL=SIGQUIT`; nginx shuts down gracefully and exits **0**. The
  `128 + N` rule applies only when a process is *terminated by* a signal.
  Check `docker image inspect <image> --format '{{.Config.StopSignal}}'`.
- **The writable layer belongs to the container object**, so changes survive
  `stop`/`start`/`restart` and die only at `rm`.
- **Environment precedence:** image `ENV` < `--env-file` < `-e`. Measured.
- **`--env-file` is not a shell script.** `QUOTED="hello"` yields `"hello"`
  including the quotes. No expansion, no `export`.
- **`docker update`** changes restart policy and resource limits (CPU, memory,
  pids) on a live container - never environment, ports, mounts, image, command
  or name. Everything else needs replacement.
- **`always` vs `unless-stopped`** differ in exactly one case: a container
  stopped by hand before a daemon restart. `always` restarts it anyway.
- **Restart backoff caps at roughly 60 seconds.** It does start small and
  double, but the ramp from ~100ms to the cap finishes in about ten attempts -
  too fast to watch by polling every few seconds. Confirmed by streaming
  `docker events` for an unlimited `on-failure` container for ~56 minutes: the
  start-die cycle held at a steady ~59-61s the entire time. Don't expect to see
  the doubling live; expect the steady ceiling.
- **Only host ports must be unique**; container ports repeat freely because each
  container has its own network namespace.
- **A tag is a pointer.** `docker tag` costs no disk; `docker image rm` prints
  `Untagged:` until the last reference goes, and only then `Deleted:`.
- **`docker image ls` is not disk accounting.** It bills shared layers to every
  image. `docker system df -v` gives SHARED/UNIQUE, and RECLAIMABLE is the sum
  of UNIQUE because shared layers stay for whoever else needs them.
- **`U` in the EXTRA column of `docker image ls` means "in Use"** by a container.
  Tested directly; it is undocumented in `--help`. No `U` means
  `docker image prune -a` will delete it.
- **On this engine the image ID IS the manifest digest** (containerd image
  store). Do not claim ID and digest always differ - on the older storage driver
  they do, here they do not.
- **`unknown/unknown` entries in a manifest list are attestation manifests**
  (BuildKit provenance and SBOM), not broken platforms.
- **PID 1 inside a container does not get normal signal defaults.** An
  unhandled `SIGTERM` is *ignored* for PID 1 specifically (except SIGKILL/
  SIGSTOP), not fatal like everywhere else. Exec-form `CMD` alone does not fix
  this - both exec-form and shell-form `CMD` took the full ~10s grace period
  and got force-killed (exit 137) with no `SIGTERM` handler in the app. Only
  `docker run --init` (tini as PID 1, which does handle it and forwards to the
  now-non-PID-1 child) fixed it - 0.4s stop, exit 143.
- **`.dockerignore`'s effect depends on how broad `COPY` is.** BuildKit only
  transfers files a `COPY`/`ADD` actually names, so a narrow `COPY app.py .`
  showed zero difference with `.dockerignore` present or absent (28B either
  way). Only `COPY . .` exposed the real effect (52.44MB vs 254B). Never treat
  "no visible difference" as proof `.dockerignore` isn't needed.
- **The `docker` group is root-equivalent** on the host.

---

## 7. Git workflow

```text
Remote     https://github.com/sagarsaitwal/docker-labs.git
Branch     main
Identity   Sagar Saitwal <sagar.saitwal@outlook.com>
           Must match the GitHub account, or commits miss the contribution graph.
```

- Commit messages: a short subject, then a body explaining *why*. **No
  `Co-Authored-By: Claude` trailer.** This repo's commits should read as
  Sagar's own work - on 31 Aug 2026 the whole history was rewritten
  (`git filter-branch --msg-filter`, then force-pushed) specifically to strip
  that line out, because it made the repo look AI-authored rather than
  AI-assisted. Do not reintroduce it.
- **Never `--amend` a commit that has already been pushed.** This has bitten once
  already; recovery was `git reset --hard origin/main`. (The one-time history
  rewrite above is a deliberate exception, done with explicit approval - it is
  not a precedent for routine amending.)
- Ask before pushing unless Sagar has said to push.
- `.gitattributes` enforces `eol=lf`. Do not weaken it - the repo is edited on
  Windows and its scripts run inside Linux containers.

### CI

`.github/workflows/ci.yml` has three jobs that discover their own inputs, so it
stays green with no Dockerfiles present and starts working when one is added.
Do not hardcode paths into it. hadolint rules `DL3008` and `DL3018` (version
pinning for apt/apk) are ignored in `.hadolint.yaml` while learning.

---

## 8. Setting up on a new machine

If Docker is freshly installed and every command says
`permission denied ... /var/run/docker.sock`, the user is not in the `docker`
group:

```bash
getent group docker          # is the user listed?
id                           # is the docker GID present?
sudo usermod -aG docker sagar
```

Then restart the login session. On WSL, from PowerShell:

```powershell
wsl --shutdown
```

Verify:

```bash
id
docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
docker ps
```

Clone and continue:

```bash
git clone https://github.com/sagarsaitwal/docker-labs.git
cd docker-labs
```

A fresh Fedora install does not have `git` yet - `sudo dnf install -y git`
first if the clone fails with "command not found." Also worth creating `~/docker-lab` (`mkdir -p ~/docker-lab`, the lab working
directory referenced throughout) and installing `jq` (`sudo dnf install -y jq`)
ahead of Day 3, which reads a fair amount of JSON output.

Then read section 2 for where the plan stands, and pick up at the next day.

---

## 9. External reference material

**KodeKloud example voting app** - a real multi-service reference project
(Python `vote` app -> Redis -> .NET `worker` -> Postgres -> Node.js `result`
app), analyzed in a session on 3 Sep 2026. Sagar wants it kept in mind for
comparison once the curriculum reaches the days it actually previews:

```text
Clone:  https://github.com/kodekloudhub/example-voting-app.git
```

- `vote/Dockerfile` - a 3-stage build (base/dev/final) - Day 12 (multi-stage builds)
- `result/Dockerfile` - uses `tini` as PID 1 to reap zombies and forward
  signals properly - ties back to the Day 1 signal-handling lesson
- `worker/Dockerfile` - `BUILDPLATFORM`/`TARGETPLATFORM` cross-build args -
  post-Day-14 buildx/multi-arch territory
- `docker-compose.yml` - `depends_on: condition: service_healthy`, Compose
  `profiles`, a `front-tier`/`back-tier` network split - Day 8-10 material

It is Docker/KodeKloud's own sample (ships its own `LICENSE`/`MAINTAINERS`),
not Sagar's work - do not merge it into `docker-labs`. It currently lives at
`~/KodekloudSample` in the FedoraLinux-44 WSL distro on this machine; clone it
fresh on any other machine rather than expecting it to travel with
`docker-labs` itself:

```bash
git clone https://github.com/kodekloudhub/example-voting-app.git ~/KodekloudSample
```

Sagar's plan is to also push a copy to his own GitHub account from another
device, as a separate repo, for safekeeping - not merged into `docker-labs`.

Don't pull concepts from it into an explanation before the day that actually
introduces them (see section 1's rule on not assuming a later day's concept is
known yet) - it's a "here's how a real project does it" comparison for Days 9,
10, and 12, not early reference material.
