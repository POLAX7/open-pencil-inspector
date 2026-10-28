# Milestone 6 UI IR and Native Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 UIKit/SwiftUI 共用的平台中立 UI IR 與 native pattern mapping，讓後續 backend 不再直接猜 Design AST。

**Architecture:** `packages/ui-ir` 將 Design AST 與 Layout Contract 轉成穩定的 component tree；`packages/native-patterns` 只負責 deterministic node-to-pattern mapping。每個 IR node 都有 source node、children 與 coverage entry；unsupported mapping 保留為 `unknown` 並產生 warning。

**Tech Stack:** Bun、TypeScript、Node test runner、Design AST、Layout Contract。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- UIKit/SwiftUI 後端只能消費共用 UI IR，不直接將 React/Tailwind output 轉成 native code。
- 不從 canvas 順序或 intrinsic size 發明 navigation；Flow IR 才是 route source。
- 每個 UI IR node 必須可追溯至 Design AST source node，coverage 不可 silent omission。
- 無法安全映射時輸出 warning/unknown，不建立假的 native control。

## Steps

- [x] Write failing tests for UI IR tree, source coverage, and layout references.
- [x] Implement deterministic Design AST to UI IR conversion.
- [x] Write failing tests for native pattern mapping and unsupported warnings.
- [x] Implement native pattern mapper for supported containers/controls.
- [x] Run UI IR tests, all package tests and TypeScript check.
- [x] Update master plan and verification report; stop before Milestone 7.
