# OpenPencil Inspector Agent Flow Confirmation Design

日期：2026-10-15
狀態：已採用並完成第一版實作（2026-10-15）；視覺 parity 仍待後續驗收

## 目標

讓 OpenPencil Inspector 從 `.fig` 解析出可驗證的畫面 inventory 與候選流程問題，再交由 Agent 向使用者確認產品 navigation、state 與 interaction。只有確認後的 Flow IR 才能進入 preflight、codegen 與 acceptance。

核心原則：parser 不猜 navigation，Agent 不修改設計證據，generator 不消費未確認的流程。

## 邊界與責任

### OpenPencil CLI / MCP

- 讀取 `.fig`，輸出 top-level screens、node IDs、子階層、layout、assets、diagnostics 與 provenance。
- 從設計中只建立 screen inventory；不以 canvas 順序、畫面相鄰或按鈕名稱自行建立 transition。
- 產生可供 Agent 閱讀的 candidate flow document，包含已觀察資料與待確認問題。
- 提供 deterministic validation，檢查確認結果是否指向已存在的 screen/node，並拒絕 unresolved/conflicting flow。

### Agent

- 根據 candidate flow 的 questions 向使用者詢問，一次整理一組互相相關的流程問題。
- 將使用者回答轉成明確的 screen、transition、state、presentation 與固定內容決策。
- 不補寫 `.fig` 解析出的 layout 或 asset 數值；設計數值仍以 AST/layout contract 為準。
- 確認完成後提交 confirmed Flow IR，保留每個決策的 user provenance。

### Generator

- 只接受 confirmed Flow IR 與已驗證的 Design Package。
- 不在 SwiftUI/UIKit generator 內補 fallback navigation。
- 若 flow 有 unresolved questions、conflicts、未知 route 或缺少確認狀態，停止生成並輸出可定位 diagnostics。

## 資料模型

保留現有 `FlowIR` 作為生成器輸入，新增一層 confirmation envelope，不把對話狀態塞進既有 transition 欄位：

```json
{
  "version": "1.0",
  "status": "candidate",
  "source": { "file": "figs/FoodApp.fig", "parser": "open-pencil-cli@0.16.0" },
  "flow": {
    "screens": [],
    "transitions": [],
    "states": [],
    "conflicts": [],
    "diagnostics": []
  },
  "questions": [
    {
      "id": "home-card-product-1",
      "kind": "transition",
      "screen": "home",
      "prompt": "點擊這張 burger card 後要前往哪個 detail screen？",
      "options": ["product-1", "product-2", "其他已存在 screen"],
      "evidence": ["design-node:0:32", "text:Cheeseburger Wendy's Burger"]
    }
  ],
  "decisions": []
}
```

狀態只有三種：

- `candidate`：只有 parser/Agent 提出的候選與問題，不得 generate。
- `confirmed`：所有 blocking questions 已回答，Flow IR 可通過 validation。
- `rejected`：使用者明確否決候選，保留原因，不得靜默重試或猜測替代流程。

User decision 的 provenance 使用 `source: "user"`；目前 `FlowProvenance.source` 需要擴充為 `user`，或由 confirmation envelope 保存 user decision 而不改動既有 parser provenance。實作時選一種，不同格式不可並存。

## 流程

1. `inspect` / `preflight` 解析設計並產生 inventory。
2. `propose-flow` 只輸出 candidate envelope；若沒有足夠證據，增加 question，不增加 transition。
3. Agent 讀取 envelope，向使用者確認 navigation、presentation、state、popup dismissal 與固定內容。
4. Agent 寫入 confirmed envelope，並由 validator 產生 canonical Flow IR。
5. `preflight` 驗證 confirmed Flow IR 與 Design Package coverage。
6. `generate` 僅接受 confirmed Flow IR；candidate 或 unresolved envelope 直接失敗。
7. report 分別列出 parser evidence、user decisions、generator output、runtime 與 visual gate，不把任何一層的 pass 當成另一層的 pass。

FoodApp 的確認結果應表達為：

```text
home card -> product detail
detail ORDER NOW -> payment
payment PAY NOW -> order confirmation popup
popup OK -> home
```

金額、描述、評分與時間等已存在於設計稿的內容，作為 fixed design content；除非使用者另行確認，不建立 repository/API dynamic data dependency。

## 介面建議

推薦先做 workspace-local CLI/MCP 能力，而不是讓 CLI 直接啟動自然語言對話：

- CLI：`propose-flow <file.fig> --output <candidate.json>`
- CLI：`confirm-flow <candidate.json> --decisions <answers.json> --output <confirmed.json>`
- CLI：`validate-flow <confirmed.json> --design <file.fig>`
- MCP：提供對應的 `propose_flow`、`confirm_flow`、`validate_flow` tools，讓 Agent 可直接讀寫結構化 envelope。

Agent 對話層可在 Codex、Agy 或其他 client 實作；OpenPencil Inspector 不綁定單一 Agent。

## 失敗與安全規則

- screen/node 不存在：confirmation validation error，不產生 placeholder route。
- question 未回答：generate blocked，列出 question IDs。
- 多個來源對同一 transition 衝突：保留所有 provenance，要求 Agent/使用者解決，不採最後寫入者。
- parser diagnostics 為 error：停止 package/generate；warning 可繼續，但必須進 report。
- Agent 回傳非法 JSON 或未知 option：拒絕 decision，不把模型輸出當成已確認流程。
- 使用者未確認的 inferred transition 永遠不能進入 native codegen。

## 驗收

- candidate output 能列出 FoodApp 的 12 個設計 root，並對缺少 navigation evidence 的項目產生 questions。
- 未確認 candidate 進入 generate 時會 fail，且指出 unresolved question。
- 確認 `home card -> product detail -> payment -> popup -> home` 後，SwiftUI/UIKit 產出相同 Flow IR route。
- confirmation envelope 可 canonicalize、重跑、審計 provenance，且不依賴 Agent 的自然語言格式。
- parser、confirmation validator、generator gate 各自有測試；build、runtime、visual evidence 分開記錄。

## 尚待決定

1. 使用者決策 provenance 要擴充 `FlowProvenance.source` 為 `user`，還是只存在 envelope。
2. `confirm-flow` 是否允許部分確認後保存為 candidate，或每次只接受完整 confirmed 結果。
3. MCP 是否第一階段只提供 read-only `propose_flow`，由 Agent 透過 CLI 寫入 confirmation，或同時提供寫入工具。
