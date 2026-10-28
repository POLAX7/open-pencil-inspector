import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFlowSources } from '../src/merge-flow.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';

const flow = (to: string): FlowIR => ({ version: '1.0', screens: [{ id: 'login', provenance: [{ source: 'yaml', reference: 'a' }] }], transitions: [{ from: 'login', event: 'submit', to, provenance: [{ source: 'yaml', reference: 'a' }] }], states: [], conflicts: [], diagnostics: [] });

test('merge preserves unique screens and transitions', () => {
  const merged = mergeFlowSources(flow('home'), { ...flow('home'), screens: [{ id: 'home', provenance: [{ source: 'json', reference: 'b' }] }] });
  assert.deepEqual(merged.screens.map((screen) => screen.id), ['login', 'home']);
  assert.equal(merged.transitions.length, 1);
});

test('merge records conflicting route targets instead of silently replacing one', () => {
  const merged = mergeFlowSources(flow('home'), flow('dashboard'));
  assert.equal(merged.conflicts.length, 1);
  assert.match(merged.conflicts[0]?.message ?? '', /home vs dashboard/);
});

test('structured overlay precedence selects its values while retaining conflict provenance', () => {
  const base = {
    ...flow('home'),
    screens: [{ id: 'login', title: 'Inferred login', provenance: [{ source: 'fig' as const, reference: 'design.fig' }] }],
  };
  const overlay = {
    ...flow('detail'),
    screens: [{ id: 'login', title: 'Login screen', provenance: [{ source: 'json' as const, reference: 'flow.json' }] }],
    transitions: [{ from: 'login', event: 'submit', to: 'detail', provenance: [{ source: 'json' as const, reference: 'flow.json' }] }],
  };
  const merged = mergeFlowSources(base, overlay, 'flow.json', { precedence: 'overlay' });

  assert.equal(merged.screens[0]?.title, 'Login screen');
  assert.equal(merged.transitions[0]?.to, 'detail');
  assert.equal(merged.conflicts.length, 2);
  assert.ok(merged.conflicts[0]?.sources.some((source) => source.source === 'json'));
});
