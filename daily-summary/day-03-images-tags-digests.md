# Day 3 — Images, tags, digests, registries

**Date:** 31 Aug - 1 Sep 2026
**Goal:** Understand what an image actually is and how to refer to one precisely.
**Outcome:** Complete. Concepts understood. The review questions were worked
through **together** this time rather than answered solo - Day 3 is denser than
Days 1-2 and the explanations were requested directly.

---

## 1. What we did

### Block 0 — clear the decks

```bash
docker rm thirsty_haslett
docker system df
```

### Block A — what an image name actually is

```text
        docker.io  /  library  /  nginx  :  1.27
        |________|    |_____|    |____|    |__|
         registry     namespace   repo      tag
```

```bash
docker pull docker.io/library/nginx:1.27
docker image ls
```

No download, no new row. Docker had been expanding `nginx:1.27` to that full
name all along.

### Block B — a tag is a pointer, not a copy

```bash
docker tag nginx:1.27 my-nginx:experiment
docker image ls | grep -E 'nginx'      # same IMAGE ID on both rows
docker system df                       # unchanged - no copy was made
docker image rm my-nginx:experiment    # prints "Untagged:", not "Deleted:"

docker pull nginx:1.27.5
docker image ls | grep nginx
```

`1.27` and `1.27.5` resolve to the same image ID `6784fb0834aa`.

### Block C — layer sharing, made visible

```bash
docker pull nginx:1.27-perl
```

Most lines of the pull output read **`Already exists`** - only the Perl layers
were downloaded, because this image reuses the layers `nginx:1.27` had brought.

### Block D — digests

```bash
docker image ls --digests
docker image inspect nginx:1.27 --format 'ID={{.Id}}'
docker image inspect nginx:1.27 --format 'RepoDigests={{json .RepoDigests}}'
docker pull nginx@sha256:6784fb0834aa7dbbe12e3d7471e69c290df3e6ba810dc38b34ae33d3c1c05f7d
```

### Block E — one tag, many architectures

```bash
docker manifest inspect nginx:1.27 | head -40
docker info --format '{{.Architecture}} / {{.OSType}}'   # x86_64 / linux
docker image ls --tree
```

### Block F — moving images without a registry

```bash
docker image save -o nginx-alpine.tar nginx:1.27-alpine
docker image rm nginx:1.27-alpine
docker image load -i nginx-alpine.tar
rm nginx-alpine.tar
```

### The state this produced

```text
IMAGE                            ID             DISK USAGE   CONTENT SIZE
nginx:1.27                       6784fb0834aa        282MB         75.5MB
nginx:1.27-alpine                65645c7bb6a0       74.5MB         21.9MB
nginx:1.27-perl                  830c1f6705d1        349MB         88.4MB
nginx:1.27.5                     6784fb0834aa        282MB         75.5MB
nginx@sha256:6784fb0834aa...     6784fb0834aa        282MB         75.5MB
```

Five rows, **three** real images. `docker system df` agrees: `Images TOTAL 3`.

---

## 2. Review questions and answers

Worked through together rather than answered solo.

**Q1. Why was there no download for `docker.io/library/nginx:1.27`?**
Because it is the same name. Docker expands the short form in two steps:

```text
nginx:1.27 -> library/nginx:1.27 -> docker.io/library/nginx:1.27
```

No namespace means `library` (the official-images namespace); no registry means
Docker Hub. The image was already stored under that fully qualified name.
Consequence: `nginx` and `ghcr.io/nginx` are different images from different
registries, and only `library` may omit a username.

**Q2. When would `docker image rm` print `Deleted:` instead of `Untagged:`?**
Only when the **last** reference is removed. Image `6784fb0834aa` currently has
three: `nginx:1.27`, `nginx:1.27.5`, and `nginx@sha256:6784fb08...`. Removing
any of the first two frees nothing. Removing the third triggers `Deleted:`
followed by the layer digests.

**Q3. Why do `image ls` and `system df` disagree?**

```text
docker image ls            docker system df -v
nginx:1.27        282MB    SIZE 282MB  SHARED 279.3MB  UNIQUE  3.152MB
nginx:1.27-perl   349MB    SIZE 349MB  SHARED 279.3MB  UNIQUE 69.71MB
nginx:1.27-alpine 74.5MB   SIZE 74.5MB SHARED     0B   UNIQUE 74.47MB
                 -------
apparent total    705.5MB       actual disk 426.7MB
```

The 278.8MB gap is the Debian base that `1.27` and `1.27-perl` share.
`image ls` bills it to both; the disk stores it once. `1.27-alpine` shows
`SHARED 0B` because it is built on Alpine and has no layers in common.

**Trust `docker system df`.** `image ls` is a per-image view, not disk accounting.

**Q4. `nginx:1.27` or `nginx:1.27.5` in production?**
`1.27.5`, or better a digest. They are identical today but behave differently
over time:

```text
1.27     MOVING pointer - repoints when 1.27.6 ships
1.27.5   FROZEN pointer - always this build
```

The failure mode of choosing `1.27` is quiet: the Dockerfile and the git history
are unchanged, yet a rebuild weeks later produces a different image, and two
servers deployed a week apart run different code under the same version string.
`1.27` is right for development, where automatic patches are wanted.

**Q5. Tag versus digest, practically.**

```text
nginx:1.27                    "whatever nginx currently calls 1.27"
nginx@sha256:6784fb0834aa...  "exactly these bytes"
```

A tag is a mutable label in a registry's database - the owner can repoint it
with no error and no warning. A digest is a content hash: you get those exact
bytes or the pull fails. Trade-off: digests do not auto-update, so bumping them
is deliberate. Common practice is `nginx:1.27.5@sha256:6784fb08...` - the tag
documents intent, the digest enforces it.

**Q6. What is `nginx:1.27` actually?**
A **manifest list**, not an image - an index pointing at one image per platform:

```text
linux/amd64      <- selected for this host
linux/arm/v5, linux/arm/v7, linux/arm64/v8
linux/386, linux/mips64le, linux/ppc64le, linux/s390x
```

Docker matched `docker info --format '{{.Architecture}} / {{.OSType}}'`
(`x86_64 / linux`) and pulled `linux/amd64`. Override with
`docker pull --platform linux/arm64 nginx:1.27` (runs under emulation, slowly).

**Q7. What does `U` in the EXTRA column mean?**
**In Use** - at least one container references the image. Verified rather than
guessed; see section 3.1.

---

## 3. Additional findings (verified on this machine)

### 3.1 `U` in the EXTRA column means "in Use"

`docker image ls --help` does not document the EXTRA column, so it was tested
directly:

```text
before                              nginx:1.27-alpine  74.5MB  21.9MB
docker run -d --name utest nginx:1.27-alpine
after                               nginx:1.27-alpine  74.5MB  21.9MB   U
docker rm -f utest
after                               nginx:1.27-alpine  74.5MB  21.9MB
```

The flag appears and disappears with the container. It matches the earlier
observation that `alpine:latest` carried `U` while a container existed and
`system df` reported `ACTIVE 1`.

**Practical meaning:** an image without `U` will be removed by
`docker image prune -a`. One with `U` is skipped.

### 3.2 RECLAIMABLE is the sum of the UNIQUE column

`docker system df` reported `426.7MB` total with `147.3MB (34%)` reclaimable,
which looked wrong given no containers were running. The arithmetic explains it:

```text
UNIQUE:  3.152 + 69.71 + 74.47 = 147.33 MB  = RECLAIMABLE
SHARED:  279.3 MB
147.3 + 279.3 = 426.6 MB                    = total SIZE
```

RECLAIMABLE counts only the bytes unique to an image, because shared layers
cannot be freed while another image still needs them. Removing **all** images
would free the full 426.7MB; removing any one frees only its unique portion.

### 3.3 On this engine the image ID *is* the manifest digest

```text
ID          = sha256:6784fb0834aa7dbbe12e3d7471e69c290df3e6ba810dc38b34ae33d3c1c05f7d
RepoDigests = ["nginx@sha256:6784fb0834aa7dbbe12e3d7471e69c290df3e6ba810dc38b34ae33d3c1c05f7d"]
```

They are the same value because this Docker uses the **containerd image store**,
where the ID is the manifest digest. In the older storage driver the ID is a
separate image-config hash and does not match `RepoDigests`. Worth knowing
before claiming "the ID and the digest are different things" on another machine.

### 3.4 `unknown/unknown` entries in a manifest list are not broken platforms

`docker manifest inspect nginx:1.27` lists several
`"architecture": "unknown", "os": "unknown"` entries interleaved with the real
platforms. These are **attestation manifests** - build provenance and SBOM data
attached by BuildKit - not runnable images.

---

## 4. What I learned

| Concept | Detail |
|---|---|
| Image name anatomy | `registry/namespace/repo:tag`. Defaults are `docker.io` and `library`. |
| A tag is a pointer | `docker tag` makes a second name for the same ID. No copy, no disk cost. |
| Untag vs delete | `docker image rm` frees data only when the last reference goes. |
| Layer sharing | Pulling `nginx:1.27-perl` printed `Already exists` for every layer `nginx:1.27` had already provided. |
| Sizes are not additive | `image ls` bills shared layers to every image. `system df` reports the truth. |
| SHARED / UNIQUE | `docker system df -v` splits each image into shared and unique bytes. |
| Digest | A content hash. The only truly immutable reference. |
| Tag mutability | The registry owner can repoint a tag silently; nothing errors. |
| Manifest list | One tag can index many per-platform images; Docker picks by host arch. |
| `--platform` | Forces a non-native architecture, run under emulation. |
| `save` / `load` | Moves an image as a tar with no registry. The tar is uncompressed. |
| `U` flag | Image is in use by a container, so prune will skip it. |

---

## 5. Keep in mind

- **Pin the patch version in production, not the minor tag.** `1.27` moves,
  `1.27.5` does not. Use `1.27.5@sha256:...` when it really matters.
- **`docker image ls` is not a disk report.** Use `docker system df`, and
  `df -v` when you need the shared/unique split.
- **`Untagged:` means nothing was freed.** Only `Deleted:` reclaims space.
- **A repository tag is not a promise.** Anyone with push access can move it.
- **One tag is many images.** `nginx:1.27` is a manifest list; the bytes you get
  depend on the host architecture.
- **Layer reuse is why images are cheap.** Base a family of images on the same
  base and the base is stored once.
- **`U` marks images that prune will spare.** Check before assuming
  `docker image prune -a` will clear something.
- **Verify storage-driver-specific claims.** ID == digest here (containerd
  store), but not on every engine.

---

## 6. Commands used

```bash
# Naming and listing
docker pull docker.io/library/nginx:1.27
docker image ls
docker image ls --digests
docker image ls --tree                       # experimental, multi-platform view
docker image ls --filter reference='nginx:*'

# Tags as pointers
docker tag nginx:1.27 my-nginx:experiment
docker image rm my-nginx:experiment

# Digests
docker image inspect nginx:1.27 --format '{{.Id}}'
docker image inspect nginx:1.27 --format '{{json .RepoDigests}}'
docker pull nginx@sha256:6784fb0834aa7dbbe12e3d7471e69c290df3e6ba810dc38b34ae33d3c1c05f7d

# Layers and size
docker image history nginx:1.27
docker system df
docker system df -v

# Platforms
docker manifest inspect nginx:1.27
docker info --format '{{.Architecture}} / {{.OSType}}'
docker pull --platform linux/arm64 nginx:1.27

# Offline transfer
docker image save -o nginx-alpine.tar nginx:1.27-alpine
docker image load -i nginx-alpine.tar

# Cleanup
docker image prune            # dangling only
docker image prune -a         # every image without a container (no U flag)
```

---

## 7. State at end of day

```text
Images     : nginx:1.27 (also tagged 1.27.5 and by digest),
             nginx:1.27-alpine, nginx:1.27-perl
             3 real images, 426.7MB on disk
Containers : none
Next       : Day 4 - writing a first Dockerfile
```
