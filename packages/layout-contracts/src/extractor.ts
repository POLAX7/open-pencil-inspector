import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import { diagnostic, type Diagnostic } from '../../core/src/diagnostics.ts';

export interface LayoutFrame { x: number; y: number; width: number; height: number }
export type LayoutMode = 'stack' | 'grid' | 'overlay' | 'absolute';

export interface LayoutNodeContract {
  id: string;
  parentId?: string;
  frame?: LayoutFrame;
  mode: LayoutMode;
  container?: {
    direction?: 'ROW' | 'COL';
    gap?: number;
    padding?: [number, number, number, number];
    alignment?: string;
    sizing?: string;
  };
  children: string[];
  text?: DesignNode['text'];
  asset?: { assetRef: string; contentMode: 'scaleAspectFit' | 'scaleAspectFill' };
}

export interface LayoutContractDocument {
  documentId: string;
  nodes: LayoutNodeContract[];
  diagnostics: Diagnostic[];
}

function frameOf(node: DesignNode): LayoutFrame | undefined {
  const layout = node.layout;
  if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number') return undefined;
  return { x: layout.x ?? 0, y: layout.y ?? 0, width: layout.width, height: layout.height };
}

function intersects(a: LayoutFrame, b: LayoutFrame): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function classifyMode(node: DesignNode, childFrames: LayoutFrame[]): LayoutMode {
  if (node.layout?.direction) return node.layout.gap !== undefined || node.layout.padding ? 'flow' : 'stack';
  const overlap = childFrames.some((frame, index) => childFrames.slice(index + 1).some((other) => intersects(frame, other)));
  if (overlap) return 'overlay';
  const xPositions = new Set(childFrames.map((frame) => frame.x));
  const yPositions = new Set(childFrames.map((frame) => frame.y));
  if (childFrames.length >= 3 && xPositions.size > 1 && yPositions.size > 1) return 'grid';
  return 'absolute';
}

function extractNode(node: DesignNode, parent: LayoutNodeContract | undefined, parentFrame: LayoutFrame | undefined, output: LayoutNodeContract[], diagnostics: Diagnostic[]): void {
  const sourceFrame = frameOf(node);
  // Design AST child coordinates are local to their parent. The top-level
  // node may retain its document coordinate, while descendants must keep the
  // source-local x/y supplied by the parser.
  const frame = sourceFrame;
  const childFrames = node.children.map((child) => frameOf(child)).filter((item): item is LayoutFrame => Boolean(item));
  const mode = classifyMode(node, childFrames);
  const contract: LayoutNodeContract = {
    id: node.id,
    ...(parent ? { parentId: parent.id } : {}),
    ...(frame ? { frame } : {}),
    mode,
    ...(node.layout && (node.layout.direction || node.layout.gap !== undefined || node.layout.padding || node.layout.alignment || node.layout.sizing)
      ? { container: { direction: node.layout.direction, gap: node.layout.gap, padding: node.layout.padding, alignment: node.layout.alignment, sizing: node.layout.sizing } }
      : {}),
    children: node.children.map((child) => child.id),
    ...(node.text ? { text: node.text } : {}),
    ...(node.assetRef ? { asset: { assetRef: node.assetRef, contentMode: 'scaleAspectFit' as const } } : {}),
  };
  output.push(contract);
  if (!sourceFrame) diagnostics.push(diagnostic('LAYOUT_MISSING_FRAME', 'warning', `Node has no complete layout frame: ${node.id}`, { path: node.id, provenance: node.provenance }));

  const childFrameEntries = node.children.map((child) => ({ node: child, frame: frameOf(child) })).filter((item): item is { node: DesignNode; frame: LayoutFrame } => Boolean(item.frame));
  if (node.layout?.direction && childFrameEntries.some((item) => item.node.layout?.direction === undefined && (item.frame.x !== 0 || item.frame.y !== 0))) {
    diagnostics.push(diagnostic('LAYOUT_MIXED_MODE', 'warning', `Container mixes explicit stack layout with independently positioned children: ${node.id}`, { path: node.id, provenance: node.provenance }));
  }
  if (sourceFrame) {
    for (const child of childFrameEntries) {
      if (child.frame.x < 0 || child.frame.y < 0 || child.frame.x + child.frame.width > sourceFrame.width || child.frame.y + child.frame.height > sourceFrame.height) {
        diagnostics.push(diagnostic('LAYOUT_CHILD_OUT_OF_BOUNDS', 'warning', `Child ${child.node.id} exceeds parent ${node.id}`, { path: child.node.id, provenance: child.node.provenance }));
      }
    }
    for (let i = 0; i < childFrameEntries.length; i += 1) for (let j = i + 1; j < childFrameEntries.length; j += 1) {
      if (intersects(childFrameEntries[i]!.frame, childFrameEntries[j]!.frame)) diagnostics.push(diagnostic('LAYOUT_CHILD_OVERLAP', 'warning', `Children ${childFrameEntries[i]!.node.id} and ${childFrameEntries[j]!.node.id} overlap`, { path: node.id, provenance: node.provenance }));
    }
  }
  for (const child of node.children) extractNode(child, contract, sourceFrame, output, diagnostics);
}

export function extractLayoutContracts(document: DesignDocument): LayoutContractDocument {
  const nodes: LayoutNodeContract[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const node of document.nodes) extractNode(node, undefined, undefined, nodes, diagnostics);
  return { documentId: document.id, nodes, diagnostics };
}
