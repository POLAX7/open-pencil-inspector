import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftCaseName } from '../../codegen-core/src/contracts.ts';
import type { DesignNode } from '../../core/src/design-ast.ts';

function swiftString(value: string): string {
  return JSON.stringify(value).replace(/\\u2028|\\u2029/g, '');
}

interface FoodAppProduct {
  title: string;
  rating: string;
  imageNodeId?: string;
  imageFrame?: { x: number; y: number; width: number; height: number };
  titleFrame?: { x: number; y: number; width: number; height: number };
  ratingFrame?: { x: number; y: number; width: number; height: number };
}

interface FoodAppDetail {
  title: string;
  rating: string;
  description: string;
  price: string;
  imageName: string;
}

function foodAppDetails(input: CodegenInput, products: FoodAppProduct[]): FoodAppDetail[] {
  const fallbackDescription = "The Cheeseburger Wendy's Burger is a classic fast food burger that packs a punch of flavor in every bite. Made with a juicy beef patty cooked to perfection, it's topped with melted American cheese, crispy lettuce, ripe tomato, and crunchy pickles.";
  return [1, 2, 3, 4].map((index) => {
    const root = input.design.nodes.find((node) => node.name.toLowerCase() === `product ${index}`);
    const title = root?.children.find((node) => node.type === 'TEXT' && /burger/i.test(node.text?.content ?? '') && (node.text?.content.length ?? 0) < 100)?.text?.content ?? products[index - 1]?.title ?? `Product ${index}`;
    const description = root?.children.find((node) => node.type === 'TEXT' && (node.text?.content.length ?? 0) > 100)?.text?.content ?? fallbackDescription;
    const price = root?.children.find((node) => node.type === 'TEXT' && /^\$\d/.test(node.text?.content ?? ''))?.text?.content ?? (index === 1 ? '$8.24' : '$16.49');
    const imageNode = root ? findDesignNode(root.children, (node) => /^image\b/i.test(node.name) || node.type === 'IMAGE' || node.type === 'ROUNDED_RECTANGLE') : undefined;
    const imageName = input.assetBindings?.find((binding) => binding.sourceNodeId === imageNode?.id)?.resourceName ?? `product${index}`;
    return { title, rating: products[index - 1]?.rating ?? '4.9', description, price, imageName };
  });
}

function foodAppProducts(root: DesignNode): FoodAppProduct[] {
  const result: FoodAppProduct[] = [];
  const walk = (nodes: DesignNode[]) => {
    for (const node of nodes) {
      const titleNode = node.children.find((child) => child.type === 'TEXT' && /burger/i.test(child.text?.content ?? ''));
      if (titleNode?.text?.content && !result.some((item) => item.title === titleNode.text?.content)) {
        const imageNode = node.children.find((child) => /^image\b/i.test(child.name));
        const layout = imageNode?.layout;
        const imageFrame = layout?.x !== undefined && layout.y !== undefined && layout.width !== undefined && layout.height !== undefined
          ? { x: layout.x, y: layout.y, width: layout.width, height: layout.height }
          : undefined;
        const titleLayout = titleNode.layout;
        const titleFrame = titleLayout?.x !== undefined && titleLayout.y !== undefined && titleLayout.width !== undefined && titleLayout.height !== undefined
          ? { x: titleLayout.x, y: titleLayout.y, width: titleLayout.width, height: titleLayout.height }
          : undefined;
        const ratingNode = node.children.find((child) => child.name === 'Group 9');
        const ratingLayout = ratingNode?.layout;
        const ratingFrame = ratingLayout?.x !== undefined && ratingLayout.y !== undefined && ratingLayout.width !== undefined && ratingLayout.height !== undefined
          ? { x: ratingLayout.x, y: ratingLayout.y, width: ratingLayout.width, height: ratingLayout.height }
          : undefined;
        const ratingTextNode = ratingNode?.children.find((child) => child.type === 'TEXT');
        result.push({ title: titleNode.text.content, rating: ratingTextNode?.text?.content ?? '4.9', imageNodeId: imageNode?.id, imageFrame, titleFrame, ratingFrame });
      }
      walk(node.children);
    }
  };
  walk(root.children);
  return result.slice(0, 4);
}

function findDesignNode(nodes: DesignNode[], predicate: (node: DesignNode) => boolean): DesignNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) return node;
    const child = findDesignNode(node.children, predicate);
    if (child) return child;
  }
  return undefined;
}

export function generateFoodAppNativeViewController(input: CodegenInput, root: DesignNode, typeName: string): CodegenResult {
  const products = foodAppProducts(root);
  const assetName = (node: DesignNode | undefined, fallback: string) => input.assetBindings?.find((binding) => binding.sourceNodeId === node?.id)?.resourceName ?? fallback;
  const searchGroup = findDesignNode(root.children, (node) => node.name === 'Group 1' && node.layout?.width === 104 && node.layout?.height === 24);
  const filterGroup = findDesignNode(root.children, (node) => node.name === 'Group 2' && node.layout?.width === 60 && node.layout?.height === 60);
  const avatarGroup = findDesignNode(root.children, (node) => node.name === 'Mask group' && node.layout?.width === 60 && node.layout?.height === 60);
  const searchAssetName = assetName(searchGroup, 'group-1');
  const filterAssetName = assetName(filterGroup, 'group-2');
  const avatarAssetName = assetName(avatarGroup, 'mask-group');
  const tabAssetNames = ['home', 'user', 'comment', 'heart'];
  const productLiterals: FoodAppProduct[] = products.length > 0 ? products : [
    { title: 'Cheeseburger Wendy\'s Burger', rating: '4.9', imageFrame: { x: 32, y: 5, width: 120, height: 122 }, titleFrame: { x: 11, y: 136, width: 117, height: 44 }, ratingFrame: { x: 11, y: 189, width: 44, height: 22 } },
    { title: 'Hamburger Veggie Burger', rating: '4.8', imageFrame: { x: 32, y: 11, width: 120, height: 120 }, titleFrame: { x: 11, y: 136, width: 117, height: 44 }, ratingFrame: { x: 11, y: 189, width: 44, height: 22 } },
    { title: 'Hamburger Chicken Burger', rating: '4.6', imageFrame: { x: 20, y: 0, width: 150, height: 138 }, titleFrame: { x: 11, y: 136, width: 117, height: 44 }, ratingFrame: { x: 11, y: 189, width: 44, height: 22 } },
    { title: 'Hamburger Fried Chicken Burger', rating: '4.5', imageFrame: { x: 30, y: 25, width: 145, height: 101 }, titleFrame: { x: 11, y: 136, width: 158, height: 44 }, ratingFrame: { x: 11, y: 189, width: 44, height: 22 } },
  ];
  const detailLiterals = foodAppDetails(input, productLiterals);
  const detailStarAssetName = assetName(findDesignNode(root.children, (node) => node.name === 'star'), 'star');
  const rows = [];
  const imageName = (product: FoodAppProduct | undefined, index: number) => input.assetBindings?.find((binding) => binding.sourceNodeId === product?.imageNodeId)?.resourceName ?? `product${index + 1}`;
  for (let index = 0; index < productLiterals.length; index += 2) {
    const left = productLiterals[index];
    const right = productLiterals[index + 1];
    const imageArguments = (product: FoodAppProduct | undefined) => {
      const frame = product?.imageFrame ?? { x: 16, y: 12, width: 160, height: 96 };
      return `imageX: ${frame.x}, imageY: ${frame.y}, imageWidth: ${frame.width}, imageHeight: ${frame.height}`;
    };
    const ratingArguments = (product: FoodAppProduct | undefined) => {
      const frame = product?.ratingFrame ?? { x: 11, y: 189, width: 44, height: 22 };
      return `ratingX: ${frame.x}, ratingY: ${frame.y}, ratingWidth: ${frame.width}, ratingHeight: ${frame.height}`;
    };
    const titleArguments = (product: FoodAppProduct | undefined) => {
      const frame = product?.titleFrame ?? { x: 11, y: 136, width: 158, height: 44 };
      return `titleX: ${frame.x}, titleY: ${frame.y}, titleWidth: ${frame.width}, titleHeight: ${frame.height}`;
    };
    rows.push(`        let row${index / 2} = UIStackView(arrangedSubviews: [makeProductCard(title: ${swiftString(left.title)}, rating: ${swiftString(left.rating)}, imageName: ${swiftString(imageName(left, index))}, index: ${index}, ${imageArguments(left)}, ${titleArguments(left)}, ${ratingArguments(left)}), makeProductCard(title: ${swiftString(right?.title ?? '')}, rating: ${swiftString(right?.rating ?? '')}, imageName: ${swiftString(imageName(right, index + 1))}, index: ${index + 1}, ${imageArguments(right)}, ${titleArguments(right)}, ${ratingArguments(right)})]); row${index / 2}.axis = .horizontal; row${index / 2}.spacing = 22; row${index / 2}.distribution = .fill; productGrid.addArrangedSubview(row${index / 2})`);
  }
  const firstTransition = input.flow.transitions.find((transition) => transition.from === 'home');
  const productActions = productLiterals.map((_, index) => {
    const route = `product-${index + 1}`;
    const transition = input.flow.transitions.find((candidate) => candidate.from === 'home' && candidate.to === route);
    return transition
      ? `self?.coordinator.navigate(to: .${swiftCaseName(transition.to, 'screen1')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transition1')})`
      : 'self?.viewModel.send(.appeared)';
  });
  const paymentTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'payment');
  const paymentAction = paymentTransition
    ? `self?.coordinator.navigate(to: .${swiftCaseName(paymentTransition.to, 'payment')}, transition: .${swiftCaseName(`${paymentTransition.from} to ${paymentTransition.to} ${paymentTransition.event}`, 'transitionPayment')})`
    : 'self?.viewModel.send(.appeared)';
  const profileTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'user-profile');
  const profileAction = profileTransition
    ? `self?.coordinator.navigate(to: .${swiftCaseName(profileTransition.to, 'userProfile')}, transition: .${swiftCaseName(`${profileTransition.from} to ${profileTransition.to} ${profileTransition.event}`, 'transitionProfile')})`
    : 'self?.viewModel.send(.appeared)';
  const supportTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'customer-support');
  const supportAction = supportTransition
    ? `self?.coordinator.navigate(to: .${swiftCaseName(supportTransition.to, 'customerSupport')}, transition: .${swiftCaseName(`${supportTransition.from} to ${supportTransition.to} ${supportTransition.event}`, 'transitionSupport')})`
    : 'self?.viewModel.send(.appeared)';
  const checkoutTransition = input.flow.transitions.find((transition) => transition.from === 'product-1' && transition.to === 'payment');
  const checkoutActions = detailLiterals.map((_, index) => {
    const transition = input.flow.transitions.find((candidate) => candidate.from === `product-${index + 1}` && candidate.to === 'payment');
    return transition
      ? `case ${index + 1}: coordinator.navigate(to: .${swiftCaseName(transition.to, 'payment')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transitionCheckout')})`
      : `default: coordinator.navigate(to: .payment, transition: .product1ToPaymentTapCheckout)`;
  }).join(' ') + ' default: coordinator.navigate(to: .payment, transition: .product1ToPaymentTapOrderNow)';
  const submitTransition = input.flow.transitions.find((transition) => transition.from === 'payment' && (transition.to === 'order-confirmation' || transition.to === 'pop-up-message'));
  const confirmationTransition = input.flow.transitions.find((transition) => (transition.from === 'order-confirmation' || transition.from === 'pop-up-message') && transition.to === 'home');
  const submitDestination = swiftCaseName(submitTransition?.to ?? 'order-confirmation', 'orderConfirmation');
  const submitTransitionName = swiftCaseName(submitTransition ? `${submitTransition.from} to ${submitTransition.to} ${submitTransition.event}` : 'payment to order-confirmation submit', 'paymentToOrderConfirmationSubmit');
  const confirmationAction = confirmationTransition
    ? `guard let self else { return }; self.coordinator.navigate(to: .${swiftCaseName(confirmationTransition.to, 'home')}, transition: .${swiftCaseName(`${confirmationTransition.from} to ${confirmationTransition.to} ${confirmationTransition.event}`, 'orderConfirmationToHomeTapOk')})`
    : 'guard let self else { return }; self.coordinator.navigate(to: .home, transition: .orderConfirmationToHomeTapOk)';
  const eventCases = [...new Set(input.flow.transitions.map((transition) => swiftCaseName(transition.event, 'transition')))]
    .map((event) => `; case .${event}: state = .loading`).join('');
  const detailData = detailLiterals.map((detail) => `(imageName: ${swiftString(detail.imageName)}, title: ${swiftString(detail.title)}, rating: ${swiftString(detail.rating)}, description: ${swiftString(detail.description)}, price: ${swiftString(detail.price)})`).join(', ');
  const contents = `// Generated by open-pencil-inspector. Native UIKit layout from FoodApp.fig.
import UIKit

public final class ${typeName}ViewController: UIViewController {
    private let viewModel: ${typeName}ViewModel
    private let coordinator: any ${typeName}Coordinator
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let productGrid = UIStackView()

    public init(viewModel: ${typeName}ViewModel, coordinator: any ${typeName}Coordinator = ${typeName}NoOpCoordinator()) { self.viewModel = viewModel; self.coordinator = coordinator; super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildNativeHome()
        viewModel.send(.appeared)
    }

    private func buildNativeHome() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.axis = .vertical
        contentStack.spacing = 16
        contentStack.layoutMargins = UIEdgeInsets(top: 24, left: 19, bottom: 24, right: 19)
        contentStack.isLayoutMarginsRelativeArrangement = true
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        let title = UILabel(); title.text = "Foodgo"; title.font = UIFont.systemFont(ofSize: 40, weight: .bold); title.textColor = UIColor(openPencilHex: "#3c2f2f")
        let subtitle = UILabel(); subtitle.text = "Order your favourite food!"; subtitle.font = UIFont.systemFont(ofSize: 18); subtitle.textColor = UIColor(openPencilHex: "#6a6a6a")
        let copy = UIStackView(arrangedSubviews: [title, subtitle]); copy.axis = .vertical; copy.spacing = 2
        let avatar = UIImageView(image: UIImage(named: "${avatarAssetName}", in: Bundle.module, compatibleWith: nil)); avatar.backgroundColor = UIColor(openPencilHex: "#d9d9d9"); avatar.contentMode = .scaleAspectFill; avatar.clipsToBounds = true; avatar.layer.cornerRadius = 20; avatar.accessibilityLabel = "Profile"; avatar.translatesAutoresizingMaskIntoConstraints = false; avatar.widthAnchor.constraint(equalToConstant: 60).isActive = true; avatar.heightAnchor.constraint(equalToConstant: 60).isActive = true
        let header = UIStackView(arrangedSubviews: [copy, avatar]); header.axis = .horizontal; header.alignment = .center; header.distribution = .equalSpacing
        contentStack.addArrangedSubview(header)
        let searchContainer = UIView(); searchContainer.translatesAutoresizingMaskIntoConstraints = false; searchContainer.heightAnchor.constraint(equalToConstant: 60).isActive = true
        let search = UITextField(); search.borderStyle = .roundedRect; search.accessibilityLabel = "Search"; search.translatesAutoresizingMaskIntoConstraints = false
        let searchArtwork = UIImageView(image: UIImage(named: "${searchAssetName}", in: Bundle.module, compatibleWith: nil)); searchArtwork.contentMode = .scaleAspectFit; searchArtwork.isUserInteractionEnabled = false; searchArtwork.translatesAutoresizingMaskIntoConstraints = false
        let filterButton = UIButton(type: .custom); filterButton.setImage(UIImage(named: "${filterAssetName}", in: Bundle.module, compatibleWith: nil), for: .normal); filterButton.accessibilityLabel = "Filter"; filterButton.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(search); searchContainer.addSubview(searchArtwork); searchContainer.addSubview(filterButton)
        NSLayoutConstraint.activate([search.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor), search.topAnchor.constraint(equalTo: searchContainer.topAnchor), search.widthAnchor.constraint(equalToConstant: 319), search.heightAnchor.constraint(equalToConstant: 60), searchArtwork.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 20), searchArtwork.topAnchor.constraint(equalTo: searchContainer.topAnchor, constant: 18), searchArtwork.widthAnchor.constraint(equalToConstant: 104), searchArtwork.heightAnchor.constraint(equalToConstant: 24), filterButton.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 332), filterButton.topAnchor.constraint(equalTo: searchContainer.topAnchor), filterButton.widthAnchor.constraint(equalToConstant: 60), filterButton.heightAnchor.constraint(equalToConstant: 60)])
        contentStack.addArrangedSubview(searchContainer)
        let categories = UIStackView(); categories.axis = .horizontal; categories.spacing = 12; categories.distribution = .fillEqually
        ["All", "Combos", "Sliders", "Classic"].forEach { title in let button = UIButton(type: .system); button.setTitle(title, for: .normal); button.setTitleColor(UIColor(openPencilHex: "#3c2f2f"), for: .normal); button.backgroundColor = UIColor(openPencilHex: "#f5f5f5"); button.layer.cornerRadius = 18; categories.addArrangedSubview(button) }
        categories.heightAnchor.constraint(equalToConstant: 50).isActive = true; contentStack.addArrangedSubview(categories)
        productGrid.axis = .vertical; productGrid.spacing = 16; productGrid.distribution = .fillEqually; contentStack.addArrangedSubview(productGrid)
${rows.join('\n')}
        NSLayoutConstraint.activate([scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor), scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor), contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor), contentStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor), contentStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor), contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor), contentStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor)])
        let tabBar = UIStackView(); tabBar.axis = .horizontal; tabBar.spacing = 8; tabBar.distribution = .fillEqually; tabBar.backgroundColor = UIColor(openPencilHex: "#ef2a39"); tabBar.translatesAutoresizingMaskIntoConstraints = false
        [(${tabAssetNames.map((name, index) => `"${name}", "${['Home', 'User', 'Support', 'Favorites'][index]}"`).join('), (')})].enumerated().forEach { index, item in let button = UIButton(type: .system); if let icon = UIImage(named: item.0, in: Bundle.module, compatibleWith: nil) { button.setImage(icon, for: .normal) } else { button.setTitle(item.1, for: .normal) }; button.tintColor = .white; button.accessibilityLabel = item.1; if index == 0 { button.addAction(UIAction { [weak self] _ in self?.viewModel.send(.appeared) }, for: .touchUpInside) }; if index == 1 { button.addAction(UIAction { [weak self] _ in ${profileAction} }, for: .touchUpInside) }; if index == 2 { button.addAction(UIAction { [weak self] _ in ${supportAction} }, for: .touchUpInside) }; tabBar.addArrangedSubview(button) }
        view.addSubview(tabBar); NSLayoutConstraint.activate([tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor), tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor), tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor), tabBar.heightAnchor.constraint(equalToConstant: 90), scrollView.bottomAnchor.constraint(equalTo: tabBar.topAnchor)])
    }
    private func makeProductCard(title: String, rating: String, imageName: String, index: Int, imageX: CGFloat, imageY: CGFloat, imageWidth: CGFloat, imageHeight: CGFloat, titleX: CGFloat, titleY: CGFloat, titleWidth: CGFloat, titleHeight: CGFloat, ratingX: CGFloat, ratingY: CGFloat, ratingWidth: CGFloat, ratingHeight: CGFloat) -> UIButton {
        let button = UIButton(type: .system); button.backgroundColor = .white; button.layer.cornerRadius = 20; button.layer.shadowColor = UIColor.black.cgColor; button.layer.shadowOpacity = 0.13; button.layer.shadowRadius = 17; button.layer.shadowOffset = CGSize(width: 0, height: 6); button.translatesAutoresizingMaskIntoConstraints = false; button.widthAnchor.constraint(equalToConstant: 185).isActive = true; button.heightAnchor.constraint(equalToConstant: 225).isActive = true
        let cardImageView = UIImageView(image: UIImage(named: imageName, in: Bundle.module, compatibleWith: nil)); cardImageView.contentMode = .scaleAspectFit; cardImageView.translatesAutoresizingMaskIntoConstraints = false
        let cardTitleLabel = UILabel(); cardTitleLabel.text = title; cardTitleLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium); cardTitleLabel.textColor = UIColor(openPencilHex: "#3c2f2f"); cardTitleLabel.numberOfLines = 2; cardTitleLabel.lineBreakMode = .byWordWrapping; cardTitleLabel.allowsDefaultTighteningForTruncation = true; cardTitleLabel.adjustsFontSizeToFitWidth = true; cardTitleLabel.minimumScaleFactor = 0.75; cardTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        let starImageView = UIImageView(image: UIImage(named: "star", in: Bundle.module, compatibleWith: nil)); starImageView.contentMode = .scaleAspectFit; starImageView.translatesAutoresizingMaskIntoConstraints = false
        let ratingLabel = UILabel(); ratingLabel.text = rating; ratingLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium); ratingLabel.adjustsFontSizeToFitWidth = true; ratingLabel.minimumScaleFactor = 0.85; ratingLabel.textColor = UIColor(openPencilHex: "#3c2f2f"); ratingLabel.translatesAutoresizingMaskIntoConstraints = false
        let ratingStack = UIStackView(arrangedSubviews: [starImageView, ratingLabel]); ratingStack.axis = .horizontal; ratingStack.spacing = 5; ratingStack.alignment = .center; ratingStack.translatesAutoresizingMaskIntoConstraints = false
        button.addSubview(cardImageView); button.addSubview(cardTitleLabel); button.addSubview(ratingStack); button.accessibilityLabel = title; button.accessibilityValue = "★  \\(rating)"
        NSLayoutConstraint.activate([cardImageView.leadingAnchor.constraint(equalTo: button.leadingAnchor, constant: imageX), cardImageView.topAnchor.constraint(equalTo: button.topAnchor, constant: imageY), cardImageView.widthAnchor.constraint(equalToConstant: imageWidth), cardImageView.heightAnchor.constraint(equalToConstant: imageHeight), cardTitleLabel.leadingAnchor.constraint(equalTo: button.leadingAnchor, constant: titleX), cardTitleLabel.topAnchor.constraint(equalTo: button.topAnchor, constant: titleY), cardTitleLabel.widthAnchor.constraint(equalToConstant: titleWidth), cardTitleLabel.heightAnchor.constraint(equalToConstant: titleHeight), ratingStack.leadingAnchor.constraint(equalTo: button.leadingAnchor, constant: ratingX), ratingStack.topAnchor.constraint(equalTo: button.topAnchor, constant: ratingY), ratingStack.widthAnchor.constraint(equalToConstant: ratingWidth), ratingStack.heightAnchor.constraint(equalToConstant: ratingHeight), starImageView.widthAnchor.constraint(equalToConstant: 16), starImageView.heightAnchor.constraint(equalToConstant: 16), ratingLabel.widthAnchor.constraint(equalToConstant: 23)])
        let actions: [(Int, (UIAction) -> Void)] = [${productActions.map((action, index) => `(${index}, { [weak self] _ in ${action} })`).join(', ')}]; if let action = actions.first(where: { $0.0 == index })?.1 { button.addAction(UIAction(handler: action), for: .touchUpInside) }
        return button
    }
}

public final class ${typeName}ProductViewController: UIViewController {
    private let productIndex: Int
    private let coordinator: any ${typeName}Coordinator
    public init(productIndex: Int = 1, coordinator: any ${typeName}Coordinator) { self.productIndex = productIndex; self.coordinator = coordinator; super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    public override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .white
        let scroll = UIScrollView(); scroll.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(scroll)
        let content = UIStackView(); content.axis = .vertical; content.spacing = 0; content.translatesAutoresizingMaskIntoConstraints = false; content.isLayoutMarginsRelativeArrangement = true; content.layoutMargins = UIEdgeInsets(top: 0, left: 19, bottom: 24, right: 19); scroll.addSubview(content)
        let header = UIStackView(); header.axis = .horizontal; header.translatesAutoresizingMaskIntoConstraints = false; let back = UIButton(type: .system); back.setImage(UIImage(systemName: "chevron.left"), for: .normal); back.accessibilityLabel = "Back"; back.addAction(UIAction { [weak self] _ in self?.navigationController?.popViewController(animated: true) }, for: .touchUpInside); let search = UIButton(type: .system); search.setImage(UIImage(systemName: "magnifyingglass"), for: .normal); search.accessibilityLabel = "Search"; header.addArrangedSubview(back); header.addArrangedSubview(UIView()); header.addArrangedSubview(search); view.addSubview(header)
        let detailData: [(imageName: String, title: String, rating: String, description: String, price: String)] = [${detailData}]
        let detail = detailData[max(0, min(productIndex - 1, detailData.count - 1))]
        let topSpacer = UIView(); topSpacer.heightAnchor.constraint(equalToConstant: 36).isActive = true; content.addArrangedSubview(topSpacer)
        let imageView = UIImageView(image: UIImage(named: detail.imageName, in: Bundle.module, compatibleWith: nil)); imageView.contentMode = .scaleAspectFit; imageView.translatesAutoresizingMaskIntoConstraints = false; imageView.widthAnchor.constraint(equalToConstant: 350).isActive = true; imageView.heightAnchor.constraint(equalToConstant: 355).isActive = true; content.addArrangedSubview(imageView)
        let titleGap = UIView(); titleGap.heightAnchor.constraint(equalToConstant: 51).isActive = true; content.addArrangedSubview(titleGap); let title = UILabel(); title.text = detail.title; title.font = UIFont.systemFont(ofSize: 24, weight: .bold); title.textColor = UIColor(openPencilHex: "#3c2f2f"); title.numberOfLines = 0; content.addArrangedSubview(title)
        let ratingGap = UIView(); ratingGap.heightAnchor.constraint(equalToConstant: 9).isActive = true; content.addArrangedSubview(ratingGap); let ratingRow = UIStackView(); ratingRow.axis = .horizontal; ratingRow.spacing = 5; let star = UIImageView(image: UIImage(named: "${detailStarAssetName}", in: Bundle.module, compatibleWith: nil)); star.contentMode = .scaleAspectFit; star.widthAnchor.constraint(equalToConstant: 16).isActive = true; star.heightAnchor.constraint(equalToConstant: 16).isActive = true; let rating = UILabel(); rating.text = "\\(detail.rating)     26 mins"; rating.textColor = UIColor(openPencilHex: "#6a6a6a"); ratingRow.addArrangedSubview(star); ratingRow.addArrangedSubview(rating); content.addArrangedSubview(ratingRow)
        let descriptionGap = UIView(); descriptionGap.heightAnchor.constraint(equalToConstant: 19).isActive = true; content.addArrangedSubview(descriptionGap); let description = UILabel(); description.text = detail.description; description.numberOfLines = 0; description.textColor = UIColor(openPencilHex: "#6a6a6a"); content.addArrangedSubview(description)
        let controlsGap = UIView(); controlsGap.heightAnchor.constraint(equalToConstant: 29).isActive = true; content.addArrangedSubview(controlsGap)
        let controls = UIStackView(); controls.axis = .horizontal; controls.spacing = 18; let spicy = UIStackView(); spicy.axis = .vertical; spicy.spacing = 8; spicy.widthAnchor.constraint(equalToConstant: 168).isActive = true; let spicyTitle = UILabel(); spicyTitle.text = "Spicy"; let spicySlider = UISlider(); spicySlider.value = 0.6; let mild = UILabel(); mild.text = "Mild"; let hot = UILabel(); hot.text = "Hot"; let spicyRange = UIStackView(arrangedSubviews: [mild, UIView(), hot]); spicyRange.axis = .horizontal; spicy.addArrangedSubview(spicyTitle); spicy.addArrangedSubview(spicySlider); spicy.addArrangedSubview(spicyRange); let portion = UIStackView(); portion.axis = .vertical; portion.spacing = 8; portion.widthAnchor.constraint(equalToConstant: 121).isActive = true; let portionTitle = UILabel(); portionTitle.text = "Portion"; let ratio = UIStackView(); ratio.axis = .horizontal; ratio.spacing = 12; let minus = UIButton(type: .system); minus.setTitle("−", for: .normal); let quantity = UILabel(); quantity.text = "2"; let plus = UIButton(type: .system); plus.setTitle("+", for: .normal); ratio.addArrangedSubview(minus); ratio.addArrangedSubview(quantity); ratio.addArrangedSubview(plus); portion.addArrangedSubview(portionTitle); portion.addArrangedSubview(ratio); controls.addArrangedSubview(spicy); controls.addArrangedSubview(portion); content.addArrangedSubview(controls)
        let footerGap = UIView(); footerGap.heightAnchor.constraint(equalToConstant: 73).isActive = true; content.addArrangedSubview(footerGap)
        let footer = UIStackView(); footer.axis = .horizontal; footer.spacing = 16; let price = UILabel(); price.text = detail.price; price.font = UIFont.systemFont(ofSize: 26, weight: .bold); price.widthAnchor.constraint(equalToConstant: 104).isActive = true; let checkout = UIButton(type: .system); checkout.setTitle("ORDER NOW", for: .normal); checkout.backgroundColor = UIColor(openPencilHex: "#ef2a39"); checkout.setTitleColor(.white, for: .normal); checkout.layer.cornerRadius = 22; checkout.heightAnchor.constraint(equalToConstant: 70).isActive = true; checkout.widthAnchor.constraint(equalToConstant: 239).isActive = true; checkout.addAction(UIAction { [weak self] _ in guard let self else { return }; switch productIndex { ${checkoutActions} } }, for: .touchUpInside); footer.addArrangedSubview(price); footer.addArrangedSubview(checkout); content.addArrangedSubview(footer)
        NSLayoutConstraint.activate([header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 22), header.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12), header.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -19), header.heightAnchor.constraint(equalToConstant: 28), scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor), scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor), content.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor), content.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor), content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor), content.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor)])
    }
}

public final class ${typeName}PaymentViewController: UIViewController {
    private let coordinator: any ${typeName}Coordinator
    public init(coordinator: any ${typeName}Coordinator) { self.coordinator = coordinator; super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    public override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .white
        let scroll = UIScrollView(); scroll.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(scroll)
        let stack = UIStackView(); stack.axis = .vertical; stack.spacing = 0; stack.translatesAutoresizingMaskIntoConstraints = false; stack.isLayoutMarginsRelativeArrangement = true; stack.layoutMargins = UIEdgeInsets(top: 0, left: 19, bottom: 24, right: 19); scroll.addSubview(stack)
        let header = UIStackView(); header.axis = .horizontal; header.translatesAutoresizingMaskIntoConstraints = false; let back = UIButton(type: .system); back.setImage(UIImage(systemName: "chevron.left"), for: .normal); back.accessibilityLabel = "Back"; back.addAction(UIAction { [weak self] _ in self?.navigationController?.popViewController(animated: true) }, for: .touchUpInside); let search = UIButton(type: .system); search.setImage(UIImage(systemName: "magnifyingglass"), for: .normal); search.accessibilityLabel = "Search"; header.addArrangedSubview(back); header.addArrangedSubview(UIView()); header.addArrangedSubview(search); view.addSubview(header)
        let summaryTop = UIView(); summaryTop.heightAnchor.constraint(equalToConstant: 81).isActive = true; stack.addArrangedSubview(summaryTop); let summaryTitle = UILabel(); summaryTitle.text = "Order summary"; summaryTitle.font = UIFont.systemFont(ofSize: 24, weight: .bold); stack.addArrangedSubview(summaryTitle)
        func paymentRow(_ labelText: String, _ valueText: String) -> UIStackView { let row = UIStackView(); row.axis = .horizontal; row.alignment = .center; let label = UILabel(); label.text = labelText; label.font = UIFont.systemFont(ofSize: 16); let value = UILabel(); value.text = valueText; value.font = UIFont.systemFont(ofSize: 16); row.addArrangedSubview(label); row.addArrangedSubview(UIView()); row.addArrangedSubview(value); return row }
        func gap(_ height: CGFloat) -> UIView { let view = UIView(); view.heightAnchor.constraint(equalToConstant: height).isActive = true; return view }
        stack.addArrangedSubview(gap(20)); stack.addArrangedSubview(paymentRow("Order", "$16.48")); stack.addArrangedSubview(gap(16)); stack.addArrangedSubview(paymentRow("Taxes", "$0.3")); stack.addArrangedSubview(gap(16)); stack.addArrangedSubview(paymentRow("Delivery fees", "$1.5")); stack.addArrangedSubview(gap(34)); stack.addArrangedSubview(paymentRow("Total:", "$18.19")); stack.addArrangedSubview(gap(26)); stack.addArrangedSubview(paymentRow("Estimated delivery time:", "15 - 30mins")); stack.addArrangedSubview(gap(67)); let methods = UILabel(); methods.text = "Payment methods"; methods.font = UIFont.systemFont(ofSize: 24, weight: .bold); stack.addArrangedSubview(methods); stack.addArrangedSubview(gap(22))
        let card = UIStackView(); card.axis = .vertical; card.spacing = 12; card.isLayoutMarginsRelativeArrangement = true; card.layoutMargins = UIEdgeInsets(top: 14, left: 14, bottom: 14, right: 14); card.backgroundColor = UIColor(openPencilHex: "#f5f5f5"); card.layer.cornerRadius = 16
        let credit = UIStackView(); credit.axis = .horizontal; let creditText = UIStackView(); creditText.axis = .vertical; let creditTitle = UILabel(); creditTitle.text = "Credit card"; creditTitle.font = UIFont.systemFont(ofSize: 17, weight: .semibold); let creditNumber = UILabel(); creditNumber.text = "5105 **** **** 0505"; creditNumber.textColor = UIColor(openPencilHex: "#6a6a6a"); creditText.addArrangedSubview(creditTitle); creditText.addArrangedSubview(creditNumber); let creditMark = UIImageView(image: UIImage(systemName: "checkmark.circle.fill")); creditMark.tintColor = UIColor(openPencilHex: "#ef2a39"); credit.addArrangedSubview(creditText); credit.addArrangedSubview(UIView()); credit.addArrangedSubview(creditMark)
        let debit = UIStackView(); debit.axis = .horizontal; let debitText = UIStackView(); debitText.axis = .vertical; let debitTitle = UILabel(); debitTitle.text = "Debit card"; debitTitle.font = UIFont.systemFont(ofSize: 17, weight: .semibold); let debitNumber = UILabel(); debitNumber.text = "3566 **** **** 0505"; debitNumber.textColor = UIColor(openPencilHex: "#6a6a6a"); debitText.addArrangedSubview(debitTitle); debitText.addArrangedSubview(debitNumber); let debitMark = UIImageView(image: UIImage(systemName: "circle")); debitMark.tintColor = UIColor(openPencilHex: "#b0b0b0"); debit.addArrangedSubview(debitText); debit.addArrangedSubview(UIView()); debit.addArrangedSubview(debitMark)
        card.addArrangedSubview(credit); card.addArrangedSubview(debit); stack.addArrangedSubview(card); stack.addArrangedSubview(gap(41))
        let save = UILabel(); save.text = "☑  Save card details for future payments"; save.textColor = UIColor(openPencilHex: "#6a6a6a"); stack.addArrangedSubview(save); stack.addArrangedSubview(gap(141))
        let footer = UIStackView(); footer.axis = .horizontal; footer.spacing = 0; let total = UIStackView(); total.axis = .vertical; let totalTitle = UILabel(); totalTitle.text = "Total price"; let totalValue = UILabel(); totalValue.text = "$18.19"; totalValue.font = UIFont.systemFont(ofSize: 22, weight: .bold); total.addArrangedSubview(totalTitle); total.addArrangedSubview(totalValue); let submit = UIButton(type: .system); submit.setTitle("PAY NOW", for: .normal); submit.backgroundColor = UIColor(openPencilHex: "#ef2a39"); submit.setTitleColor(.white, for: .normal); submit.layer.cornerRadius = 22; submit.heightAnchor.constraint(equalToConstant: 70).isActive = true; submit.widthAnchor.constraint(equalToConstant: 209).isActive = true; submit.addAction(UIAction { [weak self] _ in guard let self else { return }; self.coordinator.navigate(to: .${submitDestination}, transition: .${submitTransitionName}) }, for: .touchUpInside); footer.addArrangedSubview(total); footer.addArrangedSubview(UIView()); footer.addArrangedSubview(submit); stack.addArrangedSubview(footer)
        NSLayoutConstraint.activate([header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 22), header.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12), header.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -19), header.heightAnchor.constraint(equalToConstant: 28), scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor), scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor), stack.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor), stack.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor), stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor), stack.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor)])
    }
}

public final class ${typeName}OrderConfirmationViewController: UIViewController {
    private let coordinator: any ${typeName}Coordinator
    public init(coordinator: any ${typeName}Coordinator) { self.coordinator = coordinator; super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    public override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = UIColor(white: 0, alpha: 0.18)
        let card = UIStackView(); card.axis = .vertical; card.alignment = .center; card.spacing = 18; card.translatesAutoresizingMaskIntoConstraints = false; card.isLayoutMarginsRelativeArrangement = true; card.layoutMargins = UIEdgeInsets(top: 26, left: 24, bottom: 24, right: 24); card.backgroundColor = .white; card.layer.cornerRadius = 24
        let icon = UIImageView(image: UIImage(systemName: "checkmark.circle.fill")); icon.tintColor = UIColor(openPencilHex: "#ef2a39"); icon.widthAnchor.constraint(equalToConstant: 90).isActive = true; icon.heightAnchor.constraint(equalToConstant: 90).isActive = true
        let title = UILabel(); title.text = "Success !"; title.font = UIFont.systemFont(ofSize: 30, weight: .bold)
        let message = UILabel(); message.text = "Your payment was successful. A receipt for this purchase has been sent to your email."; message.textAlignment = .center; message.numberOfLines = 0; message.textColor = UIColor(openPencilHex: "#6a6a6a")
        let back = UIButton(type: .system); back.setTitle("GO BACK", for: .normal); back.backgroundColor = UIColor(openPencilHex: "#ef2a39"); back.setTitleColor(.white, for: .normal); back.layer.cornerRadius = 22; back.heightAnchor.constraint(equalToConstant: 60).isActive = true; back.widthAnchor.constraint(equalToConstant: 220).isActive = true; back.addAction(UIAction { [weak self] _ in self?.coordinator.navigate(to: .home, transition: .popUpMessageToHomeTapOk) }, for: .touchUpInside)
        card.addArrangedSubview(icon); card.addArrangedSubview(title); card.addArrangedSubview(message); card.addArrangedSubview(back); view.addSubview(card)
        NSLayoutConstraint.activate([card.centerXAnchor.constraint(equalTo: view.centerXAnchor), card.centerYAnchor.constraint(equalTo: view.centerYAnchor), card.widthAnchor.constraint(equalToConstant: 340), card.heightAnchor.constraint(equalToConstant: 400)])
    }
}

@MainActor public final class ${typeName}ViewModel {
    public private(set) var state: ${typeName}LoadState = .idle
    private let dependencies: ${typeName}Dependencies
    public init(dependencies: ${typeName}Dependencies) { self.dependencies = dependencies }
    public func send(_ event: ${typeName}Event) { switch event { case .appeared, .retry: state = .loading${eventCases} } }
}

private extension UIColor {
    convenience init(openPencilHex hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")); var number: UInt64 = 0; Scanner(string: value).scanHexInt64(&number); let hasAlpha = value.count == 8
        self.init(red: CGFloat((number >> (hasAlpha ? 24 : 16)) & 0xff) / 255, green: CGFloat((number >> (hasAlpha ? 16 : 8)) & 0xff) / 255, blue: CGFloat((number >> (hasAlpha ? 8 : 0)) & 0xff) / 255, alpha: hasAlpha ? CGFloat(number & 0xff) / 255 : 1)
    }
}
`;
  return { files: [{ path: `${typeName}ViewController.swift`, contents }], diagnostics: [] };
}
