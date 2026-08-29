# Journal

A running log of what I built, what broke, and what I learned. Newest last.

The failures are kept in deliberately — the debugging is the skill.

---

## Day 0 — Environment setup (Fedora 44 on WSL2)

Installed Docker Engine inside Fedora Linux 44 running on WSL2, rather than
using Docker Desktop, so that I work against a normal Linux daemon.

**Verified the setup:**

```bash
systemctl is-active docker      # active
systemctl is-enabled docker     # enabled - survives reboots
docker run hello-world          # worked (with sudo)
```

**Problem:** every Docker command failed without `sudo`:

```text
permission denied while trying to connect to the docker API
at unix:///var/run/docker.sock
```

**Diagnosis:** the socket is owned by `root:docker` with mode `srw-rw----`, and
my user wasn't in the `docker` group:

```bash
ls -l /var/run/docker.sock      # srw-rw---- 1 root docker
getent group docker             # docker:x:994:   <- empty
id                              # no 994 in my groups
```

**First fix attempt failed.** I ran `sudo usermod -aG docker $USER` from a root
shell, so `$USER` expanded to `root` — the group ended up as `docker:x:994:root`,
which changes nothing since root already had access.

**Actual fix:** name the user explicitly, then restart WSL so the login session
picks up the new group (closing the terminal is not enough — group membership is
attached at login):

```bash
sudo usermod -aG docker sagar
sudo gpasswd -d root docker     # undo the mistaken entry
# then, from PowerShell on Windows:
wsl --shutdown
```

**Lessons:**
- `$USER` inside a `sudo su` shell is `root`, not you. Shell variables are
  evaluated by the shell you're standing in.
- Group changes need a new login session, not a new terminal window.
- Membership of the `docker` group is effectively root access on the host —
  acceptable on a personal machine, not on a shared server.

---

## Day 1 — Containers: run, inspect, exec, destroy

```bash
docker run -d --name web -p 8080:80 nginx:1.27
```

**Observations:**

- I never ran `docker pull`. `run` found no local copy and fetched it — each
  `Pull complete` line is one **layer** of the image.
- The output ended with a digest, `sha256:6784fb08...`. The tag `1.27` is a
  movable label; the digest is the immutable identity of that exact image.
- `docker ps` showed `0.0.0.0:8080->80/tcp, [::]:8080->80/tcp` — published on
  both IPv4 and IPv6.
- The page was reachable at `http://localhost:8080` from the **Windows** browser
  with no configuration: WSL2 forwards localhost into the distro automatically.

**Mistake made:** ran `docker -it web sh` and got `unknown shorthand flag: 'i'`.
`-it` belongs to the `exec` subcommand, not to `docker` itself. The grammar is:

```text
docker [global options] COMMAND [command options] [arguments]
```

**Inside the container:**

```bash
docker exec -it web sh
cat /etc/os-release   # Debian GNU/Linux 12 (bookworm)
hostname              # b1744e5faded - the short container ID
```

My host is Fedora, but the container is Debian. The image ships its own
userland; only the kernel is shared. That single fact is what makes Docker
different from a VM.

**The writable layer, demonstrated:**

```bash
docker exec web sh -c 'echo "<h1>Sagar was here</h1>" > /usr/share/nginx/html/index.html'
curl http://localhost:8080     # my text
docker rm -f web
docker run -d --name web -p 8080:80 nginx:1.27
curl http://localhost:8080     # default nginx page - the edit is gone
```

The second `run` started instantly — no pull, because the image was already
local. But it produced a **new container** with a fresh writable layer.

**Conclusion I want to remember:** containers are disposable by design.
Anything that must survive has to live in a volume or a bind mount. This is the
reason `docker compose down -v` is dangerous while `docker compose down` is not.

---

## Day 2 — _next up_

<!-- Template for each entry:
## Day N — Topic
What I built:
What broke:
Root cause:
What I'd do differently:
-->
