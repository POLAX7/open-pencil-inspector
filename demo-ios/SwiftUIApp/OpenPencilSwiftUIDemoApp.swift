import SwiftUI

private struct ScreenContractCatalogView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Native targets") {
                    NavigationLink {
                        CryptoAndFoodAppView(
                            viewModel: CryptoAndFoodAppViewModel(
                                dependencies: CryptoAndFoodAppDependencies(repository: DemoRepository())
                            ),
                            navigationMode: .embedded
                        )
                    } label: {
                        Label("SwiftUI renderer", systemImage: "rectangle.on.rectangle")
                    }
                    .accessibilityIdentifier("renderer.swiftui")
                    NavigationLink {
                        RendererDetailView(title: "UIKit renderer", platform: "UIKit")
                    } label: {
                        Label("UIKit renderer", systemImage: "rectangle")
                    }
                    .accessibilityIdentifier("renderer.uikit")
                }
                Section("Contract pipeline") {
                    Text("Design AST → Screen Contract → native UI")
                        .font(.subheadline)
                    Text("This demo entry is intentionally independent from generated product features.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("OpenPencil Demo")
        }
    }
}

private struct RendererDetailView: View {
    let title: String
    let platform: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title2.weight(.semibold))
                .accessibilityIdentifier("renderer.detail.title")
            Text("Generic contract-driven runtime host")
                .foregroundStyle(.secondary)
            Text("Design AST → Screen Contract → native UI")
                .font(.subheadline)
            Text("Platform: \(platform)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .navigationTitle(title)
        .accessibilityIdentifier("renderer.detail.\(platform.lowercased())")
    }
}

private struct DemoRepository: CryptoAndFoodAppRepositoryProtocol {
    func load() async throws {}
}

private struct FoodDetailsDemoRepository: FoodDetailsRepositoryProtocol {
    func load() async throws {}
}

private struct PaymentAddressDemoRepository: PaymentAddressRepositoryProtocol {
    func load() async throws {}
}

@MainActor
private final class FoodDetailsRouteCoordinator: ObservableObject, FoodDetailsCoordinator {
    @Published var route: FoodDetailsRoute?

    func navigate(to route: FoodDetailsRoute, transition: FoodDetailsTransition) {
        self.route = route
    }
}

@MainActor
private struct FoodDetailsRouteHost: View {
    @StateObject private var coordinator = FoodDetailsRouteCoordinator()

    var body: some View {
        Group {
            if coordinator.route == .paymentAddress {
                PaymentAddressView(
                    viewModel: PaymentAddressViewModel(
                        dependencies: PaymentAddressDependencies(repository: PaymentAddressDemoRepository())
                    ),
                    navigationMode: .embedded
                )
            } else {
                FoodDetailsView(
                    viewModel: FoodDetailsViewModel(
                        dependencies: FoodDetailsDependencies(repository: FoodDetailsDemoRepository())
                    ),
                    coordinator: coordinator,
                    navigationMode: .embedded
                )
            }
        }
    }
}

@MainActor
private struct DemoExistingAppAdapter: CryptoAndFoodAppExistingAppAdapter {
    func registerDependencies() {}
    func present(route: CryptoAndFoodAppRoute, transition: CryptoAndFoodAppTransition) {}
}

@main
struct OpenPencilSwiftUIDemoApp: App {
    var body: some Scene {
        WindowGroup {
            if ProcessInfo.processInfo.arguments.contains("-openFoodDetails") {
                FoodDetailsRouteHost()
                    .frame(width: 360, height: 800, alignment: .topLeading)
                    .clipped()
                    .ignoresSafeArea()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .statusBarHidden(true)
            } else if ProcessInfo.processInfo.arguments.contains("-openGeneratedScreen") {
                CryptoAndFoodAppView(
                    viewModel: CryptoAndFoodAppViewModel(
                        dependencies: CryptoAndFoodAppDependencies(repository: DemoRepository())
                    ),
                    navigationMode: .embedded
                )
            } else {
                ScreenContractCatalogView()
            }
        }
    }
}
