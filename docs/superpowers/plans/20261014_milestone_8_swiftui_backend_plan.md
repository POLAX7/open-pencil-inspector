# Milestone 8 SwiftUI Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 SwiftUI backend 以共用 UI IR/architecture contracts 生成 native SwiftUI controls、state binding、navigation、assets 與 accessibility metadata。

**Architecture:** Generic SwiftUI generation consumes `convertToUIIR()` and shared Flow contracts. Existing FoodApp-specific renderer remains a compatibility adapter until the later fixture-wide migration; it is not used as evidence of generic backend coverage.

**Tech Stack:** TypeScript generator、SwiftUI、NavigationStack、Swift Package resources、XCTest/build gates。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Generic backend consumes UI IR, not React/Tailwind or raw Figma nodes.
- Routes/presentation come from Flow IR; UI nodes do not invent navigation.
- Assets use compiled package resources and explicit bindings; no raw SVG UIKit loading.
- Preserve accessibility identifiers/labels for interactive nodes.

## Steps

- [x] Write failing generic SwiftUI backend tests for UI IR controls, assets, accessibility, and state binding.
- [x] Implement generic UI IR SwiftUI renderer and shared ViewModel protocol conformance.
- [x] Write failing tests for NavigationStack and Flow presentation mapping.
- [x] Implement typed navigation and presentation modifiers for generic output.
- [x] Run SwiftUI tests, all package tests, TypeScript check, and iOS compile gate.
- [x] Update master plan and verification report; record legacy FoodApp adapter boundary.
