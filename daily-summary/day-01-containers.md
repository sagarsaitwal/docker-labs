# Day 1 — Containers: run, inspect, exec, destroy

**Date:** 29-30 Aug 2026
**Goal:** Run a real service in a container, observe it from outside and inside,
and prove what survives deletion and what doesn't.
**Outcome:** Complete. Part 1 - the first lab. Part 2 (section 8 onward) -
extended practice on lifecycle, multi-container management, and exit codes.

---

## 1. What we did

### Started a real service

```bash
mkdir -p ~/docker-lab && cd ~/docker-lab
docker run -d --name web -p 8080:80 nginx:1.27
```

Output:

```text
Unable to find image 'nginx:1.27' locally
1.27: Pulling from library/nginx
32e44235e1d5: Pull complete
56b81cfa547d: Pull complete
...
Digest: sha256:6784fb0834aa7dbbe12e3d7471e69c290df3e6ba810dc38b34ae33d3c1c05f7d
Status: Downloaded newer image for nginx:1.27
b1744e5faded8d79f68ed5b5dbadfb7b7d7ea289d8ccc98df0180c787181128f
```

Reading the command as a sentence:

```text
docker run    -d        --name web       -p 8080:80          nginx:1.27
   |          |            |                  |                  |
 create &  detached    name it "web"   host 8080 -> container 80  image:tag
 start     (background)
```

### Confirmed it was up

```bash
docker ps
```

```text
CONTAINER ID   IMAGE        STATUS         PORTS                                     NAMES
b1744e5faded   nginx:1.27   Up 24 seconds  0.0.0.0:8080->80/tcp, [::]:8080->80/tcp   web
```

Then opened `http://localhost:8080` in the **Windows** browser — the page loaded
with no configuration at all.

### Looked inside

```bash
docker exec -it web sh
cat /etc/os-release     # Debian GNU/Linux 12 (bookworm)
hostname                # b1744e5faded
ls /usr/share/nginx/html    # 50x.html  index.html
exit
```

### Proved the writable layer exists, then destroyed it

```bash
docker exec web sh -c 'echo "<h1>Sagar was here</h1>" > /usr/share/nginx/html/index.html'
curl http://localhost:8080          # my text appears

docker rm -f web
docker run -d --name web -p 8080:80 nginx:1.27
curl http://localhost:8080          # default nginx page - the edit is GONE
```

The second `run` was instant — no pull, because the image was already local.

---

## 2. Mistakes made

### Mistake 1 — wrong command position for `-it`

```bash
docker -it web sh
# unknown shorthand flag: 'i' in -it
```

**Root cause:** `-it` is an option of the `exec` subcommand, not of `docker`
itself. Docker's grammar is:

```text
docker [global options] COMMAND [command options] [arguments]
                        exec    -it              web sh
```

Global options (like `--context`, `--host`) are rare. Nearly every flag you use
belongs *after* the subcommand.

**Correct:** `docker exec -it web sh`

### Mistake 2 (separate, same day) — git: amending a pushed commit

While setting up the GitHub repo, I pasted a placeholder literally:

```powershell
git config --global user.email "the-email-on-your-github-account"
git commit --amend --reset-author --no-edit
git push          # ! [rejected]  main -> main (non-fast-forward)
```

**Root cause:** `--amend` does not edit a commit; it creates a *new* commit with
a new hash and abandons the old one. The old one was already on GitHub, so my
local branch was no longer a descendant of the remote. Git refused the push to
protect shared history.

**Fix:** the remote was already correct, so I discarded the local rewrite:

```powershell
git config --global user.email "sagar.saitwal@outlook.com"
git reset --hard origin/main
```

### Mistake 3 (same day) — PowerShell destroyed the README encoding

```powershell
(Get-Content README.md) -replace 'X','Y' | Set-Content -Encoding utf8 README.md
```

**Root cause:** in Windows PowerShell 5.1, `Get-Content` reads a UTF-8 file that
has **no byte-order mark** using the system codepage (Windows-1252). Every
multi-byte character was decoded as garbage, and `Set-Content` wrote the garbage
back permanently. 61 characters corrupted.

---

## 3. What I learned

| Concept | Detail |
|---|---|
| `run` auto-pulls | I never typed `docker pull`. `run` saw no local image and fetched it. Each `Pull complete` line is one **layer**. |
| Layers | An image is a stack of read-only layers. They are cached and shared — a second image based on the same base reuses them. |
| Tag vs digest | `nginx:1.27` is a *movable label*. `sha256:6784fb08...` is the immutable identity of that exact image. Only the digest makes a deploy reproducible. |
| Container ≠ VM | Host is Fedora; inside the container `/etc/os-release` says Debian 12. The image ships its own userland and shares the host **kernel**. This is why containers start in milliseconds. |
| Hostname = container ID | `hostname` inside returned `b1744e5faded`, the short form of the container ID. |
| Port publishing | `0.0.0.0:8080->80/tcp` means host port 8080 forwards to container port 80. `[::]:8080` is the same on IPv6. |
| WSL2 localhost forwarding | A port published inside WSL is reachable at `localhost` from Windows automatically. |
| The writable layer | A container = image layers (read-only) + one thin writable layer. Every change lands there and is destroyed with the container. |
| `docker ps` hides stopped containers | Stopped ones only appear with `-a`. This is why containers seem to "disappear". |
| `rm` vs `rm -f` | `rm` only removes a stopped container. `-f` stops and removes in one step. |

---

## 4. Keep in mind

- **Containers are disposable by design.** Deleting one is normal; losing data is
  not. Anything that must survive belongs in a **volume** or a **bind mount**.
  This is the whole reason `docker compose down -v` is dangerous.
- **Flags go after the subcommand.** `docker exec -it`, not `docker -it exec`.
- **`docker ps` ≠ `docker ps -a`.** When something "vanished", check with `-a`
  before concluding it never ran.
- **Pin the tag.** `nginx:1.27` not `nginx`. `latest` is just a default label
  name; it does not mean "newest" and can point anywhere.
- **`-it` explained:** `-i` keeps stdin open, `-t` allocates a terminal. Without
  both, an interactive shell exits immediately — that's why
  `docker run -it ubuntu` "won't stay up" but `docker run -it ubuntu bash` works.
- **Anything after the image name replaces the image's default command.**
  `docker run nginx echo hi` runs `echo hi` and exits — it does not start nginx.
- **Never `git --amend` a commit that is already pushed.**
- **Don't do text replacement with PowerShell 5.1's `Get-Content | Set-Content`**
  on files containing non-ASCII characters. Edit in VSCode instead.

---

## 5. Commands used

```bash
# Run
docker run -d --name web -p 8080:80 nginx:1.27

# Observe
docker ps
docker ps -a
docker logs web
docker logs -f web                 # follow; Ctrl+C leaves the VIEW, not the container
docker logs --tail 100 -t web
docker top web
docker stats --no-stream web
docker port web

# Inspect
docker inspect web
docker inspect -f '{{.State.Status}}' web
docker inspect -f '{{.Config.Image}}' web

# Go inside
docker exec -it web sh
docker exec web sh -c 'echo hi > /path/file'

# Lifecycle
docker stop web
docker start web
docker restart web
docker rm web            # stopped containers only
docker rm -f web         # force: stop + remove
```

---

## 6. Drill for retention

Do these from memory before moving on:

1. Run `httpd:2.4` named `apache` on host port 8081; confirm in the browser.
2. Print its container ID **without** `docker ps` (hint: `docker ps -a --format`).
3. Shell in and print `/etc/os-release`.
4. Stop it, then start it again **without** creating a new container.
5. Remove it in one command.
6. Run `docker run --rm -it fedora bash`, exit, and explain why `docker ps -a`
   does not list it.

**Question to be able to answer:** why does `docker run -it fedora` exit
immediately while `docker run -it fedora bash` gives a working shell?

---

## 7. State at end of day

```text
Lab directory : ~/docker-lab
Images        : nginx:1.27, hello-world
Containers    : cleaned up
Repo          : github.com/sagarsaitwal/docker-labs (public, CI green)
```

---

# Part 2 — Extended practice (same day)

Three additional tasks to widen Day 1 coverage beyond the first lab.

---

## 8. Task 1 — stop is not the same as remove

### What was run

```bash
docker run -d --name lab1 -p 8080:80 nginx:1.27
docker exec lab1 sh -c 'echo "<h1>version A</h1>" > /usr/share/nginx/html/index.html'
docker stop lab1        # docker ps -> gone; docker ps -a -> still listed, Exited
docker start lab1
curl localhost:8080
docker diff lab1
docker rm -f lab1
```

### What happened

The `exec` write **did not take effect**, so "version A" never appeared. The
container behaved correctly; the write itself failed.

Likely cause: the host shell consumed the `>` before Docker saw it. `sh -c '...'`
relies on single quotes protecting the redirect:

| Shell | Behaviour |
|---|---|
| bash (Fedora) | works - `>` is passed through to `sh` inside the container |
| PowerShell | usually works - single quotes are literal |
| **cmd.exe** | **fails** - `'` is not a quote character, so `>` redirects on the host |

Isolation test for next time:

```bash
docker exec t sh -c 'echo hi > /tmp/probe'; echo "exit=$?"
docker exec t cat /tmp/probe
```

### The principle (independent of the failed write)

The writable layer belongs to the **container object**, not to the running
process. Therefore:

```text
docker stop    -> process halted, container object KEPT   -> changes survive
docker start   -> same layer, same changes
docker restart -> same layer, same changes
docker rm      -> container object DESTROYED              -> changes gone
```

This refines the Day 1 conclusion. "Changes don't persist" is too broad. The
accurate statement is: **changes persist for the life of the container, and a
container's life ends at `rm`, not at `stop`.**

### `docker diff`

Shows precisely what the writable layer contains:

```text
A  Added    - a file that did not exist in the image
C  Changed  - a file from the image that was modified
D  Deleted  - a file from the image that was removed
```

---

## 9. Task 2 — managing several containers

```bash
docker run -d --name web1 -p 8081:80 nginx:1.27-alpine
docker run -d --name web2 -p 8082:80 nginx:1.27-alpine
docker run -d --name web3 -p 8083:80 nginx:1.27-alpine
docker run -d --name web4 -p 8081:80 nginx:1.27-alpine   # deliberate clash
```

### The port clash

```text
Bind for :::8081 failed: port is already allocated
```

- The conflict is on the **host** side of `-p 8081:80`. Host port 8081 was
  already held by **web1**; web4 was the container that failed.
- `:::8081` is the IPv6 bind attempt - Docker publishes on IPv4 and IPv6.
- **Container port 80 can be reused freely.** Every container has its own
  network namespace, so three containers all listening on 80 internally is
  normal. Only host ports must be unique.

Fix: `docker run -d --name web4 -p 8084:80 nginx:1.27-alpine`

### Listing and filtering

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker ps --filter name=web
docker ps -a --filter status=exited
docker ps -q                       # IDs only - "quiet", built for scripting
docker stats --no-stream
```

### Bulk operations

```bash
docker stop $(docker ps -q)        # all RUNNING containers
docker rm   $(docker ps -aq)       # ALL containers on the machine
```

Safe in a lab. Never on a shared or production host - `$(docker ps -aq)` is not
scoped to the containers you just created.

---

## 10. Task 3 — exit codes and signals

```bash
docker run --name t0   alpine sh -c 'echo done'
docker run --name t1   alpine sh -c 'exit 1'
docker run --name t127 alpine sh -c 'nosuchcommand'
docker run --name t126 alpine sh -c 'touch /x; chmod -x /x; /x'
docker run -d --name t143 nginx:1.27 && docker stop t143
docker run -d --name t137 nginx:1.27 && docker kill t137

for c in t0 t1 t127 t126 t143 t137; do
  echo "$c -> $(docker inspect -f '{{.State.ExitCode}}' $c)"
done
```

### Results observed

| Container | Cause | Exit | Note |
|---|---|:--:|---|
| `t0` | `echo done` finished | 0 | Success. Not a failure. |
| `t1` | explicit `exit 1` | 1 | Application error |
| `t127` | `nosuchcommand` | 127 | `sh: nosuchcommand: not found` |
| `t126` | file exists, not executable | 126 | `sh: /x: Permission denied` |
| `t143` | `docker stop` on nginx | **0** | see finding below |
| `t137` | `docker kill` on nginx | 137 | 128 + 9 (SIGKILL) |

Memory hook: **126 = found it, can't run it. 127 = can't find it.**

### Key finding - `docker stop` does not always give 143

Expected 143, observed 0. Verified the cause directly:

```bash
docker image inspect nginx:1.27 --format '{{.Config.StopSignal}}'
# SIGQUIT

docker image inspect alpine --format '{{.Config.StopSignal}}'
# (empty -> defaults to SIGTERM)
```

The nginx image overrides `STOPSIGNAL` to `SIGQUIT`, which nginx handles as a
graceful shutdown and then exits deliberately with status 0.

The correct rule:

```text
128 + N   applies when a process is TERMINATED BY a signal
          (it did not handle the signal, so the kernel killed it)

exit 0    applies when a process HANDLES the signal and exits cleanly
```

So a real 143 comes from an application that **ignores** SIGTERM. `docker stop`
sends the image's `STOPSIGNAL`, waits about 10 seconds, then sends `SIGKILL`
(which produces 137). SIGKILL can never be caught, which is why `t137` is
deterministic while `t143` depended on how nginx was written.

### Diagnosing an unexplained 137

137 means SIGKILL, but not necessarily that a human ran `docker kill`. Check for
the Linux OOM killer first:

```bash
docker inspect <container> --format '{{.State.OOMKilled}}'   # true = out of memory
docker stats
free -h
```

---

## 11. Corrections to earlier conclusions

| Earlier belief | Corrected |
|---|---|
| "Changes to a container never persist" | They persist across `stop`/`start`/`restart`. Only `rm` destroys them. |
| "`docker stop` produces exit code 143" | Only if the app ignores the stop signal. A well-behaved app exits 0. Check `.Config.StopSignal`. |
| "`docker diff` shows A and C" | Also `D` for deleted. |

---

## 12. Added to "keep in mind"

- **A container's life ends at `rm`, not at `stop`.** This is the precise version
  of the disposability rule.
- **Only host ports must be unique.** Container ports repeat freely - separate
  network namespaces.
- **Read `.Config.StopSignal` before predicting an exit code.** Images can and do
  override it.
- **Exit 0 is not a failure.** A short-lived task container exiting 0 has done
  its job. Ask what the container was *supposed* to do before assuming a bug.
- **137 without a `docker kill` means suspect OOM.** Check `.State.OOMKilled`.
- **`$(docker ps -aq)` is machine-wide.** It is not scoped to your current work.
- **Watch host-shell quoting with `docker exec sh -c '...'`.** A redirect can be
  consumed by the host shell instead of reaching the container.

---

## 13. Commands added to the toolkit

```bash
docker diff <c>                                        # what the writable layer holds
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker ps --filter name=web
docker ps -a --filter status=exited
docker stop $(docker ps -q)
docker rm   $(docker ps -aq)
docker inspect -f '{{.State.ExitCode}}' <c>
docker inspect -f '{{.State.OOMKilled}}' <c>
docker image inspect <image> --format '{{.Config.StopSignal}}'
docker kill <c>                                        # SIGKILL, always 137
docker cp <c>:/path/in/container ./local               # pull files out
docker cp ./local <c>:/path/in/container               # push files in
```
