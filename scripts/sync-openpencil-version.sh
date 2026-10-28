#!/bin/bash
set -euo pipefail

REPO="open-pencil/open-pencil"
APP_PATH="/Applications/OpenPencil.app"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  sync-openpencil-version.sh <version> [--dry-run]
  sync-openpencil-version.sh <version> --apply

Synchronizes the exact OpenPencil version across:
  - global @open-pencil/cli
  - global @open-pencil/mcp
  - this project's package.json and bun.lock
  - /Applications/OpenPencil.app

The existing Mac App is replaced directly when --apply is used.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

log() {
  echo "[open-pencil-sync] $*"
}

VERSION="${1:-}"
MODE="${2:---dry-run}"

[[ -n "$VERSION" && "$VERSION" != -* ]] || { usage; exit 2; }
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]] || die "invalid semver: $VERSION"
[[ "$MODE" == "--dry-run" || "$MODE" == "--apply" ]] || { usage; exit 2; }

for command in bun npm gh hdiutil ditto; do
  command -v "$command" >/dev/null 2>&1 || die "required command not found: $command"
done

ARCH="$(uname -m)"
case "$ARCH" in
  arm64) ASSET="OpenPencil_${VERSION}_aarch64.dmg" ;;
  x86_64) ASSET="OpenPencil_${VERSION}_x64.dmg" ;;
  *) die "unsupported macOS architecture: $ARCH" ;;
esac

TMP_DIR="$(mktemp -d /private/tmp/open-pencil-sync.XXXXXX)"
MOUNT_POINT=""
cleanup() {
  if [[ -n "$MOUNT_POINT" ]] && mount | rg -q "on $MOUNT_POINT "; then
    hdiutil detach "$MOUNT_POINT" >/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "target version: $VERSION"
log "architecture: $ARCH"
log "installer: $ASSET"
log "project: $PROJECT_ROOT"

if [[ "$MODE" == "--dry-run" ]]; then
  log "dry-run: no packages, lockfile, or Mac App will be changed"
  log "would run: npm install -g @open-pencil/cli@$VERSION @open-pencil/mcp@$VERSION"
  log "would run: bun add -d @open-pencil/cli@$VERSION @open-pencil/mcp@$VERSION"
  log "would download: GitHub release v$VERSION/$ASSET"
  log "would replace: $APP_PATH"
  exit 0
fi

log "checking GitHub release asset"
gh release view "v$VERSION" --repo "$REPO" --json assets --jq '.assets[].name' | rg -Fx "$ASSET" >/dev/null \
  || die "release asset not found: v$VERSION/$ASSET"

log "updating global CLI and MCP"
npm install -g "@open-pencil/cli@$VERSION" "@open-pencil/mcp@$VERSION"

log "updating project dependencies and bun.lock"
cd "$PROJECT_ROOT"
bun add -d "@open-pencil/cli@$VERSION" "@open-pencil/mcp@$VERSION"

log "downloading Mac App installer"
gh release download "v$VERSION" --repo "$REPO" --pattern "$ASSET" --dir "$TMP_DIR" --clobber

log "quitting OpenPencil if it is running"
osascript -e 'tell application "OpenPencil" to quit' >/dev/null 2>&1 || true

log "mounting installer"
MOUNT_POINT="$(hdiutil attach -nobrowse -readonly "$TMP_DIR/$ASSET" | awk '/\/Volumes\// {print substr($0, index($0, "/Volumes/")); exit}')"
[[ -n "$MOUNT_POINT" && -d "$MOUNT_POINT/OpenPencil.app" ]] || die "could not locate OpenPencil.app in mounted installer"

log "replacing $APP_PATH without backup"
rm -rf "$APP_PATH"
ditto "$MOUNT_POINT/OpenPencil.app" "$APP_PATH"

log "verifying synchronized versions"
PROJECT_CLI_VERSION="$(node -p "require('$PROJECT_ROOT/package.json').devDependencies['@open-pencil/cli']")"
PROJECT_MCP_VERSION="$(node -p "require('$PROJECT_ROOT/package.json').devDependencies['@open-pencil/mcp']")"
GLOBAL_CLI_VERSION="$(npm list -g --depth=0 --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).dependencies?.['@open-pencil/cli']?.version||''))")"
GLOBAL_MCP_VERSION="$(npm list -g --depth=0 --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).dependencies?.['@open-pencil/mcp']?.version||''))")"
APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist")"

[[ "$PROJECT_CLI_VERSION" == "$VERSION" ]] || die "project CLI mismatch: $PROJECT_CLI_VERSION"
[[ "$PROJECT_MCP_VERSION" == "$VERSION" ]] || die "project MCP mismatch: $PROJECT_MCP_VERSION"
[[ "$GLOBAL_CLI_VERSION" == "$VERSION" ]] || die "global CLI mismatch: $GLOBAL_CLI_VERSION"
[[ "$GLOBAL_MCP_VERSION" == "$VERSION" ]] || die "global MCP mismatch: $GLOBAL_MCP_VERSION"
[[ "$APP_VERSION" == "$VERSION" ]] || die "Mac App mismatch: $APP_VERSION"

log "synchronized: $VERSION"
