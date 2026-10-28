# Milestone 12 Fixture Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 對五份 `.fig` 完成逐 fixture 的 ingestion、Design Package、coverage、platform build、runtime 與 visual acceptance，並保留 parser/upstream blocker。

## Steps

- [x] Enumerate all five fixtures without silent exclusion.
- [x] Run official OpenPencil ingestion and record root/diagnostic counts.
- [x] Generate Design Package for every parseable fixture.
- [x] Generate SwiftUI/UIKit package source for every parseable fixture.
- [x] Validate the four parseable SwiftPM manifests.
- [x] Reproduce and record the OpenFashion official parser blocker.
- [x] Create a separate fixture-acceptance app with one generated package per
      parseable fixture and a selection page; preserve the existing demo app.
- [x] Build all four generated fixture packages through the separate SwiftUI
      and UIKit simulator acceptance targets.
- [x] Launch each parseable fixture through the acceptance selection page and
      capture runtime evidence; FoodDelivery required primary phone-screen
      selection from its large canvas root.
- [ ] Exercise declared navigation transitions from Flow/Spec for every fixture
      that declares transitions. FoodApp has manual
      `home -> product-1 -> payment -> home` evidence; CoffeeShop,
      FoodDeliveryApp, and eCommerce still require fixture-specific traversal
      evidence where their Flow/Spec declares routes.
- [ ] Add node-matched visual references and approved thresholds.
- [ ] Gate: four parseable fixtures complete all acceptance stages; OpenFashion is pass or the only explicit upstream blocker.
