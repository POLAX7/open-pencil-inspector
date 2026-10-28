import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftCaseName, swiftTypeName } from '../../codegen-core/src/contracts.ts';
import { assertValidScreenContract } from '../../codegen-core/src/screen-contract.ts';
import { convertToUIIR, selectPrimaryScreen, type UINode } from '../../ui-ir/src/convert.ts';
import { assertValidNativePatternMapping } from '../../native-patterns/src/evidence.ts';
import { buildNavigationScaffold, runtimeRouteCaseId } from '../../codegen-core/src/navigation-scaffold.ts';

function swiftStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function swiftColor(fill: string | undefined, opacity = 1): string | undefined {
  if (!fill || !/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(fill)) return undefined;
  const value = fill.slice(1);
  const hasAlpha = value.length === 8;
  const offset = hasAlpha ? 2 : 0;
  const channel = (start: number) => Number.parseInt(value.slice(start, start + 2), 16) / 255;
  const alpha = hasAlpha ? channel(0) * opacity : opacity;
  return `Color(red: ${channel(offset).toFixed(6)}, green: ${channel(offset + 2).toFixed(6)}, blue: ${channel(offset + 4).toFixed(6)}, opacity: ${alpha.toFixed(6)})`;
}
function swiftImage(resourceName: string, input: CodegenInput): string {
  return input.resourceBundle === 'main'
    ? `Image(${JSON.stringify(resourceName)})`
    : `Image(${JSON.stringify(resourceName)}, bundle: Bundle.module)`;
}
function contractedTransition(node: UINode, input: CodegenInput) {
  const interaction = input.screenContract?.interactions.find((item) => item.nodeId === node.sourceNodeId);
  if (!interaction) return undefined;
  const label = node.text?.content ?? node.label ?? node.id;
  const transition = input.flow.transitions.find((item) => item.event === interaction.event || (interaction.event === 'tap' && item.event === `tap ${label}`));
  if (!transition) throw new Error(`Screen contract interaction ${interaction.id} has no matching flow transition: ${interaction.event}`);
  return transition;
}

function findUINode(node: UINode, sourceNodeId: string): UINode | undefined {
  if (node.sourceNodeId === sourceNodeId) return node;
  for (const child of node.children) {
    const match = findUINode(child, sourceNodeId);
    if (match) return match;
  }
  return undefined;
}

function hasContractedInteractionDescendant(node: UINode, input: CodegenInput): boolean {
  return node.children.some((child) => Boolean(contractedTransition(child, input)) || hasContractedInteractionDescendant(child, input));
}

function sourceFrameModifier(node: UINode): string {
  const frame = node.layout;
  if (!frame) return '';
  return `.frame(width: ${frame.width}, height: ${frame.height}, alignment: .topLeading).offset(x: ${frame.x}, y: ${frame.y})`;
}

function textPresentationModifier(node: UINode, input: CodegenInput): string {
  const content = node.text?.content ?? '';
  const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
  const typography = component?.typography?.match(/^(.+?)\s+(\d+(?:\.\d+)?)(?:px)?(?:\/(\d+))?$/);
  const text = node.text;
  const fontFamily = typography?.[1] ?? text?.fontFamily;
  const fontSize = typography ? Number(typography[2]) : text?.fontSize;
  const rawWeight = typography ? Number(typography[3]) : text?.fontWeight;
  const weight = typeof rawWeight === 'number'
    ? rawWeight >= 700 ? 'bold' : rawWeight >= 600 ? 'semibold' : rawWeight >= 500 ? 'medium' : 'regular'
    : undefined;
  const font = fontFamily && fontSize
    ? `.font(.custom(${swiftStringLiteral(fontFamily)}, size: ${fontSize}).weight(.${weight ?? 'regular'}))`
    : fontSize
      ? `.font(.system(size: ${fontSize}, weight: .${weight ?? 'regular'}))`
      : '';
  const colorValue = component?.color ?? text?.color;
  const color = colorValue ? `.foregroundStyle(${swiftColor(colorValue) ?? 'Color.primary'})` : '';
  return `${font}${color}${content.length <= 40 ? '.lineLimit(1).minimumScaleFactor(0.5)' : ''}`;
}

function contractStyle(node: UINode, input: CodegenInput): NonNullable<UINode['style']> {
  const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
  return {
    ...(node.style ?? {}),
    ...(component?.color && !node.style?.fill ? { fill: component.color } : {}),
    ...(component?.radius !== undefined && node.style?.radius === undefined ? { radius: component.radius } : {}),
  };
}

function semanticSystemImage(node: UINode, input: CodegenInput): { name: string; color?: string } | undefined {
  const label = node.label.toLowerCase();
  if (node.kind === 'navigationBackButton') return { name: 'chevron.left', color: '#ffffff' };
  if (node.kind === 'image' && /^star(?:\s|$)/i.test(node.label)) {
    const style = contractStyle(node, input);
    return { name: 'star.fill', color: style.fill ?? '#eb0029' };
  }
  return label.length === 0 ? undefined : undefined;
}

function contractDecoration(node: UINode, input: CodegenInput): string {
  const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
  const radius = component?.radius;
  const shadow = component?.shadow
    ? `.shadow(color: ${swiftColor(component.shadow.color, component.shadow.opacity ?? 1) ?? 'Color.black'}, radius: ${component.shadow.radius}, x: ${component.shadow.x ?? 0}, y: ${component.shadow.y ?? 0})`
    : '';
  return `${radius !== undefined && radius > 0 ? `.clipShape(RoundedRectangle(cornerRadius: ${radius}))` : ''}${shadow}`;
}

function renderGenericNode(node: UINode, input: CodegenInput, typeName: string, depth = 0): string {
  const indent = ' '.repeat(depth * 4);
  const childIndent = ' '.repeat((depth + 1) * 4);
  const children = node.children.map((child) => renderGenericNode(child, input, typeName, depth + 1)).join('\n');
  const identifier = hasContractedInteractionDescendant(node, input)
    ? ''
    : `.accessibilityIdentifier(${JSON.stringify(node.sourceNodeId)})`;
  const childAccessibility = node.children.length > 0 ? '.accessibilityElement(children: .contain)' : '';
  const transition = contractedTransition(node, input);
  const style = contractStyle(node, input);
  const semanticImage = semanticSystemImage(node, input);
  const elevation = node.kind === 'navigationBackButton' || /arrow[_\s-]?back/.test(node.label.toLowerCase()) ? '.zIndex(2)' : '';
  if (transition) {
    const label = node.text?.content ?? node.label ?? node.id;
    return `${indent}Button(${JSON.stringify(label)}) { coordinator.navigate(to: .${swiftCaseName(transition.to, 'screen')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transition')}) }${textPresentationModifier(node, input)}${sourceFrameModifier(node)}${identifier}`;
  }
  if (node.kind === 'text') return `${indent}Text(${JSON.stringify(node.text?.content ?? '')})${textPresentationModifier(node, input)}${sourceFrameModifier(node)}${identifier}`;
  if (node.kind === 'textField') return `${indent}TextField(${JSON.stringify(node.text?.content ?? node.id)}, text: .constant(""))${sourceFrameModifier(node)}${identifier}`;
  if (node.kind === 'button') return `${indent}Button(${JSON.stringify(node.label || node.id)}) { viewModel.send(.appeared) }${sourceFrameModifier(node)}${identifier}`;
  if (semanticImage) return `${indent}Image(systemName: ${JSON.stringify(semanticImage.name)}).foregroundStyle(${swiftColor(semanticImage.color) ?? 'Color.primary'})${sourceFrameModifier(node)}${identifier}${elevation}`;
  if (node.kind === 'image') {
    const resourceName = input.assetBindings?.find((binding) => binding.sourceNodeId === node.sourceNodeId)?.resourceName;
    if (!resourceName) return `${indent}EmptyView()${identifier}`;
    return `${indent}${swiftImage(resourceName, input)}.resizable().scaledToFit()${sourceFrameModifier(node)}${identifier}`;
  }
  const artworkResource = input.assetBindings?.find((binding) => binding.sourceNodeId === node.sourceNodeId)?.resourceName;
  if (artworkResource && node.layout?.width && node.layout.height) {
    const fallback = swiftColor(style.fill, style.opacity ?? 1) ?? 'Color.clear';
    const contentMode = input.screenContract?.assets.find((asset) => asset.nodeId === node.sourceNodeId)?.contentMode;
    const imageSizing = contentMode === 'fill' ? '.scaledToFill().clipped()' : '.scaledToFit()';
    const artworkElevation = input.screenContract?.components.some((component) => component.kind === 'navigationBackButton') ? '' : '.zIndex(1)';
    return `${indent}ZStack { ${fallback}; ${swiftImage(artworkResource, input)}.resizable()${imageSizing} }${sourceFrameModifier(node)}${identifier}${artworkElevation}`;
  }
  if (node.kind === 'unknown') return `${indent}EmptyView()${identifier}`;
  if (node.children.length === 0 && node.layout?.width && node.layout.height) {
    const color = swiftColor(style.fill, style.opacity ?? 1) ?? 'Color.clear';
    const radius = typeof style.radius === 'number' ? style.radius : 0;
    const stroke = style.stroke ? `.overlay(RoundedRectangle(cornerRadius: ${radius}).stroke(${swiftColor(style.stroke) ?? 'Color.clear'}, lineWidth: 1))` : '';
    const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
    const shadow = component?.shadow
      ? `.shadow(color: ${swiftColor(component.shadow.color, component.shadow.opacity ?? 1) ?? 'Color.black'}, radius: ${component.shadow.radius}, x: ${component.shadow.x ?? 0}, y: ${component.shadow.y ?? 0})`
      : '';
    return `${indent}${color}${sourceFrameModifier(node)}${radius > 0 ? `.clipShape(RoundedRectangle(cornerRadius: ${radius}))` : ''}${stroke}${shadow}${identifier}`;
  }
  const body = children || `${childIndent}EmptyView()`;
  const background = swiftColor(style.fill, style.opacity ?? 1);
  const isBackContainer = /arrow[_\s-]?back/.test(node.label.toLowerCase());
  const preFrameBackground = background && !isBackContainer ? `.background(${background})` : '';
  const postFrameBackground = background && isBackContainer ? `.background(${background})` : '';
  const backFrame = isBackContainer && node.layout
    ? `.frame(width: ${node.layout.width}, height: ${node.layout.height}, alignment: .topLeading).background(${background ?? 'Color.clear'}).position(x: ${node.layout.x + node.layout.width / 2}, y: ${node.layout.y + node.layout.height / 2})`
    : undefined;
  return `${indent}ZStack(alignment: .topLeading) {\n${body}\n${indent}}${preFrameBackground}${backFrame ?? sourceFrameModifier(node)}${backFrame ? contractDecoration(node, input) : `${contractDecoration(node, input)}${postFrameBackground}`}${identifier}${childAccessibility}${elevation}`;
}

function generateGenericSwiftUIView(input: CodegenInput, typeName: string): CodegenResult {
  const navigation = input.navigationScaffold ?? buildNavigationScaffold(input.flow);
  const contractedRoot = input.screenContract
    ? input.design.nodes.find((node) => node.id === input.screenContract?.designNodeId)
    : undefined;
  const sourceDesign = contractedRoot ? { ...input.design, nodes: [{ ...contractedRoot, layout: contractedRoot.layout ? { ...contractedRoot.layout, x: 0, y: 0 } : contractedRoot.layout }] } : input.design;
  const design = selectPrimaryScreen(sourceDesign.nodes.length > 0 ? sourceDesign : {
    ...input.design,
    nodes: [{ id: 'generated-root', name: 'Generated', type: 'FRAME' as const, children: [], unsupportedProperties: [], provenance: [] }],
  });
  const ir = convertToUIIR(design);
  const rendered = renderGenericNode(ir.root, input, typeName, 5);
  const hasSheet = input.flow.screens.some((screen) => screen.presentation === 'sheet');
  const hasFullScreen = input.flow.screens.some((screen) => screen.presentation === 'modal');
  const contractedEvents = new Set(input.screenContract?.interactions.map((interaction) => interaction.event));
  const isContractedTransition = (transition: typeof input.flow.transitions[number]) => input.screenContract?.interactions.some((interaction) => {
    if (interaction.event === transition.event) return true;
    if (interaction.event !== 'tap') return false;
    const node = findUINode(ir.root, interaction.nodeId);
    const label = node?.text?.content ?? node?.label ?? node?.id ?? interaction.nodeId;
    return transition.event === `tap ${label}`;
  }) ?? false;
  const navigationButtons = navigation.transitions
    .filter((transition) => !input.screenContract || transition.from === input.screenContract.id)
    .filter((transition) => !contractedEvents.has(transition.event) && !isContractedTransition(transition))
    .map((transition, index) => {
    const routeIndex = navigation.transitions.indexOf(transition);
    const transitionCase = swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, `transition${index + 1}`);
    const routeCase = swiftCaseName(transition.to, `screen${index + 1}`);
    const presentation = navigation.screens.find((screen) => screen.id === transition.to)?.presentation;
    const present = presentation === 'sheet' ? '; isSheetPresented = true' : presentation === 'modal' ? '; isFullScreenPresented = true' : '';
    return `                Button(${JSON.stringify(transition.event)}) { coordinator.navigate(to: .${routeCase}, transition: .${transitionCase})${present} }.accessibilityIdentifier(${JSON.stringify(runtimeRouteCaseId(routeIndex >= 0 ? routeIndex : index))})`;
    }).join('\n');
  const eventCases = [...new Set(input.flow.transitions.map((transition) => swiftCaseName(transition.event, 'transition')))]
    .map((event) => `; case .${event}: state = .loaded`).join('');
  const presentationModifiers = `${hasSheet ? `\n        .sheet(isPresented: $isSheetPresented) { Text("Sheet") }` : ''}${hasFullScreen ? `\n        .fullScreenCover(isPresented: $isFullScreenPresented) { Text("Modal") }` : ''}`;
  const contractButtons = (input.screenContract?.interactions ?? []).filter((interaction) => {
    const node = findUINode(ir.root, interaction.nodeId);
    return !node || !node.layout || !contractedTransition(node, input);
  }).map((interaction) => {
    const component = input.screenContract?.components.find((item) => item.nodeId === interaction.nodeId);
    const node = findUINode(ir.root, interaction.nodeId);
    const transition = input.flow.transitions.find((item) => item.event === interaction.event || (interaction.event === 'tap' && item.event === `tap ${node?.text?.content ?? node?.label ?? node?.id ?? interaction.nodeId}`));
    if (!component || !transition) throw new Error(`Screen contract interaction ${interaction.id} cannot be positioned or routed`);
    const label = node?.text?.content ?? node?.label ?? node?.id ?? interaction.nodeId;
    const x = component.frame.x + component.frame.width / 2;
    const y = component.frame.y + component.frame.height / 2;
    const routeIndex = navigation.transitions.indexOf(transition);
    return `                Button(${JSON.stringify(label)}) { coordinator.navigate(to: .${swiftCaseName(transition.to, 'screen')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transition')}) }.frame(width: ${component.frame.width}, height: ${component.frame.height}, alignment: .topLeading).offset(x: ${component.frame.x}, y: ${component.frame.y}).accessibilityIdentifier(${JSON.stringify(interaction.nodeId)}).accessibilityValue(${JSON.stringify(runtimeRouteCaseId(routeIndex))})`;
  }).join('\n');
  const generatedContent = input.screenContract
    ? `            GeometryReader { proxy in\n                ZStack(alignment: .topLeading) {\n${rendered}\n${contractButtons}\n                }\n                .frame(width: ${input.screenContract?.screenSize.width ?? 430}, height: ${input.screenContract?.screenSize.height ?? 932}, alignment: .topLeading)\n                .scaleEffect(min(proxy.size.width / ${input.screenContract?.screenSize.width ?? 430}, proxy.size.height / ${input.screenContract?.screenSize.height ?? 932}), anchor: .topLeading)\n            }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).clipped()`
    : rendered;
  const contents = `// Generated by open-pencil-inspector. Generic UI IR SwiftUI backend.
import SwiftUI

public enum ${typeName}NavigationMode { case standalone, embedded }

@MainActor public struct ${typeName}View: View {
    @StateObject private var viewModel: ${typeName}ViewModel
${hasSheet ? '    @State private var isSheetPresented = false' : ''}
${hasFullScreen ? '    @State private var isFullScreenPresented = false' : ''}
    private let navigationMode: ${typeName}NavigationMode
    private let coordinator: any ${typeName}Coordinator
    public init(viewModel: ${typeName}ViewModel, coordinator: (any ${typeName}Coordinator)? = nil, navigationMode: ${typeName}NavigationMode = .standalone) { _viewModel = StateObject(wrappedValue: viewModel); self.coordinator = coordinator ?? ${typeName}NoOpCoordinator(); self.navigationMode = navigationMode }
    public var body: some View {
        Group {
            switch navigationMode {
            case .standalone:
                NavigationStack { navigationContent }
            case .embedded:
                navigationContent
            }
        }
        .task { viewModel.send(.appeared) }
${presentationModifiers}
    }
    private var navigationContent: some View {
        Group {
            Group {
                switch viewModel.state {
                case .idle, .loading: ProgressView()
                case .loaded: generatedContent
                case .empty: ContentUnavailableView("No content", systemImage: "tray")
                case .failed(let message): VStack { Text(message); Button("Retry") { viewModel.send(.retry) } }
                }
            }
            .navigationDestination(for: ${typeName}Route.self) { route in Text("Screen: \\(String(describing: route))") }
        }
    }
    @ViewBuilder private var generatedContent: some View {
${generatedContent}
${navigationButtons}
    }
}

@MainActor public final class ${typeName}ViewModel: ObservableObject, ${typeName}ViewModelProtocol {
    @Published public private(set) var state: ${typeName}LoadState = .idle
    private let dependencies: ${typeName}Dependencies
    public init(dependencies: ${typeName}Dependencies) { self.dependencies = dependencies }
    public func send(_ event: ${typeName}Event) { switch event { case .appeared: state = .loaded; case .retry: state = .loading${eventCases} } }
}
`;
  return { files: [{ path: `${typeName}View.swift`, contents }], diagnostics: ir.diagnostics.map((item) => item.message) };
}

export function generateSwiftUIView(input: CodegenInput): CodegenResult {
  if (input.screenContract) assertValidScreenContract(input.screenContract);
  if (input.nativePatternMapping) assertValidNativePatternMapping(input.nativePatternMapping);
  return generateGenericSwiftUIView(input, swiftTypeName(input.featureName));
}
