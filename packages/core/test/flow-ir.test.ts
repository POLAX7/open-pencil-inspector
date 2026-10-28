import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeFlow } from '../src/flow-ir.ts';
import { validateFlowIR } from '../src/flow-schema.ts';

test('Flow IR records screens, transitions, states, and provenance', () => {
  const flow = validateFlowIR({
    version: '1.0',
    screens: [{ id: 'login', provenance: [{ source: 'yaml', reference: 'login.yaml' }] }],
    transitions: [{ from: 'login', event: 'submit', to: 'home', provenance: [{ source: 'yaml', reference: 'login.yaml' }] }],
    states: [], conflicts: [], diagnostics: [],
  });
  assert.equal(flow.transitions[0]?.to, 'home');
  assert.equal(flow.screens[0]?.provenance[0]?.source, 'yaml');
});

test('Flow IR preserves confirmed action-only interactions without inventing a destination', () => {
  const flow = validateFlowIR({
    version: '1.0',
    screens: [{ id: 'profile', provenance: [] }],
    transitions: [],
    actions: [{ screenId: 'profile', nodeId: 'edit-profile', event: 'tap Edit Profile', effect: 'interactive-without-destination', provenance: [] }],
    states: [], conflicts: [], diagnostics: [],
  });

  assert.equal(flow.actions?.[0]?.screenId, 'profile');
  assert.equal(flow.transitions.length, 0);
});

test('canonical Flow IR is stable for regeneration', () => {
  const flow = { version: '1.0' as const, screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] };
  assert.equal(canonicalizeFlow(flow), canonicalizeFlow({ ...flow }));
});

test('invalid Flow IR fails before codegen can consume it', () => {
  assert.throws(() => validateFlowIR({ version: '2.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] }), /version/);
  assert.throws(() => validateFlowIR({ version: '1.0', screens: [] }), /transitions/);
});
