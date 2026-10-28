import type { FlowIR } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';

export interface MergeFlowOptions {
  precedence?: 'base' | 'overlay';
}

function canonicalTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function mergeFlowSources(base: FlowIR, overlay: FlowIR, reference = 'merge', options: MergeFlowOptions = {}): FlowIR {
  const precedence = options.precedence ?? 'overlay';
  const conflicts = [...base.conflicts, ...overlay.conflicts];
  const screens = [...base.screens];
  for (const incoming of overlay.screens) {
    const existing = screens.find((screen) => screen.id === incoming.id);
    if (!existing) screens.push(incoming);
    else if (existing.title !== incoming.title && existing.title && incoming.title && canonicalTitle(existing.title) !== canonicalTitle(incoming.title)) {
      conflicts.push({ path: `screens.${incoming.id}.title`, message: `Conflicting screen titles: ${existing.title} vs ${incoming.title}`, sources: [...existing.provenance, ...incoming.provenance] });
      if (precedence === 'overlay') screens[screens.indexOf(existing)] = incoming;
    }
  }
  const transitions = [...base.transitions];
  for (const incoming of overlay.transitions) {
    const duplicate = transitions.find((item) => item.from === incoming.from && item.event === incoming.event);
    if (!duplicate) transitions.push(incoming);
    else if (duplicate.to !== incoming.to) {
      conflicts.push({ path: `transitions.${incoming.from}.${incoming.event}`, message: `Conflicting transition targets: ${duplicate.to} vs ${incoming.to}`, sources: [...duplicate.provenance, ...incoming.provenance] });
      if (precedence === 'overlay') transitions[transitions.indexOf(duplicate)] = incoming;
    }
  }
  return validateFlowIR({
    version: '1.0', screens, transitions, states: [...base.states, ...overlay.states], conflicts,
    diagnostics: [...base.diagnostics, ...overlay.diagnostics],
  });
}
