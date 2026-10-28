import test from 'node:test';
import assert from 'node:assert/strict';
import type { ConfirmationEnvelope, FlowDecision } from '../src/contracts.ts';
import { compileConfirmedFlow, confirmEnvelope, saveDecisions, validateDecisions } from '../src/decisions.ts';
import { calculateCandidateHash } from '../src/propose.ts';

function candidate(): ConfirmationEnvelope {
  const value: Omit<ConfirmationEnvelope, 'candidateHash'> = {
    version: '1.0', status: 'candidate', source: { file: 'FoodApp.fig', parser: 'open-pencil-cli@0.16.0' },
    flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'payment', provenance: [] }, { id: 'order-confirmation', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
    questions: [
      { id: 'pay-now', kind: 'transition', screen: 'payment', prompt: 'Pay now?', evidence: ['design-node:pay'], blocking: true },
      { id: 'popup-ok', kind: 'transition', screen: 'order-confirmation', prompt: 'OK?', evidence: ['design-node:ok'], blocking: true },
    ], decisions: [], revision: 1, staleReasons: [],
  };
  return { ...value, candidateHash: calculateCandidateHash(value) };
}

function decision(questionId: string, from: string, event: string, to: string): FlowDecision {
  return { questionId, answer: { from, event, to }, provenance: [{ source: 'user', reference: `answers#${questionId}` }], revision: 1 };
}

test('compileConfirmedFlow preserves the confirmed interaction source node on a transition', () => {
  const base = candidate();
  const transitionCandidate = {
    ...base,
    questions: [{ id: 'pay-now', kind: 'transition' as const, screen: 'payment', prompt: 'Pay now?', evidence: ['design-node:pay-button'], blocking: true }],
    candidateHash: '',
  };
  const hashed = { ...transitionCandidate, candidateHash: calculateCandidateHash(transitionCandidate) };
  const draft = saveDecisions(hashed, [{
    questionId: 'pay-now',
    answer: { from: 'payment', event: 'tap pay now', to: 'order-confirmation', nodeId: 'pay-button' },
    provenance: [{ source: 'user', reference: 'test' }],
    revision: 1,
  }]);
  const flow = compileConfirmedFlow(confirmEnvelope(draft));
  assert.equal(flow.transitions[0]?.nodeId, 'pay-button');
});

test('compileConfirmedFlow derives a transition node from unique question evidence', () => {
  const base = candidate();
  const transitionCandidate = {
    ...base,
    questions: [{ id: 'pay-now', kind: 'transition' as const, screen: 'payment', prompt: 'Pay now?', evidence: ['design-node:pay-button'], blocking: true }],
    candidateHash: '',
  };
  const hashed = { ...transitionCandidate, candidateHash: calculateCandidateHash(transitionCandidate) };
  const draft = saveDecisions(hashed, [{
    questionId: 'pay-now',
    answer: { from: 'payment', event: 'tap pay now', to: 'order-confirmation' },
    provenance: [{ source: 'user', reference: 'test' }],
    revision: 1,
  }]);
  assert.equal(compileConfirmedFlow(confirmEnvelope(draft)).transitions[0]?.nodeId, 'pay-button');
});

test('partial decisions create a new candidate revision and remain unconfirmed', () => {
  const draft = saveDecisions(candidate(), [decision('pay-now', 'payment', 'tap pay now', 'order-confirmation')]);
  assert.equal(draft.status, 'candidate');
  assert.equal(draft.revision, 2);
  assert.equal(draft.parentRevision, 1);
  assert.deepEqual(validateDecisions(draft, []).blockingQuestionIds, ['popup-ok']);
});

test('confirmation creates an immutable confirmed revision only after all blocking answers', () => {
  const first = saveDecisions(candidate(), [decision('pay-now', 'payment', 'tap pay now', 'order-confirmation')]);
  assert.throws(() => confirmEnvelope(first), /Unresolved blocking questions/);
  const second = saveDecisions(first, [decision('popup-ok', 'order-confirmation', 'tap ok', 'home')]);
  const confirmed = confirmEnvelope(second);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.revision, 4);
  assert.equal(confirmed.parentRevision, 3);
  assert.throws(() => saveDecisions(confirmed, []), /Only candidate envelopes/);
  assert.deepEqual(compileConfirmedFlow(confirmed).transitions.map((item) => `${item.from}->${item.to}`), ['payment->order-confirmation', 'order-confirmation->home']);
});

test('compileConfirmedFlow preserves an action-only decision without creating a transition', () => {
  const base = candidate();
  const withoutOtherQuestion = {
    ...base,
    questions: [{ id: 'edit-profile', kind: 'transition' as const, screen: 'payment', prompt: 'Edit Profile behavior?', evidence: ['design-node:edit-profile'], blocking: true }],
    candidateHash: '',
  };
  const actionCandidate = { ...withoutOtherQuestion, candidateHash: calculateCandidateHash(withoutOtherQuestion) };
  const draft = saveDecisions(actionCandidate, [{
    questionId: 'edit-profile',
    answer: { from: 'payment', event: 'tap Edit Profile', effect: 'interactive-without-destination', nodeId: 'edit-profile' },
    provenance: [{ source: 'user', reference: 'test' }],
    revision: 1,
  }]);
  const confirmed = confirmEnvelope(draft);
  const flow = compileConfirmedFlow(confirmed);

  assert.equal(flow.transitions.length, 0);
  assert.deepEqual(flow.actions, [{
    screenId: 'payment', nodeId: 'edit-profile', event: 'tap Edit Profile', effect: 'interactive-without-destination',
    provenance: [{ source: 'natural-language', reference: 'confirmation:decision:edit-profile' }],
  }]);
});

test('stale candidate hash blocks decision persistence', () => {
  const stale = { ...candidate(), candidateHash: 'sha256:stale' };
  assert.throws(() => saveDecisions(stale, []), /Candidate hash mismatch/);
});
