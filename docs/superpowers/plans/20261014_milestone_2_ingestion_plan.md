# Milestone 2 Ingestion and Diagnostics Implementation Plan

> **For agentic workers:** Execute one checkbox at a time. Run focused tests before broader regression tests and stop at the milestone gate.

**Goal:** 讓 OpenPencil CLI 與 MCP 以同一套 external-node normalization 產生可追蹤的 Design AST，並對 unsupported、未 hydration 與 parser failure 保留明確 diagnostics。

**Architecture:** `packages/core` 提供共用 node normalizer；CLI/MCP adapter 只處理各自的 raw field aliases、query/capability 與 hydration。Normalized node fields、unsupported metadata 與 diagnostics 由同一個 core contract 產出。

**Files:**

- Create: `packages/core/src/external-node.ts`
- Create: `packages/core/test/external-node.test.ts`
- Modify: `packages/openpencil-cli/src/adapter.ts`
- Modify: `packages/openpencil-mcp/src/adapter.ts`
- Modify: `packages/openpencil-cli/test/adapter.test.ts`
- Modify: `packages/openpencil-mcp/test/adapter.test.ts`
- Modify: `docs/superpowers/plans/20261014_open_pencil_inspector_completion_plan.md`

## Steps

- [x] Write failing core tests for equivalent CLI/MCP raw aliases, geometry, Auto Layout, style, text, component metadata, asset references and unsupported diagnostics.
- [x] Run the focused core test and confirm the shared normalizer is missing.
- [x] Implement the shared normalizer and deterministic diagnostics with source provenance/path.
- [x] Refactor CLI adapter to hydrate raw subtrees first, then normalize through core.
- [x] Refactor MCP adapter to normalize through the same core contract.
- [x] Add adapter tests for metadata-preserving hydration scope and equivalent normalized output.
- [x] Add parser/capability failure diagnostics that identify source and operation without fabricating partial AST.
- [x] Run all focused tests, all package tests, TypeScript check and real fixture verification.
- [x] Gate: all five fixtures are listed as pass or concrete blocked; CLI/MCP normalized node fields match apart from source provenance; unsupported/missing/hydration/parser cases retain severity and source path.
