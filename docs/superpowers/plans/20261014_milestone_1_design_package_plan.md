# Milestone 1 Design Package Implementation Plan

> **For agentic workers:** Execute one checkbox at a time. Run the stated verification after each step and stop at the milestone gate.

**Goal:** 將 normalized Design AST、Flow IR、assets、layout contracts、audit 與 provenance 固定成可驗證、可重產的六份 JSON package。

**Architecture:** `packages/design-package` 只負責 schema validation、typed package assembly、stable serialization 與 disk writing；不解析 `.fig`、不 hydration、不產生 Swift。每個文件都帶 `schemaVersion: "1.0"`，不寫入時間或隨機值。

**Interfaces:** `DesignPackageInput` → `validateDesignPackage()` → `DesignPackage`; `writeDesignPackage(directory, package)` writes `design.json`, `flow.json`, `assets.json`, `layout-contracts.json`, `audit.json`, `provenance.json`.

**Files:**

- Create: `packages/design-package/src/schema.ts`
- Create: `packages/design-package/src/writer.ts`
- Create: `packages/design-package/test/schema.test.ts`
- Create: `packages/design-package/test/writer.test.ts`
- Modify: `docs/superpowers/plans/20261014_open_pencil_inspector_completion_plan.md`

## Steps

- [x] Write failing schema tests for six versioned documents, unknown node preservation, missing fields and audit required fields.
- [x] Run `bun test packages/design-package/test/schema.test.ts` and confirm failure is caused by the missing package module.
- [x] Implement typed package schemas and validation using existing `DesignDocument`, `FlowIR`, `Diagnostic` and `SourceProvenance` contracts.
- [x] Run schema tests and confirm valid data passes while malformed data fails loudly.
- [x] Write failing writer tests for six filenames, stable serialization, and parse-after-write round-trip.
- [x] Run `bun test packages/design-package/test/writer.test.ts` and confirm the writer is missing.
- [x] Implement directory creation and stable JSON writing without timestamps or random values.
- [x] Write and verify CLI `preflight` coverage; fatal design diagnostics stop package generation before any codegen or asset export.
- [x] Run focused tests, all package tests, and TypeScript syntax checks.
- [x] Gate: two writes from the same in-memory package are byte-identical; all six files parse and validate; malformed version/required fields are rejected; unknown design nodes remain represented with diagnostics metadata.
