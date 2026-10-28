# Milestone 0 Baseline Implementation Plan

> **For agentic workers:** Execute one checkbox at a time. Run the stated verification after each step and do not mark the step complete without evidence.

**Goal:** 建立可重跑的 baseline command，集中執行 unit、TypeScript、fixture ingestion 與 iOS asset checks，並留下五份 fixture 的 pass/fail/blocked 證據。

**Architecture:** 將 deterministic baseline summary 與外部 command runner 分離。每個檢查保留 command、exit code、status、stdout/stderr 摘要；fixture blocked 不會被隱藏，但會讓 baseline gate 失敗。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

**Files:**

- Create: `scripts/verify-baseline.ts`
- Create: `scripts/verify-baseline.test.ts`
- Modify: `package.json`
- Create: `docs/verification/20261014_baseline.md`
- Modify: `docs/superpowers/plans/20261014_open_pencil_inspector_completion_plan.md`

## Steps

- [x] Write a failing test for baseline status aggregation: a blocked fixture and a passing command produce an overall blocked result while preserving both records.
- [x] Run `bun test scripts/verify-baseline.test.ts` and confirm it fails because the summary module does not exist.
- [x] Implement the smallest pure summary function and command-result types.
- [x] Run the focused test and the full unit suite; confirm both pass.
- [x] Add the command runner for `bun test packages`, TypeScript check, fixture verification and asset verification.
- [x] Add markdown report rendering with date, pinned OpenPencil versions, commands, results and explicit fixture statuses.
- [x] Add `verify:baseline` to `package.json`.
- [x] Run `bun run verify:baseline`; inspect the report and preserve any blocked fixture as blocked.
- [x] Update the master plan and initial verification report with the observed baseline.
- [x] Gate: all four checks are executed, every `.fig` is listed, no fixture is silently excluded, and the command exits non-zero when a hard failure or blocked fixture exists.
