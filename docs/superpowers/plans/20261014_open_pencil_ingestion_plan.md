# OpenPencil Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic OpenPencil CLI/MCP ingestion layer that converts `.fig` design data into a stable normalized Design AST.

**Architecture:** Use the OpenPencil CLI for headless inspection and the MCP adapter for live-app inspection. Normalize both through one typed core interface, preserve render/codegen-critical properties, and emit explicit capability and source diagnostics.

**Tech Stack:** TypeScript, Bun, OpenPencil CLI/MCP, Vitest, fixture-based JSON.

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Preserve the original `.fig`; write operations use explicit output copies.
- Do not depend on a fixed MCP tool inventory.
- Preserve unsupported properties as diagnostics or metadata.
- No Swift codegen or API implementation belongs in this plan.
- Deterministic transforms must remain plain code; AI is not used for routing or retries.

### Task 1: Scaffold the TypeScript package and core ingestion contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/core/src/design-ast.ts`
- Create: `packages/core/src/diagnostics.ts`
- Create: `packages/core/test/design-ast.test.ts`

**Interfaces:**
- `DesignNode`, `DesignDocument`, `DesignToken`, `DesignAsset`
- `Diagnostic`, `DiagnosticSeverity`, `SourceProvenance`
- `normalizeDesignDocument(input: unknown): DesignDocument`

- [ ] **Step 1: Write failing tests** for required node identity, child hierarchy, provenance, unsupported-property diagnostics, and invalid input rejection.
- [ ] **Step 2: Run** `bunx vitest run packages/core/test/design-ast.test.ts`; verify the tests fail because the contracts do not exist.
- [ ] **Step 3: Implement** the smallest typed AST and diagnostic model.
- [ ] **Step 4: Run** the focused test; verify PASS.
- [ ] **Step 5: Commit** only after explicit user approval.

### Task 2: Implement the CLI adapter

**Files:**
- Create: `packages/openpencil-cli/src/client.ts`
- Create: `packages/openpencil-cli/src/adapter.ts`
- Create: `packages/openpencil-cli/test/adapter.test.ts`
- Create: `examples/fixtures/openpencil-cli-document.json`

**Interfaces:**
- `OpenPencilCliClient.run(args: string[]): Promise<CliResult>`
- `OpenPencilCliAdapter.inspect(filePath: string, options: InspectOptions): Promise<DesignDocument>`
- `OpenPencilCliAdapter.exportAsset(filePath: string, request: AssetExportRequest): Promise<DesignAsset>`

- [ ] **Step 1: Write failing tests** using a fake CLI runner for `info`, `tree`, `node`, `variables`, and asset export; assert command arguments and normalized output.
- [ ] **Step 2: Run** `bunx vitest run packages/openpencil-cli/test/adapter.test.ts`; verify command execution and normalization tests fail.
- [ ] **Step 3: Implement** argument construction, JSON parsing, non-zero exit diagnostics, and path validation.
- [ ] **Step 4: Run** the focused test; verify PASS.
- [ ] **Step 5: Add** a fixture test proving that a single node can be inspected without loading an entire page.
- [ ] **Step 6: Run** the adapter test suite again; verify PASS.
- [ ] **Step 7: Commit** only after explicit user approval.

### Task 3: Implement MCP capability discovery and adapter

**Files:**
- Create: `packages/openpencil-mcp/src/client.ts`
- Create: `packages/openpencil-mcp/src/capabilities.ts`
- Create: `packages/openpencil-mcp/src/adapter.ts`
- Create: `packages/openpencil-mcp/test/adapter.test.ts`

**Interfaces:**
- `McpClient.listTools(): Promise<McpToolDescription[]>`
- `discoverCapabilities(tools: McpToolDescription[]): CapabilityReport`
- `OpenPencilMcpAdapter.inspect(request: InspectRequest): Promise<DesignDocument>`

- [ ] **Step 1: Write failing tests** for tool discovery, required capability matching, unavailable-tool diagnostics, and representative query/export calls.
- [ ] **Step 2: Run** `bunx vitest run packages/openpencil-mcp/test/adapter.test.ts`; verify failures.
- [ ] **Step 3: Implement** capability discovery from live schemas instead of a hardcoded tool count.
- [ ] **Step 4: Implement** adapter calls for tree/query/node/tokens/export using the discovered tool names and schemas.
- [ ] **Step 5: Run** the focused suite; verify PASS.
- [ ] **Step 6: Add** a no-live-server integration fixture that records the exact request/response contract.
- [ ] **Step 7: Commit** only after explicit user approval.

### Task 4: Add ingestion command and end-to-end fixture verification

**Files:**
- Create: `packages/cli/src/main.ts`
- Create: `packages/cli/test/main.test.ts`
- Modify: `package.json`
- Create: `examples/fixtures/expected-design-ast.json`

**Interfaces:**
- `open-pencil-inspector inspect <file> --node <id> --json`
- `open-pencil-inspector tokens <file> --json`
- `open-pencil-inspector export <file> --node <id> --format svg --out <path>`

- [ ] **Step 1: Write failing command tests** for JSON output, missing-file errors, node-scoped inspection, and explicit asset output paths.
- [ ] **Step 2: Run** `bunx vitest run packages/cli/test/main.test.ts`; verify failures.
- [ ] **Step 3: Implement** command routing and adapter selection.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Run** `bun run check` and `bun run test:unit`; record exact output.
- [ ] **Step 6: Commit** only after explicit user approval.

## Exit Criteria

- A fixture `.fig` can be inspected through the CLI adapter.
- The MCP adapter reports unavailable capabilities explicitly.
- CLI and MCP paths produce equivalent normalized Design AST for equivalent fixtures.
- No write operation can overwrite the source file unless an explicit output path is supplied.
