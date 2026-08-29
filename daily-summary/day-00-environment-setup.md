# Day 0 — Environment Setup

**Date:** 29 Aug 2026
**Goal:** Get a working Docker Engine on Fedora under WSL2, runnable without `sudo`.
**Outcome:** Working. Engine 29.7.2, Compose v5.5.0, running as user `sagar`.

---

## 1. What we did

### Starting point

- Windows 11 Pro host
- WSL2 with a single distro: `FedoraLinux-44`
- Docker Engine installed **inside Fedora** (not Docker Desktop) — so we work
  against a normal Linux daemon and a normal Unix socket

### Verified the engine was alive

```bash
docker --version          # CLI present
docker info               # is the DAEMON reachable?
systemctl is-active docker    # active
systemctl is-enabled docker   # enabled -> survives reboots
docker run hello-world        # end-to-end test
```

`hello-world` worked — **but only with `sudo`.**

### The blocker

Every command without `sudo` failed:

```text
permission denied while trying to connect to the docker API
at unix:///var/run/docker.sock
```

### Diagnosis

```bash
ls -l /var/run/docker.sock
# srw-rw---- 1 root docker 0 /var/run/docker.sock

getent group docker
# docker:x:994:          <- group exists but is EMPTY

id
# uid=1000(sagar) gid=1000(sagar) groups=1000(sagar),10(wheel)
#                                        ^ no 994(docker)
```

The chain of reasoning:

1. The Docker CLI talks to the daemon through a **Unix socket**, not a network port.
2. That socket is a file, owned `root:docker`, mode `srw-rw----`.
3. `rw` for the owner (root) and `rw` for the group (docker); **nothing for others**.
4. I was not in the `docker` group, so I fell into "others" → permission denied.
5. `sudo` worked because it made me root, the owner.

### The fix

```bash
sudo usermod -aG docker sagar    # -a = APPEND, -G = supplementary group
sudo gpasswd -d root docker      # remove the mistaken root entry (see mistakes)
```

Then, from **PowerShell on Windows**:

```powershell
wsl --shutdown
```

### Verification after restart

```bash
id
# uid=1000(sagar) ... groups=1000(sagar),10(wheel),994(docker)   <- present

getent group docker
# docker:x:994:sagar

docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
# client=29.7.2 server=29.7.2      <- CLI reached the daemon

docker ps -a        # worked, no sudo
```

---

## 2. Mistakes made

### Mistake 1 — `$USER` expanded to `root`

Ran this **from inside a root shell** (after `sudo su`):

```bash
sudo usermod -aG docker $USER
```

Result:

```text
docker:x:994:root        <- added "root", not "sagar"
```

**Root cause:** `$USER` is expanded by the shell *before* the command runs. In a
root shell, `$USER` is already `root`. `sudo` never saw the string "sagar".

**Fix:** name the user explicitly — `sudo usermod -aG docker sagar`.
Adding root was harmless but pointless: root already owned the socket.

### Mistake 2 — expected a new terminal to be enough

Group membership is attached to a **login session**, not to a terminal window.
Opening a new tab does not re-read the group file. In WSL, the reliable reset is
`wsl --shutdown` from Windows, which tears down the whole distro session.

---

## 3. What I learned

| Concept | Detail |
|---|---|
| CLI vs daemon | `docker` (the CLI) and `dockerd` (the engine) are two separate programs. "Docker is installed" and "Docker is running" are different claims — `docker info` tests the second. |
| The socket is the API | Docker's API is exposed as a file at `/var/run/docker.sock`. Access control is plain Unix file permissions, not a Docker-specific system. |
| Group = access | Because the socket is group-owned by `docker`, membership of that group is what grants access — that's why the fix is `usermod`, not `chmod`. |
| Group membership is session-scoped | Changing `/etc/group` does not change an already-running session. |
| systemd in WSL | `/etc/wsl.conf` has `[boot] systemd=true`, which is what makes `systemctl` work at all in this distro. Without it, `systemctl is-enabled docker` is meaningless. |
| `-a` matters in `usermod` | `usermod -G docker sagar` (no `-a`) would **replace** all my supplementary groups, dropping `wheel` and losing sudo access. `-aG` appends. |

---

## 4. Keep in mind

- **The `docker` group is effectively root access.** Anyone in it can start a
  container that bind-mounts `/` and edits any file on the host. Fine on a
  personal machine; on a shared or production server, use rootless Docker or
  restrict it deliberately.
- **`docker info` is the real health check**, not `docker --version`. The version
  command only proves the CLI binary exists.
- **Never run `usermod -G` without `-a`.** Losing `wheel` means losing `sudo`,
  and you may not be able to get it back without a root shell.
- **`$VAR` is expanded by the shell you're standing in**, not by `sudo`. When it
  matters, type the literal value.
- Whenever a Docker command says "permission denied ... docker.sock", the answer
  is almost always group membership — check `id` first, not the Docker install.

---

## 5. Commands used

```bash
# Health
docker --version
docker info
docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
systemctl is-active docker
systemctl is-enabled docker

# Diagnosis
ls -l /var/run/docker.sock
getent group docker
id

# Fix
sudo usermod -aG docker sagar
sudo gpasswd -d root docker
```

```powershell
# From Windows - forces a full WSL session restart
wsl --shutdown
```

---

## 6. State at end of day

```text
Host      : Windows 11 Pro + WSL2
Distro    : FedoraLinux-44
Engine    : Docker 29.7.2 (client + server)
Compose   : v5.5.0
User      : sagar, in groups: sagar, wheel, docker
Service   : active + enabled
SELinux   : Disabled  (so no :z / :Z bind-mount labels needed)
Images    : hello-world
Containers: 1 exited (hello-world)
```
