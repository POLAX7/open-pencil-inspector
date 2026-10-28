import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFlowIR } from '../src/flow-schema.ts';

const provenance = [{ source: 'json' as const, reference: 'flow.json' }];

test('Flow schema validates nested screen, transition, and state contracts', () => {
  const flow = validateFlowIR({
    version: '1.0',
    screens: [{ id: 'login', title: 'Login', designNodeId: 'node-1', presentation: 'root', provenance }],
    transitions: [{ from: 'login', event: 'submit', to: 'home', effect: 'showLoading', parameters: ['email'], provenance }],
    states: [{ screenId: 'login', name: 'loading', fields: ['message'], provenance }],
    conflicts: [],
    diagnostics: [],
  });

  assert.equal(flow.transitions[0]?.effect, 'showLoading');
  assert.deepEqual(flow.states[0]?.fields, ['message']);
  assert.match(flow.diagnostics[0] ?? '', /Unresolved transition target: home/);
});

test('Flow schema rejects missing required nested fields instead of returning partial IR', () => {
  assert.throws(() => validateFlowIR({ version: '1.0', screens: [{ provenance }], transitions: [], states: [], conflicts: [], diagnostics: [] }), /screens\[0\]\.id/);
  assert.throws(() => validateFlowIR({ version: '1.0', screens: [{ id: 'login', provenance }], transitions: [{ from: 'login', to: 'home', provenance }], states: [], conflicts: [], diagnostics: [] }), /transitions\[0\]\.event/);
  assert.throws(() => validateFlowIR({ version: '1.0', screens: [{ id: 'login', provenance: [] }], transitions: [], states: [{ screenId: 'login', name: 'loading' }], conflicts: [], diagnostics: [] }), /states\[0\]\.provenance/);
});
