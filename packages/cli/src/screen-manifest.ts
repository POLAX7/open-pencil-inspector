import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import { selectPrimaryScreen } from '../../ui-ir/src/convert.ts';
import { buildRuntimeRoutePlan } from '../../verification/src/runtime-route-plan.ts';

export interface ScreenAcceptanceManifest {
  schemaVersion: '1.0';
  featureName: string;
  primaryScreenId?: string;
  renderedNodeId?: string;
  screens: Array<{
    id: string;
    title?: string;
    designNodeId?: string;
    presentation?: string;
    generated: boolean;
    layout?: { width?: number; height?: number };
  }>;
  transitions: Array<{ from: string; event: string; to: string }>;
  runtimeRouteCases: ReturnType<typeof buildRuntimeRoutePlan>['cases'];
  unresolvedActions: ReturnType<typeof buildRuntimeRoutePlan>['unresolvedActions'];
}

function findNode(nodes: DesignNode[], id: string | undefined): DesignNode | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

export function buildScreenAcceptanceManifest(
  featureName: string,
  design: DesignDocument,
  flow: FlowIR,
): ScreenAcceptanceManifest {
  const selectedDesign = selectPrimaryScreen(design);
  const primaryNode = selectedDesign.nodes[0];
  const primaryScreen = flow.screens.find((screen) => screen.designNodeId === primaryNode?.id)
    ?? flow.screens.find((screen) => screen.presentation === 'root')
    ?? flow.screens[0];

  const runtimeRoutePlan = buildRuntimeRoutePlan(flow);
  return {
    schemaVersion: '1.0',
    featureName,
    ...(primaryScreen ? { primaryScreenId: primaryScreen.id } : {}),
    ...(primaryNode ? { renderedNodeId: primaryNode.id } : {}),
    screens: flow.screens.map((screen) => {
      const node = findNode(design.nodes, screen.designNodeId);
      return {
        id: screen.id,
        ...(screen.title ? { title: screen.title } : {}),
        ...(screen.designNodeId ? { designNodeId: screen.designNodeId } : {}),
        ...(screen.presentation ? { presentation: screen.presentation } : {}),
        generated: screen.id === primaryScreen?.id,
        ...(node?.layout && (node.layout.width !== undefined || node.layout.height !== undefined)
          ? { layout: { ...(node.layout.width !== undefined ? { width: node.layout.width } : {}), ...(node.layout.height !== undefined ? { height: node.layout.height } : {}) } }
          : {}),
      };
    }),
    transitions: flow.transitions.map(({ from, event, to }) => ({ from, event, to })),
    runtimeRouteCases: runtimeRoutePlan.cases,
    unresolvedActions: runtimeRoutePlan.unresolvedActions,
  };
}
