# Milestone 5 Asset and Token Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 SVG-first/PNG-fallback asset policy 與 Design AST semantic tokens 變成可重用、可驗證的 contracts。

**Architecture:** `packages/assets` 負責 deterministic resource naming 與 asset manifest contract；CLI 保持既有 exporter 與 `.xcassets` writer，但使用共享命名規則。`packages/tokens` 將來源 token 正規化成 semantic token，保留 provenance 與 host binding，不猜測未提供的設計值。

**Tech Stack:** Bun、TypeScript、Node test runner、Swift Package `.xcassets` resources。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- SVG 為 vector primary format；SVG export/compile/runtime 不可用時才明確 fallback PNG。
- 每個 asset 保留 source node id、source name、format、path 與 provenance。
- 不以 SF Symbol 或手繪 placeholder 取代 source asset。
- token extraction 不建立 API/theme speculation；只保留 AST 已提供的 values。

## Steps

- [x] Write failing tests for stable resource names and asset manifest metadata.
- [x] Implement shared asset naming/manifest helpers and use them from CLI assets.
- [x] Write failing tests for semantic token extraction and host bindings.
- [x] Implement deterministic token normalization with provenance.
- [x] Run asset/token tests, package tests, TypeScript check and asset validation.
- [x] Update master plan and verification report; stop before Milestone 6.
