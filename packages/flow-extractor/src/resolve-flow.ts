import type { DesignDocument } from '../../core/src/design-ast.ts';
import type { FlowIR, FlowScreen } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findDesignNodeId(screen: FlowScreen, design: DesignDocument): string | undefined {
  if (screen.designNodeId && design.nodes.some((node) => node.id === screen.designNodeId)) return screen.designNodeId;
  const candidates = [screen.id, screen.title ?? ''].map(slug).filter(Boolean);
  return design.nodes.find((node) => candidates.includes(slug(node.name)))?.id;
}

export function resolveFlowScope(design: DesignDocument, input: FlowIR, reference: string): FlowIR {
  const flow = validateFlowIR(input);
  const diagnostics = [...flow.diagnostics];
  const screens = flow.screens.map((screen) => {
    const designNodeId = findDesignNodeId(screen, design);
    if (!designNodeId) diagnostics.push(`Unresolved design screen: ${screen.id} (${reference})`);
    return designNodeId ? { ...screen, designNodeId } : screen;
  });
  const resolvedScreenIds = new Set(screens.filter((screen) => screen.designNodeId).map((screen) => screen.id));
  for (const state of flow.states) {
    if (!resolvedScreenIds.has(state.screenId)) diagnostics.push(`Unresolved design state screen: ${state.screenId} (${reference})`);
  }
  return validateFlowIR({ ...flow, screens, diagnostics });
}
