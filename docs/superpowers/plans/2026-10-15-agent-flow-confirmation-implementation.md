# Agent Flow Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 OpenPencil Inspector 的 candidate flow、Agent confirmation、immutable confirmed revision 與 generate gate，讓 Agent 確認流程後才產生 SwiftUI/UIKit。

**Architecture:** 保留現有 `FlowIR` 作為 codegen input，新增獨立的 confirmation envelope 保存 questions、decisions、revision 與 audit。CLI/MCP 只執行 deterministic propose/save/validate/confirm/compile；Agent 負責自然語言詢問與將回答轉成結構化 decisions。Generator 只接受未過期且 validation pass 的 confirmed Flow IR。

**Tech Stack:** TypeScript ESM、Bun test、Node `--experimental-strip-types`、既有 `FlowIR`/Design AST/CLI adapter、workspace-local OpenPencil MCP adapter。

**Spec:** `docs/superpowers/specs/2026-10-15-agent-flow-confirmation-design.md`

## Global Constraints

- 不修改 Pencil Mac App 或 `@open-pencil/mcp` 官方 MCP；只修改本 repo 的 CLI、flow-confirmation package 與 `packages/openpencil-mcp` adapter。
- Parser 不猜 navigation；canvas 順序、畫面相鄰與按鈕名稱不可自動產生 transition。
- 部分確認只能保存為 draft/candidate，不能 generate。
- confirmed revision immutable；修改已確認流程必須建立新的 revision。
- 所有寫入都必須驗證 candidate hash、question ID、answer schema、target screen 與 revision。
- Generate 必須拒絕 candidate、unresolved questions、conflicts、unknown route 與 stale confirmation。
- 既有 build/runtime/visual gate 必須與 flow confirmation gate 分開報告。
- 不執行 commit、push、merge、reset 或刪除使用者資料；每個 task 以測試與 checkpoint 結束。

---

### Task 1: Confirmation envelope schema and revision model

**Files:**
- Create: `packages/flow-confirmation/src/contracts.ts`
- Create: `packages/flow-confirmation/src/schema.ts`
- Create: `packages/flow-confirmation/test/schema.test.ts`
- Modify: `packages/core/src/flow-ir.ts` only if a typed `confirmationRef?: string` is required by the compiled IR

**Interfaces:**
- `ConfirmationStatus = 'candidate' | 'confirmed' | 'rejected'`
- `FlowQuestion` with `id`, `kind`, `screen`, `prompt`, `options`, `evidence`, `blocking`
- `FlowDecision` with `questionId`, structured `answer`, `provenance`, and `revision`
- `ConfirmationEnvelope` with `version`, `status`, `candidateHash`, `source`, `flow`, `questions`, `decisions`, `revision`, `parentRevision`, and `staleReasons`
- `validateConfirmationEnvelope(envelope): ConfirmationValidationResult`
- `canonicalizeConfirmationEnvelope(envelope): string`

- [x] **Completed:** schema tests, deterministic validators, canonicalization, and revision metadata are implemented; focused tests pass.

### Task 2: Candidate flow proposal from Design AST

**Files:**
- Create: `packages/flow-confirmation/src/propose.ts`
- Create: `packages/flow-confirmation/test/propose.test.ts`
- Modify: `packages/flow-extractor/src/fig-flow.ts` only to reuse its screen inventory without adding transitions

**Interfaces:**
- `proposeFlow(design: DesignDocument, source: string, parserVersion: string): ConfirmationEnvelope`
- `buildFlowQuestions(design, flow): FlowQuestion[]`

- [x] **Completed:** proposal generation preserves 12 FoodApp roots, emits no inferred transitions, and asks only actionable questions with node/screen evidence. Actual candidate: 12 screens, 16 questions, 0 transitions.

### Task 3: Decision persistence, validation, and immutable confirmation

**Files:**
- Create: `packages/flow-confirmation/src/decisions.ts`
- Create: `packages/flow-confirmation/test/decisions.test.ts`
- Modify: `packages/flow-confirmation/src/schema.ts`

**Interfaces:**
- `saveDecisions(candidate, decisions): ConfirmationEnvelope`
- `validateDecisions(candidate, decisions): ConfirmationValidationResult`
- `confirmEnvelope(candidate): ConfirmationEnvelope`
- `compileConfirmedFlow(envelope): FlowIR`

- [x] **Completed:** draft/confirmed revisions, stale hash rejection, blocking-question validation, and confirmed Flow IR compilation are implemented and tested.

### Task 4: CLI proposal and confirmation commands

**Files:**
- Modify: `packages/cli/src/main.ts`
- Create: `packages/cli/src/confirmation-files.ts`
- Modify: `packages/cli/test/main.test.ts`
- Create: `packages/cli/test/flow-confirmation.test.ts`

**Interfaces:**
- `propose-flow <file.fig> --output <candidate.json>`
- `save-flow-decisions <candidate.json> --decisions <answers.json> --output <draft.json>`
- `validate-flow <candidate.json> --design <file.fig>`
- `confirm-flow <candidate.json> --output <confirmed.json>`
- Existing `preflight` and `generate` accept `--confirmed-flow <confirmed.json>`; legacy raw Markdown flow remains supported only as an explicit compatibility path until migrated.

- [x] **Completed:** CLI commands, atomic writes, confirmed-flow generate gate, and FoodApp candidate/draft/confirmed round trip are implemented. Candidate generation is rejected before asset export.

### Task 5: Workspace-local MCP confirmation tools

**Files:**
- Modify: `packages/openpencil-mcp/src/adapter.ts`
- Modify: `packages/openpencil-mcp/src/capabilities.ts`
- Modify: `packages/openpencil-mcp/test/adapter.test.ts`
- Create: `packages/openpencil-mcp/src/flow-confirmation.ts`
- Create: `packages/openpencil-mcp/test/flow-confirmation.test.ts`

**Interfaces:**
- Read-only `propose_flow` delegates to `proposeFlow`.
- Restricted `save_flow_decisions` accepts candidate hash plus typed decisions and returns a new draft envelope.
- Read-only `validate_flow` returns blocking diagnostics without writing.
- Restricted `confirm_flow` creates an immutable confirmed envelope only when validation passes.
- No arbitrary file-write tool and no natural-language-to-transition shortcut.

- [x] **Completed:** workspace-local adapter methods and no-mutation tests are implemented. Official Pencil MCP remains read/export boundary; no official tool was modified.

### Task 6: Verification, FoodApp migration, and documentation

**Files:**
- Modify: `examples/specs/food-app-flow.md` to become a confirmed-flow fixture or reference decision set
- Modify: `docs/verification/20261015_foodapp_design_inventory.md`
- Modify: `docs/superpowers/plans/20261014_open_pencil_inspector_completion_plan.md`
- Create: `packages/flow-confirmation/test/foodapp-confirmed-flow.test.ts`
- Modify: `packages/verification/src/coverage.ts` only if confirmation references need a report entry

- [x] **Completed:** FoodApp confirmed envelope generated 12 screens/11 transitions/0 diagnostics; SwiftUI and UIKit build/run succeeded. Runtime interaction and pixel visual gates remain separate and pending.

## Final Verification Commands

```bash
bun test packages
bun test acceptance-ios/test
bun run check
```

Xcode verification must use the configured XcodeBuildMCP profiles `open-pencil-acceptance` and `open-pencil-acceptance-uikit`; build success is reported separately from Simulator interaction and visual screenshot evidence.
