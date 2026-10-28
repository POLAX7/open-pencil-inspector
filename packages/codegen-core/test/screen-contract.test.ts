import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScreenContract, type ScreenContract } from '../src/screen-contract.ts';

function validContract(): ScreenContract {
  return {
    id: 'home',
    designNodeId: 'node-home',
    screenSize: { width: 390, height: 844 },
    safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 },
    contentPadding: [16, 16, 16, 16],
    components: [{ id: 'title', nodeId: 'node-title', kind: 'text', frame: { x: 16, y: 16, width: 100, height: 24 }, provenance: [{ source: 'fig', reference: 'node-title' }] }],
    assets: [],
    interactions: [{ id: 'open-profile', nodeId: 'node-avatar', event: 'tap', transition: { to: 'profile', kind: 'push' }, provenance: [{ source: 'spec', reference: 'flow.md#open-profile' }] }],
    unresolvedQuestions: [],
    provenance: [{ source: 'fig', reference: 'FoodApp.fig#node-home' }],
  };
}

test('validates a screen contract with traceable geometry and interaction provenance', () => {
  const result = validateScreenContract(validContract());
  assert.deepEqual(result, []);
});

test('blocks generation when a component frame or interaction transition is missing', () => {
  const contract = validContract();
  contract.components[0]!.frame = undefined;
  contract.interactions[0]!.transition = undefined;
  const result = validateScreenContract(contract);
  assert.deepEqual(result.map((item) => item.code), ['SCREEN_COMPONENT_FRAME_REQUIRED', 'SCREEN_INTERACTION_TRANSITION_REQUIRED']);
  assert.ok(result.every((item) => item.severity === 'error'));
});

test('requires unresolved questions to be explicit rather than silently guessing flow', () => {
  const contract = validContract();
  contract.unresolvedQuestions = [{ id: 'q1', question: 'Does checkout present a sheet?', status: 'unconfirmed', provenance: [{ source: 'fig', reference: 'node-checkout' }] }];
  const result = validateScreenContract(contract);
  assert.deepEqual(result.map((item) => item.code), ['SCREEN_UNRESOLVED_QUESTION']);
  assert.equal(result[0]?.severity, 'error');
});
