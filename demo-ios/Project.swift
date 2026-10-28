import ProjectDescription

let project = Project(
    name: "OpenPencilDemo",
    targets: [
        .target(
            name: "OpenPencilSwiftUIDemo",
            destinations: .iOS,
            product: .app,
            bundleId: "com.openpencil.inspector.swiftui-demo",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .file(path: "SwiftUIApp/Info.plist"),
            sources: ["SwiftUIApp/**"],
            resources: ["SwiftUIApp/Resources/**"],
            settings: .settings(base: ["ASSETCATALOG_COMPILER_APPICON_NAME": ""])
        ),
        .target(
            name: "OpenPencilUIKitDemo",
            destinations: .iOS,
            product: .app,
            bundleId: "com.openpencil.inspector.uikit-demo",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .file(path: "UIKitApp/Info.plist"),
            sources: ["UIKitApp/**"],
            resources: ["UIKitApp/Resources/**"],
            settings: .settings(base: ["ASSETCATALOG_COMPILER_APPICON_NAME": ""])
        ),
        .target(
            name: "OpenPencilSwiftUIDemoUITests",
            destinations: .iOS,
            product: .uiTests,
            bundleId: "com.openpencil.inspector.swiftui-demo.uitests",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .default,
            sources: ["UITests/SwiftUIRouteUITests.swift"],
            dependencies: [.target(name: "OpenPencilSwiftUIDemo")]
        ),
        .target(
            name: "OpenPencilUIKitDemoUITests",
            destinations: .iOS,
            product: .uiTests,
            bundleId: "com.openpencil.inspector.uikit-demo.uitests",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .default,
            sources: ["UITests/UIKitRouteUITests.swift"],
            dependencies: [.target(name: "OpenPencilUIKitDemo")]
        ),
    ]
)
