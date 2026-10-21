#!/usr/bin/env bash
#
# Build and (re)start the R.A. Design Studio website under PM2.
#
#   /srv/radesign/scripts/deploy.sh            # build what is on disk, reload
#   /srv/radesign/scripts/deploy.sh --pull     # git pull first, then build
#
# Content lives in Atlas and Cloudinary, so a deploy never touches site data.
# Only code and CSS changes need this script; text and image edits made in
# /admin are live the moment they are saved.
#
# Requires: Node 22, pm2 installed globally, and a filled-in .env.local.
# Next reads .env.local from the working directory itself, so no secret is
# passed through PM2 or through this script.
#
# First run on a new box:
#   npm install -g pm2
#   pm2 install pm2-logrotate      # PM2 logs grow without bound otherwise
#   /srv/radesign/scripts/deploy.sh
#   pm2 startup                    # run the command it prints, then:
#   pm2 save

set -euo pipefail

# Default to the checkout this script lives in, so it works from wherever the
# source actually sits. On the server that is /srv/radesign/scripts/deploy.sh,
# which resolves to /srv/radesign without hardcoding it; on a laptop it resolves
# to the working copy. Override APP_DIR to deploy somewhere else.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="${APP_NAME:-radesign}"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.local}"
ECOSYSTEM="${ECOSYSTEM:-$APP_DIR/ecosystem.config.cjs}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
PULL=0
[ "${1:-}" = "--pull" ] && PULL=1

note() { echo "[$(date -u +%FT%TZ)] $*"; }
die()  { note "FAILED: $*"; logger -t radesign-deploy "FAILED: $*" 2>/dev/null || true; exit 1; }

# --- preflight -------------------------------------------------------------
# Everything that can be checked cheaply is checked before the build, so a
# misconfigured box fails in seconds rather than after a three-minute compile.

[ -d "$APP_DIR" ]    || die "$APP_DIR does not exist"
cd "$APP_DIR"
[ -f package.json ]  || die "$APP_DIR is not the application directory (no package.json)"
[ -r "$ENV_FILE" ]   || die "cannot read $ENV_FILE — copy .env.example and fill it in"
[ -f "$ECOSYSTEM" ]  || die "missing $ECOSYSTEM"

command -v node >/dev/null || die "node not found"
command -v npm  >/dev/null || die "npm not found"
command -v pm2  >/dev/null || die "pm2 not found (npm install -g pm2)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Node 22+ required, found $(node --version)"

# .env.local holds the Atlas and Cloudinary credentials. Group- or
# world-readable is a finding worth stopping for, not warning about.
PERMS="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE")"
case "$PERMS" in
  600|400) ;;
  *) die "$ENV_FILE is mode $PERMS — run: chmod 600 $ENV_FILE" ;;
esac

# Every variable the app needs at runtime. Checked by name only; the values are
# never printed, and the file is grepped rather than sourced so nothing in it
# can execute.
for key in ADMIN_EMAIL ADMIN_PASSWORD_HASH ADMIN_SESSION_SECRET \
           MONGODB_URI MONGODB_DB \
           CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET; do
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2-)"
  [ -n "$value" ] || die "$key is empty in $ENV_FILE"
done

# Two process managers both binding 127.0.0.1:3000 means the second one dies
# with EADDRINUSE, usually long after the deploy appeared to succeed.
if command -v systemctl >/dev/null && systemctl is-active --quiet "$APP_NAME" 2>/dev/null; then
  die "the $APP_NAME systemd unit is active. Pick one process manager: sudo systemctl disable --now $APP_NAME"
fi

if [ "$(id -u)" = "0" ]; then
  note "WARNING: running as root. PM2 will then own the app as root and"
  note "         'pm2 startup' will install a root-level boot hook."
fi

note "deploying $APP_NAME from $APP_DIR"

# --- source ----------------------------------------------------------------

if [ "$PULL" = "1" ]; then
  git rev-parse --git-dir >/dev/null 2>&1 || die "--pull given but $APP_DIR is not a git checkout"
  # A dirty tree means someone edited the server in place. Merging over that
  # silently is how local fixes disappear.
  [ -z "$(git status --porcelain)" ] || die "working tree has uncommitted changes — commit, stash or discard them first"
  note "pulling $(git rev-parse --abbrev-ref HEAD)"
  git pull --ff-only || die "git pull failed (not a fast-forward?)"
fi

note "building $(git rev-parse --short HEAD 2>/dev/null || echo 'untracked source')"

# --- build -----------------------------------------------------------------
# Protect .next/cache/images across the build. Without it Next re-fetches every
# source image from Cloudinary on first render — roughly 600 MB against a 25
# credit/month allowance, and exhausting that makes Cloudinary stop delivering.
#
# Building in place does keep .next/cache, so this is insurance rather than a
# certainty: it matters when the source is replaced wholesale (a fresh clone, an
# rsync over the top, or anything that removes .next) which is exactly when the
# loss would go unnoticed.
#
# A fresh mktemp dir each run, rather than a fixed /tmp path: a fixed path left
# behind by an earlier failed deploy would restore a stale cache over the new
# build, and two concurrent deploys would overwrite each other's stash.

STASH="$(mktemp -d)"
CACHE_SAVED=0
restore_cache() {
  if [ "$CACHE_SAVED" = "1" ] && [ -d "$STASH/images" ]; then
    # Copy the CONTENTS ("/." suffix), not the directory. `cp -r src dest` nests
    # src inside dest when dest already exists, which it does whenever the build
    # preserved the cache — that silently produced .next/cache/images/images.
    # Merging contents is also right when the build added new entries: the files
    # are content-addressed, so re-writing an existing key is a no-op.
    mkdir -p .next/cache/images
    cp -R "$STASH/images/." .next/cache/images/
    note "image cache restored"
  fi
  rm -rf "$STASH"
}
# Runs on success and on failure alike, so a failed build cannot lose the cache.
trap restore_cache EXIT

if [ -d .next/cache/images ]; then
  cp -r .next/cache/images "$STASH/images"
  CACHE_SAVED=1
  note "image cache stashed ($(du -sh "$STASH/images" | cut -f1))"
fi

note "installing dependencies"
npm ci || die "npm ci failed"

note "building"
# The build needs neither Atlas nor Cloudinary, so a failure here is a code
# problem. The running app is left alone — PM2 is not touched until this passes.
npm run build || die "build failed — the running app was left untouched"

restore_cache
trap - EXIT

# --- start or reload -------------------------------------------------------

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  note "reloading $APP_NAME"
  pm2 reload "$ECOSYSTEM" --update-env || die "pm2 reload failed"
else
  note "starting $APP_NAME for the first time"
  pm2 start "$ECOSYSTEM" || die "pm2 start failed"
fi

# Persist the process list so `pm2 resurrect` brings the app back after a
# reboot. Without this, a reboot leaves the site down until someone notices.
pm2 save >/dev/null || note "WARNING: pm2 save failed — the app may not survive a reboot"

# --- health check ----------------------------------------------------------
# PM2 reporting "online" only means the process started. It says nothing about
# whether Next can actually serve a page, so ask the server.

note "waiting for $HEALTH_URL"
for i in $(seq 1 "$HEALTH_RETRIES"); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)"
  if [ "$CODE" = "200" ]; then
    note "health check OK (HTTP 200 after ${i}s)"
    note "deploy complete"
    logger -t radesign-deploy "deploy complete: $(git rev-parse --short HEAD 2>/dev/null || echo untracked)" 2>/dev/null || true
    exit 0
  fi
  sleep 1
done

note "last response: HTTP ${CODE:-none}"
note "recent logs:"
pm2 logs "$APP_NAME" --lines 30 --nostream 2>/dev/null || true
# A non-200 here is usually Atlas refusing the connection: check that the
# server's current public IP is still allowlisted under Atlas Network Access.
die "app did not return 200 within ${HEALTH_RETRIES}s"
