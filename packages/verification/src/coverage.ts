import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import type { AuditEntry } from '../../design-package/src/schema.ts';

export type NodeCoverageKind = 'generated' | 'asset' | 'unsupported' | 'ignored-with-reason';
export type CoverageStatus = 'generated' | 'blocked';

export interface NodeCoverageEntry {
  sourceNodeId: string;
  kind: NodeCoverageKind;
  reason?: string;
}

export interface FlowCoverageEntry {
  kind: 'screen' | 'state' | 'transition';
  id: string;
  status: CoverageStatus;
  reason?: string;
}

export interface CoverageReport {
  nodes: {
    total: number;
    entries: NodeCoverageEntry[];
    byKind: Record<NodeCoverageKind, number>;
  };
  flow: {
    screens: FlowCoverageEntry[];
    states: FlowCoverageEntry[];
    transitions: FlowCoverageEntry[];
  };
  audit: AuditEntry[];
}

export interface CoverageInput {
  design: DesignDocument;
  flow: FlowIR;
  assetNodeIds?: string[];
  ignoredNodeReasons?: Record<string, string>;
}

function allNodes(nodes: DesignNode[]): DesignNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children)]);
}

function auditEntry(reason: string, source: string, blocking: boolean): AuditEntry {
  return {
    severity: blocking ? 'blocked' : 'warning',
    source: { reference: source },
    pipelineStage: 'Analyze',
    reason,
    affectedOutput: 'coverage.json',
    blocking,
  };
}

export function buildCoverageReport(input: CoverageInput): CoverageReport {
  const assets = new Set(input.assetNodeIds ?? []);
  const ignored = input.ignoredNodeReasons ?? {};
  const audit: AuditEntry[] = [];
  const entries = allNodes(input.design.nodes).map((node): NodeCoverageEntry => {
    const ignoredReason = ignored[node.id];
    if (ignoredReason) {
      audit.push(auditEntry(`Node ${node.id} ignored: ${ignoredReason}`, `design:${node.id}`, false));
      return { sourceNodeId: node.id, kind: 'ignored-with-reason', reason: ignoredReason };
    }
    if (node.type === 'UNKNOWN' || node.unsupportedProperties.length > 0) {
      const reason = `Node ${node.id} has unsupported mapping: ${node.unsupportedProperties.join(', ') || 'unknown node type'}`;
      audit.push(auditEntry(reason, `design:${node.id}`, false));
      return { sourceNodeId: node.id, kind: 'unsupported', reason };
    }
    if (assets.has(node.id) || node.assetRef) return { sourceNodeId: node.id, kind: 'asset' };
    return { sourceNodeId: node.id, kind: 'generated' };
  });
  const byKind: Record<NodeCoverageKind, number> = {
    generated: 0, asset: 0, unsupported: 0, 'ignored-with-reason': 0,
  };
  for (const entry of entries) byKind[entry.kind] += 1;

  const designNodeIds = new Set(allNodes(input.design.nodes).map((node) => node.id));
  const screenStatus = input.flow.screens.map((screen): FlowCoverageEntry => {
    const status = screen.designNodeId && designNodeIds.has(screen.designNodeId) ? 'generated' : 'blocked';
    const reason = status === 'blocked' ? `Screen ${screen.id} has no resolved design root` : undefined;
    if (reason) audit.push(auditEntry(reason, `flow:screen:${screen.id}`, true));
    return { kind: 'screen', id: screen.id, status, ...(reason ? { reason } : {}) };
  });
  const screenIds = new Set(input.flow.screens.filter((screen) => screenStatus.find((entry) => entry.id === screen.id)?.status === 'generated').map((screen) => screen.id));
  const stateCoverage = input.flow.states.map((state): FlowCoverageEntry => {
    const status = screenIds.has(state.screenId) ? 'generated' : 'blocked';
    const reason = status === 'blocked' ? `State ${state.name} has no generated screen ${state.screenId}` : undefined;
    if (reason) audit.push(auditEntry(reason, `flow:state:${state.screenId}:${state.name}`, true));
    return { kind: 'state', id: `${state.screenId}:${state.name}`, status, ...(reason ? { reason } : {}) };
  });
  const transitionCoverage = input.flow.transitions.map((transition): FlowCoverageEntry => {
    const status = screenIds.has(transition.from) && screenIds.has(transition.to) ? 'generated' : 'blocked';
    const reason = status === 'blocked' ? `Transition ${transition.from} -> ${transition.to} has an uncovered endpoint` : undefined;
    if (reason) audit.push(auditEntry(reason, `flow:transition:${transition.from}:${transition.event}`, true));
    return { kind: 'transition', id: `${transition.from}:${transition.event}:${transition.to}`, status, ...(reason ? { reason } : {}) };
  });

  return {
    nodes: { total: entries.length, entries, byKind },
    flow: { screens: screenStatus, states: stateCoverage, transitions: transitionCoverage },
    audit,
  };
}
