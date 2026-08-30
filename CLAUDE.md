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
| 3 | Images, tags, digests, registries | **Next** |
| 4-14 | See the README progress table | Not started |

`README.md` holds the authoritative progress table. Update it whenever a day is
finished.

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
- **Only host ports must be unique**; container ports repeat freely because each
  container has its own network namespace.
- **The `docker` group is root-equivalent** on the host.

---

## 7. Git workflow

```text
Remote     https://github.com/sagarsaitwal/docker-labs.git
Branch     main
Identity   Sagar Saitwal <sagar.saitwal@outlook.com>
           Must match the GitHub account, or commits miss the contribution graph.
```

- Commit messages: a short subject, then a body explaining *why*. End with
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Never `--amend` a commit that has already been pushed.** This has bitten once
  already; recovery was `git reset --hard origin/main`.
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

Then read section 2 for where the plan stands, and pick up at the next day.
