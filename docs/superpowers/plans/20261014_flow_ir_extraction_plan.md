# Flow IR and Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert YAML, JSON, Markdown/plain text, and natural-language flow descriptions into one reviewable Flow IR for navigation, states, and basic interactions.

**Architecture:** Structured YAML/JSON parsing is deterministic. Markdown/plain text uses a constrained parser. Natural language is extracted by an AI-facing boundary into a schema-validated candidate, then deterministic validation and conflict resolution produce Flow IR.

**Tech Stack:** TypeScript, Bun, Zod or equivalent schema validation, Vitest, Markdown fixtures.

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Natural language extraction must never directly write Swift code.
- Every Flow IR field records source provenance.
- Conflicts are diagnostics, not silent merges.
- Structured input takes precedence over inferred natural-language values by default.
- API details are represented only as deferred dependency contracts.

### Task 1: Define and validate Flow IR

**Files:**
- Create: `packages/core/src/flow-ir.ts`
- Create: `packages/core/src/flow-schema.ts`
- Create: `packages/core/test/flow-ir.test.ts`

- [ ] **Step 1: Write failing tests** for screens, routes, parameters, events, transitions, states, effects, provenance, and conflicts.
- [ ] **Step 2: Run** `bunx vitest run packages/core/test/flow-ir.test.ts`; verify failures.
- [ ] **Step 3: Implement** schema validation and canonical serialization.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Commit** only after explicit user approval.

### Task 2: Add YAML and JSON loaders

**Files:**
- Create: `packages/flow-extractor/src/structured-loader.ts`
- Create: `packages/flow-extractor/test/structured-loader.test.ts`
- Create: `examples/specs/login-flow.yaml`
- Create: `examples/specs/login-flow.json`

- [ ] **Step 1: Write failing tests** proving equivalent YAML and JSON produce byte-equivalent canonical Flow IR.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** parsers, schema validation, default values, and source provenance.
- [ ] **Step 4: Run** the focused test; verify PASS.
- [ ] **Step 5: Add** invalid schema and unknown-event diagnostics.
- [ ] **Step 6: Run** the full flow-extractor unit suite; verify PASS.
- [ ] **Step 7: Commit** only after explicit user approval.

### Task 3: Add Markdown/plain-text extraction

**Files:**
- Create: `packages/flow-extractor/src/markdown-loader.ts`
- Create: `packages/flow-extractor/test/markdown-loader.test.ts`
- Create: `examples/specs/login-flow.md`

- [ ] **Step 1: Write failing tests** for headings, screen bullets, transition sentences, state lists, and unresolved statements.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** deterministic extraction for the documented Markdown conventions.
- [ ] **Step 4: Implement** unresolved-intent diagnostics instead of guessing missing route targets.
- [ ] **Step 5: Run** focused tests; verify PASS.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 4: Add AI extraction boundary and deterministic normalization

**Files:**
- Create: `packages/flow-extractor/src/natural-language.ts`
- Create: `packages/flow-extractor/src/normalize.ts`
- Create: `packages/flow-extractor/test/natural-language.test.ts`

- [ ] **Step 1: Write failing tests** with a fake model response for login success/failure/register flow, malformed model output, and ambiguous intent.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** a narrow extractor interface that accepts a prompt and returns schema-validated candidate Flow IR only.
- [ ] **Step 4: Implement** deterministic defaults, provenance, conflict detection, and structured-input precedence.
- [ ] **Step 5: Run** focused tests; verify PASS without requiring network access.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 5: Merge `.fig` context and flow sources

**Files:**
- Create: `packages/flow-extractor/src/merge-flow.ts`
- Create: `packages/flow-extractor/test/merge-flow.test.ts`

- [ ] **Step 1: Write failing tests** for screen matching by explicit node id, name fallback, structured-vs-natural-language conflicts, and missing design nodes.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** provenance-aware merge and diagnostics.
- [ ] **Step 4: Run** all flow extractor tests; verify PASS.
- [ ] **Step 5: Commit** only after explicit user approval.

## Exit Criteria

- All four input formats produce the same canonical Flow IR for equivalent requirements.
- Ambiguity and conflict are visible in diagnostics.
- The extraction layer does not generate Swift or invoke API behavior.
- Flow IR can be consumed by both SwiftUI and UIKit generators without source-format branching.
