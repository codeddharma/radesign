# R.A. Design Studio: deployment guide

Website for **radesign.info**, built with Next.js 15 (App Router), React 19 and TypeScript.
All content (projects, Studio page, contact details, media list) is stored in a
single SQLite file: `data/radesign-admin.sqlite`. Editors change it through the
admin panel at `/admin`.

The site is currently served from a Mac through a **Cloudflare Tunnel**. This
guide moves it to a Linux VPS behind the same Cloudflare domain.

---

## 1. Server requirements

| Item | Minimum |
|---|---|
| OS | Ubuntu 22.04 / 24.04 LTS (any modern Linux works) |
| CPU / RAM | 1 vCPU / 4 GB is enough (2 vCPU recommended for faster builds) |
| Disk | 50 GB (current media about 100 MB; plan for growth) |
| **Node.js** | **22.5 or newer** (tested on **v22.22**). This is required because the app uses the built-in `node:sqlite` module. |
| npm | ships with Node |

Install Node 22 (example using NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # must print v22.5+ 
```

---

## 2. What is in this package

```
app/ components/ lib/      application source (edit these to change the site)
public/                    static files + all project photos (public/media)
data/radesign-admin.sqlite live content database (clean snapshot, no enquiries)
data/*.json                legacy seed files (not read at runtime; safe to keep)
ops/com.radesign.web.plist macOS service file used on the old Mac (reference only)
.env.local                 REAL environment values (admin login + session secret). Keep private.
.env.example               template for the required environment variables
design_handoff/            original design source files (reference for changes)
package.json / package-lock.json
ADMIN_PANEL_PLAN.md        background planning doc (not needed to deploy)
```

**Not included:** `node_modules/` and `.next/` (build output). `npm ci` and
`npm run build` recreate them on the server.

`.env.local` **is included** and holds the real admin login. Keep it private:
never commit it to git and never share it further. After going live, consider
setting a new `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.

---

## 3. Install and build

```bash
# as a normal (non-root) user, e.g. "radesign"
sudo mkdir -p /srv/radesign && sudo chown $USER /srv/radesign
cd /srv/radesign
unzip ~/radesign-deploy-*.zip -d .      # or scp the folder here

npm ci                                   # exact versions from package-lock.json
# .env.local is already included. Check the values (section 4).
npm run build
```

Test it:

```bash
npm run start -- -H 127.0.0.1 -p 3000
curl -I http://127.0.0.1:3000/          # expect HTTP 200
```

Stop it with Ctrl+C and set it up as a service (section 5).

---

## 4. Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password (12+ characters, strong) |
| `ADMIN_SESSION_SECRET` | Long random string used for the admin session cookie. Generate with `openssl rand -hex 32` |
| `ADMIN_DB_PATH` | Path to the SQLite file. Keep `./data/radesign-admin.sqlite` |

`NEXT_DIST_DIR` exists only for running a local preview beside a live build.
**Leave it unset in production.**

`chmod 600 .env.local` so only the app user can read it.

---

## 5. Run as a service (systemd)

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
sudo systemctl status radesign
journalctl -u radesign -f              # logs
```

The app binds to `127.0.0.1` only, so it is never exposed directly. Traffic
arrives through Cloudflare (section 6). A harmless
`ExperimentalWarning: SQLite is an experimental feature` line in the logs is expected.

---

## 6. Connect the domain through Cloudflare

The domain is already on Cloudflare. Pick **one** option.

### Option A: Cloudflare Tunnel (recommended; same as today, no open ports)

1. Install `cloudflared` on the server: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. In **Cloudflare Zero Trust → Networks → Tunnels**, either:
   - **reuse the existing tunnel**: copy its install command/token and run it on
     the new server (`sudo cloudflared service install <TOKEN>`), or
   - create a new tunnel and add public hostnames.
3. Public hostnames must point to **`http://127.0.0.1:3000`** for both
   `radesign.info` and `www.radesign.info`. The site currently redirects the apex
   domain to `www`. Keep that behaviour.
4. Once the new server responds, **stop the tunnel on the old Mac** so only one
   origin serves the site.

### Option B: Nginx reverse proxy + proxied DNS

- Point `A` records for `radesign.info` and `www` to the server IP, **proxied (orange cloud)**.
- Nginx `proxy_pass http://127.0.0.1:3000;` with a Cloudflare Origin Certificate,
  SSL mode **Full (strict)**.
- Firewall: allow 80/443 only from Cloudflare IP ranges.

---

## 7. Cloudflare caching (important for speed)

Create a **Cache Rule** (Caching → Cache Rules):

- **When** URI path starts with `/_next/image` **or** `/_next/static` **or** `/media/`
- **Then** Eligible for cache, Edge TTL **1 month**, Browser TTL **respect origin**

Do **not** cache `/admin*` or `/api/*`. After a deploy, **Purge Everything** once.

---

## 8. Data and backups (must do)

Everything the client edits lives on this server's disk:

| Path | What |
|---|---|
| `data/radesign-admin.sqlite` (+ `-wal`, `-shm`) | all site content |
| `public/media/` | all photos, including admin uploads in `public/media/uploads/` |

Daily backup example (`crontab -e`):

```cron
30 2 * * * cd /srv/radesign && sqlite3 data/radesign-admin.sqlite ".backup /srv/backups/radesign-$(date +\%F).sqlite" && tar czf /srv/backups/media-$(date +\%F).tgz public/media
```

(`sudo apt install sqlite3`.) Copy backups off the server as well, and keep about 14 days.
Never copy the live `.sqlite` file while the app runs. Use `.backup` as shown.

---

## 9. Known behaviour and limits

1. **Images uploaded through `/admin` after the build.** Next.js serves only the
   files that were in `public/` **when `npm run build` ran**. New uploads land in
   `public/media/uploads/` but won't load until one of these is done:
   - run `npm run build && sudo systemctl restart radesign` after uploading, **or**
   - (better, Option B) have Nginx serve that folder directly:
     `location /media/uploads/ { alias /srv/radesign/public/media/uploads/; }`

2. **Large photos.** More high-resolution images are expected (15 GB or more).
   Resize them before uploading, to **2560 px on the long edge, JPEG quality
   85** (about 0.5–1 MB each). The site never shows images wider than about 2400 px.
   Full-size camera files waste disk and make the single CPU slow while
   generating thumbnails. Keep the untouched originals off the server
   (Drive or NAS).

3. **Content pages are server-rendered on each request** (they read SQLite), so
   admin text edits appear immediately without a rebuild. **Code or CSS changes
   need** `npm run build` plus a restart (about 1 minute of downtime).

---

## 10. Updating the site later

```bash
cd /srv/radesign
# copy in the new source (keep data/, public/media/uploads/ and .env.local!)
npm ci
npm run build
sudo systemctl restart radesign
```

---

## 11. Quick checklist

- [ ] Node 22.5+ installed
- [ ] `npm ci && npm run build` succeeds
- [ ] `.env.local` filled in, `chmod 600`
- [ ] systemd service running, `curl -I http://127.0.0.1:3000` gives 200
- [ ] Cloudflare tunnel/DNS points to the new server; old Mac tunnel stopped
- [ ] `https://www.radesign.info` loads; `https://radesign.info` redirects to www
- [ ] `/work`, `/studio`, `/contact` load; `/careers` redirects to `/contact`
- [ ] Admin login at `/admin` works
- [ ] Cache rule added; cache purged
- [ ] Daily backups running and tested with one restore
