# Milestone 11 Coverage, Build, and Runtime Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立不會靜默遺漏 node/flow 的 coverage 與 audit，並分開 structural、runtime、visual 驗證狀態。

## Steps

- [x] 以 failing tests 固定 node coverage 守恆與 unsupported/ignored audit。
- [x] 實作 node、screen、state、transition coverage report。
- [x] 以 failing tests 固定 semantic UI tree 與 navigation gate 的 pass/blocked/pending 狀態。
- [x] 實作 runtime gate helpers，缺少 simulator evidence 時只能 pending。
- [x] 擴充 screenshot verification，支援明確 threshold 與 diff PNG 輸出。
- [x] CLI report 輸出 coverage、audit 與 structural/runtime/visual gate 分離狀態。
- [x] 執行 104 個 package tests、TypeScript syntax check、asset validation、UIKit/SwiftUI build。
- [x] 啟動 UIKit demo 並取得 semantic UI snapshot；navigation interaction 未取得本輪 tap evidence，保持未宣稱 pass。
