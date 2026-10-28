# iOS Codegen and Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate generic MVVM/MVVM-C/DI SwiftUI and UIKit code, package it as reusable Swift Packages and file exports, and verify it in demo apps.

**Architecture:** A shared codegen-core maps Design AST and Flow IR into platform-neutral feature contracts. SwiftUI and UIKit renderers implement platform-specific views and coordinators. API output stops at repository/service protocols until an API SPEC is supplied.

**Tech Stack:** TypeScript codegen, Swift 6-compatible generated source, Swift Package Manager, XcodeBuildMCP, XCTest, iOS Simulator.

**Spec:** `docs/superpowers/specs/20261014_open_pencil_ios_codegen_design.md`

## Global Constraints

- Generated code is generic and does not assume `1111talent` conventions.
- SwiftUI and UIKit share state, events, routes, repository protocols, and DI contracts.
- Demo stubs are deterministic and are not production API implementations.
- API SPEC is a later input; current output contains protocol boundaries only.
- Screenshot success requires reference evidence and explicit comparison; build success alone is insufficient.

### Task 1: Define codegen contracts and token/resource mapping

**Files:**
- Create: `packages/codegen-core/src/contracts.ts`
- Create: `packages/codegen-core/src/token-mapper.ts`
- Create: `packages/assets/src/ios-assets.ts`
- Create: `packages/codegen-core/test/contracts.test.ts`

- [ ] **Step 1: Write failing tests** for feature names, state/event types, route parameters, DI dependencies, semantic colors, typography, SVG, and image resource mapping.
- [ ] **Step 2: Run** the focused tests; verify failures.
- [ ] **Step 3: Implement** platform-neutral contracts and deterministic token/resource mapping.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Add** diagnostics for missing fonts/assets and unsupported node types.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 2: Generate shared MVVM/MVVM-C/DI Swift contracts

**Files:**
- Create: `packages/codegen-core/src/swift-contract-generator.ts`
- Create: `packages/codegen-core/test/swift-contract-generator.test.ts`
- Create: `examples/expected/FeatureContracts.swift`

- [ ] **Step 1: Write failing snapshot tests** for `FeatureState`, `FeatureEvent`, `FeatureViewModel`, `FeatureRoute`, repository protocols, dependencies, and composition root.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** stable file naming, access control, imports, and generated-source headers.
- [ ] **Step 4: Run** the focused test; verify PASS.
- [ ] **Step 5: Validate** that no API endpoint or concrete networking client is emitted.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 3: Implement SwiftUI generator

**Files:**
- Create: `packages/codegen-swiftui/src/generator.ts`
- Create: `packages/codegen-swiftui/src/view-renderer.ts`
- Create: `packages/codegen-swiftui/src/navigation-renderer.ts`
- Create: `packages/codegen-swiftui/test/generator.test.ts`

- [ ] **Step 1: Write failing tests** for layout mapping, state-driven rendering, buttons/text fields, loading/empty/error/success states, NavigationStack routes, and injected dependencies.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** the minimal renderer and coordinator/navigation output.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Add** a generated SwiftUI fixture and compile it in the demo target.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 4: Implement UIKit generator

**Files:**
- Create: `packages/codegen-uikit/src/generator.ts`
- Create: `packages/codegen-uikit/src/view-controller-renderer.ts`
- Create: `packages/codegen-uikit/src/navigation-renderer.ts`
- Create: `packages/codegen-uikit/test/generator.test.ts`

- [ ] **Step 1: Write failing tests** for UIView hierarchy, Auto Layout constraints, state updates, controls, loading/empty/error/success states, UINavigationController routes, and injected dependencies.
- [ ] **Step 2: Run** the focused test; verify failures.
- [ ] **Step 3: Implement** the minimal renderer and coordinator/navigation output.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Add** a generated UIKit fixture and compile it in the demo target.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 5: Package outputs and create demos

**Files:**
- Create: `swift-package/Package.swift`
- Create: `swift-package/Sources/GeneratedSwiftUI/`
- Create: `swift-package/Sources/GeneratedUIKit/`
- Create: `demo/SwiftUIDemo/`
- Create: `demo/UIKitDemo/`
- Create: `packages/cli/src/generate.ts`
- Create: `packages/cli/test/generate.test.ts`

- [ ] **Step 1: Write failing tests** for file export, Swift Package layout, demo composition roots, and deterministic regeneration.
- [ ] **Step 2: Run** focused TypeScript tests; verify failures.
- [ ] **Step 3: Implement** package/file output and deterministic manifest generation.
- [ ] **Step 4: Run** TypeScript tests; verify PASS.
- [ ] **Step 5: Build** both demo targets with XcodeBuildMCP and record exact commands/results.
- [ ] **Step 6: Commit** only after explicit user approval.

### Task 6: Add Simulator and screenshot verification

**Files:**
- Create: `packages/verification/src/screenshot-diff.ts`
- Create: `packages/verification/test/screenshot-diff.test.ts`
- Create: `examples/references/`
- Create: `docs/verification/20261014_initial_codegen_verification.md`

- [ ] **Step 1: Write failing tests** for image dimension checks, reference-unavailable status, threshold-pending status, and explicit pass/fail outcomes.
- [ ] **Step 2: Run** focused tests; verify failures.
- [ ] **Step 3: Implement** evidence reporting without treating missing references as passes.
- [ ] **Step 4: Run** focused tests; verify PASS.
- [ ] **Step 5: Run** both demo apps in Simulator, capture agreed states, and compare against references.
- [ ] **Step 6: Record** static, build, runtime, and visual evidence separately.
- [ ] **Step 7: Commit** only after explicit user approval.

## Exit Criteria

- Both SwiftUI and UIKit generated outputs compile in standalone demo targets.
- The same Design AST and Flow IR generate both platform outputs.
- MVVM/MVVM-C/DI contracts are visible and testable.
- Navigation and basic UI states work with deterministic demo stubs.
- Integration file exports and Swift Package outputs are reproducible.
- Visual verification reports pass, fail, reference-unavailable, or threshold-pending explicitly.
