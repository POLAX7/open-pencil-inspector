import { diagnostic, type Diagnostic } from '../../core/src/diagnostics.ts';
import type { DesignNode } from '../../core/src/design-ast.ts';

export type NativePattern = 'screen' | 'container' | 'text' | 'textField' | 'image' | 'button' | 'navigationBar' | 'navigationBackButton' | 'tabBar' | 'unknown';

export interface NativePatternResult { pattern: NativePattern; evidence?: string[]; warning?: Diagnostic }

export function mapNativePattern(node: Pick<DesignNode, 'id' | 'name' | 'type' | 'text' | 'assetRef' | 'style'>): NativePatternResult {
  const name = node.name.toLowerCase();
  if (node.type === 'FRAME' && /navigation|nav bar/.test(name)) return { pattern: 'navigationBar', evidence: ['node-type', 'node-name'] };
  if (node.type === 'FRAME' && /tab bar|bottom nav/.test(name)) return { pattern: 'tabBar', evidence: ['node-type', 'node-name'] };
  if (node.type === 'SECTION' || node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') return { pattern: 'container', evidence: ['node-type'] };
  if (node.type === 'TEXT' && !node.text?.content && /search|email|password|input|field/.test(name)) return { pattern: 'textField', evidence: ['node-type', 'node-name', 'empty-text-content'] };
  if (node.type === 'TEXT') return { pattern: 'text', evidence: ['node-type'] };
  if (node.type === 'VECTOR' && /arrow[_\s-]?back(?:[_\s-]?ios)?/.test(name)) return { pattern: 'navigationBackButton', evidence: ['node-type', 'node-name'] };
  if (node.type === 'VECTOR' && name === 'bg' && node.style?.fill) return { pattern: 'container', evidence: ['node-type', 'node-name', 'style-fill'] };
  if (node.type === 'VECTOR' && /^star(?:\s+\d+)?$/.test(name)) return { pattern: 'image', evidence: ['node-type', 'node-name', 'artwork-name'] };
  if (node.type === 'IMAGE' || ((node.type === 'VECTOR' || node.type === 'INSTANCE') && node.assetRef)) return { pattern: 'image', evidence: ['node-type', ...(node.assetRef ? ['asset-ref'] : [])] };
  if ((node.type === 'RECTANGLE' || node.type === 'ROUNDED_RECTANGLE' || node.type === 'ELLIPSE') && /button|checkout|submit|save|action/.test(name)) return { pattern: 'button', evidence: ['node-type', 'node-name'] };
  if (node.type === 'RECTANGLE' || node.type === 'ROUNDED_RECTANGLE' || node.type === 'ELLIPSE') return { pattern: 'container', evidence: ['node-type'] };
  return { pattern: 'unknown', warning: diagnostic('UNSUPPORTED_NATIVE_PATTERN', 'warning', `Unsupported native pattern for node ${node.id}`, { path: node.id, provenance: node.provenance }) };
}
