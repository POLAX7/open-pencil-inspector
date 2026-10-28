import type { Diagnostic } from '../../core/src/diagnostics.ts';
import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import type { LayoutFrame } from '../../layout-contracts/src/extractor.ts';
import { mapNativePattern, type NativePattern } from '../../native-patterns/src/mapper.ts';

export interface UINode {
  id: string;
  sourceNodeId: string;
  label: string;
  kind: NativePattern;
  children: UINode[];
  layout?: LayoutFrame;
  assetRef?: string;
  text?: DesignNode['text'];
  style?: DesignNode['style'];
}

export interface CoverageEntry { sourceNodeId: string; status: 'generated' | 'unsupported'; reason?: string }
export interface UIIRDocument { root: UINode; coverage: CoverageEntry[]; diagnostics: Diagnostic[] }

function localFrame(node: DesignNode): LayoutFrame | undefined {
  const layout = node.layout;
  if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number') return undefined;
  return { x: layout.x ?? 0, y: layout.y ?? 0, width: layout.width, height: layout.height };
}

export function selectPrimaryScreen(document: DesignDocument): DesignDocument {
  const root = document.nodes[0];
  if (!root || (document.nodes.length === 1 && (root.layout?.width ?? 0) <= 430 && (root.layout?.height ?? 0) <= 1200)) return document;
  const findScreen = (nodes: DesignNode[]): DesignNode | undefined => {
    for (const node of nodes) {
      const width = node.layout?.width ?? 0;
      const height = node.layout?.height ?? 0;
      if ((node.type === 'FRAME' || node.type === 'RECTANGLE') && width >= 320 && width <= 430 && height >= 700 && height <= 1000) return node;
      const child = findScreen(node.children);
      if (child) return child;
    }
    return undefined;
  };
  const screen = findScreen(document.nodes);
  return screen ? {
    ...document,
    nodes: [{ ...screen, layout: { ...screen.layout, x: 0, y: 0 } }],
  } : document;
}

export function convertToUIIR(document: DesignDocument): UIIRDocument {
  const coverage: CoverageEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  function convert(node: DesignNode): UINode {
    const mapped = mapNativePattern(node);
    if (mapped.warning) diagnostics.push(mapped.warning);
    coverage.push({ sourceNodeId: node.id, status: mapped.pattern === 'unknown' ? 'unsupported' : 'generated', ...(mapped.warning ? { reason: mapped.warning.message } : {}) });
    // Design AST child coordinates are local to their parent. The layout
    // contract validator also supports global source coordinates, but native
    // renderers must consume the source-local frame to avoid subtracting a
    // parent's origin twice.
    const layout = localFrame(node);
    return {
      id: node.id,
      sourceNodeId: node.id,
      label: node.name,
      kind: mapped.pattern,
      children: node.children.map(convert),
      ...(layout ? { layout } : {}),
      ...(node.assetRef ? { assetRef: node.assetRef } : {}),
      ...(node.text ? { text: node.text } : {}),
      ...(node.style ? { style: node.style } : {}),
    };
  }
  const sourceRoot = document.nodes[0];
  if (!sourceRoot) throw new TypeError('UI IR requires at least one design root node');
  return { root: convert(sourceRoot), coverage, diagnostics };
}
