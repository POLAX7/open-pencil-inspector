import UIKit

private final class DemoNavigationController: UINavigationController {
    private let hidesStatusBar: Bool

    init(rootViewController: UIViewController, hidesStatusBar: Bool) {
        self.hidesStatusBar = hidesStatusBar
        super.init(rootViewController: rootViewController)
    }

    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var prefersStatusBarHidden: Bool {
        hidesStatusBar || (topViewController?.prefersStatusBarHidden ?? false)
    }
}

private final class ScreenContractCatalogViewController: UITableViewController {
    private let sections = [
        ("Native targets", ["SwiftUI renderer", "UIKit renderer"]),
        ("Contract pipeline", ["Design AST → Screen Contract → native UI"])
    ]

    override func numberOfSections(in tableView: UITableView) -> Int {
        sections.count
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].1.count
    }

    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        sections[section].0
    }

    override func tableView(
        _ tableView: UITableView,
        cellForRowAt indexPath: IndexPath
    ) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        cell.textLabel?.text = sections[indexPath.section].1[indexPath.row]
        if indexPath.section == 0 {
            cell.accessibilityIdentifier = indexPath.row == 0 ? "renderer.swiftui" : "renderer.uikit"
            cell.isAccessibilityElement = true
            cell.accessibilityTraits = .button
            cell.accessoryType = .disclosureIndicator
        }
        if indexPath.section == 1 {
            cell.detailTextLabel?.text = "Independent demo entry for native generation"
        }
        return cell
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        defer { tableView.deselectRow(at: indexPath, animated: true) }
        guard indexPath.section == 0 else { return }
        let platform = indexPath.row == 0 ? "SwiftUI" : "UIKit"
        if indexPath.row == 1 {
            let controller = CryptoAndFoodAppViewController(
                viewModel: CryptoAndFoodAppViewModel(
                    dependencies: CryptoAndFoodAppDependencies(repository: DemoRepository())
                )
            )
            controller.title = "Order Empty"
            navigationController?.pushViewController(controller, animated: true)
            return
        }
        let detail = UIViewController()
        detail.view.backgroundColor = .systemBackground
        detail.title = "\(platform) renderer"
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 0
        label.text = "Generic contract-driven runtime host\n\nDesign AST → Screen Contract → native UI\nPlatform: \(platform)"
        label.accessibilityIdentifier = "renderer.detail.\(platform.lowercased())"
        detail.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: detail.view.layoutMarginsGuide.leadingAnchor),
            label.trailingAnchor.constraint(equalTo: detail.view.layoutMarginsGuide.trailingAnchor),
            label.topAnchor.constraint(equalTo: detail.view.safeAreaLayoutGuide.topAnchor, constant: 24),
        ])
        navigationController?.pushViewController(detail, animated: true)
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
private final class FoodDetailsRouteCoordinator: FoodDetailsCoordinator {
    weak var navigationController: UINavigationController?

    func navigate(to route: FoodDetailsRoute, transition: FoodDetailsTransition) {
        guard route == .paymentAddress else { return }
        let controller = PaymentAddressViewController(
            viewModel: PaymentAddressViewModel(
                dependencies: PaymentAddressDependencies(repository: PaymentAddressDemoRepository())
            )
        )
        controller.title = "Payment Address"
        navigationController?.pushViewController(controller, animated: true)
    }
}

@MainActor
private struct DemoExistingAppAdapter: CryptoAndFoodAppExistingAppAdapter {
    func registerDependencies() {}
    func present(route: CryptoAndFoodAppRoute, transition: CryptoAndFoodAppTransition) {}
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let rootViewController: UIViewController
        var foodDetailsCoordinator: FoodDetailsRouteCoordinator?
        foodDetailsCoordinator = nil
        if ProcessInfo.processInfo.arguments.contains("-openFoodDetails") {
            let coordinator = FoodDetailsRouteCoordinator()
            foodDetailsCoordinator = coordinator
            rootViewController = FoodDetailsViewController(
                viewModel: FoodDetailsViewModel(
                    dependencies: FoodDetailsDependencies(repository: FoodDetailsDemoRepository())
                ),
                coordinator: coordinator
            )
        } else if ProcessInfo.processInfo.arguments.contains("-openGeneratedScreen") {
            foodDetailsCoordinator = nil
            rootViewController = CryptoAndFoodAppViewController(
                viewModel: CryptoAndFoodAppViewModel(
                    dependencies: CryptoAndFoodAppDependencies(repository: DemoRepository())
                )
            )
        } else {
            rootViewController = ScreenContractCatalogViewController(style: .insetGrouped)
        }
        let navigationController = DemoNavigationController(
            rootViewController: rootViewController,
            hidesStatusBar: ProcessInfo.processInfo.arguments.contains("-openFoodDetails")
        )
        foodDetailsCoordinator?.navigationController = navigationController
        guard let windowScene = application.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first else { return false }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = navigationController
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
