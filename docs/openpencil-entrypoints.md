# OpenPencil entrypoints

`open-pencil-inspector` has two independent design-data entrypoints.

## Default: CLI / headless generation

Use the local OpenPencil CLI when the source is a `.fig` file:

```sh
bun run packages/cli/src/main.ts pages ./figs/CryptoAndFoodApp.fig

bun run packages/cli/src/main.ts generate ./figs/CryptoAndFoodApp.fig \
  --page "🟠 Apps" \
  --output /tmp/CryptoAndFoodAppGenerated
```

This path does not require OpenPencil Mac App to be open. It reads the file,
normalizes the design into the shared Design AST, merges the optional Flow IR,
exports SVG-first assets with PNG fallback, and generates SwiftUI/UIKit output.
It is the intended path for repeatable local generation and CI.

To generate a standalone Swift Package instead of loose source files, add
`--package`:

```sh
bun run packages/cli/src/main.ts generate ./figs/RealEstateApp.fig \
  --page Screens \
  --output /tmp/RealEstateAppPackage \
  --feature RealEstateApp \
  --package
```

The package layout places generated Swift files and `Resources` (including
`Assets.xcassets`) under platform-specific source targets, and writes
`Package.swift` at the output root.

## Optional: MCP / live-document inspection

Use the MCP adapter when an agent needs to inspect the document currently open
in OpenPencil Mac App. The current official `openpencil-mcp` bridge discovers
the running App's document session through its local socket and discovery file,
so this path requires the Mac App and an active document.

MCP is not a prerequisite for CLI generation. If the App is closed or no live
document is available, CLI generation from a `.fig` file remains available.

Both paths normalize into the same Design AST and can feed the same Flow IR and
iOS code generators. API integration remains deferred until an API SPEC is
provided.

## Screenshot verification

The same CLI exposes the visual verification gate:

```sh
bun run packages/cli/src/main.ts verify reference.png candidate.png \
  --threshold 0.01
```

The command reports JSON with `pass`, `fail`,
`reference-unavailable`, or `reference-threshold-pending`. A threshold is a
pixel-difference ratio from `0` to `1`; it must be approved against a matching
design reference before it can be used as an acceptance gate.

## Fresh-directory workflow

For a multi-page `.fig`, choose the page or selected roots before analysis. A
selection manifest is the reproducible form of that choice:

```json
{
  "version": "1.0",
  "source": "figs/CryptoAndFoodApp.fig",
  "page": { "id": "0:5", "name": "🟠 Apps" },
  "rootNodes": [{ "id": "0:88", "name": "Food App", "type": "FRAME" }],
  "scope": "selected-subtree"
}
```

The complete local workflow is:

```sh
mkdir -p /tmp/open-pencil-inspector-run
bun run packages/cli/src/main.ts pages figs/CryptoAndFoodApp.fig
bun run packages/cli/src/main.ts screen-contract figs/CryptoAndFoodApp.fig \
  --page '🟠 Apps' --node 0:89 \
  --output /tmp/open-pencil-inspector-run/home-contract.json
bun run packages/cli/src/main.ts propose-flow figs/CryptoAndFoodApp.fig \
  --selection /tmp/open-pencil-inspector-run/selection.json \
  --output /tmp/open-pencil-inspector-run/candidate.json
bun run packages/cli/src/main.ts confirm-flow \
  /tmp/open-pencil-inspector-run/candidate.json \
  --output /tmp/open-pencil-inspector-run/confirmed.json
bun run packages/cli/src/main.ts preflight figs/CryptoAndFoodApp.fig \
  --selection /tmp/open-pencil-inspector-run/selection.json \
  --confirmed-flow /tmp/open-pencil-inspector-run/confirmed.json \
  --output /tmp/open-pencil-inspector-run/package
bun run packages/cli/src/main.ts validate /tmp/open-pencil-inspector-run/package
bun run packages/cli/src/main.ts generate figs/CryptoAndFoodApp.fig \
  --selection /tmp/open-pencil-inspector-run/selection.json \
  --confirmed-flow /tmp/open-pencil-inspector-run/confirmed.json \
  --output /tmp/open-pencil-inspector-run/native \
  --platform swiftui
```

CLI failures are JSON on stderr, with stable `code` and exit codes. Usage and
scope errors use exit code `2`; ingestion, validation, and generation failures
use exit code `1`.
