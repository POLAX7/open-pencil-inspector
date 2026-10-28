import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftCaseName, swiftTypeName } from '../../codegen-core/src/contracts.ts';
import { assertValidScreenContract } from '../../codegen-core/src/screen-contract.ts';
import type { DesignNode } from '../../core/src/design-ast.ts';
import { convertToUIIR, selectPrimaryScreen, type UINode } from '../../ui-ir/src/convert.ts';
import { assertValidNativePatternMapping } from '../../native-patterns/src/evidence.ts';
import { buildNavigationScaffold, runtimeRouteCaseId } from '../../codegen-core/src/navigation-scaffold.ts';

function swiftString(value: string): string {
  return JSON.stringify(value).replace(/\\u2028|\\u2029/g, '');
}
function resourceBundle(input: CodegenInput): string {
  return input.resourceBundle === 'main' ? 'Bundle.main' : 'Bundle.module';
}

function designElements(nodes: DesignNode[], originX = 0, originY = 0, output: string[] = []): string[] {
  for (const node of nodes) {
    const x = originX + (node.layout?.x ?? 0);
    const y = originY + (node.layout?.y ?? 0);
    const width = node.layout?.width ?? 0;
    const height = node.layout?.height ?? 0;
    if ((node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') && width > 0 && height > 0 && node.style?.fill) {
      const radius = node.type === 'ELLIPSE' ? Math.min(width, height) / 2 : (typeof node.style.radius === 'number' ? node.style.radius : 0);
      output.push(`        addShape(x: ${x}, y: ${y}, width: ${width}, height: ${height}, color: ${swiftString(node.style.fill)}, radius: ${radius}, opacity: ${node.style.opacity ?? 1})`);
    }
    if (node.type === 'TEXT' && node.text?.content && node.layout?.x !== undefined && node.layout?.y !== undefined) {
      const width = node.layout.width ?? 160;
      const height = node.layout.height ?? 24;
      const fontSize = node.text.fontSize ?? Math.max(12, Math.min(32, height * 0.65));
      output.push(`        addText(${swiftString(node.text.content)}, x: ${x}, y: ${y}, width: ${width}, height: ${height}, fontSize: ${fontSize}, color: ${swiftString(node.text.color ?? '#3c2f2f')})`);
    }
    designElements(node.children, x, y, output);
  }
  return output;
}
function swiftIdentifier(value: string, fallback: string): string {
  const result = value.replace(/[^a-zA-Z0-9]/g, '_');
  return /^[a-zA-Z_]/.test(result) && result.length > 0 ? result : fallback;
}

function uiFontWeight(weight: number | string | undefined): string {
  if (typeof weight === 'number') return weight >= 700 ? '.bold' : weight >= 600 ? '.semibold' : weight >= 500 ? '.medium' : '.regular';
  if (weight === 'bold' || weight === 'semibold' || weight === 'medium') return `.${weight}`;
  return '.regular';
}

function contractStyle(node: UINode, input: CodegenInput): { fill?: string; stroke?: string; radius?: number } {
  const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
  return {
    ...(node.style?.fill ? { fill: node.style.fill } : component?.color ? { fill: component.color } : {}),
    ...(node.style?.stroke ? { stroke: node.style.stroke } : {}),
    ...(typeof node.style?.radius === 'number' ? { radius: node.style.radius } : typeof component?.radius === 'number' ? { radius: component.radius } : {}),
  };
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

function runtimeRouteIdentifier(input: CodegenInput, transition: { from: string; event: string; to: string } | undefined): string | undefined {
  if (!transition) return undefined;
  const index = buildNavigationScaffold(input.flow).transitions.findIndex((candidate) => candidate.from === transition.from && candidate.event === transition.event && candidate.to === transition.to);
  return index >= 0 ? runtimeRouteCaseId(index) : undefined;
}

function renderGenericUIKitNode(node: UINode, parent: string, input: CodegenInput, lines: string[], names: Set<string>): boolean {
  let name = swiftIdentifier(node.sourceNodeId, `node${names.size + 1}`);
  let suffix = 2;
  while (names.has(name)) name = `${name}_${suffix++}`;
  names.add(name);
  const frame = node.layout;
  const width = frame?.width ?? 0;
  const height = frame?.height ?? 0;
  const resource = input.assetBindings?.find((binding) => binding.sourceNodeId === node.sourceNodeId)?.resourceName;
  const measuredStyle = contractStyle(node, input);
  const contractComponent = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
  const semanticSystemImage = node.kind === 'navigationBackButton'
    ? { name: 'chevron.left', color: '#ffffff' }
    : node.kind === 'image' && /^star(?:\s|$)/i.test(node.label)
      ? { name: 'star.fill', color: measuredStyle.fill ?? '#eb0029' }
      : undefined;
  const contracted = contractedTransition(node, input);
  const routeIdentifier = runtimeRouteIdentifier(input, contracted);
  if (semanticSystemImage) {
    lines.push(`        let ${name} = UIImageView(image: UIImage(systemName: ${swiftString(semanticSystemImage.name)})); ${name}.tintColor = UIColor(openPencilHex: ${swiftString(semanticSystemImage.color)}); ${name}.contentMode = .scaleAspectFit;`);
  } else if (resource && node.kind !== 'text' && node.kind !== 'button' && node.kind !== 'textField') {
    const fill = measuredStyle.fill ? `; ${name}.backgroundColor = UIColor(openPencilHex: ${swiftString(measuredStyle.fill)})` : '';
    const radius = typeof measuredStyle.radius === 'number' && measuredStyle.radius > 0 ? `; ${name}.layer.cornerRadius = ${measuredStyle.radius}; ${name}.clipsToBounds = true` : '';
    lines.push(`        let ${name} = UIImageView(image: UIImage(named: ${swiftString(resource)}, in: ${resourceBundle(input)}, compatibleWith: nil)); ${name}.contentMode = .scaleAspectFit${fill}${radius};`);
  } else if (contracted) {
    const label = node.text?.content ?? node.label ?? node.id;
    const action = `self?.coordinator.navigate(to: .${swiftCaseName(contracted.to, 'screen')}, transition: .${swiftCaseName(`${contracted.from} to ${contracted.to} ${contracted.event}`, 'transition')})`;
    const titleColor = contractComponent?.color ? ` ${name}.setTitleColor(UIColor(openPencilHex: ${swiftString(contractComponent.color)}), for: .normal);` : '';
    lines.push(`        let ${name} = UIButton(type: .system); ${name}.setTitle(${swiftString(label)}, for: .normal);${titleColor} ${name}.addAction(UIAction { [weak self] _ in ${action} }, for: .touchUpInside);${routeIdentifier ? ` ${name}.accessibilityValue = ${swiftString(routeIdentifier)};` : ''}`);
  } else if (node.kind === 'text') {
    const component = input.screenContract?.components.find((item) => item.nodeId === node.sourceNodeId);
    const color = node.text?.color ?? component?.color;
    const typography = component?.typography?.match(/^(.+?)\s+(\d+(?:\.\d+)?)px(?:\/(\d+))?$/);
    const fontFamily = typography?.[1] ?? node.text?.fontFamily;
    const fontSize = typography ? Number(typography[2]) : node.text?.fontSize;
    const fontWeight = typography?.[3] ? Number(typography[3]) : node.text?.fontWeight;
    const font = fontSize
      ? `; ${name}.font = UIFont(name: ${swiftString(fontFamily ?? '')}, size: ${fontSize}) ?? UIFont.systemFont(ofSize: ${fontSize}, weight: ${uiFontWeight(fontWeight)})`
      : '';
    const textColor = color ? `; ${name}.textColor = UIColor(openPencilHex: ${swiftString(color)})` : '';
    lines.push(`        let ${name} = UILabel(); ${name}.text = ${swiftString(node.text?.content ?? node.label)}; ${name}.numberOfLines = 0${font}${textColor}; ${name}.adjustsFontSizeToFitWidth = true; ${name}.minimumScaleFactor = 0.5;`);
  } else if (node.kind === 'image') {
    lines.push(`        let ${name} = UIImageView(image: UIImage(named: ${swiftString(resource ?? node.assetRef ?? node.label)}, in: ${resourceBundle(input)}, compatibleWith: nil)); ${name}.contentMode = .scaleAspectFit;`);
  } else if (node.kind === 'textField') {
    lines.push(`        let ${name} = UITextField(); ${name}.placeholder = ${swiftString(node.label)}; ${name}.borderStyle = .roundedRect;`);
  } else if (node.kind === 'button') {
    const transition = input.flow.transitions.find((candidate) => candidate.event.toLowerCase() === node.label.toLowerCase());
    const routeIdentifier = runtimeRouteIdentifier(input, transition);
    const action = transition
      ? `self?.coordinator.navigate(to: .${swiftCaseName(transition.to, 'screen')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transition')})`
      : 'self?.viewModel.send(.appeared)';
    lines.push(`        let ${name} = UIButton(type: .system); ${name}.setTitle(${swiftString(node.label)}, for: .normal); ${name}.addAction(UIAction { [weak self] _ in ${action} }, for: .touchUpInside);${routeIdentifier ? ` ${name}.accessibilityValue = ${swiftString(routeIdentifier)};` : ''}`);
  } else {
    const fill = measuredStyle.fill ? `; ${name}.backgroundColor = UIColor(openPencilHex: ${swiftString(measuredStyle.fill)})` : '';
    const radius = typeof measuredStyle.radius === 'number' && measuredStyle.radius > 0 ? `; ${name}.layer.cornerRadius = ${measuredStyle.radius}; ${name}.clipsToBounds = true` : '';
    const stroke = measuredStyle.stroke ? `; ${name}.layer.borderColor = UIColor(openPencilHex: ${swiftString(measuredStyle.stroke)}).cgColor; ${name}.layer.borderWidth = 1` : '';
    lines.push(`        let ${name} = UIView()${fill}${radius}${stroke};`);
  }
  lines.push(`        ${name}.translatesAutoresizingMaskIntoConstraints = false; ${name}.accessibilityIdentifier = ${swiftString(node.sourceNodeId)}; ${parent}.addSubview(${name});`);
  if (frame) lines.push(`        NSLayoutConstraint.activate([${name}.leadingAnchor.constraint(equalTo: ${parent}.leadingAnchor, constant: ${frame.x}), ${name}.topAnchor.constraint(equalTo: ${parent}.topAnchor, constant: ${frame.y}), ${name}.widthAnchor.constraint(equalToConstant: ${width}), ${name}.heightAnchor.constraint(equalToConstant: ${height})]);`);
  let containsContractedInteraction = Boolean(contracted);
  for (const child of node.children) containsContractedInteraction = renderGenericUIKitNode(child, name, input, lines, names) || containsContractedInteraction;
  if (containsContractedInteraction) lines.push(`        ${parent}.bringSubviewToFront(${name});`);
  return containsContractedInteraction;
}

function generateGenericUIKitViewController(input: CodegenInput, typeName: string): CodegenResult {
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
  const root = ir.root;
  const rootFrame = root.layout ?? { x: 0, y: 0, width: 430, height: 932 };
  const rootComponent = input.screenContract?.components.find((item) => item.nodeId === root.sourceNodeId);
  const rootFill = root.style?.fill ?? rootComponent?.color;
  const lines: string[] = [];
  const names = new Set<string>();
  const nodesToRender = root.children.length > 0 ? root.children : [root];
  for (const child of nodesToRender) renderGenericUIKitNode(child, 'contentView', input, lines, names);
  for (const interaction of input.screenContract?.interactions ?? []) {
    const component = input.screenContract.components.find((item) => item.nodeId === interaction.nodeId);
    const node = findUINode(root, interaction.nodeId);
    const transition = navigation.transitions.find((item) => item.event === interaction.event || (interaction.event === 'tap' && item.event === `tap ${node?.text?.content ?? node?.label ?? node?.id ?? interaction.nodeId}`));
    if (!component || !transition) throw new Error(`Screen contract interaction ${interaction.id} cannot be positioned or routed`);
    if (node && contractedTransition(node, input)) continue;
    const name = swiftIdentifier(`contract_${interaction.nodeId}`, `contractInteraction${names.size + 1}`);
    const label = node?.text?.content ?? node?.label ?? node?.id ?? interaction.nodeId;
    const action = `self?.coordinator.navigate(to: .${swiftCaseName(transition.to, 'screen')}, transition: .${swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, 'transition')})`;
    const routeIdentifier = runtimeRouteIdentifier(input, transition);
    lines.push(`        let ${name} = UIButton(type: .system); ${name}.setTitle(${swiftString(label)}, for: .normal); ${name}.addAction(UIAction { [weak self] _ in ${action} }, for: .touchUpInside);`);
    lines.push(`        ${name}.translatesAutoresizingMaskIntoConstraints = false; ${name}.accessibilityIdentifier = ${swiftString(interaction.nodeId)};${routeIdentifier ? ` ${name}.accessibilityValue = ${swiftString(routeIdentifier)};` : ''} contentView.addSubview(${name});`);
    lines.push(`        NSLayoutConstraint.activate([${name}.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: ${component.frame.x}), ${name}.topAnchor.constraint(equalTo: contentView.topAnchor, constant: ${component.frame.y}), ${name}.widthAnchor.constraint(equalToConstant: ${component.frame.width}), ${name}.heightAnchor.constraint(equalToConstant: ${component.frame.height})]);`);
  }
  const contents = `// Generated by open-pencil-inspector. Generic UI IR UIKit backend.
import UIKit

@MainActor public final class ${typeName}ViewController: UIViewController {
    private let viewModel: ${typeName}ViewModel
    private let coordinator: any ${typeName}Coordinator
    private let contentView = UIView()
    public init(viewModel: ${typeName}ViewModel, coordinator: (any ${typeName}Coordinator)? = nil) { self.viewModel = viewModel; self.coordinator = coordinator ?? ${typeName}NoOpCoordinator(); super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ${rootFill ? `UIColor(openPencilHex: ${swiftString(rootFill)})` : '.systemBackground'}
        contentView.backgroundColor = ${rootFill ? `UIColor(openPencilHex: ${swiftString(rootFill)})` : '.systemBackground'}
        contentView.translatesAutoresizingMaskIntoConstraints = false
        contentView.accessibilityIdentifier = ${swiftString(root.sourceNodeId)}
        view.addSubview(contentView)
        NSLayoutConstraint.activate([contentView.leadingAnchor.constraint(equalTo: view.leadingAnchor), contentView.topAnchor.constraint(equalTo: view.topAnchor), contentView.widthAnchor.constraint(equalToConstant: ${rootFrame.width}), contentView.heightAnchor.constraint(equalToConstant: ${rootFrame.height})])
${lines.join('\n')}
        viewModel.send(.appeared)
    }
}

@MainActor public final class ${typeName}ViewModel: ${typeName}ViewModelProtocol {
    public private(set) var state: ${typeName}FeatureState = .idle
    private let dependencies: ${typeName}Dependencies
    public init(dependencies: ${typeName}Dependencies) { self.dependencies = dependencies }
    public func send(_ event: ${typeName}Event) { switch event { case .appeared: state = .loaded; case .retry: state = .loading${input.flow.transitions.map((transition) => `; case .${swiftCaseName(transition.event, 'transition')}: state = .loaded`).join('')} } }
}

private extension UIColor {
    convenience init(openPencilHex hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")); var number: UInt64 = 0; Scanner(string: value).scanHexInt64(&number); let hasAlpha = value.count == 8
        self.init(red: CGFloat((number >> (hasAlpha ? 24 : 16)) & 0xff) / 255, green: CGFloat((number >> (hasAlpha ? 16 : 8)) & 0xff) / 255, blue: CGFloat((number >> (hasAlpha ? 8 : 0)) & 0xff) / 255, alpha: hasAlpha ? CGFloat(number & 0xff) / 255 : 1)
    }
}
`;
  return { files: [{ path: `${typeName}ViewController.swift`, contents }], diagnostics: ir.diagnostics.map((item) => item.message) };
}

export function generateUIKitViewController(input: CodegenInput): CodegenResult {
  if (input.screenContract) assertValidScreenContract(input.screenContract);
  if (input.nativePatternMapping) assertValidNativePatternMapping(input.nativePatternMapping);
  return generateGenericUIKitViewController(input, swiftTypeName(input.featureName));
  /* const navigationButtons = input.flow.transitions.map((transition, index) => {
    const transitionCase = swiftCaseName(`${transition.from} to ${transition.to} ${transition.event}`, `transition${index + 1}`);
    const routeCase = swiftCaseName(transition.to, `screen${index + 1}`);
    return `        let button${index} = UIButton(type: .system); button${index}.setTitle("${transition.event}", for: .normal); button${index}.addAction(UIAction { [weak self] _ in self?.coordinator.navigate(to: .${routeCase}, transition: .${transitionCase}) }, for: .touchUpInside); navigationStack.addArrangedSubview(button${index})`;
  }).join('\n');
  const eventCases = [...new Set(input.flow.transitions.map((transition) => swiftCaseName(transition.event, 'transition')))]
    .map((event) => `; case .${event}: state = .loading`).join('');
  const renderedDesignElements = root ? designElements(root.children).join('\n') : '';
  const canvasWidth = root?.layout?.width ?? 430;
  const canvasHeight = root?.layout?.height ?? 932;
  const contents = `// Generated by open-pencil-inspector.
import UIKit

public final class ${typeName}ViewController: UIViewController {
    private let viewModel: ${typeName}ViewModel
    private let coordinator: any ${typeName}Coordinator
    private let contentLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private let designCanvas = UIView()
    private let designContent = UIView()

    public init(viewModel: ${typeName}ViewModel, coordinator: any ${typeName}Coordinator = ${typeName}NoOpCoordinator()) { self.viewModel = viewModel; self.coordinator = coordinator; super.init(nibName: nil, bundle: nil) }
    @available(*, unavailable) required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        designCanvas.translatesAutoresizingMaskIntoConstraints = false
        designCanvas.backgroundColor = .black
        designCanvas.clipsToBounds = true
        view.addSubview(designCanvas)
        designContent.frame = CGRect(x: 0, y: 0, width: ${canvasWidth}, height: ${canvasHeight})
        designContent.backgroundColor = .white
        designCanvas.addSubview(designContent)
        renderDesignCanvas()
        let navigationStack = UIStackView(); navigationStack.axis = .vertical; navigationStack.spacing = 8; navigationStack.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(navigationStack)
${navigationButtons}
        navigationStack.isHidden = true
        NSLayoutConstraint.activate([designCanvas.topAnchor.constraint(equalTo: view.topAnchor), designCanvas.leadingAnchor.constraint(equalTo: view.leadingAnchor), designCanvas.trailingAnchor.constraint(equalTo: view.trailingAnchor), designCanvas.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        viewModel.send(.appeared)
    }
    public override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateDesignScale()
    }
    public override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        updateDesignScale()
    }
    private func updateDesignScale() {
        let viewport = view.window?.bounds.size ?? UIScreen.main.bounds.size
        let scale = min(viewport.width / ${canvasWidth}, viewport.height / ${canvasHeight})
        designContent.transform = CGAffineTransform(scaleX: scale, y: scale)
        designContent.center = CGPoint(x: designCanvas.bounds.midX, y: designCanvas.bounds.midY)
    }
    private func renderDesignCanvas() {
        designCanvas.accessibilityIdentifier = "openpencil-design-canvas"
        designContent.layer.cornerRadius = 0
        designContent.clipsToBounds = true
${renderedDesignElements}
    }
    private func addShape(x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, color: String, radius: CGFloat, opacity: CGFloat) {
        let shape = UIView(frame: CGRect(x: x, y: y, width: width, height: height))
        shape.backgroundColor = UIColor(openPencilHex: color).withAlphaComponent(opacity)
        shape.layer.cornerRadius = radius
        designContent.addSubview(shape)
    }
    private func addText(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, fontSize: CGFloat, color: String) {
        let label = UILabel(frame: CGRect(x: x, y: y, width: width, height: height))
        label.text = text
        label.font = .systemFont(ofSize: fontSize, weight: fontSize >= 24 ? .bold : .regular)
        label.textColor = UIColor(openPencilHex: color)
        label.numberOfLines = 0
        label.adjustsFontSizeToFitWidth = false
        designContent.addSubview(label)
    }
    @objc private func retry() { viewModel.send(.retry) }
}

@MainActor public final class ${typeName}ViewModel {
    public private(set) var state: ${typeName}LoadState = .idle
    private let dependencies: ${typeName}Dependencies
    public init(dependencies: ${typeName}Dependencies) { self.dependencies = dependencies }
    public func send(_ event: ${typeName}Event) { switch event { case .appeared, .retry: state = .loading${eventCases} } }
}

private extension UIColor {
    convenience init(openPencilHex hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var number: UInt64 = 0
        Scanner(string: value).scanHexInt64(&number)
        let hasAlpha = value.count == 8
        self.init(red: CGFloat((number >> (hasAlpha ? 24 : 16)) & 0xff) / 255, green: CGFloat((number >> (hasAlpha ? 16 : 8)) & 0xff) / 255, blue: CGFloat((number >> (hasAlpha ? 8 : 0)) & 0xff) / 255, alpha: hasAlpha ? CGFloat(number & 0xff) / 255 : 1)
    }
}
`;
  return { files: [{ path: `${typeName}ViewController.swift`, contents }], diagnostics: [] }; */
}
