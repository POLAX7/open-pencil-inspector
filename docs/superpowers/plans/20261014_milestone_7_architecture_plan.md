# Milestone 7 Shared iOS Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 由 Flow IR 產生可供 UIKit/SwiftUI backend 共用的 MVVM/MVVM-C/DI architecture contracts。

**Architecture:** `codegen-core` owns feature state/event/route names, ViewModel protocol, Coordinator route ownership, Dependencies and Repository protocol. Backend targets later implement views and platform-specific ViewModels against these contracts; API details remain protocol-only.

**Tech Stack:** TypeScript generator、Swift 6 contracts、MVVM/MVVM-C、constructor DI。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Flow IR is the only source of route and presentation decisions.
- API SPEC 未提供前不產生 endpoint、DTO 或 guessed repository methods。
- Dependencies are explicit constructor inputs; no global service locator.
- UIKit/SwiftUI backends consume the shared contracts and must not redefine route ownership.

## Steps

- [x] Write failing architecture snapshot tests for ViewModel protocol and state/event/route contracts.
- [x] Implement shared Swift architecture contract generation.
- [x] Write failing tests for Flow-owned presentation and protocol-only API boundary.
- [x] Implement deterministic presentation/transition contracts without endpoint guesses.
- [x] Run architecture tests, all package tests and TypeScript check.
- [x] Update master plan and verification report; stop before Milestone 8.
