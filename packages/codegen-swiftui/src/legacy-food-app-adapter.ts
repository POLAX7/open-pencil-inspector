import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftCaseName } from '../../codegen-core/src/contracts.ts';

function swiftStringLiteral(value: string): string {
  return JSON.stringify(value);
}

interface FoodAppImageAsset {
  name: string;
  title: string;
  titleX: number;
  titleY: number;
  titleWidth: number;
  titleHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rating: string;
  ratingX: number;
  ratingY: number;
  ratingWidth: number;
  ratingHeight: number;
}

interface FoodAppDetail {
  title: string;
  description: string;
  price: string;
  image: string;
}

function foodAppDetails(input: CodegenInput, fallbackImages: FoodAppImageAsset[]): FoodAppDetail[] {
  const fallbackDescription = "The Cheeseburger Wendy's Burger is a classic fast food burger that packs a punch of flavor in every bite. Made with a juicy beef patty cooked to perfection, it's topped with melted American cheese, crispy lettuce, ripe tomato, and crunchy pickles.";
  return [1, 2, 3, 4].map((index) => {
    const root = input.design.nodes.find((node) => node.name.toLowerCase() === `product ${index}`);
    const title = root?.children.find((node) => node.type === 'TEXT' && /burger/i.test(node.text?.content ?? '') && (node.text?.content.length ?? 0) < 100)?.text?.content ?? fallbackImages[index - 1]?.title ?? `Product ${index}`;
    const description = root?.children.find((node) => node.type === 'TEXT' && (node.text?.content.length ?? 0) > 100)?.text?.content ?? fallbackDescription;
    const price = root?.children.find((node) => node.type === 'TEXT' && /^\$\d/.test(node.text?.content ?? ''))?.text?.content ?? (index === 1 ? '$8.24' : '$16.49');
    const imageNode = root?.children.find((node) => /^image\b/i.test(node.name) || node.type === 'IMAGE' || node.type === 'ROUNDED_RECTANGLE');
    const image = input.assetBindings?.find((binding) => binding.sourceNodeId === imageNode?.id)?.resourceName ?? fallbackImages[index - 1]?.name ?? `product${index}`;
    return { title, description, price, image };
  });
}

function foodAppImageAssets(input: CodegenInput): FoodAppImageAsset[] {
  const assets: FoodAppImageAsset[] = [];
  const walk = (nodes: typeof input.design.nodes) => {
    for (const node of nodes) {
      const titleNode = node.children.find((child) => child.type === 'TEXT' && /burger/i.test(child.text?.content ?? ''));
      const hasProductTitle = Boolean(titleNode);
      const imageNode = node.children.find((child) => child.type === 'IMAGE' || /^image(?:\s|$)/i.test(child.name));
      if (hasProductTitle && imageNode) {
        const ratingNode = node.children.find((child) => child.name === 'Group 9');
        const ratingText = ratingNode?.children.find((child) => child.type === 'TEXT');
        assets.push({
          name: input.assetBindings?.find((binding) => binding.sourceNodeId === imageNode.id)?.resourceName ?? `product${assets.length + 1}`,
          title: titleNode?.text?.content ?? node.name,
          titleX: titleNode?.layout?.x ?? 11,
          titleY: titleNode?.layout?.y ?? 136,
          titleWidth: titleNode?.layout?.width ?? 117,
          titleHeight: titleNode?.layout?.height ?? 44,
          x: imageNode.layout?.x ?? 12,
          y: imageNode.layout?.y ?? 12,
          width: imageNode.layout?.width ?? 120,
          height: imageNode.layout?.height ?? 120,
          rating: ratingText?.text?.content ?? '4.9',
          ratingX: ratingNode?.layout?.x ?? 11,
          ratingY: ratingNode?.layout?.y ?? 189,
          ratingWidth: ratingNode?.layout?.width ?? 44,
          ratingHeight: ratingNode?.layout?.height ?? 22,
        });
      }
      walk(node.children);
    }
  };
  walk(input.design.nodes);
  const detected = assets.slice(0, 4);
  const fallbackFrames = [
    { x: 32, y: 5, width: 120, height: 122 },
    { x: 32, y: 11, width: 120, height: 120 },
    { x: 20, y: 0, width: 150, height: 138 },
    { x: 30, y: 25, width: 145, height: 101 },
  ];
  return [1, 2, 3, 4].map((index) => {
    const frame = fallbackFrames[index - 1];
    return detected[index - 1] ?? { title: `Product ${index}`, titleX: 11, titleY: 136, titleWidth: index === 4 ? 158 : 117, titleHeight: 44, name: `product${index}`, ...frame, rating: '4.9', ratingX: 11, ratingY: 189, ratingWidth: 44, ratingHeight: 22 };
  });
}

function findDesignNode(nodes: typeof inputDesignNodes, predicate: (node: typeof inputDesignNodes[number]) => boolean): typeof inputDesignNodes[number] | undefined {
  for (const node of nodes) {
    if (predicate(node)) return node;
    const child = findDesignNode(node.children, predicate);
    if (child) return child;
  }
  return undefined;
}

type inputDesignNodes = CodegenInput['design']['nodes'];

export function generateFoodAppNativeSwiftUIView(input: CodegenInput, typeName: string): CodegenResult {
  const [product1Image, product2Image, product3Image, product4Image] = foodAppImageAssets(input);
  const [product1Detail, product2Detail, product3Detail, product4Detail] = foodAppDetails(input, [product1Image, product2Image, product3Image, product4Image]);
  const searchGroup = findDesignNode(input.design.nodes, (node) => node.name === 'Group 1' && node.layout?.width === 104 && node.layout?.height === 24);
  const filterGroup = findDesignNode(input.design.nodes, (node) => node.name === 'Group 2' && node.layout?.width === 60 && node.layout?.height === 60);
  const avatarGroup = findDesignNode(input.design.nodes, (node) => node.name === 'Mask group' && node.layout?.width === 60 && node.layout?.height === 60);
  const assetName = (node: typeof searchGroup, fallback: string) => input.assetBindings?.find((binding) => binding.sourceNodeId === node?.id)?.resourceName ?? fallback;
  const searchAssetName = assetName(searchGroup, 'group-1');
  const filterAssetName = assetName(filterGroup, 'group-2');
  const avatarAssetName = assetName(avatarGroup, 'mask-group');
  const starAssetName = assetName(findDesignNode(input.design.nodes, (node) => node.name === 'star'), 'star');
  const productTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'product-1');
  const paymentTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'payment');
  const profileTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'user-profile');
  const supportTransition = input.flow.transitions.find((transition) => transition.from === 'home' && transition.to === 'customer-support');
  const checkoutTransition = input.flow.transitions.find((transition) => transition.from === 'product-1' && transition.to === 'payment');
  const submitTransition = input.flow.transitions.find((transition) => transition.from === 'payment' && (transition.to === 'order-confirmation' || transition.to === 'pop-up-message'));
  const confirmationTransition = input.flow.transitions.find((transition) => (transition.from === 'order-confirmation' || transition.from === 'pop-up-message') && transition.to === 'home');
  const submitRoute = swiftCaseName(submitTransition?.to ?? 'order-confirmation', 'orderConfirmation');
  const navigate = (transition: typeof input.flow.transitions[number] | undefined, fallbackRoute: string, fallbackTransition: string) => transition
    ? `coordinator.navigate(to: .${swiftCaseName(transition.to, fallbackRoute)}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, fallbackTransition)})`
    : `coordinator.navigate(to: .${fallbackRoute}, transition: .${fallbackTransition})`;
  const productAction = productTransition ? navigate(productTransition, 'product1', 'transition1') : 'viewModel.send(.appeared)';
  const paymentAction = paymentTransition ? navigate(paymentTransition, 'payment', 'transitionPayment') : 'viewModel.send(.appeared)';
  const profileAction = profileTransition ? navigate(profileTransition, 'userProfile', 'transitionProfile') : 'viewModel.send(.appeared)';
  const supportAction = supportTransition ? navigate(supportTransition, 'customerSupport', 'transitionSupport') : 'viewModel.send(.appeared)';
  const checkoutAction = navigate(checkoutTransition, 'payment', 'product1ToPaymentTapCheckout');
  const submitAction = navigate(submitTransition, submitRoute, 'paymentToOrderConfirmationSubmit');
  const confirmationAction = navigate(confirmationTransition, 'home', 'orderConfirmationToHomeTapOk');
  const eventCases = [...new Set(input.flow.transitions.map((transition) => swiftCaseName(transition.event, 'transition')))]
    .map((event) => `; case .${event}: state = .loaded`).join('');
  const contents = `// Generated by open-pencil-inspector. Native SwiftUI layout from FoodApp.fig.
import SwiftUI
import UIKit

public enum ${typeName}NavigationMode { case standalone, embedded }

public struct ${typeName}View: View {
    @StateObject private var viewModel: ${typeName}ViewModel
    @State private var navigationPath: [${typeName}Route] = []
    @State private var isConfirmationPresented = false
    private let navigationMode: ${typeName}NavigationMode
    private let coordinator: any ${typeName}Coordinator
    private let onSubmitToRoot: (() -> Void)?

    public init(viewModel: ${typeName}ViewModel, coordinator: any ${typeName}Coordinator = ${typeName}NoOpCoordinator(), navigationMode: ${typeName}NavigationMode = .standalone, onSubmitToRoot: (() -> Void)? = nil) { _viewModel = StateObject(wrappedValue: viewModel); self.coordinator = coordinator; self.navigationMode = navigationMode; self.onSubmitToRoot = onSubmitToRoot }
    public var body: some View {
        ZStack {
            Group {
                switch navigationMode {
                case .standalone:
                    NavigationStack(path: $navigationPath) { navigationContent }
                case .embedded:
                    navigationContent
                }
            }
            if isConfirmationPresented {
                ${typeName}OrderConfirmationView(navigationPath: $navigationPath, coordinator: coordinator) { isConfirmationPresented = false; onSubmitToRoot?(); ${confirmationAction} }
                    .zIndex(1)
            }
        }
        .task { viewModel.send(.appeared) }
    }
    private var navigationContent: some View {
        Group {
            Group {
                switch viewModel.state {
                case .idle, .loading: ProgressView()
                case .loaded: home
                case .empty: ContentUnavailableView("No content", systemImage: "tray")
                case .failed(let message): VStack { Text(message); Button("Retry") { viewModel.send(.retry) } }
                }
            }
        }
        .navigationDestination(for: ${typeName}Route.self) { route in
            switch route {
            case .product1: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product1Detail.title)}, image: "${product1Detail.image}", rating: "${product1Image.rating}", description: ${swiftStringLiteral(product1Detail.description)}, price: "${product1Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })
            case .product2: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product2Detail.title)}, image: "${product2Detail.image}", rating: "${product2Image.rating}", description: ${swiftStringLiteral(product2Detail.description)}, price: "${product2Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })
            case .product3: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product3Detail.title)}, image: "${product3Detail.image}", rating: "${product3Image.rating}", description: ${swiftStringLiteral(product3Detail.description)}, price: "${product3Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })
            case .product4: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product4Detail.title)}, image: "${product4Detail.image}", rating: "${product4Image.rating}", description: ${swiftStringLiteral(product4Detail.description)}, price: "${product4Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })
            case .payment: ${typeName}PaymentView(navigationPath: $navigationPath, coordinator: coordinator, navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })
            case .${submitRoute}: ${typeName}OrderConfirmationView(navigationPath: $navigationPath, coordinator: coordinator) { isConfirmationPresented = false; ${confirmationAction} }
            case .userProfile: ${typeName}PlaceholderView(title: "User profile")
            case .customerSupport: ${typeName}PlaceholderView(title: "Customer support")
            default: Text("Screen: \\(String(describing: route))")
            }
        }
    }
    private var home: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack { VStack(alignment: .leading, spacing: 2) { Text("Foodgo").font(.system(size: 40, weight: .bold)).foregroundStyle(Color(hex: "#3c2f2f")); Text("Order your favourite food!").font(.headline).foregroundStyle(Color(hex: "#6a6a6a")) }; Spacer(); if let avatarImage = UIImage(named: "${avatarAssetName}", in: Bundle.module, compatibleWith: nil) { Image(uiImage: avatarImage).resizable().scaledToFill().frame(width: 60, height: 60).clipShape(RoundedRectangle(cornerRadius: 20)).accessibilityLabel("Profile") } else { Circle().fill(Color(hex: "#d9d9d9")).frame(width: 60, height: 60) } }
                ZStack(alignment: .topLeading) { TextField("", text: .constant("")).textFieldStyle(.roundedBorder).frame(width: 319, height: 60); if let searchImage = UIImage(named: "${searchAssetName}", in: Bundle.module, compatibleWith: nil) { Image(uiImage: searchImage).resizable().scaledToFit().frame(width: 104, height: 24).position(x: 72, y: 30) }; Button {} label: { if let filterImage = UIImage(named: "${filterAssetName}", in: Bundle.module, compatibleWith: nil) { Image(uiImage: filterImage).resizable().scaledToFit() } }.buttonStyle(.plain).accessibilityLabel("Filter").frame(width: 60, height: 60).position(x: 362, y: 30) }.frame(width: 392, height: 60, alignment: .topLeading)
                HStack(spacing: 12) { ForEach(["All", "Combos", "Sliders", "Classic"], id: \\.self) { Text($0).frame(maxWidth: .infinity).padding(.vertical, 14).background(Color(hex: "#f5f5f5")).clipShape(Capsule()) } }
                LazyVGrid(columns: [GridItem(.fixed(185)), GridItem(.fixed(185))], spacing: 22) {
                    NavigationLink(destination: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product1Detail.title)}, image: "${product1Detail.image}", rating: "${product1Image.rating}", description: ${swiftStringLiteral(product1Detail.description)}, price: "${product1Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })) { productCard(title: ${swiftStringLiteral(product1Image.title)}, titleX: ${product1Image.titleX}, titleY: ${product1Image.titleY}, titleWidth: ${product1Image.titleWidth}, titleHeight: ${product1Image.titleHeight}, image: "${product1Image.name}", imageX: ${product1Image.x}, imageY: ${product1Image.y}, imageWidth: ${product1Image.width}, imageHeight: ${product1Image.height}, rating: "${product1Image.rating}", ratingX: ${product1Image.ratingX}, ratingY: ${product1Image.ratingY}, ratingWidth: ${product1Image.ratingWidth}, ratingHeight: ${product1Image.ratingHeight}) }
                    NavigationLink(destination: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product2Detail.title)}, image: "${product2Detail.image}", rating: "${product2Image.rating}", description: ${swiftStringLiteral(product2Detail.description)}, price: "${product2Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })) { productCard(title: ${swiftStringLiteral(product2Image.title)}, titleX: ${product2Image.titleX}, titleY: ${product2Image.titleY}, titleWidth: ${product2Image.titleWidth}, titleHeight: ${product2Image.titleHeight}, image: "${product2Image.name}", imageX: ${product2Image.x}, imageY: ${product2Image.y}, imageWidth: ${product2Image.width}, imageHeight: ${product2Image.height}, rating: "${product2Image.rating}", ratingX: ${product2Image.ratingX}, ratingY: ${product2Image.ratingY}, ratingWidth: ${product2Image.ratingWidth}, ratingHeight: ${product2Image.ratingHeight}) }
                    NavigationLink(destination: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product3Detail.title)}, image: "${product3Detail.image}", rating: "${product3Image.rating}", description: ${swiftStringLiteral(product3Detail.description)}, price: "${product3Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })) { productCard(title: ${swiftStringLiteral(product3Image.title)}, titleX: ${product3Image.titleX}, titleY: ${product3Image.titleY}, titleWidth: ${product3Image.titleWidth}, titleHeight: ${product3Image.titleHeight}, image: "${product3Image.name}", imageX: ${product3Image.x}, imageY: ${product3Image.y}, imageWidth: ${product3Image.width}, imageHeight: ${product3Image.height}, rating: "${product3Image.rating}", ratingX: ${product3Image.ratingX}, ratingY: ${product3Image.ratingY}, ratingWidth: ${product3Image.ratingWidth}, ratingHeight: ${product3Image.ratingHeight}) }
                    NavigationLink(destination: ${typeName}ProductDetailView(navigationPath: $navigationPath, coordinator: coordinator, title: ${swiftStringLiteral(product4Detail.title)}, image: "${product4Detail.image}", rating: "${product4Image.rating}", description: ${swiftStringLiteral(product4Detail.description)}, price: "${product4Detail.price}", starAsset: "${starAssetName}", navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: { isConfirmationPresented = true })) { productCard(title: ${swiftStringLiteral(product4Image.title)}, titleX: ${product4Image.titleX}, titleY: ${product4Image.titleY}, titleWidth: ${product4Image.titleWidth}, titleHeight: ${product4Image.titleHeight}, image: "${product4Image.name}", imageX: ${product4Image.x}, imageY: ${product4Image.y}, imageWidth: ${product4Image.width}, imageHeight: ${product4Image.height}, rating: "${product4Image.rating}", ratingX: ${product4Image.ratingX}, ratingY: ${product4Image.ratingY}, ratingWidth: ${product4Image.ratingWidth}, ratingHeight: ${product4Image.ratingHeight}) }
                }
            }.padding(.horizontal, 19).padding(.top, 24).padding(.bottom, 24)
        }
        .safeAreaInset(edge: .bottom) { HStack { if let image = UIImage(named: "home", in: Bundle.module, compatibleWith: nil) { Button { viewModel.send(.appeared) } label: { Image(uiImage: image).renderingMode(.template) }.accessibilityLabel("Home") } else { Button("⌂") { viewModel.send(.appeared) } }; Spacer(); NavigationLink(destination: ${typeName}PlaceholderView(title: "User profile")) { if let image = UIImage(named: "user", in: Bundle.module, compatibleWith: nil) { Image(uiImage: image).renderingMode(.template) } else { Text("User") } }.accessibilityLabel("User"); Spacer(); NavigationLink(destination: ${typeName}PlaceholderView(title: "Customer support")) { if let image = UIImage(named: "comment", in: Bundle.module, compatibleWith: nil) { Image(uiImage: image).renderingMode(.template) } else { Text("Support") } }.accessibilityLabel("Support"); Spacer(); if let image = UIImage(named: "heart", in: Bundle.module, compatibleWith: nil) { Image(uiImage: image).renderingMode(.template).accessibilityLabel("Favorites") } else { Text("♥") } }.foregroundStyle(.white).padding(.horizontal, 24).padding(.vertical, 18).background(Color(hex: "#ef2a39")) }
    }
    private func productCard(title: String, titleX: CGFloat, titleY: CGFloat, titleWidth: CGFloat, titleHeight: CGFloat, image: String, imageX: CGFloat, imageY: CGFloat, imageWidth: CGFloat, imageHeight: CGFloat, rating: String, ratingX: CGFloat, ratingY: CGFloat, ratingWidth: CGFloat, ratingHeight: CGFloat) -> some View { ZStack(alignment: .topLeading) { if let uiImage = UIImage(named: image, in: Bundle.module, compatibleWith: nil) { Image(uiImage: uiImage).resizable().scaledToFit().frame(width: imageWidth, height: imageHeight).position(x: imageX + imageWidth / 2, y: imageY + imageHeight / 2) }; Text(title).font(.system(size: 16, weight: .medium)).foregroundStyle(Color(hex: "#3c2f2f")).multilineTextAlignment(.leading).lineLimit(2).allowsTightening(true).minimumScaleFactor(0.75).fixedSize(horizontal: false, vertical: true).frame(width: titleWidth, height: titleHeight, alignment: .topLeading).position(x: titleX + titleWidth / 2, y: titleY + titleHeight / 2); HStack(spacing: 5) { if let starImage = UIImage(named: "star", in: Bundle.module, compatibleWith: nil) { Image(uiImage: starImage).resizable().frame(width: 16, height: 16) }; Text(rating).font(.system(size: 16, weight: .medium)).foregroundStyle(Color(hex: "#3c2f2f")).lineLimit(1).fixedSize(horizontal: true, vertical: true).frame(width: 23, alignment: .leading) }.frame(width: ratingWidth, height: ratingHeight, alignment: .leading).position(x: ratingX + ratingWidth / 2, y: ratingY + ratingHeight / 2) }.frame(width: 185, height: 225, alignment: .topLeading).background(.white).clipShape(RoundedRectangle(cornerRadius: 20)).shadow(color: .black.opacity(0.13), radius: 17, y: 6) }
}

public struct ${typeName}ProductDetailView: View {
    @Environment(\\.dismiss) private var dismiss
    @Binding var navigationPath: [${typeName}Route]
    let coordinator: any ${typeName}Coordinator
    let title: String
    let image: String
    let rating: String
    let description: String
    let price: String
    let starAsset: String
    let navigationMode: ${typeName}NavigationMode
    let onSubmitToRoot: (() -> Void)?
    let onPresentConfirmation: (() -> Void)?
    public init(navigationPath: Binding<[${typeName}Route]>, coordinator: any ${typeName}Coordinator, title: String, image: String, rating: String, description: String, price: String, starAsset: String, navigationMode: ${typeName}NavigationMode = .standalone, onSubmitToRoot: (() -> Void)? = nil, onPresentConfirmation: (() -> Void)? = nil) { self._navigationPath = navigationPath; self.coordinator = coordinator; self.title = title; self.image = image; self.rating = rating; self.description = description; self.price = price; self.starAsset = starAsset; self.navigationMode = navigationMode; self.onSubmitToRoot = onSubmitToRoot; self.onPresentConfirmation = onPresentConfirmation }
    public var body: some View { ZStack(alignment: .top) { ScrollView { VStack(alignment: .leading, spacing: 0) { if let uiImage = UIImage(named: image, in: Bundle.module, compatibleWith: nil) { Image(uiImage: uiImage).resizable().scaledToFit().frame(width: 350, height: 355).frame(maxWidth: .infinity, alignment: .center) }; Spacer().frame(height: 51); Text(title).font(.title2.bold()); Spacer().frame(height: 9); HStack(spacing: 5) { if let star = UIImage(named: starAsset, in: Bundle.module, compatibleWith: nil) { Image(uiImage: star).resizable().scaledToFit().frame(width: 16, height: 16) }; Text(rating); Text("26 mins") }.foregroundStyle(Color(hex: "#6a6a6a")); Spacer().frame(height: 19); Text(description).font(.body).foregroundStyle(Color(hex: "#6a6a6a")); Spacer().frame(height: 29); HStack(alignment: .top, spacing: 0) { VStack(alignment: .leading, spacing: 8) { Text("Spicy"); Slider(value: .constant(0.6), in: 0...1); HStack { Text("Mild"); Spacer(); Text("Hot") } }.frame(width: 168); Spacer(); VStack(alignment: .leading, spacing: 8) { Text("Portion"); HStack(spacing: 12) { Button("−") {}; Text("2"); Button("+") {} }.buttonStyle(.bordered).frame(width: 121, height: 40) }.frame(width: 121) }; Spacer().frame(height: 73); HStack { Text(price).font(.title.bold()).frame(width: 104, alignment: .leading); Spacer(); NavigationLink(destination: ${typeName}PaymentView(navigationPath: $navigationPath, coordinator: coordinator, navigationMode: navigationMode, onSubmitToRoot: onSubmitToRoot, onPresentConfirmation: onPresentConfirmation)) { Text("ORDER NOW") }.buttonStyle(${typeName}PrimaryButtonStyle()).frame(width: 239) } }.padding(.top, 36).padding(.horizontal, 19).padding(.bottom, 24) }.ignoresSafeArea(edges: .bottom); HStack { Button { dismiss() } label: { Image(systemName: "chevron.left").font(.system(size: 18, weight: .semibold)) }.accessibilityLabel("Back"); Spacer(); Button {} label: { Image(systemName: "magnifyingglass").font(.system(size: 20, weight: .medium)) }.accessibilityLabel("Search") }.frame(height: 28).padding(.horizontal, 12).padding(.top, 22) }.toolbar(.hidden, for: .navigationBar) }
}

public struct ${typeName}PaymentView: View {
    @Environment(\\.dismiss) private var dismiss
    @Binding var navigationPath: [${typeName}Route]
    let coordinator: any ${typeName}Coordinator
    let navigationMode: ${typeName}NavigationMode
    let onSubmitToRoot: (() -> Void)?
    let onPresentConfirmation: (() -> Void)?
    public init(navigationPath: Binding<[${typeName}Route]>, coordinator: any ${typeName}Coordinator, navigationMode: ${typeName}NavigationMode = .standalone, onSubmitToRoot: (() -> Void)? = nil, onPresentConfirmation: (() -> Void)? = nil) { self._navigationPath = navigationPath; self.coordinator = coordinator; self.navigationMode = navigationMode; self.onSubmitToRoot = onSubmitToRoot; self.onPresentConfirmation = onPresentConfirmation }
    public var body: some View { ZStack(alignment: .top) { ScrollView { VStack(alignment: .leading, spacing: 0) { Spacer().frame(height: 81); Text("Order summary").font(.title2.bold()); Spacer().frame(height: 20); paymentRow("Order", "$16.48"); Spacer().frame(height: 16); paymentRow("Taxes", "$0.3"); Spacer().frame(height: 16); paymentRow("Delivery fees", "$1.5"); Spacer().frame(height: 34); paymentRow("Total:", "$18.19"); Spacer().frame(height: 26); paymentRow("Estimated delivery time:", "15 - 30mins"); Spacer().frame(height: 67); Text("Payment methods").font(.title2.bold()); Spacer().frame(height: 22); VStack(spacing: 27) { paymentCard("Credit card", "5105 **** **** 0505", true); paymentCard("Debit card", "3566 **** **** 0505", false) }; Spacer().frame(height: 41); HStack(spacing: 9) { Image(systemName: "checkmark.square.fill"); Text("Save card details for future payments") }.foregroundStyle(Color(hex: "#6a6a6a")); Spacer().frame(height: 141); Text("Total price"); HStack { Text("$18.19").font(.title.bold()); Spacer(); Button("PAY NOW") { onPresentConfirmation?() }.buttonStyle(${typeName}PrimaryButtonStyle()).frame(width: 209) } }.padding(.horizontal, 19).padding(.bottom, 24) }.ignoresSafeArea(edges: .bottom); HStack { Button { dismiss() } label: { Image(systemName: "chevron.left").font(.system(size: 18, weight: .semibold)) }.accessibilityLabel("Back"); Spacer(); Button {} label: { Image(systemName: "magnifyingglass").font(.system(size: 20, weight: .medium)) }.accessibilityLabel("Search") }.frame(height: 28).padding(.horizontal, 12).padding(.top, 22) }.toolbar(.hidden, for: .navigationBar) }
    private func paymentRow(_ label: String, _ value: String) -> some View { HStack { Text(label); Spacer(); Text(value) } }
    private func paymentCard(_ title: String, _ number: String, _ selected: Bool) -> some View { HStack { VStack(alignment: .leading, spacing: 6) { Text(title).font(.headline); Text(number).foregroundStyle(Color(hex: "#6a6a6a")) }; Spacer(); Image(systemName: selected ? "checkmark.circle.fill" : "circle").foregroundStyle(selected ? Color(hex: "#ef2a39") : Color(hex: "#b0b0b0")) }.padding(14).frame(height: 80).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 12)) }
}

    private func paymentRow(_ label: String, _ value: String) -> some View { HStack { Text(label); Spacer(); Text(value) } }

public struct ${typeName}OrderConfirmationView: View {
    @Binding var navigationPath: [${typeName}Route]
    let coordinator: any ${typeName}Coordinator
    let onGoBack: () -> Void
    public init(navigationPath: Binding<[${typeName}Route]>, coordinator: any ${typeName}Coordinator, onGoBack: @escaping () -> Void) { self._navigationPath = navigationPath; self.coordinator = coordinator; self.onGoBack = onGoBack }
    public var body: some View { ZStack { Color.black.opacity(0.18).ignoresSafeArea(); VStack(spacing: 18) { ZStack { Circle().fill(Color(hex: "#ef2a39")).frame(width: 90, height: 90); Image(systemName: "checkmark").font(.system(size: 34, weight: .bold)).foregroundStyle(.white) }; Text("Success !").font(.system(size: 30, weight: .bold)); Text("Your payment was successful. A receipt for this purchase has been sent to your email.").multilineTextAlignment(.center).foregroundStyle(Color(hex: "#6a6a6a")); Button("GO BACK") { navigationPath.removeAll(); onGoBack() }.buttonStyle(${typeName}PrimaryButtonStyle()).frame(width: 220, height: 60) }.padding(24).frame(width: 340, height: 400).background(.white).clipShape(RoundedRectangle(cornerRadius: 24)) } }
}

private struct ${typeName}PlaceholderView: View { let title: String; var body: some View { Text(title).font(.title).navigationTitle(title) } }

private struct ${typeName}PrimaryButtonStyle: ButtonStyle { func makeBody(configuration: Configuration) -> some View { configuration.label.foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 52).background(Color(hex: "#ef2a39")).clipShape(RoundedRectangle(cornerRadius: 22)).opacity(configuration.isPressed ? 0.8 : 1) } }
private extension Color { init(hex: String) { let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")); var number: UInt64 = 0; Scanner(string: value).scanHexInt64(&number); self.init(red: Double((number >> 16) & 0xff) / 255, green: Double((number >> 8) & 0xff) / 255, blue: Double(number & 0xff) / 255) } }

@MainActor public final class ${typeName}ViewModel: ObservableObject, ${typeName}ViewModelProtocol {
    @Published public private(set) var state: ${typeName}LoadState = .idle
    private let dependencies: ${typeName}Dependencies
    public init(dependencies: ${typeName}Dependencies) { self.dependencies = dependencies }
    public func send(_ event: ${typeName}Event) { switch event { case .appeared: state = .loaded; case .retry: state = .loading${eventCases} } }
}
`;
  return { files: [{ path: `${typeName}View.swift`, contents }], diagnostics: [] };
}
