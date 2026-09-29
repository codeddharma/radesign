#!/usr/bin/env bash
#
# Off-site backup of the R.A. Design Studio content database.
#
# Atlas M0 has no backup feature at any price, so this is the only copy of the
# site's content. Cloudinary holds the images separately.
#
# Runs every 15 days and keeps the newest 5 archives (about 75 days of history):
#   0 3 1,16 * * /srv/radesign/scripts/backup-mongo.sh >> /var/log/radesign-backup.log 2>&1
#
# "1,16" is deliberate. "*/15" in the day-of-month field also fires on the 31st.
#
# Requires: mongodb-database-tools (mongodump) and rclone, with a Google Drive
# remote already authorised via `rclone config`.
#
# Restore:  mongorestore --uri="$MONGODB_URI" --archive=<file> --gzip --drop

set -euo pipefail

APP_DIR="${APP_DIR:-/srv/radesign}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.local}"
REMOTE="${BACKUP_REMOTE:-gdrive:radesign-backups}"
KEEP="${BACKUP_KEEP:-5}"
WORK_DIR="$(mktemp -d)"

note() { echo "[$(date -u +%FT%TZ)] $*"; }
die()  { note "FAILED: $*"; logger -t radesign-backup "FAILED: $*" 2>/dev/null || true; exit 1; }
trap 'rm -rf "$WORK_DIR"' EXIT

[ -r "$ENV_FILE" ] || die "cannot read $ENV_FILE"
# Read MONGODB_URI without sourcing the file, so nothing else in it is executed.
MONGODB_URI="$(grep -E '^MONGODB_URI=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
[ -n "$MONGODB_URI" ] || die "MONGODB_URI is not set in $ENV_FILE"

command -v mongodump >/dev/null || die "mongodump not found (apt install mongodb-database-tools)"
command -v rclone    >/dev/null || die "rclone not found"

ARCHIVE="radesign-$(date -u +%F).archive.gz"
note "dumping to $ARCHIVE"
mongodump --uri="$MONGODB_URI" --archive="$WORK_DIR/$ARCHIVE" --gzip --quiet \
  || die "mongodump failed"

# A dump that succeeded but produced nothing would silently "back up" an empty
# database over a good history, so check before uploading.
SIZE=$(wc -c < "$WORK_DIR/$ARCHIVE")
[ "$SIZE" -gt 1024 ] || die "archive is only ${SIZE} bytes — refusing to upload"
note "archive is ${SIZE} bytes"

note "uploading to $REMOTE"
rclone copy "$WORK_DIR/$ARCHIVE" "$REMOTE/" --no-traverse || die "rclone upload failed"

# Retention: ISO dates sort lexically, so the oldest are simply the first.
# Counting explicitly rather than using `head -n -N`, which is GNU-only.
note "pruning to the newest $KEEP archives"
LISTING="$WORK_DIR/listing.txt"
rclone lsf "$REMOTE/" --include 'radesign-*.archive.gz' | sort > "$LISTING" || die "could not list $REMOTE"
TOTAL=$(wc -l < "$LISTING" | tr -d ' ')
if [ "$TOTAL" -gt "$KEEP" ]; then
  head -n "$((TOTAL - KEEP))" "$LISTING" | while IFS= read -r file; do
    [ -n "$file" ] || continue
    note "  removing $file"
    rclone deletefile "$REMOTE/$file" || die "could not delete $file"
  done
else
  note "  $TOTAL archive(s) present, nothing to prune"
fi

note "backup complete: $ARCHIVE"
logger -t radesign-backup "backup complete: $ARCHIVE (${SIZE} bytes)" 2>/dev/null || true
