# Milestone 4 Layout Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Design AST 的 parent/child frame 與 layout metadata 轉成可供兩個 iOS backend 共用的 Layout Contract。

**Architecture:** `extractLayoutContracts()` 只做 deterministic tree extraction，保存 parent-relative frame、container metrics、text/asset metadata 與 layout mode；`validateLayoutContracts()` 只做 contract diagnostics，不修改輸入。缺少尺寸、bounds 越界、重疊與混合 layout 都必須顯式回報。

**Tech Stack:** Bun、TypeScript、Node test runner、OpenPencil normalized Design AST。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- 不依賴 fixture 名稱，不以 intrinsic size 或前一個 sibling 推導位置。
- 不修改 Design AST；contract 必須保留 source node id 與 parent 關係。
- 不在本 milestone 生成 UIKit/SwiftUI code；backend 於後續 milestone 消費 contract。
- 所有 fallback、缺少 frame、越界與 ambiguous layout 都要進 diagnostics。

## Steps

- [x] Write failing tests for extraction of frames, padding/gap, text and asset contracts.
- [x] Implement deterministic layout contract extraction and layout mode classification.
- [x] Write failing tests for bounds, overlap, missing dimensions and mixed-mode diagnostics.
- [x] Implement contract validation without repairing or guessing source frames.
- [x] Run layout tests, all package tests and TypeScript check.
- [x] Update master plan and verification report; stop before Milestone 5.
