# R.A. Design Studio: deployment guide

Website for **radesign.info** — Next.js 15 (App Router), React 19, TypeScript.

Content lives in **MongoDB Atlas**. Images live in **Cloudinary**. Editors change
both through the admin panel at `/admin`. The application server itself holds no
site data, so it can be rebuilt or replaced without losing anything.

Target host: an **Oracle Cloud Ubuntu** instance behind Cloudflare.

---

## 1. Server requirements

| Item | Minimum |
|---|---|
| OS | Ubuntu 22.04 / 24.04 LTS |
| CPU / RAM | 1 vCPU / 4 GB (Oracle's Always Free ARM shape is ample) |
| Disk | 20 GB — photos no longer live on the server |
| Node.js | 22 LTS |
| npm | ships with Node |

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

Also install the backup tooling (section 8):

```bash
sudo apt-get install -y rclone
# mongodb-database-tools, for mongodump/mongorestore:
#   https://www.mongodb.com/docs/database-tools/installation/installation-linux/
```

> Earlier versions of this app required Node 22.5+ because they used the
> experimental `node:sqlite`. That dependency is gone.

---

## 2. Accounts to create

### MongoDB Atlas (free M0 tier)

1. Create a project and an **M0** cluster.
2. **Database Access** — add a user with read/write on the `radesign` database.
3. **Network Access** — allowlist the Oracle instance's public IP. Prefer the
   specific address over `0.0.0.0/0`.
4. **Connect → Drivers** — copy the connection string into `MONGODB_URI`.

M0 gives 512 MB, which is far more than this site's text content needs.
**M0 has no backup feature**, at any price — section 8 is therefore mandatory,
not optional.

### Cloudinary (free tier)

1. Create an account; note the **cloud name**, **API key** and **API secret**
   from Product Environment Credentials.
2. Nothing else to configure — folders are created on first upload.

The free tier is 25 credits/month (1 credit = 1 GB storage, or 1 GB delivery
bandwidth, or 1,000 transformations). Current usage is roughly **3 of 25**.
See section 9 for how to keep it there.

---

## 3. Install and build

```bash
sudo mkdir -p /srv/radesign && sudo chown $USER /srv/radesign
cd /srv/radesign
# copy the source here (git clone, scp, or unzip)

cp .env.example .env.local     # then fill it in — section 4
chmod 600 .env.local

npm ci
npm run build
npm run start -- -H 127.0.0.1 -p 3000
curl -I http://127.0.0.1:3000/     # expect HTTP 200
```

`npm run build` does **not** need the database or Cloudinary to be reachable.

---

## 4. Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the admin password. Generate with `npm run admin:hash`. The plaintext is never stored. |
| `ADMIN_SESSION_SECRET` | Signs session cookies. At least 32 characters: `openssl rand -hex 32` |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | Database name (`radesign`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

To set or change the admin password:

```bash
npm run admin:hash            # prompts, prints the ADMIN_PASSWORD_HASH line
pm2 reload radesign           # or: sudo systemctl restart radesign
```

The restart is what makes the new hash take effect — `.env.local` is read at
start-up, not per request.

`NEXT_DIST_DIR` exists only for running a preview beside a live build. **Leave
it unset in production.**

Never commit `.env.local`, and never include it in a handover archive.

---

## 5. One-off migration from the old SQLite site

Only needed once, when moving from the previous file-based deployment. Run it
from a machine that has both the old `data/radesign-admin.sqlite` and the old
`public/media/` folder.

```bash
# 1. Prove coverage first. Uploads nothing, writes nothing, needs no credentials.
node scripts/migrate-to-cloud.mjs --dry-run

# Expect: 117 images, 10 projects, 1 settings document, "All image references mapped."
# If it reports unmapped references, fix those before continuing.

# 2. Run it for real.
npm run migrate:cloud
```

The script is idempotent — Cloudinary public ids are derived from file paths and
existing assets are skipped, and the Mongo writes are upserts. A failed run can
simply be repeated.

Afterwards, keep a copy of the original `public/media/` somewhere safe (Drive or
a NAS). It is no longer needed by the application.

---

## 6. Run as a service

Pick **one** process manager. PM2 and the systemd unit below both bind
`127.0.0.1:3000`, so whichever starts second dies with `EADDRINUSE` — usually
noticed only once the site is already down. `scripts/deploy.sh` refuses to run
while the systemd unit is active, but nothing stops you starting them the other
way round.

Either way the app binds to `127.0.0.1` only and is never exposed directly;
Cloudflare's tunnel (section 7) is what reaches it.

### Option A — PM2 (scripted)

`ecosystem.config.cjs` defines the process and `scripts/deploy.sh` performs the
whole deploy: preflight checks, dependency install, build, image-cache
preservation, reload and a health check.

```bash
npm install -g pm2
pm2 install pm2-logrotate        # PM2 log files grow without bound otherwise

cd /srv/radesign
./scripts/deploy.sh              # builds and starts

pm2 startup                      # prints a command — run it, then:
pm2 save                         # so the app returns after a reboot
```

Day to day:

```bash
pm2 status
pm2 logs radesign
pm2 reload radesign              # after a manual rebuild
```

The script stops before touching the running app if anything is wrong —
`.env.local` missing, left group-readable, or any required variable empty; Node
older than 22; pm2 absent; the systemd unit still active. A failed build also
leaves the running app alone.

> `pm2 startup` run as root installs a **root-level** boot hook and PM2 will own
> the app as root. Run the deploy as the `radesign` user instead, matching
> `User=radesign` in the systemd unit.

Secrets are never passed through PM2. Next loads `.env.local` itself from the
working directory, which is why `ecosystem.config.cjs` sets only `NODE_ENV` and
pins `NEXT_DIST_DIR` back to empty — PM2 inherits the invoking shell's
environment, and a stray `NEXT_DIST_DIR` from a dev preview would otherwise make
production serve the wrong build directory.

#### On aaPanel

aaPanel's **Node Project** manager runs PM2 itself, under its own process name.
Two ways to run this site there, and mixing them is the thing to avoid:

- **Let aaPanel manage it.** Point the Node project at the folder, set the start
  command to `npm run start`, and deploy by rebuilding then restarting from the
  panel. `scripts/deploy.sh` is not used.
- **Manage it yourself.** Stop/delete the aaPanel Node project for this site and
  run `./scripts/deploy.sh`.

The script refuses to start a second server when something already holds port
3000, naming the process, so the clash fails in seconds rather than becoming an
intermittently broken site. It cannot see an aaPanel project by name, though —
only the occupied port — so if you pick the panel, deploy through the panel.

Paths differ from the rest of this guide: aaPanel sites live under
`/www/wwwroot/<folder>`, and its Node builds sit in `/www/server/nodejs/vNN/bin`
rather than `/usr/bin`. Nothing needs editing for that — the script and
`ecosystem.config.cjs` both resolve the application directory from their own
location — but `node`, `npm` and `pm2` must be on `PATH` for the shell running
the deploy. If `pm2 not found` appears while the panel clearly has Node:

```bash
export PATH="/www/server/nodejs/v22.11.0/bin:$PATH"   # adjust the version
npm install -g pm2
```

aaPanel fronts sites with **Nginx**, not a Cloudflare tunnel, so section 7's
tunnel is optional. Set the site up as a reverse proxy to `http://127.0.0.1:3000`
and keep the app bound to `127.0.0.1` so it is never reachable directly. In the
proxy configuration, forward the client's protocol — Next builds absolute URLs
for canonical tags, the sitemap and OpenGraph from it, and without it they are
emitted as `http://`:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
```

Do not let Nginx serve the folder as static files. `/admin` and `/api/*` must
reach Node, and nothing may cache them.

### Option B — systemd

`/etc/systemd/system/radesign.service`:

```ini
[Unit]
Description=R.A. Design Studio website (Next.js)
After=network.target

[Service]
Type=simple
User=radesign
WorkingDirectory=/srv/radesign
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/radesign/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now radesign
journalctl -u radesign -f
```

---

## 7. Domain and Cloudflare

### Use a Cloudflare Tunnel (strongly recommended on Oracle)

Oracle Cloud instances ship with **restrictive local iptables rules and a
separate VCN security list**. Opening inbound ports means getting both right,
and is the most common reason an Oracle deployment appears unreachable. A tunnel
needs no inbound port at all and sidesteps both.

1. Install `cloudflared` on the server.
2. In **Cloudflare Zero Trust → Networks → Tunnels**, create a tunnel (or reuse
   the existing one) and run its install command on this server.
3. Point the public hostnames for `radesign.info` and `www.radesign.info` at
   **`http://127.0.0.1:3000`**. The apex redirects to `www`; keep that.
4. Once the new server responds, stop any tunnel running on the old host so only
   one origin serves the site.

### Cache rules

Caching → Cache Rules:

- **When** URI path starts with `/_next/image` **or** `/_next/static`
- **Then** Eligible for cache, Edge TTL **1 month**, Browser TTL respect origin

Do **not** cache `/admin*` or `/api/*`.

> The old `/media/*` rule is obsolete — images are served through
> `/_next/image` now, not from the server's disk.

---

## 8. Backups — mandatory

Atlas M0 has **no backup feature**, so `scripts/backup-mongo.sh` is the only
copy of the site's content.

One-time setup:

```bash
rclone config          # create a Google Drive remote named "gdrive"
chmod +x /srv/radesign/scripts/backup-mongo.sh
/srv/radesign/scripts/backup-mongo.sh      # run once by hand and confirm it works
```

Schedule it (`sudo crontab -e`) — the 1st and 16th, about every 15 days:

```cron
0 3 1,16 * * /srv/radesign/scripts/backup-mongo.sh >> /var/log/radesign-backup.log 2>&1
```

It keeps the newest **5** archives (about 75 days of history) and deletes older
ones. Override with `BACKUP_REMOTE` and `BACKUP_KEEP` if needed.

### Test a restore — before you need one

An untested backup is not a backup. Restore into a scratch database and point a
local dev server at it:

```bash
mongorestore --uri="$MONGODB_URI" --nsFrom='radesign.*' --nsTo='radesign_restore_test.*' \
  --archive=radesign-YYYY-MM-DD.archive.gz --gzip
```

Then run the site locally with `MONGODB_DB=radesign_restore_test` and confirm the
projects and settings are all present. Drop the scratch database afterwards.

Images are held by Cloudinary and are not in this archive. The free tier carries
no SLA, so **keep the original full-resolution photos off-platform** (Drive or a
NAS) as the master copy.

---

## 9. Operating notes and limits

1. **Content edits are live immediately.** Pages are server-rendered per request
   and read MongoDB, so text, images, ordering and publishing all take effect on
   save. Only **code or CSS** changes need `npm run build` plus a restart.

2. **Uploaded images appear immediately too** — they go to Cloudinary and are
   recorded in MongoDB in the same request. (The previous deployment wrote them
   to `public/media/uploads/`, where Next would not serve them until the next
   rebuild. That defect is gone.)

3. **Preserve the image cache across deploys.** `.next/cache/images` holds the
   optimised copies. Lose it and Next re-fetches every source image from
   Cloudinary on first render — roughly 600 MB of the monthly allowance, and
   exhausting that makes Cloudinary **stop delivering** until the cycle resets.

   `scripts/deploy.sh` stashes and restores it around the build, including when
   the build fails. Building in place does keep `.next/cache`, so this matters
   mainly when the source is replaced wholesale — a fresh clone, or an rsync
   over the top — which is exactly when the loss would go unnoticed.

   Doing it by hand instead:

   ```bash
   cd /srv/radesign
   STASH=$(mktemp -d)
   cp -r .next/cache/images "$STASH/images" 2>/dev/null || true
   npm ci && npm run build
   mkdir -p .next/cache/images && cp -R "$STASH/images/." .next/cache/images/ 2>/dev/null || true
   rm -rf "$STASH"
   pm2 reload radesign           # or: sudo systemctl restart radesign
   ```

   Note the `/.` suffix: `cp -r src dest` nests `src` *inside* `dest` when
   `dest` already exists, quietly producing `.next/cache/images/images`.

4. **Resize before uploading.** Cloudinary caps ingest at 2560 px on the long
   edge, but uploading 40 MB camera originals still wastes time and bandwidth.
   Export at about **2560 px, JPEG quality 85** (roughly 0.5–1 MB). Keep the
   untouched originals off-platform.

5. **Never add a Cloudinary loader for `next/image`.** Images are delivered as
   one fixed URL each, so a transformation is billed once per image, ever. A
   per-request loader bills per width x format and can exhaust the free tier —
   and Cloudinary responds by **refusing to deliver** until the next cycle,
   which takes the site's images offline. Check the Cloudinary dashboard
   occasionally: the transformation count should track uploads, not page views.

6. **Atlas M0 allows ~100 operations/second.** Fine for this traffic, but avoid
   adding uncached per-request queries.

---

## 10. Updating the site later

With PM2, the whole update is the deploy script:

```bash
cd /srv/radesign
./scripts/deploy.sh --pull     # git pull, build, reload, health check
```

`--pull` fast-forwards the checkout first and refuses to run if the working tree
has uncommitted changes, so an edit made directly on the server is never
silently overwritten. Omit it to build whatever source is already on disk
(useful when deploying by rsync or scp).

On systemd, do the same steps by hand — see section 9 note 3 for the build,
then `sudo systemctl restart radesign`.

Content is untouched by a redeploy — it lives in Atlas and Cloudinary.

---

## 11. Go-live checklist

- [ ] Node 22 installed; `npm ci && npm run build` succeeds
- [ ] Atlas cluster created, user added, server IP allowlisted
- [ ] Cloudinary account created, credentials in `.env.local`
- [ ] `.env.local` filled in and `chmod 600`; fresh `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`
- [ ] Migration dry run clean, then run for real; content visible in Atlas
- [ ] One process manager chosen (PM2 **or** systemd, not both) and running
- [ ] If PM2: `pm2 startup` + `pm2 save` done, and `pm2-logrotate` installed
- [ ] `curl -I http://127.0.0.1:3000` returns 200
- [ ] Reboot tested — the site comes back by itself
- [ ] Cloudflare tunnel points at the new server; old origin stopped
- [ ] `https://www.radesign.info` loads; apex redirects to `www`
- [ ] `/work`, `/studio`, `/contact`, `/press` load; `/careers` redirects to `/contact`
- [ ] Admin login works at `/admin`
- [ ] **Upload an image through `/admin` and confirm it appears on the public site with no rebuild**
- [ ] Cache rules added; cache purged once
- [ ] Backup script runs by hand, lands in Drive, and **one restore has been tested**
