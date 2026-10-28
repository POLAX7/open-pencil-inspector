# OpenPencil iOS Codegen Design

**日期：** 2026-10-14  
**狀態：** Design approved in conversation; implementation not started

## Goal

建立一個獨立於 `figma-inspector` 的 OpenPencil inspector/codegen 專案，將設計師提供的 `.fig` 設計文件與畫面流程描述，轉換成可驗證的 SwiftUI 與 UIKit iOS UI 程式碼。

第一版支援 UI、基本互動狀態、navigation 與畫面流程；API endpoint、request/response model、networking implementation 與 API error mapping 延後至取得 API SPEC 後再加入。

## Scope

### Included

- OpenPencil CLI adapter：讀取設計文件、節點樹、tokens、component props 與 assets。
- OpenPencil MCP adapter：讓 AI agent 查詢、分析、必要時修改目前的 OpenPencil 文件。
- 共用 Design AST / IR，避免 SwiftUI 與 UIKit 各自解析設計文件。
- Flow input adapter，支援 Markdown／純文字／自然語言、YAML 與 JSON。
- 統一的 Flow IR，描述畫面、事件、狀態、route、transition 與 conflict diagnostics。
- SwiftUI codegen 與 UIKit codegen。
- MVVM、MVVM-C 與 dependency injection 結構化輸出。
- 可拷貝到既有專案的 Swift files/assets。
- 可獨立編譯、測試與展示的 Swift Package/demo projects。
- 基本 UI state：loading、empty、error、disabled、success 等。
- screenshot 與 Simulator 驗證所需的輸出與 fixture。

### Deferred

- 真實 API endpoint 與 networking implementation。
- Request/response models 與 repository implementation。
- API error mapping。
- 未經 Spec 明確描述的商業規則。
- 自動推導複雜的完整產品流程。

## Design Principles

- 保留原本 `figma-inspector`；OpenPencil 版本是獨立專案，不直接改寫既有 inspector。
- OpenPencil adapter 只負責取得與操作設計資料；codegen 不依賴特定 UI 編輯器。
- SwiftUI 與 UIKit 共用 Design AST、Flow IR、state、route、repository protocol 與 dependency contracts。
- 自然語言只用於抽取非結構化意圖；抽取完成後的 Flow IR、檔案產生、路由與 deterministic transforms 由程式控制。
- `.fig` 負責視覺結構、components、tokens、尺寸與 assets；Spec 負責 navigation、互動、狀態與流程意圖。
- Source-first：開始解析前先讀取所有已提供的 Spec、brief 與描述，決定預期 screen、state 與 flow scope；沒有 Spec 時只從 `.fig` 建立可觀察的畫面 inventory，不臆測產品流程。
- Metadata-first：先盤點 pages、root screens 與 node metadata，再只 hydration 已選定的完整 subtree。
- 來源衝突必須產生明確 diagnostic，不可靜默覆蓋。
- React／Tailwind output 不是任何 iOS backend 的輸入；最多只能作為人工理解設計結構的參考。
- API 未定義時，輸出 protocol／placeholder boundary，不產生假 endpoint 或假資料契約。
- 生成結果必須可以在 demo project 中獨立編譯，並可拷貝至通用既有 iOS 專案。

## Architecture

```text
       Spec / brief / description + .fig metadata
                         │
                         ▼
                 Source discovery
                         │
                         ▼
        Selected subtree read / hydration
                         │
                         ▼
             Design AST + Flow IR
                         │
                         ▼
          Layout / Asset / Token / UI IR
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      SwiftUI generator        UIKit generator
             │                       │
             └───────────┬───────────┘
                         ▼
              Swift Package + file export
                         │
                         ▼
        Validate + Audit + Coverage Report
```

## Compiler Pipeline

1. **Discover Sources**：讀取 Spec／brief／描述，盤點 `.fig` pages、root screens 與 metadata。
2. **Read**：只 hydration scope 內所需的完整 node subtree。
3. **Normalize**：將 CLI／MCP 與 flow sources 統一為 Design AST、Flow IR 與 provenance。
4. **Analyze**：產生 Layout Contract、Asset Manifest、tokens、native patterns、UI IR 與 coverage ledger。
5. **Generate**：從同一份 UI IR 產生 UIKit、SwiftUI、MVVM／MVVM-C 與 DI contracts。
6. **Validate**：執行 schema、coverage、layout、asset、build、runtime、navigation 與 visual gates。
7. **Report**：輸出 audit、warnings、blocked diagnostics 與各 gate 結果。

不設獨立 `Optimize` 階段；任何正規化或結構簡化都必須保留設計語意並可由 provenance/audit 追蹤。第一版不實作 cache；只有實際效能量測證明重複解析是瓶頸時，才另外設計 cache key 與失效規則。

## Project Layout

```text
open-pencil-inspector/
├── packages/
│   ├── core/                 # Design AST, Flow IR, diagnostics
│   ├── openpencil-cli/       # Default headless .fig adapter
│   ├── openpencil-mcp/       # Optional live Mac App adapter
│   ├── flow-extractor/       # Markdown/text/YAML/JSON/natural language
│   ├── codegen-core/         # Shared code generation contracts
│   ├── codegen-swiftui/      # SwiftUI output
│   ├── codegen-uikit/        # UIKit output
│   └── assets/               # iOS asset/token conversion
├── swift-package/
│   ├── GeneratedSwiftUI/
│   └── GeneratedUIKit/
├── demo/
│   ├── SwiftUIDemo/
│   └── UIKitDemo/
├── examples/
│   ├── specs/
│   └── fixtures/
└── docs/
    └── superpowers/
```

## Design Data Model

### Design AST / IR

The normalized design representation must retain the render-critical and codegen-critical subset of an OpenPencil node:

- node id, name and type
- parent/child hierarchy
- frame bounds and layout direction
- gap, padding, alignment, sizing and fill behavior
- fills, strokes, radius, opacity and shadows
- text content, font, weight, color, line height and alignment
- component identity, variants and properties
- vector/image/icon references
- variables and semantic token references
- unsupported properties and source diagnostics

The AST must preserve unsupported properties as diagnostics or metadata rather than silently treating them as supported.

### Flow IR

The normalized flow representation must describe:

- screen identity and source node reference
- screen presentation style
- route and route parameters
- events and event payloads
- source and destination screens
- transition style
- screen state and state transitions
- user-visible effects such as error display
- dependency requirements
- unresolved intent and source conflicts

Example:

```json
{
  "screens": ["launch", "login", "home", "register"],
  "transitions": [
    { "from": "launch", "event": "completed", "to": "login" },
    { "from": "login", "event": "loginSucceeded", "to": "home" },
    { "from": "login", "event": "loginFailed", "to": "login", "effect": "showError" },
    { "from": "login", "event": "tapRegister", "to": "register" }
  ]
}
```

## Input Precedence

The system accepts three input classes:

1. Structured YAML/JSON, for deterministic CI and regeneration.
2. Markdown/plain text, for human-maintained specs.
3. Natural language, for interactive extraction through an AI agent.

All inputs must produce the same Flow IR schema. When multiple sources are supplied, the system records provenance for each Flow IR field and reports conflicts. The exact precedence rule will be implemented as an explicit configuration, with structured input taking precedence over inferred natural-language values by default.

## Generated iOS Architecture

Both output targets share the following conceptual contracts:

```text
FeatureState
FeatureEvent
FeatureViewModelProtocol
FeatureRepositoryProtocol
FeatureDependencies
FeatureRoute
```

SwiftUI output contains a `View`, observable state binding, and a composition root. UIKit output contains a `UIViewController`, binding/update mechanism, coordinator, and composition root. Both use MVVM for presentation state, MVVM-C for navigation ownership, and dependency injection for repositories, services, and child coordinators.

The generated repository layer is protocol-only until API SPEC is available. Demo projects may use deterministic in-memory stubs solely to exercise loading, empty, error, success, and navigation states.

## OpenPencil Integration

The CLI adapter is the default headless path for `.fig` inspection, node querying, token analysis, asset export and deterministic document operations; it does not require the OpenPencil Mac App. The MCP adapter exposes the same normalized information to an AI agent and is optional for live inspection of the document currently open in the Mac App.

The adapter must not make codegen depend on a fixed MCP tool inventory. It should discover or validate available tools and fail with actionable diagnostics when a required capability is unavailable.

The original `.fig` file remains the source artifact. Any OpenPencil write operation must use an explicit output copy and preserve the original for comparison.

## Error Handling

- Missing node or unsupported node type: emit a diagnostic with source id and continue only when the generated output remains valid.
- Missing font or asset: emit a warning and generate a named placeholder reference; never silently replace a resource without recording the substitution.
- Ambiguous natural-language flow: stop Flow IR generation for the ambiguous portion and report the missing decision.
- Conflicting `.fig` and Spec values: report both sources and the selected precedence result.
- Missing API SPEC: generate protocol boundaries and a clear deferred integration diagnostic.
- Unavailable OpenPencil CLI/MCP capability: fail the affected adapter operation with the command/tool and required capability.

Every fallback, ignored node, unsupported mapping, ambiguity and degradation must create an audit entry containing severity, source file/node id, pipeline stage, reason, selected fallback, affected screen/component and whether it blocks code generation. Silent guessing is forbidden.

## Verification Strategy

### Unit tests

- OpenPencil node normalization
- Design AST preservation of layout and render-critical properties
- Markdown, YAML, JSON and natural-language Flow IR extraction
- Input precedence and conflict diagnostics
- SwiftUI and UIKit structural generation
- MVVM/MVVM-C/DI contract generation
- route and state transition generation
- API placeholder boundary generation

### Integration tests

- Fixture `.fig` ingestion through CLI adapter
- MCP tool discovery and representative inspection
- Complete fixture generation into Swift Package targets
- Demo project build for SwiftUI and UIKit

### Visual/runtime verification

- Export design references from OpenPencil
- Build and run generated demos in iOS Simulator
- Capture matching screen states
- Compare screenshots and report unresolved visual differences

A successful CLI/MCP call, successful Swift compilation, or generated file count alone is not visual acceptance.

## Success Criteria

- A representative `.fig` fixture can be ingested without requiring the original `figma-inspector` runtime.
- The same Flow IR can be generated from YAML, JSON, Markdown/plain text, and natural-language input for equivalent requirements.
- SwiftUI and UIKit outputs compile in their demo targets.
- Generated screens include agreed basic states and navigation transitions.
- Generated outputs expose DI seams without assuming API details.
- Unsupported or ambiguous input is surfaced as diagnostics.
- Demo screenshots can be compared against design references with an explicit pass/fail result.

## Out of Scope for This Design

- API SPEC design or API client generation.
- Production networking, authentication and persistence.
- Automatic visual approval without reference screenshots and thresholds.
- Design package caching before profiling demonstrates a material repeated-ingestion bottleneck.
- React／Tailwind-to-SwiftUI or React／Tailwind-to-UIKit translation.
- Replacement or migration of the existing `figma-inspector` project.
