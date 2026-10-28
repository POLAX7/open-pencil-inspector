import type { DesignDocument } from '../../core/src/design-ast.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';
import { discoverScreens } from './screen-discovery.ts';

function screenId(name: string, fallback: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || fallback;
}

/**
 * Builds only the screen inventory that is observable from a design tree.
 * Navigation is intentionally not inferred from canvas order; it must come
 * from a flow spec or an explicit user/model description.
 */
export function inferFlowFromDesign(document: DesignDocument, reference: string): FlowIR {
  const seen = new Set<string>();
  const discovery = discoverScreens(document, reference, 'selected-subtree');
  const inventory = discovery.screens.length > 0
    ? discovery.screens.map((entry) => ({ title: entry.title, nodeId: entry.nodeId, provenance: entry.provenance }))
    : document.nodes.map((node) => ({ title: node.name, nodeId: node.id, provenance: node.provenance }));
  const screens = inventory.map((entry, index) => {
    const id = screenId(entry.title, `screen-${index + 1}`);
    const uniqueId = seen.has(id) ? `${id}-${index + 1}` : id;
    seen.add(uniqueId);
    return {
      id: uniqueId,
      title: entry.title || undefined,
      designNodeId: entry.nodeId,
      presentation: index === 0 ? 'root' as const : undefined,
      provenance: entry.provenance.length > 0
        ? entry.provenance
        : [{ source: 'fig' as const, reference, field: `nodes[${index}]` }],
    };
  });
  return validateFlowIR({
    version: '1.0',
    screens,
    transitions: [],
    states: [],
    conflicts: [],
    diagnostics: screens.length === 0 ? [`No root screens found in ${reference}`] : [],
  });
}
