# OpenPencil Version Sync

Use `scripts/sync-openpencil-version.sh` to synchronize one exact OpenPencil version across the global CLI, global MCP, this project's dependencies, `bun.lock`, and `/Applications/OpenPencil.app`.

## Preview

```bash
./scripts/sync-openpencil-version.sh 0.16.0-beta.3 --dry-run
```

The default mode is dry-run. It does not download, install, modify `package.json`, modify `bun.lock`, or replace the Mac App.

## Apply

```bash
./scripts/sync-openpencil-version.sh 0.16.0-beta.3 --apply
```

The apply mode:

1. Confirms the GitHub release contains the correct macOS installer for the current CPU architecture.
2. Installs the exact version of global `@open-pencil/cli` and `@open-pencil/mcp` with npm.
3. Installs the exact version into this project with Bun and updates `bun.lock`.
4. Quits OpenPencil if it is running.
5. Replaces `/Applications/OpenPencil.app` directly without keeping a backup.
6. Verifies all four version sources and fails loudly if any mismatch remains.

The script selects `aarch64.dmg` on Apple Silicon and `x64.dmg` on Intel Macs.

## Override the CLI binary

The project adapter uses its local `node_modules/.bin/openpencil` by default. Set `OPENPENCIL_CLI` only when an explicit alternate binary is required:

```bash
OPENPENCIL_CLI=/path/to/openpencil ./scripts/sync-openpencil-version.sh 0.16.0-beta.3 --dry-run
```
