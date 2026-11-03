# OpenPencil Inspector

[English](README.md) | 繁體中文

OpenPencil Inspector 是一套將 OpenPencil/Figma `.fig` 設計稿轉成可追蹤原生 UI 實作資料的工具。

它會使用 OpenPencil CLI 讀取設計稿，再整理設計結構、畫面、版面配置、元件、資產與 Screen Contract，最後協助產生原生 UI 程式碼。目前原生程式碼輸出以 iOS 為主，支援 SwiftUI 與 UIKit。

主要流程如下：

```text
.fig 設計稿
  -> OpenPencil CLI / MCP
  -> Design AST / Screen Contract
  -> SwiftUI / UIKit
```

## 使用前置需求

請先準備：

- macOS（目前工具鏈主要以 macOS 為開發環境）
- Node.js
- Bun `>= 1.1.0`
- OpenPencil Mac App
- OpenPencil CLI
- OpenPencil MCP：如果要讓 Codex、Antigravity 或其他 agent 讀取 App 中目前開啟的設計稿

OpenPencil App、CLI 與 MCP 建議使用相同版本。安裝後可以先確認：

```sh
openpencil --version
openpencil-mcp --version
```

## 安裝與版本確認

複製 repository 並安裝 JavaScript 依賴：

```sh
git clone https://github.com/POLAX7/open-pencil-inspector.git
cd open-pencil-inspector
bun install
```

確認 repository CLI 可以使用：

```sh
node --experimental-strip-types packages/cli/src/main.ts --help
```

如果要使用 MCP，請先啟動 OpenPencil Mac App，再將 workspace-local MCP 註冊給 agent。以下以 Codex 為例：

```sh
mkdir -p ~/Documents/GitHub/open-pencil-mcp
npm install \
  --prefix ~/Documents/GitHub/open-pencil-mcp \
  --no-save \
  --package-lock=false \
  @open-pencil/mcp@0.16.0

codex mcp add open-pencil -- \
  ~/Documents/GitHub/open-pencil-mcp/node_modules/.bin/openpencil-mcp
```

確認 MCP 註冊設定：

```sh
codex mcp get open-pencil
```

## Agent 使用範例

啟動 OpenPencil、開啟要處理的 `.fig` 文件並確認 MCP 已註冊，再對 Codex 或其他支援 MCP 的 agent 下達類似指令：

```text
使用 open-pencil-inspector 處理 figs/CryptoAndFoodApp.fig。

請讀取「🟠 Apps」頁面中的指定畫面，整理畫面結構、資產與版面配置，
建立 Screen Contract、執行 preflight，並產生可接入 iOS 專案的 SwiftUI 與 UIKit 輸出。
請保留設計節點 ID 與資產來源，並列出無法從設計稿確定的行為。
```

Agent 可以透過 OpenPencil MCP 取得目前 App 的選取範圍、節點與開啟中的設計文件資訊，再使用 repository CLI 完成 inspect、Screen Contract、preflight 與 code generation。

## Android UI 開發的使用方式

OpenPencil Inspector 目前的原生程式碼輸出以 SwiftUI 與 UIKit 為主，尚未提供 Kotlin 或 Jetpack Compose 專用 generator。

Android 開發仍可利用本工具取得：

- 畫面與節點階層
- 元件尺寸、間距與 layout contract
- 顏色、字體、圓角與其他 design token
- 圖片、SVG 與其他資產來源
- Screen Contract 與畫面結構資料

接著可以將產出的 Screen Contract、layout contract 與資產作為 Jetpack Compose 或 XML layout 的實作輸入。如此可以共用設計解析與規格整理流程，再由 Android 開發者使用原生 Android 元件完成最後的 UI 實作。

## 常見問題與限制

### 為什麼 CLI 找不到 OpenPencil？

確認 CLI 已安裝並且在 `PATH` 中：

```sh
which openpencil
openpencil --version
```

如果使用 repository 依賴，請先執行 `bun install`，並優先使用 repository 提供的 local binary。

### 為什麼 MCP 沒有回傳設計稿資料？

MCP 會連線到目前正在執行的 OpenPencil App。請確認：

1. OpenPencil 正在執行。
2. App 中已開啟 `.fig` 文件。
3. MCP client 指向正確的 `openpencil-mcp` 執行檔。
4. App、CLI 與 MCP 使用相同版本。

### 可以使用任意 `.fig` 文件嗎？

可以嘗試讀取任何受支援的 `.fig` 文件。不同設計稿可能使用不同的元件、資產、字體與節點結構，因此建議在產生程式碼前先執行 inspect 或 preflight。

### 產生的程式碼是否包含完整產品功能？

產出內容主要描述 UI 結構與可追蹤的設計資料。API、商業邏輯、資料流、權限與產品行為仍需要在目標 App 中自行實作。

### 如何驗證 repository？

```sh
bun test packages
bun run check
bun run verify:figs
```
