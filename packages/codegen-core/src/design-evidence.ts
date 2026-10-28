import type { DesignDocument, DesignNode, DesignStyle } from '../../core/src/design-ast.ts';
import { diagnostic, type Diagnostic, type SourceProvenance } from '../../core/src/diagnostics.ts';
import { mapNativePattern, type NativePattern } from '../../native-patterns/src/mapper.ts';

export type DesignEvidenceKind = 'screen' | 'component' | 'asset';
export type EvidenceVerificationMethod = 'screen-contract' | 'source-node' | 'runtime-snapshot' | 'visual-reference';

export interface DesignEvidenceEntry {
  kind: DesignEvidenceKind;
  nodeId: string;
  title: string;
  frame?: { x: number; y: number; width: number; height: number };
  style?: DesignStyle;
  assetRef?: string;
  nativePattern?: NativePattern;
  nativeEvidence?: string[];
  verificationMethod: EvidenceVerificationMethod;
  provenance: SourceProvenance[];
}

export interface DesignEvidenceChecklist {
  version: '1.0';
  source: string;
  entries: DesignEvidenceEntry[];
  diagnostics: Diagnostic[];
}

function frameOf(node: DesignNode): DesignEvidenceEntry['frame'] | undefined {
  const layout = node.layout;
  if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number') return undefined;
  return { x: layout.x ?? 0, y: layout.y ?? 0, width: layout.width, height: layout.height };
}

function provenanceOf(node: DesignNode, source: string): SourceProvenance[] {
  return node.provenance.length > 0
    ? node.provenance
    : [{ source: 'fig', reference: source, field: `node:${node.id}` }];
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

function isAsset(node: DesignNode, document: DesignDocument): boolean {
  return node.type === 'IMAGE'
    || !!node.assetRef
    || document.assets.some((asset) => asset.sourceNodeId === node.id);
}

export function buildDesignEvidence(
  document: DesignDocument,
  screenNodeIds: string[],
  source: string,
): DesignEvidenceChecklist {
  const entries: DesignEvidenceEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  const addNode = (node: DesignNode, kind: DesignEvidenceKind) => {
    const frame = frameOf(node);
    if (!frame) {
      diagnostics.push(diagnostic('DESIGN_EVIDENCE_FRAME_REQUIRED', 'warning', `Evidence node has no measurable frame: ${node.id}`, {
        path: node.id,
        provenance: provenanceOf(node, source),
      }));
    }
    const mapped = mapNativePattern(node);
    entries.push({
      kind,
      nodeId: node.id,
      title: node.name || node.id,
      ...(frame ? { frame } : {}),
      ...(node.style ? { style: node.style } : {}),
      ...(node.assetRef ? { assetRef: node.assetRef } : {}),
      nativePattern: mapped.pattern,
      ...(mapped.evidence ? { nativeEvidence: mapped.evidence } : {}),
      verificationMethod: 'screen-contract',
      provenance: provenanceOf(node, source),
    });
  };

  for (const screenNodeId of screenNodeIds) {
    const screen = findNode(document.nodes, screenNodeId);
    if (!screen) {
      diagnostics.push(diagnostic('DESIGN_EVIDENCE_SCREEN_NOT_FOUND', 'error', `Screen node not found: ${screenNodeId}`, { path: screenNodeId }));
      continue;
    }
    addNode(screen, 'screen');
    for (const node of descendants(screen)) {
      addNode(node, isAsset(node, document) ? 'asset' : 'component');
    }
  }

  return { version: '1.0', source, entries, diagnostics };
}
