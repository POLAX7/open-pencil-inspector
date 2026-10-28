import type { DesignAsset, DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';

export interface ScreenContext {
  screen: { id: string; node: DesignNode };
  assets: DesignAsset[];
  flow: FlowIR;
}

function findNode(nodes: DesignNode[], id: string): DesignNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function descendantIds(node: DesignNode): Set<string> {
  const ids = new Set<string>([node.id]);
  for (const child of node.children) for (const id of descendantIds(child)) ids.add(id);
  return ids;
}

export function buildScreenContext(design: DesignDocument, flow: FlowIR, designNodeId: string): ScreenContext {
  const node = findNode(design.nodes, designNodeId);
  if (!node) throw new Error(`Screen node not found: ${designNodeId}`);
  const screen = flow.screens.find((item) => item.designNodeId === designNodeId || item.id === node.name || item.id === designNodeId);
  const screenId = screen?.id ?? designNodeId;
  const ids = descendantIds(node);
  return {
    screen: { id: screenId, node },
    assets: design.assets.filter((asset) => asset.sourceNodeId && ids.has(asset.sourceNodeId)),
    flow: {
      ...flow,
      screens: flow.screens.filter((item) => item.id === screenId || item.designNodeId === designNodeId),
      transitions: flow.transitions.filter((item) => item.from === screenId),
    },
  };
}
