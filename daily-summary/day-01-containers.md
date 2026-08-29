# Day 1 — Containers: run, inspect, exec, destroy

**Date:** 29 Aug 2026
**Goal:** Run a real service in a container, observe it from outside and inside,
and prove what survives deletion and what doesn't.
**Outcome:** Complete. nginx served to the Windows browser; writable-layer
behaviour demonstrated.

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
