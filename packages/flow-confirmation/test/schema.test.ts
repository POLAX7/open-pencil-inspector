import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeConfirmationEnvelope, validateConfirmationEnvelope } from '../src/schema.ts';
import type { ConfirmationEnvelope } from '../src/contracts.ts';

function envelope(overrides: Partial<ConfirmationEnvelope> = {}): ConfirmationEnvelope {
  return {
    version: '1.0', status: 'candidate', source: { file: 'FoodApp.fig', parser: 'open-pencil-cli@0.16.0' }, candidateHash: 'sha256:candidate',
    flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
    questions: [{ id: 'payment-submit', kind: 'transition', screen: 'payment', prompt: 'Pay now goes where?', options: ['payment', 'home'], evidence: ['design-node:0:469'], blocking: true }],
    decisions: [], revision: 1, staleReasons: [], ...overrides,
  };
}

test('confirmation envelope reports unresolved blocking questions without rejecting a candidate', () => {
  const result = validateConfirmationEnvelope(envelope());
  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingQuestionIds, ['payment-submit']);
});

test('confirmed envelope rejects unresolved questions and unknown decision targets', () => {
  const result = validateConfirmationEnvelope(envelope({ status: 'confirmed', decisions: [{ questionId: 'payment-submit', answer: { to: 'missing-screen' }, provenance: [{ source: 'user', reference: 'answer-1' }], revision: 1 }] }));
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /Decision target screen does not exist/);
});

test('schema rejects duplicate question IDs and invalid revision metadata', () => {
  assert.throws(() => validateConfirmationEnvelope(envelope({ revision: 0 })), /revision/);
  const result = validateConfirmationEnvelope(envelope({ questions: [envelope().questions[0]!, envelope().questions[0]!] }));
  assert.match(result.errors.join('\n'), /Duplicate question ID/);
});

test('canonical confirmation envelope is stable for regeneration', () => {
  const first = envelope();
  const second = { ...envelope(), questions: [...envelope().questions] };
  assert.equal(canonicalizeConfirmationEnvelope(first), canonicalizeConfirmationEnvelope(second));
});

test('schema rejects a selection fingerprint that no longer matches its manifest', () => {
  const selection = { version: '1.0' as const, source: 'design.fig', page: { id: 'p', name: 'Screens' }, rootNodes: [{ id: 'r', name: 'Home', type: 'FRAME' }], scope: 'selected-subtree' as const };
  assert.throws(() => validateConfirmationEnvelope(envelope({ selection: { manifest: selection, fingerprint: 'sha256:stale' } })), /selection\.fingerprint/);
});
