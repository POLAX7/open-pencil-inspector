# Milestone 3 Flow Contract Implementation Plan

> **For agentic workers:** Execute one checkbox at a time. Keep parsing, precedence, design scope resolution and validation as separate deterministic functions.

**Goal:** 將所有 Flow inputs 轉成完整、可驗證、具 provenance 的 Flow IR，並把 Spec screen scope 回綁到 Design AST。

**Architecture:** Loader 只負責 parse；core validator 負責結構契約；merge 負責明確 precedence/conflict；scope resolver 負責 source-first screen/state scope 與 Design AST mapping。自然語言只提供候選 Flow IR，不直接控制 codegen。

**Files:**

- Modify: `packages/core/src/flow-schema.ts`
- Create: `packages/core/test/flow-schema.test.ts`
- Create: `packages/flow-extractor/src/resolve-flow.ts`
- Create: `packages/flow-extractor/test/resolve-flow.test.ts`
- Modify: `packages/flow-extractor/src/merge-flow.ts`
- Modify: `packages/flow-extractor/src/fig-flow.ts`
- Modify: `packages/flow-extractor/test/merge-flow.test.ts`
- Modify: `packages/cli/src/main.ts`
- Modify: `docs/superpowers/plans/20261014_open_pencil_inspector_completion_plan.md`

## Steps

- [x] Write failing deep Flow schema tests for required IDs, provenance arrays, transition/state fields, invalid version and unresolved target diagnostics.
- [x] Implement deterministic Flow IR validation without inventing missing routes.
- [x] Write failing tests for explicit overlay precedence and conflict provenance.
- [x] Implement merge precedence as an explicit option; retain conflicts and selected-source provenance.
- [x] Write failing tests for source-first scope resolution and Design AST screen mapping.
- [x] Implement `resolveFlowScope()` with unresolved screen diagnostics and no visual-node route guessing.
- [x] Apply scope resolution in CLI `preflight` and `generate` after all flow sources are merged.
- [x] Run all flow-focused tests, all package tests, TypeScript check and fixture baseline.
- [x] Gate: equivalent structured/Markdown/natural-language candidates produce the same validated contract; conflicts are visible; every resolved screen maps to a design node; unresolved screens/routes are explicit diagnostics.
