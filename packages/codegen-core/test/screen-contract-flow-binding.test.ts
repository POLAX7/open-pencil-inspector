import test from 'node:test';
import assert from 'node:assert/strict';
import { bindScreenContractsToFlow } from '../src/screen-contract-flow-binding.ts';

const contract = {
  id: 'food-details',
  designNodeId: 'details',
  screenSize: { width: 360, height: 800 },
  safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 },
  contentPadding: [0, 0, 0, 0] as [number, number, number, number],
  components: [{ id: 'order', nodeId: 'order', kind: 'button', frame: { x: 10, y: 700, width: 200, height: 48 }, provenance: [{ source: 'fig' as const, reference: 'details#order' }] }],
  assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'fig' as const, reference: 'details' }],
};

test('binds a confirmed transition to its evidence-backed Screen Contract node', () => {
  const result = bindScreenContractsToFlow([contract], {
    version: '1.0',
    screens: [{ id: 'food-details', designNodeId: 'details', provenance: [] }, { id: 'payment-address', designNodeId: 'payment', provenance: [] }],
    transitions: [{ from: 'food-details', event: 'tap Order Now', to: 'payment-address', nodeId: 'order', provenance: [{ source: 'inferred', reference: 'confirmation:decision:order' }] }],
    states: [], conflicts: [], diagnostics: [],
  });
  assert.deepEqual(result[0]?.interactions, [{
    id: 'flow-interaction-1', nodeId: 'order', event: 'tap Order Now',
    transition: { to: 'payment-address', kind: 'push' },
    provenance: [{ source: 'inferred', reference: 'confirmation:decision:order', field: 'confirmed-flow.nodeId' }],
  }]);
});

test('blocks binding when a confirmed transition has no unique source node', () => {
  assert.throws(() => bindScreenContractsToFlow([contract], {
    version: '1.0',
    screens: [{ id: 'food-details', designNodeId: 'details', provenance: [] }, { id: 'payment-address', designNodeId: 'payment', provenance: [] }],
    transitions: [{ from: 'food-details', event: 'tap Order Now', to: 'payment-address', provenance: [] }],
    states: [], conflicts: [], diagnostics: [],
  }), /requires an evidence-backed nodeId/);
});
