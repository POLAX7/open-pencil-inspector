import { diagnostic, type Diagnostic } from '../../core/src/diagnostics.ts';
import type { LayoutContractDocument } from './extractor.ts';

export function validateLayoutContracts(input: LayoutContractDocument): LayoutContractDocument {
  const diagnostics: Diagnostic[] = [...input.diagnostics];
  const ids = new Set<string>();
  for (const node of input.nodes) {
    if (ids.has(node.id)) diagnostics.push(diagnostic('LAYOUT_DUPLICATE_NODE', 'error', `Duplicate layout node: ${node.id}`, { path: node.id }));
    ids.add(node.id);
    if (node.frame && (node.frame.width < 0 || node.frame.height < 0)) diagnostics.push(diagnostic('LAYOUT_INVALID_FRAME', 'error', `Node has negative dimensions: ${node.id}`, { path: node.id }));
  }
  return { ...input, diagnostics };
}
