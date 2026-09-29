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
sudo systemctl restart radesign
```

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

## 6. Run as a service (systemd)

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

The app binds to `127.0.0.1` only and is never exposed directly.

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

3. **Preserve the image cache across deploys.** `npm run build` wipes
   `.next/cache`, which forces Next to re-fetch every source image from
   Cloudinary — roughly 600 MB of the monthly bandwidth allowance. Keep it:

   ```bash
   cd /srv/radesign
   cp -r .next/cache/images /tmp/next-image-cache 2>/dev/null || true
   npm ci && npm run build
   mkdir -p .next/cache && cp -r /tmp/next-image-cache .next/cache/images 2>/dev/null || true
   sudo systemctl restart radesign
   ```

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

```bash
cd /srv/radesign
# copy in the new source, keeping .env.local
cp -r .next/cache/images /tmp/next-image-cache 2>/dev/null || true
npm ci
npm run build
mkdir -p .next/cache && cp -r /tmp/next-image-cache .next/cache/images 2>/dev/null || true
sudo systemctl restart radesign
```

Content is untouched by a redeploy — it lives in Atlas and Cloudinary.

---

## 11. Go-live checklist

- [ ] Node 22 installed; `npm ci && npm run build` succeeds
- [ ] Atlas cluster created, user added, server IP allowlisted
- [ ] Cloudinary account created, credentials in `.env.local`
- [ ] `.env.local` filled in and `chmod 600`; fresh `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`
- [ ] Migration dry run clean, then run for real; content visible in Atlas
- [ ] systemd service running; `curl -I http://127.0.0.1:3000` returns 200
- [ ] Cloudflare tunnel points at the new server; old origin stopped
- [ ] `https://www.radesign.info` loads; apex redirects to `www`
- [ ] `/work`, `/studio`, `/contact`, `/press` load; `/careers` redirects to `/contact`
- [ ] Admin login works at `/admin`
- [ ] **Upload an image through `/admin` and confirm it appears on the public site with no rebuild**
- [ ] Cache rules added; cache purged once
- [ ] Backup script runs by hand, lands in Drive, and **one restore has been tested**
