import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import { diagnostic, type Diagnostic, type SourceProvenance } from '../../core/src/diagnostics.ts';
import { mapNativePattern, type NativePattern } from './mapper.ts';

export interface NativePatternMappingEntry {
  nodeId: string;
  pattern: NativePattern;
  evidence: string[];
  verificationMethod: 'design-ast';
  provenance: SourceProvenance[];
}

export interface NativePatternMappingReport {
  version: '1.0';
  source: string;
  entries: NativePatternMappingEntry[];
  diagnostics: Diagnostic[];
}

export function assertValidNativePatternMapping(report: NativePatternMappingReport): void {
  const seen = new Set<string>();
  for (const entry of report.entries) {
    if (seen.has(entry.nodeId)) throw new Error(`NATIVE_PATTERN_MAPPING_BLOCKED: duplicate mapping for node ${entry.nodeId}`);
    seen.add(entry.nodeId);
    if (entry.pattern === 'unknown' || entry.evidence.length === 0) {
      throw new Error(`NATIVE_PATTERN_MAPPING_BLOCKED: node ${entry.nodeId} has no evidence-backed native pattern`);
    }
  }
}

function findNode(nodes: DesignNode[], id: string): DesignNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function provenanceOf(node: DesignNode, source: string): SourceProvenance[] {
  return node.provenance.length > 0
    ? node.provenance
    : [{ source: 'fig', reference: source, field: `node:${node.id}` }];
}

function descendants(node: DesignNode): DesignNode[] {
  return [node, ...node.children.flatMap((child) => descendants(child))];
}

export function buildNativePatternMapping(
  document: DesignDocument,
  screenNodeIds: string[],
  source: string,
  assetNodeIds: Set<string> = new Set(),
): NativePatternMappingReport {
  const entries: NativePatternMappingEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const screenNodeId of screenNodeIds) {
    const screen = findNode(document.nodes, screenNodeId);
    if (!screen) {
      diagnostics.push(diagnostic('NATIVE_PATTERN_SCREEN_NOT_FOUND', 'error', `Screen node not found: ${screenNodeId}`, { path: screenNodeId }));
      continue;
    }
    for (const node of descendants(screen)) {
      const mapped = mapNativePattern(node);
      const isContractAsset = assetNodeIds.has(node.id);
      if (mapped.warning && !isContractAsset) diagnostics.push(mapped.warning);
      entries.push({
        nodeId: node.id,
        pattern: isContractAsset ? 'image' : mapped.pattern,
        evidence: isContractAsset ? ['screen-contract-asset'] : (mapped.evidence ?? []),
        verificationMethod: 'design-ast',
        provenance: provenanceOf(node, source),
      });
    }
  }
  return { version: '1.0', source, entries, diagnostics };
}
