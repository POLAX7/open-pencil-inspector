import type { FlowIR } from './flow-ir.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function requiredProvenance(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new TypeError(`${path}.provenance must be an array`);
}

export function validateFlowIR(input: unknown): FlowIR {
  if (!isRecord(input)) throw new TypeError('Flow IR must be an object');
  const value = input;
  if (value.version !== '1.0') throw new TypeError('Flow IR version must be 1.0');
  for (const field of ['screens', 'transitions', 'states', 'conflicts', 'diagnostics']) {
    if (!Array.isArray(value[field])) throw new TypeError(`Flow IR ${field} must be an array`);
  }
  for (const [index, screen] of value.screens.entries()) {
    if (!isRecord(screen)) throw new TypeError(`screens[${index}] must be an object`);
    requiredString(screen.id, `screens[${index}].id`);
    requiredProvenance(screen.provenance, `screens[${index}]`);
    if (screen.title !== undefined) requiredString(screen.title, `screens[${index}].title`);
    if (screen.designNodeId !== undefined) requiredString(screen.designNodeId, `screens[${index}].designNodeId`);
    if (screen.presentation !== undefined && !['push', 'modal', 'sheet', 'replace', 'root'].includes(String(screen.presentation))) {
      throw new TypeError(`screens[${index}].presentation is invalid`);
    }
  }
  const screenIds = new Set(value.screens.map((screen) => isRecord(screen) && typeof screen.id === 'string' ? screen.id : ''));
  const diagnostics = [...value.diagnostics] as string[];
  const actions = value.actions === undefined ? [] : value.actions;
  if (!Array.isArray(actions)) throw new TypeError('Flow IR actions must be an array');
  for (const [index, action] of actions.entries()) {
    if (!isRecord(action)) throw new TypeError(`actions[${index}] must be an object`);
    requiredString(action.screenId, `actions[${index}].screenId`);
    requiredString(action.event, `actions[${index}].event`);
    requiredString(action.effect, `actions[${index}].effect`);
    requiredProvenance(action.provenance, `actions[${index}]`);
    if (action.nodeId !== undefined) requiredString(action.nodeId, `actions[${index}].nodeId`);
    if (!screenIds.has(action.screenId)) diagnostics.push(`Unresolved action screen: ${action.screenId}`);
  }
  for (const [index, transition] of value.transitions.entries()) {
    if (!isRecord(transition)) throw new TypeError(`transitions[${index}] must be an object`);
    requiredString(transition.from, `transitions[${index}].from`);
    requiredString(transition.event, `transitions[${index}].event`);
    const target = requiredString(transition.to, `transitions[${index}].to`);
    requiredProvenance(transition.provenance, `transitions[${index}]`);
    if (transition.nodeId !== undefined) requiredString(transition.nodeId, `transitions[${index}].nodeId`);
    if (transition.effect !== undefined) requiredString(transition.effect, `transitions[${index}].effect`);
    if (transition.parameters !== undefined && (!Array.isArray(transition.parameters) || transition.parameters.some((item) => typeof item !== 'string'))) {
      throw new TypeError(`transitions[${index}].parameters must be an array of strings`);
    }
    if (!screenIds.has(target) && !diagnostics.some((item) => item.includes(`Unresolved transition target: ${target}`))) {
      diagnostics.push(`Unresolved transition target: ${target}`);
    }
  }
  for (const [index, state] of value.states.entries()) {
    if (!isRecord(state)) throw new TypeError(`states[${index}] must be an object`);
    requiredString(state.screenId, `states[${index}].screenId`);
    requiredString(state.name, `states[${index}].name`);
    requiredProvenance(state.provenance, `states[${index}]`);
    if (state.fields !== undefined && (!Array.isArray(state.fields) || state.fields.some((item) => typeof item !== 'string'))) {
      throw new TypeError(`states[${index}].fields must be an array of strings`);
    }
  }
  for (const [index, conflict] of value.conflicts.entries()) {
    if (!isRecord(conflict)) throw new TypeError(`conflicts[${index}] must be an object`);
    requiredString(conflict.path, `conflicts[${index}].path`);
    requiredString(conflict.message, `conflicts[${index}].message`);
    if (!Array.isArray(conflict.sources)) throw new TypeError(`conflicts[${index}].sources must be an array`);
  }
  if (diagnostics.some((item) => typeof item !== 'string')) throw new TypeError('Flow IR diagnostics must contain only strings');
  return { ...input, actions: actions as FlowIR['actions'], diagnostics } as FlowIR;
}
