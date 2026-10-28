# OpenPencil Inspector 專案進度

更新日期：2026-10-22

## 專案目標

`open-pencil-inspector` 要建立一套通用、可重複、可驗證的 Agent-driven design-to-native iOS 工具鏈：

```text
.fig / Pencil / Spec / 自然語言
        ↓
OpenPencil CLI / MCP
        ↓
Design AST + Flow IR
        ↓
Screen Contract / Flow Contract
        ↓
通用 UI IR 與 component generator
        ↓
SwiftUI + UIKit 原生專案
        ↓
build / runtime / navigation / screenshot / visual verification
```

FoodApp 是 acceptance pilot，不是產品本身，也不應決定 generator 架構。

## 歷史進度

### 2026-10-14：pipeline 與 contract 基礎

- 完成 `.fig → Design AST → Flow IR → Design Package → UI IR → SwiftUI/UIKit` 主 pipeline。
- 完成 ingestion、layout contract、asset/token manifest、native pattern mapping。
- 完成 MVVM/MVVM-C、Coordinator、DI、Repository protocol 與 deterministic demo stub 邊界。
- 完成 `preflight`、`generate`、`validate`、`report` CLI stages。
- 建立 build、coverage、runtime、navigation、screenshot verification gates。
- 明確規定 build success 不等於 runtime 或 visual pass。

### 2026-10-15：FoodApp inventory 與 Flow

- 重新盤點 FoodApp，確認 12 個 screens、已確認 transitions 與主要 assets。
- 發現 Product 2–4、Product 5、Payment、profile、support、popup 尚未完整消費 Figma hierarchy。
- profile/support 當時已接 route，但仍為 placeholder；Product 2–4 是簡化 detail layout。
- 確認 FoodApp 只能作為 pilot，不能代表 generic pipeline 完成。

### 2026-10-16：Agent-driven workflow 定義

- 確立 Agent 負責設計語意、Screen Contract、Flow Questions 與逐頁驗收。
- OpenPencil CLI/MCP 負責讀取 node、geometry、style、asset 與 provenance，不猜產品流程。
- Generator 只消費已確認 Contract 與共用 UI IR，不得包含 FoodApp-specific 整頁分支。
- SwiftUI/UIKit 維持獨立 runtime target，共用同一份 Design Package。

### 2026-10-19：fixture handoff 與 parser blocker

- 完成 Product 2–4 的 handoff/contract baseline 紀錄。
- `OpenFashion.fig` 持續被官方 parser 阻擋：
  `Ambiguous resource 0e4b63a55fb9d526154c64100ca1efdf5cb886bf version 324:5`。
- 此問題必須保留為明確 upstream blocker，不得以猜測 AST 或 placeholder UI 掩蓋。

### 2026-10-20：generic FoodAppPilot pilot

- Generic UI IR generator 與 FoodApp compatibility adapter 已分離。
- FoodAppPilot、Product 1、Payment generated package 已接入 SwiftUI/UIKit acceptance host。
- Home 使用 tree hydration 與 contract-scoped asset export。
- 已取得 SwiftUI runtime build/run 與部分 route evidence；完整逐頁 route 與 visual threshold 仍未完成。

### 2026-10-21：目前驗證與修正

- SwiftUI Home acceptance 已修正並驗證：bottom navigation artwork、透明 notch、四個 icon、card container style。
- Generic SwiftUI text renderer 已支援 Contract typography/color；Figma 字型若未安裝仍會 fallback。
- Screen Contract 已補 Home header 與四張商品卡的 geometry/style/shadow evidence。
- acceptance host 目前以 full-screen canvas 對齊 Home Figma root；此 host 行為仍需整理成正式可重用策略。
- 最新全套 Bun tests：`182 pass / 0 fail`。
- 最新 TypeScript syntax check：通過。
- SwiftUI acceptance build/run：通過；最新 Home screenshot 已取得。

### 2026-10-22：selection-first 工具入口

- 將目前有效 fixture 收斂為 `figs/CryptoAndFoodApp.fig`、`figs/RealEstateApp.fig`、`figs/E-learning.fig`；它們目前只作 ingestion、scope、contract 與工具驗證，native example App 延後。
- 新增共用 `SelectionManifest`、穩定 fingerprint，以及 CLI 的 `pages`、`--page`、`--page-id`、重複 `--node`、`--selection` 入口。
- CLI 對真正可列出 page 的 multi-page `.fig` 禁止未指定 scope 時默默使用第一頁；scope 會寫入 Design Package provenance。
- OpenPencil CLI adapter 已支援 page inventory、page-aware tree/node inspection 與多 root merge；MCP adapter 已支援 `getPages`、`getSelection`、`inspectSelection` 的 read-only boundary。
- Flow Confirmation candidate 可綁定 selection fingerprint，selection 不一致時不得 compile。
- 新 fixture scope verification 已通過：`CryptoAndFoodApp` `🟠 Apps` 7 roots / 266 diagnostics、`RealEstateApp` `Screens` 65 roots / 4117 diagnostics、`E-learning` `🎨 Designs` 5 roots / 125 diagnostics；三者均為 0 error。`SECTION` 已納入通用 Design AST 與 native container mapping，`LINE/STAR/BOOLEAN_OPERATION` 已納入 asset-backed vector 分類；其餘 diagnostics 仍待分類與改善。
- 舊 `examples/`、`acceptance-ios/`、`swift-package/` 已移出 repository；舊生成 App 不再是 active acceptance input，保留在 `/private/tmp/open-pencil-inspector-legacy-examples-20261022/` 作為可恢復備份。Generic package tests 與 compatibility adapter tests 仍保留。
- CLI 已完成 machine-readable error JSON、穩定 scope error codes/exit codes，以及 fresh-directory selection → confirmation → Design Package → validate → SwiftUI generation end-to-end test。
- CLI 新增 `screen-contract <file.fig> --node <node-id> --output <contract.json>`；會從已選定 root 產生帶相對 frame、native pattern、asset 與 provenance 的 contract draft，root 缺 frame 時 fail loud，互動不由設計樹順序猜測。
- 修正 selected-node hydration：OpenPencil `node --id` 只提供 child count，CLI adapter 現在改從 bounded page tree 取回指定 node subtree；真實 `CryptoAndFoodApp.fig#0:89` smoke test 已取得 8 components，未再產生空 contract。
- `screen-contract` 輸出已統一為 `{ screenContracts: [...] }`，可直接接 `preflight --screen-contracts`；真實 `0:89` contract → preflight → validate 已通過。
- `generate --screen-contract` 已支援同一份 `{ screenContracts: [...] }` artifact，使用 `--screen-id` 選定 contract；generic contract generation regression 已通過。
- 已重新確認目前可用的 runtime host 是 `demo-ios`：`OpenPencilSwiftUIDemo` 在 iPhone 16 Pro / iOS 18.6 build/run 成功，runtime snapshot 取得 64 elements，screenshot 取得 368×800；這只是 generic host baseline，snapshot 沒有可操作 target，尚未形成 selected fixture 的 route evidence 或 visual pass。XcodeBuildMCP 內原 `open-pencil-acceptance*` profiles 仍指向已移出的 `acceptance-ios`，屬 stale profile，不能當作目前 host 證據。
- generic `demo-ios` host 已補上最小可觀測 navigation seam：SwiftUI `NavigationLink` 與 UIKit table cell/detail controller 共用 `renderer.swiftui`、`renderer.uikit` identifiers；兩個 scheme 在 iPhone 16 Pro / iOS 18.6 均 build/run 成功，snapshot 均取得 2 個 tap targets。這仍只是 host readiness；generated fixture contract、tap route 與 visual evidence 尚未接入。
- MCP 已補上與 CLI 對齊的 structured error envelope：capability、bridge、selection invalid 都保留 diagnostic code/path；focused MCP tests 通過。
- 已定位並修正大型 `.fig` preflight 的 hydration N+1：preflight/propose 改用 bounded tree hydration，CryptoAndFoodApp 約 3 秒、RealEstateApp 約 7 秒、E-learning 約 2 秒完成，三份 package 均 `validate` pass。
- 三份實際 package 的 structural gate 均 pass；runtime/visual 仍 pending。最新 package audit entries 分別為 1969、11354、713，blocking 均為 0；數量增加是因為 `preflight` 現在也把 layout contract 的 missing frame、overlap、out-of-bounds 等分析寫入 audit，而不是只記錄 Normalize diagnostics。最新 layout contract node 數分別為 1285、6179、386。
- 新 fixture 的 page scope inspection、實際 preflight 與 validate 均已完成；bounded tree hydration 後 CryptoAndFoodApp 約 3 秒、RealEstateApp 約 7 秒、E-learning 約 2 秒。先前超過 90 秒的紀錄已被新證據取代，不再視為目前狀態。
- Focused tests 與清理後的 package/script tests 通過：`233 pass / 0 fail`；TypeScript syntax check 通過。
- 以真實 `CryptoAndFoodApp.fig` page `🟠 Apps` / node `0:89` 重新執行 `screen-contract`：contract 產生 8 components、1 個 image asset、0 diagnostics。native generation 後續因 source image resource 缺失而被明確阻擋，不能把先前的 package output 視為目前成功證據。
- 發現並修正 generic SwiftUI generator 無條件 `import UIKit` 的跨平台依賴；SwiftUI asset rendering 改用 `Image(_:bundle:)`，targeted SwiftUI suite `24 pass / 0 fail`，並確認產出的 SwiftUI source 不再 import UIKit。
- 生成 package 的 `Package.swift` 是 iOS-only；直接 `swift build` 會以 macOS SDK 編譯，因此本次 macOS SwiftPM failure 不能宣稱 iOS build failure，也不能宣稱 iOS build pass。仍需透過 XcodeBuildMCP 的 iOS Simulator host 驗證 generated source 的實際編譯與 runtime。
- 重新以 XcodeBuildMCP 驗證目前 `demo-ios` SwiftUI host：iPhone 16 Pro / iOS Simulator build/run 成功，snapshot 取得 68 elements 與 2 個 renderer targets；這是 host readiness evidence，不是 generated fixture compile、tap route 或 visual pass。當前工具 session 未提供 tap operation，因此 route acceptance 仍 pending。
- `CryptoAndFoodApp#0:89` selected fixture 已接入 `demo-ios` 的 SwiftUI/UIKit generated host source；兩個 scheme 皆以 XcodeBuildMCP 在 iPhone 16 Pro / iOS Simulator build/run 成功。這證明 generated fixture source 可進入 iOS target，但目前 snapshot 仍停在 catalog，尚未取得 tap 後的 generated screen route evidence。
- XcodeBuildMCP 首次編譯發現 Swift 6 actor-isolation 問題：generic SwiftUI View/UIKit ViewController 的 coordinator default argument 直接建立 `@MainActor` NoOp coordinator。generator 已改為 optional coordinator，於 actor-isolated initializer 內建立 fallback；SwiftUI/UIKit generator regression tests 覆蓋此契約，完整 suite 更新為 `206 pass / 0 fail`。
- 為避開目前 Simulator automation session 沒有 tap API，acceptance host 新增 bounded launch flag `-openGeneratedScreen`；SwiftUI/UIKit 皆可直接啟動 selected generated screen。XcodeBuildMCP 已取得兩邊的 iOS Simulator runtime snapshot 與 368×800 screenshot：SwiftUI snapshot 讀到 `0:89` 下的 `Ouch! Hungry`、說明文字與 `Find Foods`；UIKit snapshot 讀到 `0:91` 文字與 `0:94` 的 `Find Foods` target。這是 selected screen runtime evidence，不是 catalog evidence，也仍不是 visual pixel pass。
- 修正 Screen Contract 與 Layout Contract 的座標模型：`.fig` Design AST 的子節點 `x/y` 已是父層相對座標，不再重複扣除 selected root 或 parent origin；bounds 檢查改用父容器 local bounds。focused tests、全套 `bun test packages scripts`（`206 pass / 0 fail`）與 `bun run check` 均通過。
- 以三份新 fixture 重新執行 page-scoped preflight／validate：Crypto `🟠 Apps`、RealEstate `Screens`、E-learning `🎨 Designs` 均 pass；修正後 layout audit entries 分別為 `999`、`6978`、`448`，不再沿用修正前的 `1969`、`11354`、`713` 數字。
- 真實 `CryptoAndFoodApp.fig#0:89` contract 已重新確認為 360×800、8 components、1 個 image asset、0 diagnostics；component frames 均保留為有效的父層相對座標，例如 button group `0:94` 為 `{x:0,y:360,width:200,height:45}`。
- `screen-contract` 對使用者選定的 subtree 改用 bounded node-detail hydration；一般全頁 preflight 仍使用單次 tree hydration。真實 `0:89` contract 現已取得 button `#eb0029`、radius `8`、標題／說明／按鈕文字的 Poppins metadata 與顏色，實測約 5.7 秒完成。
- style hydration 後的完整驗證為 `212 pass / 0 fail`、`bun run check` 通過；`screen-contract` 的測試名稱與 CLI 行為已同步，不影響 preflight 的 bounded tree performance path。
- image-like rectangle `0:97` 已納入 selected contract 的 scoped asset intent；normalizer 同時修正為只把 `SOLID` fill 轉成 `style.fill`，避免把 `IMAGE` fill 誤生成色塊。直接檢查 `.fig` ZIP 後確認其引用的 `1aaccae6cb3f9c3c34a87a80130d31b74ff8253a` 不在 `images/`，OpenPencil export 產生的 PNG alpha 範圍為 `0..0`；這是 source fixture 缺少 image resource，不是 generator 可以猜測修復的問題。
- generic iOS generator 已補上 non-package `Bundle.main` resource binding；Swift Package 仍使用 `Bundle.module`。UIKit generator 也補上 Screen Contract 的 fill/radius fallback、text color、font metadata 與縮放設定。以最新 generated UIKit host build/run 觀察到紅色按鈕與文字樣式已出現；SwiftUI runtime snapshot 仍能讀到 3 個 selected-screen 文本，但 XcodeBuildMCP screenshot 曾回傳與 snapshot 不一致的空白畫面，需另行釐清 screenshot surface，不能當 visual pass。
- 已建立 node-matched reference `docs/verification/CryptoAndFoodApp-0-89-reference.png`。以目前雙 host candidate screenshot 測量差異：SwiftUI `0.0471909722`、UIKit `0.05071875`；這只是 threshold=0 的差異量測與 diff 產物，尚未設定 approved threshold，也不能宣稱 visual pass。初步差異包含背景／按鈕 style 與文字 metadata 尚未完整進入 selected contract，以及 simulator system chrome 尚未正規化。

### 2026-10-22：selected screen render diagnosis

- SwiftUI selected screen 的實際 screenshot 已重新驗證：host build/run 成功，標題、說明文字與紅色按鈕可見；先前的整頁白屏不是 Simulator 問題，而是 generic SwiftUI container 的 `clipShape` 順序與 zero-radius clip，以及 image resource view 對 generated subtree 的破壞性影響。
- Generic SwiftUI container 已改為先建立 measured frame，再套用非零 radius decoration；zero-radius container 不再產生 `clipShape(RoundedRectangle(cornerRadius: 0))`。加入 action-only flow model、existing iOS integration profile validation、feature integration descriptor、Design Package integration artifact、platform gate、adapter protocol、runtime route plan 與 fail-loud validation 後，最新完整 suite 為 `243 pass / 0 fail`，`bun run check` 通過。
- SwiftUI non-package image lookup 改為安全的 default `Image(name)`，避免失敗的 loose resource／bundle lookup 令整個 generated screen 不繪製；目前 screenshot 可見 layout，但 image `0:97` 仍未載入，故 asset/resource fidelity 仍是明確 blocker，不宣稱 visual pass。
- 進一步檢查 `image-16.png` 的 raster alpha 範圍為 `0..0`，確認 export 結果是完全透明檔案，而非單純 SwiftUI 載入 API 問題。CLI 現在以 `ASSET_EXPORT_EMPTY_RASTER` fail loud；真實 `CryptoAndFoodApp#0:89` generate 已重現此錯誤，不能再把該 generated output 視為成功。
- tree hydration 現在只對 image candidates 追加 bounded `node` detail，並保留 `assetRef`；真實 generate 錯誤會包含 `assetRef 1aaccae6cb3f9c3c34a87a80130d31b74ff8253a`，便於追查 archive resource provenance。
- 重新執行 `scripts/verify-selection-scope.ts`：CryptoAndFoodApp `🟠 Apps` 為 7 roots / 266 diagnostics / 0 errors，RealEstateApp `Screens` 為 65 / 4117 / 0，E-learning `🎨 Designs` 為 5 / 125 / 0。另一次未指定 page 的 general `verify:figs` 只掃到 E-learning 的 81 diagnostics；兩者 scope 不同，不能混用統計。
- 修正 `scripts/verify-baseline.ts` 的過時 `verify:ios-assets` 呼叫；該 script 已不存在且不屬於目前 fixture/tool baseline。現在 `bun run verify:baseline` 會同時驗證 unit、TypeScript、fixture ingestion 與 selection scope，四個 checks 均 pass；完整 `bun test packages scripts` 為 223 pass / 0 fail。
- 再次以 XcodeBuildMCP `open-pencil-demo-swiftui` profile build/run selected screen；iPhone 16 Pro runtime snapshot 取得 `0:89` 的標題、說明與按鈕文字，但 targets 為 0。這表示目前 selected contract 沒有已確認 interaction，不能產生可操作 route evidence；仍不可把 screen snapshot 當成 navigation acceptance。
- 對完整 `CryptoAndFoodApp.fig#🟠 Apps` 產生 Flow candidate：保留 7 個 root screens、0 transitions，並正確提出 2 個 blocking questions：`Order Now` (`0:536`) 與 `Edit Profile` (`0:719`) 的目的地。這些 destination 必須由使用者確認，不能由 generator 或畫面順序猜測。
- 修正通用 Flow inventory：selected subtree 內的 phone-sized `FRAME/RECTANGLE` 會成為 screen candidates；`CryptoAndFoodApp` 現在辨識出 `Payment Address` (`0:560`) 等 26 個實際手機畫面。Flow questions 也會綁定到包含 control 的實際 screen：`Order Now` → `Food Details` (`0:528`)，`Edit Profile` → `Profile` (`0:701`)。
- 使用同一份 Selection Manifest 完成 Food App page 的 candidate → decisions → confirmed Flow：`Order Now` 已確認為 `food-details → payment-address`，selection fingerprint 綁定並通過 preflight。`Edit Profile` 的 user decision 已保留，但「可點擊且無 destination」仍待加入通用 action-only interaction model，不能用假 screen 取代。
- UIKit generated host 仍可 build/run 並顯示文字與紅色按鈕；兩個 host 的 selected screen screenshot 仍需 viewport normalization、asset decode 修正與 approved pixel threshold 才能進入 visual gate。

### 2026-10-22：FoodApp direct route evidence boundary rechecked

- 以 XcodeBuildMCP `open-pencil-demo-swiftui` profile 重新 build/run `demo-ios`，`-openGeneratedScreen` 成功啟動，但實際畫面仍是 `CryptoAndFoodApp#0:89` Home empty-state，而不是 confirmed Flow 的 `Food Details#0:528`。
- Runtime snapshot 取得 1 element、0 likely interaction targets；因此目前 host 沒有可操作的 `Order Now`，不能執行或宣稱 `food-details → payment-address` direct route pass。
- 這確認當前阻塞是 acceptance host fixture scope 不匹配，不是上一階段 route ID wiring 的失效。下一個實作前置是把已確認 `food-details` Screen Contract 與 `payment-address` destination 接入可替換 host；不能只改 UI test 去猜畫面或用 launch flag 代替 route。
- 重新對真實 `CryptoAndFoodApp.fig#0:528` 執行 `screen-contract`：產出 33 components、1 asset、7 個 `UNSUPPORTED_NATIVE_PATTERN` warnings，但 `interactions` 為空。這表示目前 confirmed Flow 的 `Order Now → Payment Address` 尚未綁回 Screen Contract 的 source node；若直接由 generator 猜 node，會破壞 provenance-first 邊界。

### 2026-10-22：Confirmed Flow → Screen Contract interaction binding

- `FlowTransition` 現在可保留 optional `nodeId`；`compileConfirmedFlow()` 優先使用 decision answer 的 nodeId，否則只在 question evidence 存在唯一 `design-node:<id>` 時推導，沒有唯一 evidence 不會猜測。
- 新增 `packages/codegen-core/src/screen-contract-flow-binding.ts`；confirmed transition 會依 flow screen 的 `designNodeId` 找到對應 Screen Contract，建立帶 node、event、destination、presentation kind 與 provenance 的 `ContractInteraction`。
- binding 會阻擋缺少 evidence-backed nodeId，或 node 不在該 Screen Contract 的 component hierarchy；不從文字、canvas 順序或 generator fallback 建立互動。
- CLI `preflight` 與 `generate` 在使用 `--confirmed-flow` 時會先執行 binding，再進入 package validation、asset export 與 native generation。
- 驗證：Flow confirmation、binding、CLI E2E 與完整 suite 通過；最新完整 `bun test packages scripts` 為 `249 pass / 0 fail`，`bun run check` 通過。
- 尚未宣稱 FoodApp runtime route 完成：需要用這個 binding 重新產生 `Food Details#0:528` / `Payment Address#0:560` host，並以兩個 iOS host 直接點擊驗證。

### 2026-10-22：Real CryptoAndFoodApp binding smoke test

- 以目前 `figs/CryptoAndFoodApp.fig` 的 `🟠 Apps` page 重新執行 candidate → decisions → confirmed flow；`Order Now` question evidence 為 `0:536`，confirmed Flow 為 `food-details → payment-address`，並保留 `nodeId: 0:536`。`Edit Profile` 保留 `0:719` action-only。
- 用同一份 confirmed flow 與 `Food Details#0:528` contract 執行 preflight；package `flow.json` 已保留 transition nodeId，`screen-contracts.json` 已產生 `flow-interaction-1`，destination 為 `payment-address`、kind 為 `push`，provenance 指向 confirmation decision。
- 實際執行 SwiftUI native generation 時，binding 已成功進入 generator，但在 asset export 階段被明確阻擋：`ASSET_EXPORT_EMPTY_RASTER`，node `0:531`、assetRef `c0f5e07597d25a884fc35c413f3bb756994232b7`、輸出 `image-6.png` alpha 無可見像素。這是目前 Food Details route host 生成的 upstream asset blocker，不是 Flow/Contract binding 失效。
- 因此目前仍不能進入 iOS host direct route；必須先修正或取得該 asset 的有效 export，再重新生成 Food Details / Payment Address host。

### 2026-10-22：FoodApp asset blocker root cause

- OpenPencil node inspection 顯示 `Food Details#0:531` 與 `Payment Address#0:585` 都引用同一個 `imageHash: c0f5e07597d25a884fc35c413f3bb756994232b7`。
- 直接檢查 `figs/CryptoAndFoodApp.fig` archive：`images/` 共有 26 個實體資源，但沒有該 hash；因此不是 native bundle、SwiftUI `Image` 或 UIKit `UIImage` loading 失敗。
- 直接用 OpenPencil CLI 對該 node 做 SVG/PNG export 都回傳 `Nothing to export`；目前 fallback PNG 雖是合法 600×716 RGBA 檔，但 alpha 與 RGB 範圍皆為 `0..0`，所以被 `ASSET_EXPORT_EMPTY_RASTER` 正確阻擋。
- 這是 fixture source resource 缺失的 upstream blocker。不能用人工圖片、SF Symbol 或其他 archive image 代替，否則會失去 Figma provenance 並污染 visual acceptance；需重新取得包含該 resource 的 `.fig`，或由使用者提供對應原始 asset 後再重跑 pipeline。

### 2026-10-22：產品輸出模式調整為既有 iOS App integration

- 主要使用情境確認為：將選定的 `.fig` screen/flow 接入既有 iOS App，而不是只產生 standalone demo App。
- Design Package 仍保留為通用 canonical intermediate；新增的 existing-app integration profile 會描述既有 project、module、SwiftUI/UIKit entry point、navigation/coordinator、DI 與 asset destination。
- SwiftUI/UIKit generator 仍維持 generic；既有 App integration 以 adapter/profile 接入，不把 FoodApp 邏輯回流到 generator。
- 新工作計畫已明確納入完整工作鏈：Selection Manifest → metadata-first Screen Discovery → Design Evidence Checklist → Design AST → Screen Contract → Flow Confirmation → Navigation scaffold → SwiftUI/UIKit generation → runtime + visual verification。
- Screen Discovery Report、Design Evidence Checklist、Native Pattern Mapping 與 generator gate 已完成第一版；更完整的 native pattern semantics 尚待完成。
- 本文件是目前唯一主進度、決策與後續工作文件。

## 目前狀態

| 項目 | 狀態 | 說明 |
|---|---|---|
| OpenPencil CLI/MCP ingestion | 已完成 scope 基礎能力 | 支援 local `.fig`、page/node/selection scope、bounded tree hydration、diagnostics；unsupported coverage 仍待分類 |
| Design AST / Flow IR | 已完成基礎能力 | hierarchy、geometry、flow、provenance 可進入 package |
| Screen/Flow Contract | 部分完成 | schema、validator、layout contract、Flow Confirmation binding 已有；真實 `Food Details#0:528` host 尚待重新生成與 runtime 驗證 |
| Generic SwiftUI backend | 已完成基礎能力 | UI IR、native controls、Contract style/typography、container render ordering；真實 selected contract 已接入 iOS host build/run，但 image resource fidelity 仍不完整 |
| Generic UIKit backend | 已完成基礎能力 | generic hierarchy／constraints、Screen Contract style fallback、text typography/color 已有；仍需更多實際 fixture 驗證 |
| FoodApp compatibility adapter | 保留中 | 只能作 acceptance 相容層，不能回流成公開 generator 行為 |
| Asset pipeline | blocked for affected assets | SVG-first/PNG fallback、selected contract scoped asset intent 已有；已偵測完全透明 raster 並以 `ASSET_EXPORT_EMPTY_RASTER` 中止，仍需修正 OpenPencil image export；boolean SVG exporter 仍有 notch 問題 |
| Runtime navigation | 部分完成 | confirmed transition、共用 scaffold 與 route observability 已完成；目前 demo host 只接 `0:89` Home empty-state（snapshot 0 targets），`food-details → payment-address` direct route 仍未取得 |
| Visual verification | pending | `CryptoAndFoodApp#0:89` screenshot 已能顯示文字／按鈕；image `0:97` 未載入，仍缺 asset decode、viewport normalization 與 approved pixel threshold |
| Fixture acceptance corpus | ingestion/package baseline 已完成 | 三份新 fixture 已完成 scoped preflight、validate、structural baseline；CryptoAndFoodApp node `0:89` 已接入雙 host build/run，直接 route 與 visual pass 尚未完成 |
| 舊 FoodApp/CoffeeShop 等 generated examples | 已移出主線 | generated packages、舊 acceptance host、舊 examples 已移出；synthetic tests／legacy compatibility code 僅保留作通用回歸測試 |
| OpenFashion | 已移出有效 fixture corpus | 舊 parser blocker 保留於歷史紀錄，不再作目前驗收輸入 |
| CLI/MCP productization | 部分完成 | CLI/MCP structured errors、scope selection、confirmation E2E、integration profile validation 與 real-fixture preflight 已有；existing-app adapter 與更完整 contract/runtime evidence 尚待處理 |

## Fixture 狀態

| Fixture | Ingestion/package | Build | Runtime/navigation | Visual | 備註 |
|---|---|---|---|---|---|
| CryptoAndFoodApp | scope/ingestion 已驗證 | `0:89` 雙 host 已 build/run | selected screen evidence 已有；direct route pending | pending | `🟠 Apps` 下含 Food App 與 Crypto，需用明確 node scope 分別驗證 |
| RealEstateApp | page inventory 已確認 | pending | pending | pending | `Screens` page 是主要驗證範圍，Cover 不得被當成完整設計 |
| E-learning | page inventory 已確認 | pending | pending | pending | `🎨 Designs` 是主要驗證範圍，unsupported nodes 需進 audit |

## 目前主要待作項目

### P0：回到通用產品主線

1. 補齊 Selection Manifest 與 Screen Contract / Flow Confirmation 的產品化收口：pages → selection → inspect → screen-contract → propose → questions → user confirmation → compile → generate；目前主流程與 contract draft 可跑，仍需 fresh-directory guide、contract confirmation 與 API 行為一致性維護。
2. 清楚隔離 acceptance host workaround 與 generic generator 能力；不能用 host patch 掩蓋 generator coverage 缺口。
3. 補齊 selected contract 的 render-critical style／typography／asset metadata；目前 CLI bounded tree 仍未提供所有 OpenPencil node 的完整 style fields，不能由 generator 猜顏色或圓角；image resource `0:97` 仍需可重現的 decode/export 修正。
4. 修正 image/raster export 與 boolean operation asset export，使重新 generate 後不需要手動修改或接受空白 generated asset。
5. 完成舊 generated example/acceptance references 的清理；保留純 generic synthetic unit tests 與明確 legacy compatibility tests，改用三份新 fixture 做 scope/contract/tool tests。
6. 完成完整 fixture matrix：每份新 fixture 的 selected screen、state、transition、asset、SwiftUI/UIKit build 與 runtime evidence。
7. 將真實 selected contract 產出的 SwiftUI/UIKit source 接入 `demo-ios` 的可替換 host，使用 XcodeBuildMCP 驗證 iOS Simulator compile/run；目前 CryptoAndFoodApp node `0:89` 已完成，其他 fixture/screen 尚待擴充，不能用 macOS `swift build` 取代此 gate。若 automation session 沒有 tap API，可使用 acceptance-only `-openGeneratedScreen` 取得 screen evidence，但不可把它記成 navigation route pass。

### P1：驗證產品化

8. 為 selected screen 完成 style/viewport 正規化，再建立 approved threshold；現有 reference、candidate、diff 僅是 pending evidence。
9. 自動產生 structural/runtime/visual 三種獨立 gate 報告。
10. 完成兩個 host 的直接 route evidence；先接入 confirmed `Food Details#0:528` / `Payment Address#0:560` contract，native example host 僅在工具驗證需要時建立，不作產品完成條件。
11. 補上 confirmed Flow → Screen Contract interaction binding：保留 question evidence 的 source node、event、destination 與 provenance，再讓 generator/host 消費明確 interaction；不得由 canvas order、文字猜測或 generator fallback 代替。

### P2：文件與交付

12. 維護 MCP error envelope parity、CLI machine-readable diagnostics、exit code 與 fresh-directory guide；核心實作已完成，剩餘是持續驗證與文件同步。
13. 更新版本同步與 OpenPencil Mac App 前置條件文件。
14. 最後才建立 selected fixture 的 visual parity；不再把 FoodApp Product 2–5、profile、support、popup 當成 generator 架構中心。

## 後續唯一執行計畫

後續工作固定依照以下順序，不再另立同一產品方向的計畫文件：

```text
Selection Manifest
  ↓
Metadata-first Screen Discovery
  ↓
Design Evidence Checklist
  ↓
Design AST
  ↓
Screen Contract
  ↓
Flow Confirmation
  ↓
Navigation scaffold
  ↓
SwiftUI / UIKit generation
  ↓
Runtime + visual verification
```

### Phase A：Screen Discovery 與 Design Evidence

狀態：Report、Checklist、Native Pattern Mapping artifact 與 generator gate 已完成第一版。

- 已建立 `packages/flow-extractor/src/screen-discovery.ts` 與 `packages/codegen-core/src/design-evidence.ts`，並保留 source node、frame、style、asset reference、native pattern、verification method 與 provenance。
- 已加入 CLI `screen-discovery <file.fig> --output <report.json> [scope options]`，並讓 `inferFlowFromDesign` 共用同一套 discovery；不再維護第二套 phone-sized screen traversal。
- 已加入 focused tests，確認 nested `Payment Address (0:560)` 不會被外層 `Food App (0:88)` 蓋掉，且缺少 frame 時會產生 `DESIGN_EVIDENCE_FRAME_REQUIRED` warning。
- 已將 Report／Checklist 寫入 Design Package，新增 `screen-discovery.json`、`design-evidence.json` 與 `native-patterns.json`；`preflight` 產生、`validate` 讀取，並保留 package schema 驗證。
- Native mapping 現在附帶 `nativeEvidence`，獨立 report 會保留 pattern、evidence basis、verification method 與 provenance；SwiftUI/UIKit generator 在收到 mapping 時會阻擋 unknown、空 evidence 或 duplicate node mapping。Screen Contract 明確列為 asset 的 artwork node 可使用 `screen-contract-asset` evidence。
- 驗收：nested `Payment Address (0:560)` 能被發現，不把外層 `Food App (0:88)` 誤判成唯一 screen；missing frame／asset 必須保留 provenance 並 fail loud。
- Phase A 已完成；下一步進入 Phase C，建立只由 confirmed Flow 產生的 Navigation scaffold。Phase B existing iOS App profile 會在 route contract 明確後接續。

### Phase B：Existing iOS App Integration Profile

狀態：profile schema、CLI validation、adapter descriptor 與 acceptance host compile wiring 已完成第一版；外部既有 App 的實際 host wiring 尚未完成。

- 建立 validated integration profile，描述既有 App 的 project、module、feature、SwiftUI/UIKit entry point、navigation/coordinator、DI 與 asset destination。
- CLI 以 `--integration <existing-ios-app.json>` 載入 profile；缺少或無效 profile 時拒絕 existing-app generation，不猜測 host symbol。
- Design Package 保持 canonical intermediate；`demo-ios` 只作 acceptance fixture，不定義任意 client App 的 integration API。
- 不在 generic generator 加入 FoodApp-specific branch。

### 2026-10-22：Existing iOS App integration profile 第一版

- 新增 `packages/codegen-core/src/existing-ios-integration.ts`，要求明確的 project path、module、feature、至少一個 SwiftUI/UIKit entry point、navigation coordinator、DI registration 與 asset destination。
- `generate --integration <profile.json>` 現在會先驗證 profile；缺少 entry point、未知 asset bundle 或空 host symbol 會 fail loud，不進入 `.fig` hydration 或生成。
- `CodegenInput` 已保留 `integrationProfile` 邊界；新增 `packages/codegen-core/src/existing-ios-adapter.ts`，輸出 feature-level integration descriptor，明確列出 host module、coordinator、DI、asset destination 與 entry point，不修改 generic layout renderer。
- Generated integration descriptor 同時提供 `${feature}ExistingAppAdapter` protocol；既有 App 只需實作 `registerDependencies()` 與 `present(route:transition:)`，實際 coordinator/DI method 仍由 host app 決定。
- `generate --platform swiftui|uikit|both` 會檢查 profile 是否提供相應 entry point；避免輸出缺少 host backend 的 integration result。
- Design Package 可選擇保存 `integration.json`；`preflight --integration <profile.json>` 寫入 profile，`validate` 會重新驗證，沒有 profile 的既有 package 維持相容。
- `validate` 只忽略不存在的 `integration.json`；若檔案存在但 JSON 損壞，會明確失敗，不再靜默當作沒有 integration profile。
- 目前 descriptor 是安全的 host handoff，不會猜測未知 coordinator/DI method signature；完整外部 host adapter call contract 與實際既有 App compile 尚待 Phase F。
- 驗證：新增 profile/adapter/package/platform/fail-loud tests 通過；本文件目前最新完整驗證為 `245 pass / 0 fail`，`bun run check` 通過。

### 2026-10-22：Existing App adapter host compile evidence

- `demo-ios` acceptance host 已加入 SwiftUI/UIKit integration protocol fixture；Tuist project 重新生成後，兩個 target 均納入新增 source。
- XcodeBuildMCP 實際驗證：`OpenPencilSwiftUIDemo` 與 `OpenPencilUIKitDemo` 在 iPhone 16 Pro / iOS Simulator build/run 成功，並使用 `-openGeneratedScreen` 啟動 generated screen。
- 首次 build failure 的原因是 project file 尚未包含新增 source，已由 Tuist regenerate 修正；這是 host project wiring 問題，不是 Swift protocol compile error。
- 此 evidence 證明 integration contract 可進入真實 iOS target；尚未證明既有外部 App 的實際 coordinator/DI wiring、direct route 或 visual parity。
- UIKit catalog runtime snapshot 已取得 2 個可操作 targets：`renderer.swiftui`、`renderer.uikit`；使用 `-openGeneratedScreen` 可取得 generated screen snapshot，但目前 XcodeBuildMCP session 沒有提供 tap action，因此 catalog → generated screen 的直接 route 仍 pending，不能以 launch flag 代替。
- 已改用 XCTest UI route gate 補足 automation：`OpenPencilSwiftUIDemoUITests.testCatalogToSwiftUIGeneratedScreen` 與 `OpenPencilUIKitDemoUITests.testCatalogToUIKitGeneratedScreen` 均通過，實際從 catalog tap renderer identifier 後驗證 generated screen 的 `Ouch! Hungry`。
- 因此 demo host 的 catalog → generated screen route evidence 已完成；FoodApp confirmed flow 的 home → product → payment → home route 仍需在 selected generated feature host 中另外驗證，不能由這個 host gate 取代。
- 新增 `packages/verification/src/runtime-route-plan.ts`；它把 confirmed Flow transitions 轉成可執行 route cases，並保留 action-only unresolved actions，供未來 SwiftUI/UIKit host 共用同一份 route acceptance plan。
- Design Package 現在固定寫出 `runtime-route-plan.json`；內容由 Flow IR 重新推導，validate 會忽略 artifact wrapper 的 `schemaVersion` 後比對 route plan，避免 stale route evidence 混入 package。
- `screen-acceptance` manifest 與 `report` 現在直接呈現 `runtimeRouteCases`／`unresolvedActions`，使用者不必另外解析 route plan artifact 才能知道待驗證路由與未定義 destination 的 action。

### 2026-10-22：Runtime route observability

- 新增共用 `runtimeRouteCaseId()`，讓 `runtime-route-plan.json` 與 SwiftUI/UIKit generated controls 使用同一組 deterministic `route-1`、`route-2` 識別。
- SwiftUI scaffold navigation button 以 accessibility identifier 暴露 route case；Screen Contract interaction 保留原始 node ID，另以 accessibility value 暴露 route case。
- UIKit 保留 node-level accessibility identifier，並在可確認 destination 的 button 上以 accessibility value 暴露 route case；不改變 generic layout 或額外猜測 navigation。
- 新增 SwiftUI/UIKit generator tests，確認 source node identifier 與 confirmed route case 可同時被 runtime automation 取得。
- 驗證：focused generator/runtime tests 48 pass / 0 fail；完整 `bun test packages scripts` 245 pass / 0 fail；`bun run check` 通過。

### Phase C：Confirmed Flow 與 Navigation Scaffold

狀態：第一版 Navigation scaffold、action-only unresolved model 與 route observability 已完成；selected feature 的直接 runtime route evidence 尚未完成。

- 只從 confirmed Flow 建立 route scaffold，不從 canvas 順序推測 navigation。
- SwiftUI/UIKit 使用相同 route IDs 與 transition evidence。
- `Food Details → Payment Address` 產生 confirmed edge。
- `Edit Profile` 保留為 action-only unresolved interaction，不建立假 destination；其 `screenId`、`nodeId`、event、effect 與 provenance 會進入 Flow IR 與 scaffold。

### 2026-10-22：Navigation scaffold 第一版

- 已建立 `packages/codegen-core/src/navigation-scaffold.ts`，route screens 與 transition edges 只從 FlowIR 產生；不從 canvas order 或 diagnostics 推測 navigation。
- SwiftUI、UIKit、Swift contract generator 與 CLI generate 已接入共用 scaffold；presentation 會映射為 push、sheet、modal 或 replace。
- `Food Details → Payment Address` 這類 confirmed transition 可產生共用 edge；`Edit Profile` action-only decision 可編譯為 Flow IR action，scaffold 會保留 unresolved action 並不建立 destination。
- 驗證：Flow IR、confirmation compile 與 navigation scaffold focused tests，以及完整 `bun test packages scripts` 均通過。

### Phase D：SwiftUI/UIKit Existing-App Adapters

狀態：generic backend、existing-app adapter descriptor 與 demo host compile fixture 已完成；真實外部既有 App adapter wiring 尚未完成。

- SwiftUI adapter 使用宣告的 module、entry point、router/coordinator、DI boundary。
- UIKit adapter 使用相同 UI IR／Screen Contract，不複製 render logic。
- standalone generation 只保留為明確的 compatibility／test mode。
- adapter 只輸出 feature-level integration，不產生隱藏的 app-level router。

### Phase E：Host-aware Assets 與 Verification Gates

狀態：asset manifest、contract-scoped export 與基本 gates 已有；host-aware asset destination 的外部 App 驗證與 visual gates 尚未完成。

- Asset manifest 記錄 source node、source hash、export format 與 host destination。
- 缺少 source resource 或 empty raster 時，在寫出 misleading integration result 前中止；有來源引用的遺失資源使用 `ASSET_SOURCE_RESOURCE_MISSING` 明確阻擋。
- 結構、build、runtime snapshot、navigation route、visual pixel parity 分開驗收。
- build/run 不得被當成 route acceptance 或 visual pass。

### Phase F：代表性既有 iOS App 驗證

狀態：尚未完成。

- 選定一個代表性既有 iOS host，記錄 workspace、scheme、module、navigation boundary 與 asset destination。
- 使用 `CryptoAndFoodApp.fig` 的 confirmed `food-details → payment-address` Flow 產生 feature integration。
- 以 XcodeBuildMCP 驗證 SwiftUI/UIKit compile/run、runtime snapshot 與直接 route evidence。
- 修正 asset decode、viewport normalization 後，才建立 node-matched reference 與 approved pixel threshold。

### 2026-10-22：來源圖片資源完整性盤點與 fail-loud 診斷

- 直接檢查 `CryptoAndFoodApp.fig` 的 image nodes、`fills[].imageHash` 與 `.fig` archive 內的 `images/` entries：14 個被引用 hash 中有 9 個不存在，影響 20 個 image nodes；`c0f5e07597d25a884fc35c413f3bb756994232b7` 不是單一孤立案例。
- Food Details 的 `0:531`、Payment Address 的 `0:585` 都引用缺失 hash；OpenPencil export 會產生全透明 PNG，並非 generator 排版或 iOS asset loading 造成。
- `packages/cli/src/assets.ts` 現在會把「有 `assetRef` 但 OpenPencil 回報 Nothing to export」或「fallback raster 完全透明」統一回報為 `ASSET_SOURCE_RESOURCE_MISSING`；沒有 `assetRef` 的一般空 raster 仍保留 `ASSET_EXPORT_EMPTY_RASTER`。
- 新增 tests 驗證兩種來源資源遺失情況；實際 Food Details generate 已驗證輸出：`ASSET_SOURCE_RESOURCE_MISSING`、node `0:531`、assetRef `c0f5...`。
- 尚未補入或猜測遺失圖片；必須取得包含完整 image resources 的原始 `.fig`，或由使用者提供明確 asset mapping 後才能繼續 visual acceptance。
- 驗證：asset focused tests 2 pass / 0 fail；完整 `bun test packages scripts --timeout 30000` 為 250 pass / 0 fail；`bun run check` 通過。

### 2026-10-22：Figma 網頁版與 local `.fig` 資源差異

- 使用者確認 Figma 網頁版 node `3-84259` 仍可看到該圖片，因此「設計雲端本身沒有圖片」不能再視為已確認 root cause。
- 目前 workspace 內的 `figs/CryptoAndFoodApp.fig` 只有一份，archive 的 `images/` entry 使用內容 SHA-1 命名；被 `0:531` 引用的 `c0f5...` 確實完全不存在，不是單純檔名轉換問題。
- 目前仍需取得一份可辨識為最新的 Figma `File → Save local copy` 輸出，與現有檔案做 archive-level 比對；在此之前，阻塞點應描述為「Figma local copy／中間檔案與 OpenPencil ingestion 邊界的資源缺口」，不要再宣稱是設計來源遺失。
- Figma 官方建議以 `File → Save local copy` 取得 `.fig`；若新檔仍缺少資源，下一步應提交最小重現給 OpenPencil parser/importer，或由 Figma node 直接匯出該圖片作為對照，不應由 generator 猜測補圖。
- 已取得並比對 `figs/CryptoAndFoodApp-original.fig`：兩份 `.fig` 都只有 25 個 image resources，`c0f5...` 都不存在；node `0:531` 的完整 JSON 一致，差異只有 archive compression 與 `exported_at`。因此已排除「下載檔案損壞／覆蓋錯檔」，目前 blocker 可定位為 Figma local-copy 對該圖片資源的內嵌缺口，或其雲端／元件資源在 local copy 中未被帶入。
- 使用 Figma REST API 讀取 file key `wtjachg24GRbV81006Cw5g`：找到 23 個 image references；12 個有直接 image-fill URL，11 個沒有直接 URL。對沒有直接 URL 的 25 個相關節點改用 `GET /v1/images/:key` render API，全部成功取得 PNG。
- 已將恢復資源保存到 `figs/recovered-assets/CryptoAndFoodApp/`，包含 12 個 direct image fills、25 個 rendered node PNG 與 `manifest.json`。Figma node `3:84664` 對應 Food Details 的 600×716 早餐圖片，證明 Figma API 端仍能渲染出原本 local `.fig` 缺失的視覺資源。
- 尚未把 recovered assets 靜默塞回 `.fig`；下一步應建立明確的 source-node mapping／asset recovery input，再由 pipeline 決定是否允許生成，保留來源與恢復證據。
- 使用 API recovered rendered PNG 建立修復版 `figs/CryptoAndFoodApp.fig`：原本的 `CryptoAndFoodApp.fig` 已依使用者要求刪除，`CryptoAndFoodApp-recovered.fig` 已改名為 canonical filename；修復版補入 9 個缺失 image hash entries。`0:531` 已重新 export 成正常 600×716 圖片；Food Details generation 已越過 asset blocker。
- 此 recovery fixture 的資源是 Figma node-rendered PNG，不是原始 image-fill binary，不能直接當作 pixel parity proof；其用途是驗證 asset recovery 與後續 pipeline gate。重新 generation 後目前下一個 blocker 是 `NATIVE_PATTERN_MAPPING_BLOCKED`（node `0:1226`）。

### 2026-10-27：Navigation back vector native pattern mapping

- 根因確認：`0:1226` 是 `icon/navigation/arrow_back_ios_24px` 的無 `assetRef` `VECTOR`；既有 mapper 沒有 navigation-back pattern，因此回傳 `unknown` 並觸發 native mapping gate。
- 新增通用 `navigationBackButton` pattern，僅對名稱符合 `arrow_back`／`arrow_back_ios` 的 `VECTOR` 生效，證據為 `node-type` 與 `node-name`；一般無法辨識的 VECTOR 仍維持 `UNSUPPORTED_NATIVE_PATTERN`，不放寬成任意 image 或 button。
- 新增 regression test，先驗證現況失敗，再完成 mapping；focused native-pattern/gate tests 為 `9 pass / 0 fail`。
- 真實 `CryptoAndFoodApp.fig` node `0:1226` smoke test 已回傳 `navigationBackButton`，無 node diagnostic。
- 對 `CryptoAndFoodApp.fig` page `🟠 Apps`、root `0:528` 執行真實 preflight 後，`native-patterns.json` 的 `0:1226` entry 已為 `navigationBackButton`，provenance 指向 `figs/CryptoAndFoodApp.fig`，diagnostics 為空。
- 完整 `bun test packages` 為 `248 pass / 0 fail`，`bun run check` 通過。此修正只解除 `0:1226` mapping blocker；Food Details / Payment Address 的 runtime route、asset recovery provenance 與 visual pixel acceptance 仍未完成。

### 2026-10-27：Food Details background/star mapping 與 generation 解阻

- 重新執行 `Food Details#0:528` generation 後，下一個 blocker 為 `0:533`；該 node 是 360×360、名稱 `bg` 的純色 VECTOR，原本因 tree hydration 沒有取得 `fills` 而無法建立 evidence-backed mapping。
- OpenPencil CLI adapter 的 bounded tree hydration 現在只對明確命名為 `bg` 的 VECTOR 追加 node detail；normalize 後取得 `style.fill`，mapper 將其映射為 `container`，證據為 `node-type`、`node-name`、`style-fill`。
- `Star 1`～`Star 5` 以明確 artwork name 映射為 `image`，證據為 `node-type`、`node-name`、`artwork-name`；未命名或無法辨識的 VECTOR 仍維持 blocked，不擴大猜測範圍。
- 新增 mapper tests 與 CLI adapter hydration regression test；focused tests 為 `27 pass / 0 fail`。
- 真實 `CryptoAndFoodApp.fig` page `🟠 Apps`、root `0:528` 的 SwiftUI/UIKit generation 已成功，輸出 `image-6.svg`，diagnostics 為空。
- 完整 `bun test packages` 為 `251 pass / 0 fail`，`bun run check` 通過。此結果只證明 Food Details generation 已越過 native pattern mapping；confirmed flow、iOS host runtime route 與 visual pixel acceptance 仍 pending。

### 2026-10-27：Confirmed Food Details route generation

- 重新建立並驗證 confirmed Flow artifact：`Order Now` node `0:536` 明確指向 `payment-address`；`Edit Profile` node `0:719` 保留 `interactive-without-destination` action-only。
- `validate-flow` 回傳 `valid: true`；Food Details route generation 已成功產生 SwiftUI/UIKit route：`paymentAddress`、transition `foodDetailsToPaymentAddressTapOrderNow`、runtime identifier `route-1`。
- Generation 輸出 `Resources/image-6.svg`，沒有 asset 或 native-pattern blocking error。
- 因目前只提供 `Food Details#0:528` Screen Contract，未同時接入 `Payment Address#0:560` contract，輸出仍保留 25 個 `Unresolved design screen` diagnostics。這是 host/多 screen contract integration blocker，不是 confirmed transition binding 失效。
- 尚未把該 route source 接入 `demo-ios` 的 SwiftUI/UIKit host，因此不能宣稱 iOS runtime route 或 direct tap acceptance pass。

### 2026-10-27：Food Details → Payment Address host runtime route

- 產生並接入 `FoodDetails` 與 `PaymentAddress` 的 SwiftUI/UIKit generated sources、`image-6.svg` resource 與 `demo-ios` host project。
- SwiftUI host 新增 `-openFoodDetails` acceptance path，以 `FoodDetailsRouteCoordinator` 切換至 `PaymentAddressView`；UIKit host 以同一 confirmed route push `PaymentAddressViewController`。
- TDD 先新增兩個 route UI tests；初始 RED 證據確認 launch flag 尚未接入，之後又捕捉到 SwiftUI parent accessibility merge 與 UIKit duplicate contract overlay 兩個真實 runtime 問題。
- Generic SwiftUI generator 現在對含 interactive descendant 的 ancestor 保留 child accessibility target，不再讓父 container 吸收 route node；generic UIKit generator 不再對已由 AST 產生 interactive control 的 contract node 追加 duplicate overlay。
- XcodeBuildMCP SwiftUI profile：`2 tests passed / 0 failed`；UIKit profile：`2 tests passed / 0 failed`。兩邊皆實際從 node `0:536` 點擊後觀察到 Payment Address root `0:560`。
- 完整 `bun test packages` 為 `252 pass / 0 fail`，`bun run check` 通過。此完成 selected `food-details → payment-address` runtime route evidence；visual screenshot/pixel threshold acceptance 仍 pending，generation output 仍會列出未選定的其他 design screens diagnostics。

### 2026-10-27：Food Details visual runtime evidence 與 asset catalog 修正

- 原因確認：host 只帶入 loose `image-6.svg` 時，SwiftUI/UIKit runtime 的 `UIImage(named:)`／`Image("image-6")` 無法載入，Food Details 的圖片區呈空白；不是 recovered asset 本身再次遺失。
- 將 generated `Resources/Assets.xcassets/image-6.imageset` 複製到兩個 demo target，並在 `demo-ios/Project.swift` 明確關閉未提供的 `AppIcon` asset 名稱，避免 Tuist/Xcode 因新增 catalog 而以缺少 AppIcon 阻擋 build。
- SwiftUI 與 UIKit `-openFoodDetails` build/run 均成功；兩張 368×800 simulator screenshot 均可看到早餐圖片與 Food Details 內容。這證明 asset bundle loading 與 host rendering 已越過空白圖問題。
- UIKit route UI tests：`2 passed / 0 failed`；SwiftUI route UI tests：`2 passed / 0 failed`。兩者仍可由 `0:536` Order Now 導向 Payment Address `0:560`。
- 截圖目前是 runtime evidence，不是 node-matched visual acceptance：尚未有 `Food Details#0:528` 的 approved reference 與 pixel threshold，因此 visual status 仍為 pending。

### 2026-10-27：Food Details node reference 與 semantic icon visual 修正

- 使用 `openpencil export figs/CryptoAndFoodApp.fig --node 0:528 -f png` 建立 node-matched design reference：`docs/verification/CryptoAndFoodApp-0-528-reference.png`，尺寸 `360×800`。匯出時 Poppins 由本機 fallback substitution 處理，故此 reference 是 recovered fixture evidence，尚未核准為 pixel threshold baseline。
- 初次正式 diff 已明確回報 `fail`，原因是 reference `360×800`、Simulator candidate `368×800`，不是把尺寸不一致誤算成通過。
- 確認 generated Food Details 的 `Star 1..5` 原本落成 `EmptyView`，且 back vector 只生成白色矩形。SwiftUI/UIKit generator 現在依既有 native-pattern evidence 將 back vector 生成 `chevron.left`，將明確命名的 star vectors 生成 `star.fill` 並保留 Figma fill color。
- 新增 SwiftUI/UIKit semantic icon regression tests；focused generators `48 pass / 0 fail`，完整 `bun test packages` `254 pass / 0 fail`，`bun run check` 通過。
- 新 SwiftUI runtime screenshot 已可看到五顆 rating stars；back button 仍有 host z-order 差異待定位，且 viewport normalization、reference threshold 尚未完成，因此 visual acceptance 仍 pending。

### 2026-10-27：SwiftUI back container modifier ordering 追蹤

- 追蹤確認 artwork `.zIndex(1)` 會壓過 navigation back，已在有明確 back contract 的 screen 停用 artwork elevation，並為 back container 使用 `frame → background → offset → clip → zIndex` 的明確順序。
- 重新 build/run 後五顆 stars 維持正常；SwiftUI route UI tests 仍為 `2 passed / 0 failed`。
- Simulator 截圖仍顯示 back red container 的位置與預期 reference 不一致（目前出現在畫面左緣，chevron 未可見），因此不能宣稱 back visual 修正完成；下一步需針對 SwiftUI nested `ZStack` 的 source-frame/offset composition 做最小 reproduction。
- Tuist regeneration 曾因外部 session directory permission denied 失敗；既有 workspace 直接 build/run 成功，未觀察到 Xcode compile error。

### 2026-10-27：SwiftUI Food Details back button visual 修正完成

- nested `ZStack` 的 back container 改用 contract frame 中心點定位：`frame → background → position → clip → zIndex`，避免 local offset composition 將 red button 推到畫面左緣。
- 最新 SwiftUI Simulator screenshot 已看到正確的紅色 24×24 back button 與白色 chevron；五顆 rating stars、圖片與內容也維持正常。
- SwiftUI route UI tests：`2 passed / 0 failed`；UIKit route UI tests：`2 passed / 0 failed`；`bun run check` 通過。
- 已保存 runtime evidence：`docs/verification/CryptoAndFoodApp-0-528/candidate-swiftui-back-fixed.png`。
- Visual pixel acceptance 仍 pending：design reference 為 `360×800`，Simulator capture 為 `368×800`，尚未完成 viewport normalization 與 approved threshold。

### 2026-10-27：Food Details viewport normalization diff

- 將 `368×800` SwiftUI Simulator capture 去除 status bar 與 bottom safe-area，依 app canvas viewport 正規化為 `360×800`，保存為 `docs/verification/CryptoAndFoodApp-0-528/candidate-swiftui-normalized-safe.png`。
- reference 與 candidate 尺寸已一致；正式 `verify --threshold 0.01` 回報 `fail`，difference ratio `0.4638368056`，diff 保存於 `docs/verification/CryptoAndFoodApp-0-528/diff-swiftui-normalized-safe.png`。
- 因此 viewport mismatch 已從 blocker 降級為已處理的 comparison preprocessing；目前剩餘是實際 native layout、font fallback 與內容位置差異，尚未核准任何 pixel threshold。

### 2026-10-27：Quantity control stroke mapping 追蹤

- Reference 明確顯示 `0:543`／`0:546` quantity controls 有 `1px #000000` stroke、radius `8`；generic SwiftUI/UIKit renderer 已支援 `style.stroke`，並新增 `ROUNDED_RECTANGLE` native mapping 與 regression tests。
- focused CLI/mapper/generator tests 為 `73 pass / 0 fail`；但真實 Food Details generation 的 `Rectangle 5` detail 仍未進入 generated UIKit source，runtime screenshot 的 `+/-` border 尚未出現。
- 目前 blocker 已縮小到 selected subtree tree hydration 的節點型別／深度邊界；不能把 synthetic generator test pass 當成真實 fixture visual pass。
- 曾以 bounded depth `18` 重跑 generation，但實際 source 仍未取得 `0:543` stroke，且成本明顯增加；該無效的 depth expansion 已撤回，保留現有 depth 與 blocker 證據。

### 2026-10-27：Quantity control stroke hydration 修正完成

- Proof：page tree 的 `0:543` 只有 id/name/type；直接 `node --id 0:543` 回傳 `cornerRadius: 8` 與 black stroke。generation 的 bounded tree depth `6` 不足以把該深層 descendant 帶入。
- generation scope 改用 bounded depth `18`；完成後 generated UIKit source 的 `0:543`／`0:546` 已包含 `borderColor #000000` 與 `borderWidth 1`，沒有改成 unbounded hydration。
- UIKit runtime screenshot 已看到 `+/-` quantity controls 的黑色圓角框；SwiftUI/UIKit route UI tests 各為 `2 passed / 0 failed`。
- UIKit normalized visual diff 尺寸已一致但仍 `fail`，difference ratio `0.5954444444`；stroke blocker 已解除，剩餘差異仍包含 viewport、font fallback 與整體 layout，尚未核准 pixel threshold。

### 2026-10-27：UIKit viewport 對齊嘗試與撤回

- 曾嘗試將 generic UIKit canvas 改為 edge-to-edge，但 runtime 顯示 system status bar 會覆蓋 design canvas；該 host anchor 變更已撤回，保留原本 safe-area 行為。
- raw simulator capture 的比例回復與 canvas crop 仍可建立 candidate evidence，但正式 diff 仍未通過；目前 visual 差異包含 canvas/host normalization、reference render/font fallback 與 native layout details。

### 2026-10-27：UIKit Screen Contract typography 與 runtime 回歸驗證

- UIKit generator 現在消費 Screen Contract 的 `component.typography`；例如 `Poppins 14px/18px` 會嘗試載入 `Poppins`，載入失敗時保留 deterministic system-font fallback。檢查確認 workspace 沒有內嵌 Poppins font asset，因此 runtime 仍存在字型替代造成的 visual 差異；沒有把 fallback 誤報為 Poppins pixel match。
- Generic UIKit canvas 同步設定 root fill 到 `contentView.backgroundColor`，避免 generated canvas 的背景色只落在 controller view 而被內容層覆蓋。
- UIKit generator focused tests：`20 pass / 0 fail`；`bun run check`：通過。
- UIKit XcodeBuildMCP runtime route tests：`2 passed / 0 failed`，包含 Catalog → Food Details 與 `0:536` Order Now → Payment Address `0:560`。
- SwiftUI XcodeBuildMCP runtime route tests：`2 passed / 0 failed`，確認共用 generated source 更新後 route evidence 沒有回歸。
- 最新 UIKit runtime screenshot 已可看到圖片、紅色 back button、五顆 stars、黑色 `+/-` quantity stroke、內容與 Order Now；這是 runtime rendering evidence，不是 node-matched pixel acceptance。
- 正式 visual acceptance 仍為 pending：normalized UIKit diff 先前為 `0.5954444444`（raw normalization `0.5366145833`），reference 仍受 Poppins fallback 與 native layout/viewport 差異影響；尚未核准 threshold。

### 2026-10-27：Viewport diff 根因邊界確認

- 重新檢視 `candidate-uikit-normalized.png` 與 `candidate-uikit-raw-normalized.png` 後，白色內容卡在 candidate 右側仍留下圖片區；這不是 Screen Contract 的 `360×800` frame 證據，主要受 XcodeBuildMCP optimized screenshot 將 iPhone 16 Pro viewport 重採樣為 `368×800`，再經 crop/scale 正規化的影響。
- UIKit generated source 的 root/content canvas 仍明確是 `360×800`，Food Details card root `0:532` 是 `360×360`、`y=440`；因此目前沒有足夠證據把 host capture artifact 改寫成 generated layout bug。
- Reference 顯示的 card 上緣圓角也未在目前 Screen Contract 對應 component (`0:532` / `0:533`) 的 radius evidence 出現；不以 reference 外觀反推未確認的 radius。
- 結論：viewport normalization 仍是 pixel acceptance 的 comparison blocker；保留 runtime route/build evidence，暫不新增 speculative geometry 修正。

### 2026-10-27：Raw simulator screenshot comparison

- 透過 mobile simulator screenshot 通道取得未經 XcodeBuildMCP optimized resampling 的 UIKit screenshot：`1206×2622`，即 iPhone 16 Pro 的 3× native capture；保存為 `docs/verification/CryptoAndFoodApp-0-528/candidate-uikit-native-3x.png`。
- 依據 simulator status bar 約 `145px`、generated canvas 左側 `360pt = 1080px`，裁出 `1080×2400` canvas 後縮放為 `360×800`；normalized evidence 保存為 `candidate-uikit-native-normalized.png`。
- 使用 repository CLI verify、reference `CryptoAndFoodApp-0-528-reference.png`、threshold `0.01`：結果 `fail`，difference ratio `0.5742326389`。
- 因 raw capture 已排除先前 optimized screenshot 的主要 viewport artifact，剩餘差異應歸入 image crop/rendering、Poppins 未載入造成的 font fallback、以及 UIKit/native rendering，而非繼續猜測 frame 或 radius。
- Pixel acceptance 仍未通過；runtime route/build evidence 仍有效，reference threshold 仍未核准。

### 2026-10-27：UIKit canvas origin 修正與 raw pixel diff 改善

- TDD 先新增 UIKit generator regression：Screen Contract generated canvas 必須 anchor 到 `view.leadingAnchor`／`view.topAnchor`，不能再使用 `safeAreaLayoutGuide`；現況先得到 1 fail，完成修正後 UIKit generator focused tests 為 `21 pass / 0 fail`。
- 根因證據：safe-area anchor 版本 raw screenshot 的 card 起點為 `1621px`，修正後為 `1320px`，精確對應 contract `y=440 × 3`。這確認先前約 `52pt` 的垂直偏移是 generated UIKit canvas anchor，而非 screenshot crop 猜測。
- 有 Screen Contract 的 generated UIKit controller 現在隱藏 status bar；demo host 新增 `DemoNavigationController` 轉發 top controller 的 status-bar preference，讓 raw simulator capture 保留 node canvas 原點、不被 system chrome 覆蓋。
- 修正後 raw `1206×2622` screenshot 直接裁出左側 `1080×2400` 3× canvas，再縮放為 `360×800`；candidate 保存為 `candidate-uikit-node-canvas-normalized.png`，diff 保存為 `diff-uikit-node-canvas-normalized.png`。
- 正式 verify 結果由先前 `0.5742326389` 改善至 `0.05453125`，仍以 threshold `0.01` 判定 `fail`；目前剩餘差異主要是 Poppins fallback、recovered image rasterization/crop、以及 native anti-aliasing/未確認圓角，不再是 viewport origin offset。
- UIKit XcodeBuildMCP route tests：`2 passed / 0 failed`；SwiftUI route tests：`2 passed / 0 failed`；`bun run check` 通過。沒有把 `0.05453125` 誤報為 pixel acceptance pass。

### 2026-10-27：UIKit contracted button text color 修正

- Diff mask 顯示 UIKit `Order Now` 文字呈系統藍；Screen Contract component `0:536` 已提供文字色 `#fbf2cf`，因此這是可由 contract 證明的 generator gap，不是視覺猜測。
- UIKit contracted `UIButton` 現在對有 contract color 的 interaction node 呼叫 `setTitleColor(..., for: .normal)`；新增 route-color regression assertion，focused UIKit generator tests 維持 `21 pass / 0 fail`。
- 接入 generated Food Details source 後重新 build/run；UIKit route UI tests：`2 passed / 0 failed`，`bun run check` 通過。
- Raw node-canvas normalized diff 從 `0.05453125` 降至 `0.05415625`，仍未達 `0.01` threshold。剩餘 visual 差異以 Poppins fallback、recovered image rasterization/crop、anti-aliasing 與 reference 未具 contract provenance 的外觀差異為主。

### 2026-10-27：完整套件回歸驗證

- 完整 `bun test packages` 首次因 CLI generate 測試仍期待舊的 `hydrateDepth: 6` 而出現 `258 pass / 1 fail`；該 assertion 與既有 bounded generation policy 不一致，已同步為實際且有意的 `hydrateDepth: 18`。
- 修正後完整套件結果為 `259 pass / 0 fail`，`39 expect()` calls；`bun run check` 亦通過。
- 此回歸修正只同步測試對既有深度策略的期待，沒有放寬 hydration 為 unbounded。

### 2026-10-27：字型 fallback bounded investigation

- 檢查 `/System/Library/Fonts`、`/Library/Fonts` 與 repository workspace，沒有可直接載入的 Poppins font asset；OpenPencil export log 也明確記錄 `Font substitution: Poppins Medium, Poppins Regular`。
- 因此沒有把 Avenir、Arial、Futura 等本機字型任意替換成 Poppins；那會是無 provenance 的 visual guess。UIKit 仍保留 `UIFont(name: "Poppins", ...) ?? system fallback`，並將此差異標為 acceptance uncertainty。
- Diff mask 顯示目前主要文字差異集中於 font glyph/metrics，沒有發現新的 contract-backed color 或 frame blocker；pixel acceptance 維持 `fail/pending`，不再以候選字型實驗冒充通過。
- 重新以不帶 threshold 的 repository CLI verify，狀態為 `reference-threshold-pending`；目前 `0.01` 只是 verification test/documentation example，並非本專案已核准的 visual threshold。`0.05415625` 是 measured difference，不應單獨宣稱 pass/fail acceptance。

### 2026-10-27：Food Details card radius 原始證據確認

- 直接查詢 recovered `.fig` 的 `0:532` (`details`) 與 `0:533` (`bg`)：兩者 `cornerRadius` 都是 `0`，且 `0:533` 的白色 fill 沒有 stroke/effect。
- 因此 reference 上緣的圓角外觀沒有對應到目前可追溯的 node radius evidence；不將它擅自加入 UIKit/SwiftUI generator。此項維持為 reference-rendering uncertainty，而不是 contract-backed fix。

### 2026-10-27：Inter fallback experiment 結束

- OpenPencil core 雖自帶 `Inter-Regular.ttf`／`Inter-Medium.ttf`，但將其註冊到 demo host 並讓 UIKit Poppins fallback 優先嘗試 Inter 後，normalized candidate SHA-1 與原 candidate 完全一致，pixel diff 仍為 `0.05415625`。
- 該 workspace build 也沒有證據顯示新增 Inter resources 被消費；因此已撤回 Inter assets、Info.plist registration 與 generator fallback 變更，保留原本的 `Poppins → system fallback` 行為。
- 回撤後 UIKit generator focused tests：`21 pass / 0 fail`；UIKit build 成功；route UI tests：`2 passed / 0 failed`；`bun run check` 通過。

### 2026-10-27：Status bar ownership 收斂

- 進一步檢視後，將 `prefersStatusBarHidden` 從 generated UIKit Screen Contract controller 移除，避免生成結果對整合 host 施加全域 status-bar 行為。
- `demo-ios` acceptance host 的 `DemoNavigationController` 現在只在 `-openFoodDetails` capture path 隱藏 status bar；generated canvas 仍使用已驗證的 `view.topAnchor`／`view.leadingAnchor`。
- UIKit generator focused tests：`21 pass / 0 fail`；UIKit build/run 成功；UIKit route UI tests：`2 passed / 0 failed`；`bun run check` 通過。
- 此調整不改變目前 raw node-canvas diff `0.05415625`，只把 runtime capture concern 放回 host 邊界。

### 2026-10-27：Status bar ownership final regression

- 先前一次 raw capture 在 UI test 後停留於 catalog，造成錯誤的 `0.9712361111` diff；已辨識為 capture state error，沒有寫入 acceptance evidence。
- 重新以 `-openFoodDetails` launch 後取得 raw canvas，正式 verify 回到 `0.05415625`，與修正前 node-canvas evidence 一致。
- 完整 `bun test packages`：`259 pass / 0 fail`；畫面沒有因 status-bar ownership 調整而回歸。

### 2026-10-27：SwiftUI contract typography 與 acceptance canvas 修正

- SwiftUI typography parser 原本只接受 `Family 45/400`，沒有消費 Food Details contract 實際使用的 `Poppins 14px`；新增 regression test 後先得到 fail，再擴充 parser 保留舊格式並支援 px 格式。
- SwiftUI contracted interaction button 現在套用 `textPresentationModifier`，因此 `Order Now` 消費 contract 的 `Poppins 14px`、文字色與單行縮放設定，不再以 system default 17pt 造成截斷。
- SwiftUI demo acceptance host 固定 selected screen 為 `360×800` top-leading canvas、clip 並隱藏 status bar；這是 host capture policy，不改 generic generator 的 responsive GeometryReader 行為。
- SwiftUI raw node-canvas normalized candidate 保存為 `candidate-swiftui-node-canvas-normalized.png`，diff 保存為 `diff-swiftui-node-canvas-normalized.png`；正式 measured difference 為 `0.0630104167`，相較先前約 `0.46` 已大幅改善，但仍未通過未核准的 `0.01` example threshold。
- SwiftUI route UI tests：`2 passed / 0 failed`；完整 `bun test packages`：`260 pass / 0 fail`；`bun run check` 通過。
- 目前兩個 backend 的 raw node-canvas measured differences：UIKit `0.05415625`、SwiftUI `0.0630104167`；reference threshold 仍是 `reference-threshold-pending`，剩餘差異主要是 Poppins fallback、recovered image rasterization 與 anti-aliasing。

### 2026-10-28：Food Details reference 分界差異追查

- 直接查詢 recovered `.fig`：`0:532` (`details`) 的來源 frame 是 `x=0, y=440, width=360, height=360`；其子節點 `0:533` (`bg`) 也是 `360×360` 白色 vector，沒有額外 `+10px` 的 layout evidence。
- `FoodDetailsView.swift` 與 UIKit generated source 都使用 `0:532` 的 `y=440`；SwiftUI 與 UIKit candidate 的白色內容分界因此一致，並非某一 backend 的單獨回歸。
- Reference PNG 視覺上約在 `y=450` 才出現白色內容，與 node contract 不一致；目前判定為 recovered export/compositing 的 reference-rendering uncertainty，不修改 generator 加入無 provenance 的 `+10px` offset。
- `0:1225` 的來源 frame 仍是 `x=16, y=24, width=24, height=24`、radius `4`，返回按鈕尺寸沒有新的 contract blocker。

### 2026-10-28：Reference export deterministic 重現

- 以相同命令重新 export `CryptoAndFoodApp.fig` node `0:528`，輸出仍為 `360×800`。
- 新輸出 `/private/tmp/openpencil-food-details-reference-repeat.png` 與保存的 `docs/verification/CryptoAndFoodApp-0-528-reference.png` SHA-256 完全相同：`68c92bca5a79778e1193c296c540cd68749e459825d4d44c2f7c827bdf3c71ea`。
- 因此 reference 約 `y=450` 的分界是可穩定重現的 OpenPencil export 結果，不是先前 capture 的偶發污染；但它仍與來源 node `0:532` 的 `y=440` frame 不一致，維持 reference/export provenance uncertainty，不改 native generator。

### 2026-10-28：Reference 上緣差異精確定位

- 逐列抽樣 reference PNG 顯示中央像素在 `y=440` 已是白色；真正差異是左右上角的白色區域由 `y=440` 開始逐步向外展開，至 `y=451` 才覆蓋整列，形狀等同約 `16px` 上緣圓角裁切。
- 這不是整個 details panel 延後 `10px`；native candidate 使用 contract 的 `y=440` 是正確的，但缺少 reference 中的角落裁切。
- 再查 `0:528`、`0:532`、`0:533`，三者來源 `cornerRadius` 都是 `0`；因此目前仍沒有可追溯的 node evidence 支持在 generator 加入圓角，維持 reference-rendering uncertainty。

### 2026-10-28：Clipping metadata 邊界

- `CryptoAndFoodApp.fig` 是封裝 archive；透過目前公開 `openpencil node` inspection 可取得 `0:528`、`0:532`、`0:533` 的 frame、fill 與 `cornerRadius`，但沒有回報 `clipsContent` 或 per-corner radius 欄位。
- 因此不能把 reference PNG 的上緣圓角反推成 native layout contract；此項維持為 reference-only rendering evidence，直到取得額外且可追溯的 design metadata。

### 2026-10-28：Food Details artwork content mode 確認

- Screen Contract 的 asset manifest 明確記錄 `0:531` `contentMode: fit`；SwiftUI generator 因此使用 `.scaledToFit()`，與 contract 一致。
- 不改用 `.scaledToFill()` 或加入額外 crop，因為那會違反目前可追溯的 asset evidence；圖片剩餘差異維持為 recovered export/rasterization uncertainty。

### 2026-10-28：兩個 backend 的 threshold-free verify

- 使用 repository CLI `node --experimental-strip-types packages/cli/src/main.ts verify`，對 UIKit 與 SwiftUI node-canvas normalized candidates 各執行一次不帶 threshold 的 verify。
- 兩者均回報 `reference-threshold-pending`，訊息為 reference 存在但未提供 approved threshold；沒有把全域 OpenPencil CLI 的 unknown command 誤當成 project verification 結果。

### 2026-10-28：Fixture regression verification

- `bun run verify:figs` 結果：`CryptoAndFoodApp.fig` `pass`、`diagnostics: 0`；`RealEstateApp.fig` `pass`、`diagnostics: 0`。
- `E-learning.fig` 也維持 `pass`，但保留既有 `81` diagnostics；這不是本次變更新增的 failure，仍需沿用既有 upstream/parser 邊界處理。

### 2026-10-28：Selection scope regression verification

- `bun run verify:selection` 通過；`CryptoAndFoodApp.fig`、`RealEstateApp.fig`、`E-learning.fig` 三個 explicit page scope 的 `errors` 都是 `0`。
- 各 fixture 仍會保留 diagnostics（分別為 `266`、`4117`、`125`），這些是既有 coverage/unsupported metadata 報告，不是 selection 或 ingestion blocker。

### 2026-10-28：完整 baseline verification

- `bun run verify:baseline` status：`pass`。
- 四個 checks 全部通過：unit `260 pass / 0 fail`、TypeScript `bun run check`、fixture verification、selection verification。
- 因此目前 code/fixture/selection baseline 沒有新的 regression；剩餘未決仍是 visual reference provenance 與 approved pixel threshold，不是 structural 或 runtime gate failure。

### 2026-10-28：Reusable agent skill 建立

- 已建立可跨未來 `.fig` / iOS App 工作重複使用的 Codex skill：`open-pencil-inspector`。
- skill 位置：`/Users/DavidTai/.codex/skills/open-pencil-inspector/SKILL.md`；UI metadata 位於同目錄 `agents/openai.yaml`。
- skill 將 `CryptoAndFoodApp.fig` 定位為 regression fixture，而非 product-specific generator，並封裝 selection、Design AST、Flow IR、Screen Contract、asset/native mapping、SwiftUI/UIKit、host runtime 與 visual acceptance 的 reusable workflow。
- 內建 `quick_validate.py` 因執行環境缺少 Python `yaml` 套件無法啟動；已用 Ruby YAML 解析確認 frontmatter、檔名、metadata 與 TODO placeholder 均有效。未宣稱官方 validator 已通過。

### 2026-10-28：Agy skill discovery 驗證

- 已將同一份 `open-pencil-inspector` skill 同步到 `/Users/DavidTai/Documents/GitHub/.agents/skills/open-pencil-inspector/`，讓 workspace-local skill discovery 可使用；Codex user skill 仍位於 `/Users/DavidTai/.codex/skills/open-pencil-inspector/`。
- 兩份 `SKILL.md` 與 `agents/openai.yaml` SHA-256 完全一致。
- Agy 唯讀 smoke test 已成功讀取 workspace skill，並正確解析 reusable workflow 第一步為建立 page/node scope 與 selection fingerprint。
- 初次 Agy 啟動曾因 sandbox host logging/localhost 限制失敗，後續以 host permission 與嚴格唯讀 prompt 驗證成功；沒有修改專案檔案。

### 後續完成條件

- 使用者可選取 `.fig` page 或 node scope，並取得可追溯的 Screen Discovery Report 與 Design Evidence Checklist。
- 未確認的 Flow、缺失 asset、缺失 host integration point 都會明確阻擋生成。
- 既有 iOS App 可透過 validated profile 消費生成的 feature output。
- SwiftUI/UIKit 共用同一份 Design Package 與 Navigation scaffold，但保留各自 backend。
- Structural、runtime、route、visual evidence 都可獨立判定，不互相冒充。

## 已知限制與決策

- 不建立 Figma API runtime dependency；主要輸入是 OpenPencil CLI/MCP、Spec 與自然語言。
- 不把 React/Tailwind output 翻譯成 SwiftUI/UIKit。
- 不以整張 screenshot/image flatten 取代 native node hierarchy。
- API SPEC 未提供前，只生成 protocol、DI seam 與 deterministic stub，不猜 endpoint/model。
- OpenFashion parser blocker 必須保持可定位、可報告、不可 silent skip。
- 目前專案不是 Git checkout，因此沒有 branch、diff、commit 可作進度證據；進度以本文件與驗證輸出為準。

## Definition of Done

- `.fig + Spec` 可在新目錄完成 ingestion、contract、generation、validation、report。
- SwiftUI/UIKit 共用 Design Package 與 Flow/Screen Contract，不含 fixture-name 整頁 generator。
- 可解析 fixture 完成全 screen、state、transition、runtime 與 visual coverage。
- 每個 visual screen 有 reference、threshold、diff 與明確 pass/fail/pending。
- 所有 unsupported node、fallback、ambiguity、parser blocker 都在 audit 中可追溯。
- OpenFashion 若仍無法解析，必須是唯一且明確的 upstream blocked 狀態。
