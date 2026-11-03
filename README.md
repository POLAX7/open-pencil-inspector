# OpenPencil Inspector

English | [繁體中文](README.zh-TW.md)

OpenPencil Inspector turns OpenPencil/Figma `.fig` design files into traceable data for native UI implementation.

It uses the OpenPencil CLI to inspect a design file, then organizes its structure, screens, layout, components, assets, and Screen Contracts before generating native UI code. Native code generation currently focuses on iOS, with support for SwiftUI and UIKit.

The main workflow is:

```text
.fig design file
  -> OpenPencil CLI / MCP
  -> Design AST / Screen Contract
  -> SwiftUI / UIKit
```

## Prerequisites

Install or prepare the following:

- macOS (the current toolchain primarily targets macOS)
- Node.js
- Bun `>= 1.1.0`
- OpenPencil Mac App
- OpenPencil CLI
- OpenPencil MCP, if Codex, Antigravity, or another agent needs to inspect the design currently open in the app

Use the same version for the OpenPencil App, CLI, and MCP. Verify the installed tools with:

```sh
openpencil --version
openpencil-mcp --version
```

## Installation and Version Check

Clone the repository and install its JavaScript dependencies:

```sh
git clone https://github.com/POLAX7/open-pencil-inspector.git
cd open-pencil-inspector
bun install
```

Confirm that the repository CLI is available:

```sh
node --experimental-strip-types packages/cli/src/main.ts --help
```

To use MCP, start the OpenPencil Mac App first, then register a workspace-local MCP server with your agent. For Codex:

```sh
mkdir -p ~/Documents/GitHub/open-pencil-mcp
npm install \
  --prefix ~/Documents/GitHub/open-pencil-mcp \
  --no-save \
  --package-lock=false \
  @open-pencil/mcp@0.16.0

codex mcp add open-pencil -- \
  ~/Documents/GitHub/open-pencil-mcp/node_modules/.bin/openpencil-mcp
```

Confirm the MCP registration:

```sh
codex mcp get open-pencil
```

## Agent Usage Example

Start OpenPencil, open the `.fig` file you want to inspect, and make sure the MCP server is registered. Then send a request like this to Codex or another MCP-capable agent:

```text
Use open-pencil-inspector to process figs/CryptoAndFoodApp.fig.

Inspect the target screen on the "🟠 Apps" page. Extract the screen structure,
assets, and layout information; create a Screen Contract; run preflight; and
generate SwiftUI and UIKit output that can be integrated into an iOS project.
Preserve the design node IDs and asset provenance, and list any behavior that
cannot be determined from the design file.
```

The agent can use OpenPencil MCP to inspect the current selection, nodes, and open design document, then use the repository CLI for inspection, Screen Contract generation, preflight, and code generation.

## Using the Tool for Android UI Development

OpenPencil Inspector currently generates native SwiftUI and UIKit output. It does not yet provide a dedicated Kotlin or Jetpack Compose generator.

Android developers can still use the tool to obtain:

- Screen and node hierarchy
- Component dimensions, spacing, and layout contracts
- Colors, typography, corner radii, and other design tokens
- Images, SVGs, and other asset provenance
- Screen Contracts and screen structure data

The resulting Screen Contracts, layout contracts, and assets can then be used as implementation input for Jetpack Compose or XML layouts. This allows the design-inspection and specification workflow to be shared while Android developers implement the final UI with native Android components.

## Common Questions and Limitations

### Why cannot the CLI find OpenPencil?

Check that the CLI is installed and available in `PATH`:

```sh
which openpencil
openpencil --version
```

When using the repository dependencies, run `bun install` and prefer the local binary provided by the repository.

### Why does MCP return no design data?

MCP connects to the OpenPencil App that is currently running. Check that:

1. OpenPencil is running.
2. The `.fig` file is open in the app.
3. The MCP client points to the correct `openpencil-mcp` executable.
4. The App, CLI, and MCP use the same version.

### Can I use any `.fig` file?

You can try inspecting any supported `.fig` file. Different designs may use different components, assets, fonts, and node structures, so inspect or preflight the file before generating code.

### Does the generated code include complete product functionality?

The generated output describes UI structure and traceable design data. APIs, business logic, data flow, permissions, and product behavior still need to be implemented in the target application.

### How do I verify the repository?

```sh
bun test packages
bun run check
bun run verify:figs
```
