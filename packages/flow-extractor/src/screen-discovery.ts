import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import type { Diagnostic, SourceProvenance } from '../../core/src/diagnostics.ts';

export interface ScreenDiscoveryEntry {
  nodeId: string;
  title: string;
  parentNodeId?: string;
  frame: { x: number; y: number; width: number; height: number };
  confidence: 'phone-sized-frame' | 'explicit-root' | 'ambiguous';
  provenance: SourceProvenance[];
}

export interface ScreenDiscoveryReport {
  version: '1.0';
  source: string;
  scope: 'page' | 'selected-subtree';
  screens: ScreenDiscoveryEntry[];
  diagnostics: Diagnostic[];
}

function frameOf(node: DesignNode): ScreenDiscoveryEntry['frame'] | undefined {
  const layout = node.layout;
  if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number') return undefined;
  return { x: layout.x ?? 0, y: layout.y ?? 0, width: layout.width, height: layout.height };
}

function isPhoneSized(node: DesignNode): boolean {
  const frame = frameOf(node);
  return (node.type === 'FRAME' || node.type === 'RECTANGLE')
    && !!frame
    && frame.width >= 320 && frame.width <= 430
    && frame.height >= 700 && frame.height <= 1000;
}

function entry(node: DesignNode, reference: string, confidence: ScreenDiscoveryEntry['confidence'], parentNodeId?: string): ScreenDiscoveryEntry | undefined {
  const frame = frameOf(node);
  if (!frame) return undefined;
  return {
    nodeId: node.id,
    title: node.name || node.id,
    ...(parentNodeId ? { parentNodeId } : {}),
    frame,
    confidence,
    provenance: node.provenance.length > 0
      ? node.provenance
      : [{ source: 'fig', reference, field: `node:${node.id}` }],
  };
}

export function discoverScreens(
  document: DesignDocument,
  source: string,
  scope: ScreenDiscoveryReport['scope'],
): ScreenDiscoveryReport {
  const screens: ScreenDiscoveryEntry[] = [];
  const visit = (node: DesignNode, parentNodeId?: string) => {
    if (isPhoneSized(node)) {
      const screen = entry(node, source, 'phone-sized-frame', parentNodeId);
      if (screen) screens.push(screen);
      return;
    }
    node.children.forEach((child) => visit(child, node.id));
  };
  document.nodes.forEach((node) => visit(node));

  if (screens.length === 0) {
    for (const node of document.nodes) {
      const screen = entry(node, source, 'explicit-root');
      if (screen) screens.push(screen);
    }
  }

  return { version: '1.0', source, scope, screens, diagnostics: [] };
}
