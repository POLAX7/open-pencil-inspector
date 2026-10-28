import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateNavigationGate, evaluateSemanticTreeGate } from '../src/runtime-gates.ts';
import { buildRuntimeRoutePlan } from '../src/runtime-route-plan.ts';

test('semantic UI tree gate distinguishes missing evidence from missing identifiers', () => {
  assert.equal(evaluateSemanticTreeGate(['home', 'save']).status, 'pending');
  assert.equal(evaluateSemanticTreeGate(['home', 'save'], ['home']).status, 'blocked');
  assert.equal(evaluateSemanticTreeGate(['home'], ['home', 'save']).status, 'pass');
});

test('navigation gate requires the observed route sequence to match the Flow expectation', () => {
  assert.equal(evaluateNavigationGate(['home', 'detail']).status, 'pending');
  assert.equal(evaluateNavigationGate(['home', 'detail'], ['home', 'payment']).status, 'blocked');
  assert.equal(evaluateNavigationGate(['home', 'detail'], ['home', 'detail']).status, 'pass');
});

test('runtime route plan exposes only confirmed transitions and preserves unresolved actions', () => {
  const plan = buildRuntimeRoutePlan({
    version: '1.0',
    screens: [{ id: 'home', presentation: 'root', provenance: [] }, { id: 'payment', presentation: 'push', provenance: [] }],
    transitions: [{ from: 'home', event: 'tap order', to: 'payment', provenance: [] }],
    actions: [{ screenId: 'home', nodeId: 'profile', event: 'tap profile', effect: 'interactive-without-destination', provenance: [] }],
    states: [], conflicts: [], diagnostics: [],
  });
  assert.deepEqual(plan.cases, [{ id: 'route-1', from: 'home', event: 'tap order', to: 'payment', kind: 'push' }]);
  assert.equal(plan.unresolvedActions[0]?.reason, 'interactive-without-destination');
});
