import type { Diagnostic, SourceProvenance } from '../../core/src/diagnostics.ts';
import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import { diagnostic } from '../../core/src/diagnostics.ts';
import { mapNativePattern } from '../../native-patterns/src/mapper.ts';
import type { ScreenContract, ContractFrame } from './screen-contract.ts';

export interface ScreenContractExtraction {
  contract: ScreenContract;
  diagnostics: Diagnostic[];
}

function provenance(node: DesignNode, reference: string): SourceProvenance[] {
  return node.provenance.length > 0 ? node.provenance : [{ source: 'fig', reference, field: `node:${node.id}` }];
}

function frameOf(node: DesignNode): ContractFrame | undefined {
  const layout = node.layout;
  if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number') return undefined;
  return { x: layout.x ?? 0, y: layout.y ?? 0, width: layout.width, height: layout.height };
}

function findNode(nodes: DesignNode[], id: string): DesignNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function descendants(node: DesignNode): DesignNode[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

function isAssetLike(node: DesignNode): boolean {
  return node.type === 'IMAGE' || /^(image|photo|pngwing)(?:\s|$)/i.test(node.name.trim());
}

export function extractScreenContract(
  design: DesignDocument,
  designNodeId: string,
  reference: string,
): ScreenContractExtraction {
  const screen = findNode(design.nodes, designNodeId);
  if (!screen) throw new Error(`Screen node not found: ${designNodeId}`);
  const rootFrame = frameOf(screen);
  if (!rootFrame) throw new Error(`Screen node has no complete frame: ${designNodeId}`);

  const diagnostics: Diagnostic[] = [];
  const components = descendants(screen).map((node) => {
    const mapped = mapNativePattern(node);
    if (mapped.warning) diagnostics.push(mapped.warning);
    // Design AST child coordinates are already local to their parent. Do not
    // subtract the selected root's page coordinates a second time.
    const frame = frameOf(node);
    if (!frame) diagnostics.push(diagnostic('SCREEN_COMPONENT_FRAME_MISSING', 'warning', `Component has no complete frame: ${node.id}`, { path: node.id, provenance: provenance(node, reference) }));
    return {
      id: node.id,
      nodeId: node.id,
      kind: mapped.pattern,
      ...(frame ? { frame } : {}),
      ...(node.style?.radius !== undefined && typeof node.style.radius === 'number' ? { radius: node.style.radius } : {}),
      ...(node.style?.fill ? { color: node.style.fill } : {}),
      ...(node.text?.fontFamily || node.text?.fontSize ? { typography: [node.text.fontFamily, node.text.fontSize ? `${node.text.fontSize}px` : undefined].filter(Boolean).join(' ') } : {}),
      provenance: provenance(node, reference),
    };
  });
  const nodeIds = new Set(descendants(screen).map((node) => node.id));
  const assetByNodeId = new Map(design.assets.filter((asset) => asset.sourceNodeId).map((asset) => [asset.sourceNodeId!, asset]));
  const assets = descendants(screen)
    .filter((node) => nodeIds.has(node.id) && (assetByNodeId.has(node.id) || isAssetLike(node)))
    .map((node) => {
      const asset = assetByNodeId.get(node.id);
      return {
        nodeId: node.id,
        resourceName: asset?.name || asset?.id || node.name || node.id,
        contentMode: 'fit' as const,
        provenance: asset && asset.provenance.length > 0 ? asset.provenance : provenance(node, reference),
      };
    });
  return {
    contract: {
      id: screen.name || designNodeId,
      designNodeId,
      screenSize: { width: rootFrame.width, height: rootFrame.height },
      safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 },
      contentPadding: [0, 0, 0, 0],
      components,
      assets,
      interactions: [],
      unresolvedQuestions: [],
      provenance: provenance(screen, reference),
    },
    diagnostics,
  };
}
