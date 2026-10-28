# Demo integration

`demo-ios/` contains two iOS app targets generated with Tuist 4:

- `OpenPencilSwiftUIDemo` — SwiftUI + MVVM + injected repository.
- `OpenPencilUIKitDemo` — UIKit + MVVM-C navigation root + injected repository.

Generate the Xcode project with:

```sh
cd demo-ios
tuist generate
```

The targets are deliberately independent from generated product features. They
provide native SwiftUI/UIKit entry points for verifying that a confirmed Screen
Contract can be rendered without making FoodApp a generator boundary.

Generate iOS source files from a `.fig` screen inventory:

```sh
node --experimental-strip-types packages/cli/src/main.ts \
  generate figs/CryptoAndFoodApp.fig \
  --page "🟠 Apps" \
  --feature CryptoAndFoodApp \
  --output /tmp/CryptoAndFoodAppGenerated
```

For a standalone Swift Package output, add `--package`; the generated package
contains the Swift sources and compiled-resource-compatible asset catalog:

```sh
node --experimental-strip-types packages/cli/src/main.ts \
  generate figs/RealEstateApp.fig \
  --page Screens \
  --feature RealEstateApp \
  --output /tmp/RealEstateAppPackage \
  --package
```

The `--flow` file may be Markdown, JSON, or YAML. Without it, the command
generates zero navigation transitions; canvas order is never treated as flow.

Verify all local `.fig` fixtures and preserve parser failures as blocked:

```sh
bun run verify:figs
```

The current demo composition roots launch a small native catalog. Generated
feature packages remain available for explicit package-generation acceptance,
but are not required by either demo target.
