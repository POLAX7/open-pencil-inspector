# Milestone 10 Project and Package Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 CLI 可選擇 SwiftUI/UIKit/both，並能驗證與報告 Design Package；輸出保留可拷貝 source/resources 的 package layout。

**Architecture:** CLI 先產生六份 Design Package 文件，再以同一份 Design AST/Flow IR 選擇 platform backend。`validate` 只接受並驗證完整 package；`report` 只彙整可觀測文件與 audit，不猜測缺失資料。

## Steps

- [x] 以 failing tests 固定 `--platform swiftui|uikit|both` 的輸出邊界。
- [x] 實作 platform-aware source/package generation。
- [x] 以 failing tests 固定 `validate` 與 `report` 的 machine-readable output。
- [x] 實作 Design Package validation/reporting，缺件或 schema 錯誤時 fail loud。
- [x] 執行 99 個 package tests、TypeScript syntax check、asset validation。
- [x] 以 XcodeBuildMCP 驗證 UIKit 與 SwiftUI demo workspace 均可編譯。
- [x] 更新 master plan 與 verification report；記錄 fixture-wide generated app 尚待 M12。
