# Milestone 9 UIKit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 UIKit backend 以共用 UI IR 生成原生 view hierarchy、Auto Layout constraints、touch targets 與 Flow-owned coordinator boundary。

**Architecture:** Generic UIKit generation consumes UI IR and emits `UIView` containers, `UILabel`, `UIImageView`, `UITextField`, and `UIButton` with explicit source frames. Existing FoodApp-specific renderer remains a compatibility adapter until fixture-wide migration.

**Tech Stack:** TypeScript generator、UIKit、Auto Layout、UINavigationController/coordinator、Swift Package resources。

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Build parent containers before children; every child frame is source-relative.
- No flattened screenshot/canvas replacement for generic UI IR nodes.
- Assets use compiled resource bindings; interactive nodes have accessibility identifiers.
- Navigation/presentation decisions remain owned by Flow IR and Coordinator.

## Steps

- [x] Write failing generic UIKit backend tests for native hierarchy, constraints, assets, touch targets, and DI.
- [x] Implement generic UI IR UIKit renderer and shared ViewModel protocol conformance.
- [x] Write failing tests for coordinator-owned navigation/presentation boundary.
- [x] Implement typed coordinator actions without inventing routes.
- [x] Run UIKit tests, all package tests, TypeScript check, and iOS compile gate.
- [x] Update master plan and verification report; record legacy FoodApp adapter boundary.
