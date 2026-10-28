# Selection-First Design Scope

## Goal

讓使用者先從 `.fig` 選定 page、section 或 frame 範圍，再開始 ingestion、Flow Confirmation、Screen Contract 與 native code generation。

系統不得默默只處理第一個 page，也不得把未選取的 Cover、component library 或其他產品畫面混入分析結果。

## User flow

```text
.fig
  ↓
list pages / sections / frames
  ↓
user selects page or node scope
  ↓
selection manifest
  ↓
inspect selected subtree only
  ↓
propose → confirm Flow
  ↓
preflight / package / generate
```

## Scope forms

### Page scope

`--page <page-name>` is a convenience selector. The resolved page ID is recorded in the manifest and is the canonical identity used downstream.

### Node scope

`--node <node-id>` selects one frame, section, or node and its descendants. The selected page must be recorded and the node must belong to that page.

### Selection manifest

`--selection <selection.json>` supports multiple roots selected from the same source document and page.

```json
{
  "version": "1.0",
  "source": "figs/CryptoAndFoodApp.fig",
  "page": { "id": "0:5", "name": "🟠 Apps" },
  "rootNodes": [
    { "id": "0:88", "name": "Food App", "type": "SECTION" }
  ],
  "scope": "selected-subtree"
}
```

The source path, page ID/name, root node IDs/names/types, and scope mode must be copied into Design Package provenance and audit output.

## CLI and adapter behavior

- Add page inventory support before inspection.
- Extend CLI inspection options with page identity and root-node scope.
- Keep `--page` and `--node` as ergonomic selectors; normalize both into the same internal selection manifest.
- Make `preflight` and `generate` consume the normalized scope.
- Reject a missing page, ambiguous page name, node not found, node from another page, or empty selection with a structured diagnostic and non-zero exit code.
- Preserve full-document `info` and `pages` commands as read-only inventory operations.
- Mac App current selection is an input source for the same manifest; it must not create a separate scope model.

## MCP behavior

The local MCP bridge should expose page inventory and current selection through the existing read boundary. Selection-derived IDs are passed to the same deterministic inspection and package functions used by the CLI. MCP must not infer a scope from a visible page when an explicit selection is absent.

## Flow integration

The confirmation workflow begins only after scope resolution:

```text
resolve selection → inspect selection → propose-flow → save decisions → confirm-flow
```

The confirmation envelope records the selection manifest or a stable reference to it. A candidate from one page or root scope must not be compiled against another scope without invalidation.

## Error and provenance rules

- Page and node identity errors are blocking.
- Unsupported nodes remain warnings with exact node provenance.
- Scope resolution never falls back silently to the first page.
- Every generated package reports source file, page ID/name, root node IDs, and scope mode.
- Existing parser blockers, such as OpenFashion resource ambiguity, remain explicit and are not replaced by an empty selection.

## Verification

Tests must cover:

1. Page inventory resolves the correct page ID and node count.
2. `CryptoAndFoodApp.fig` can select `🟠 Apps`, `Food App`, and `Crypto` independently.
3. `RealEstateApp.fig` can select `Screens` without inspecting `Cover`.
4. Multiple roots produce one manifest and preserve both root IDs.
5. Invalid page/node combinations fail loudly.
6. Preflight and generate use only selected roots.
7. Flow confirmation candidate hash changes when the selection changes.
8. A fresh-directory end-to-end path preserves selection provenance through the native package.

## Non-goals

- No FoodApp-specific layout tuning.
- No automatic semantic choice of which screen the user intended.
- No guessing navigation transitions from page order or canvas position.
- No visual pixel-pass claim; visual verification remains a later independent gate.

## Fixture policy

- The current fixture set is `CryptoAndFoodApp.fig`, `RealEstateApp.fig`, and `E-learning.fig` only.
- Previous FoodApp, CoffeeShop, FoodDeliveryApp, eCommerce, and OpenFashion example artifacts must not remain as active example or acceptance inputs.
- New fixtures are used first for ingestion, scope, contract, and tool verification; native example-app generation is a later validation phase, not the architecture driver.
- Generic unit tests may use small synthetic Design AST values when testing a pure transform. Tests that exercise real `.fig` ingestion must use the current fixture set and an explicit page or node scope.
