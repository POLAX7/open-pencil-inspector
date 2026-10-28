export interface FlowProvenance {
  source: 'yaml' | 'json' | 'markdown' | 'natural-language' | 'fig' | 'inferred';
  reference: string;
  field?: string;
}

export interface FlowScreen {
  id: string;
  title?: string;
  designNodeId?: string;
  presentation?: 'push' | 'modal' | 'sheet' | 'replace' | 'root';
  provenance: FlowProvenance[];
}

export interface FlowTransition {
  from: string;
  event: string;
  to: string;
  nodeId?: string;
  effect?: string;
  parameters?: string[];
  provenance: FlowProvenance[];
}

export interface FlowAction {
  screenId: string;
  nodeId?: string;
  event: string;
  effect: string;
  provenance: FlowProvenance[];
}

export interface FlowState {
  screenId: string;
  name: string;
  fields?: string[];
  provenance: FlowProvenance[];
}

export interface FlowConflict {
  path: string;
  message: string;
  sources: FlowProvenance[];
}

export interface FlowIR {
  version: '1.0';
  screens: FlowScreen[];
  transitions: FlowTransition[];
  actions?: FlowAction[];
  states: FlowState[];
  conflicts: FlowConflict[];
  diagnostics: string[];
}

export function canonicalizeFlow(flow: FlowIR): string {
  return JSON.stringify({
    version: flow.version,
    screens: flow.screens,
    transitions: flow.transitions,
    actions: flow.actions ?? [],
    states: flow.states,
    conflicts: flow.conflicts,
    diagnostics: flow.diagnostics,
  });
}
