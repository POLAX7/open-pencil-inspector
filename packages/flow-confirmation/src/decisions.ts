import type { FlowAction, FlowIR, FlowTransition } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';
import type { ConfirmationEnvelope, ConfirmationValidationResult, FlowDecision } from './contracts.ts';
import { calculateCandidateHash } from './propose.ts';
import { validateConfirmationEnvelope } from './schema.ts';
import { selectionFingerprint, type SelectionManifest } from '../../core/src/selection-scope.ts';

function assertCandidateHash(candidate: ConfirmationEnvelope): void {
  const { candidateHash, ...withoutHash } = candidate;
  const expected = calculateCandidateHash(withoutHash);
  if (candidateHash !== expected) throw new Error(`Candidate hash mismatch: expected ${expected}, received ${candidateHash}`);
}

function nextRevision(candidate: ConfirmationEnvelope): number {
  return candidate.revision + 1;
}

export function validateDecisions(candidate: ConfirmationEnvelope, decisions: FlowDecision[]): ConfirmationValidationResult {
  const next = applyDecisions(candidate, decisions, false);
  return validateConfirmationEnvelope(next);
}

function applyDecisions(candidate: ConfirmationEnvelope, decisions: FlowDecision[], advance: boolean): ConfirmationEnvelope {
  assertCandidateHash(candidate);
  if (candidate.status !== 'candidate') throw new Error(`Only candidate envelopes can accept decisions; received ${candidate.status}`);
  const revision = advance ? nextRevision(candidate) : candidate.revision;
  const merged = new Map(candidate.decisions.map((decision) => [decision.questionId, decision]));
  for (const decision of decisions) merged.set(decision.questionId, { ...decision, revision });
  return {
    ...candidate,
    decisions: [...merged.values()],
    revision,
    parentRevision: advance ? candidate.revision : candidate.parentRevision,
  };
}

export function saveDecisions(candidate: ConfirmationEnvelope, decisions: FlowDecision[]): ConfirmationEnvelope {
  return applyDecisions(candidate, decisions, true);
}

export function confirmEnvelope(candidate: ConfirmationEnvelope): ConfirmationEnvelope {
  const draft = applyDecisions(candidate, [], true);
  const confirmed = { ...draft, status: 'confirmed' as const };
  const validation = validateConfirmationEnvelope(confirmed);
  if (!validation.valid) throw new Error(`Cannot confirm flow: ${validation.errors.join('; ')}`);
  return confirmed;
}

function decisionNodeId(decision: FlowDecision, question: ConfirmationEnvelope['questions'][number] | undefined): string | undefined {
  if (typeof decision.answer.nodeId === 'string' && decision.answer.nodeId.length > 0) return decision.answer.nodeId;
  const evidence = question?.evidence.filter((item) => item.startsWith('design-node:')).map((item) => item.slice('design-node:'.length));
  return evidence?.length === 1 ? evidence[0] : undefined;
}

function transitionFromDecision(decision: FlowDecision, question: ConfirmationEnvelope['questions'][number] | undefined): FlowTransition | undefined {
  const answer = decision.answer;
  if (typeof answer.from !== 'string' || typeof answer.event !== 'string' || typeof answer.to !== 'string') return undefined;
  const nodeId = decisionNodeId(decision, question);
  return {
    from: answer.from,
    event: answer.event,
    to: answer.to,
    ...(nodeId ? { nodeId } : {}),
    ...(typeof answer.effect === 'string' ? { effect: answer.effect } : {}),
    provenance: [{ source: 'natural-language', reference: `confirmation:decision:${decision.questionId}` }],
  };
}

function actionFromDecision(decision: FlowDecision): FlowAction | undefined {
  const answer = decision.answer;
  if (typeof answer.from !== 'string' || typeof answer.event !== 'string' || typeof answer.effect !== 'string' || typeof answer.to === 'string') return undefined;
  return {
    screenId: answer.from,
    ...(typeof answer.nodeId === 'string' ? { nodeId: answer.nodeId } : {}),
    event: answer.event,
    effect: answer.effect,
    provenance: [{ source: 'natural-language', reference: `confirmation:decision:${decision.questionId}` }],
  };
}

export function compileConfirmedFlow(envelope: ConfirmationEnvelope, currentSelection?: SelectionManifest): FlowIR {
  const validation = validateConfirmationEnvelope(envelope);
  if (envelope.status !== 'confirmed' || !validation.valid) throw new Error(`Cannot compile unconfirmed flow: ${validation.errors.join('; ') || 'status is not confirmed'}`);
  if (envelope.selection && (!currentSelection || selectionFingerprint(currentSelection) !== envelope.selection.fingerprint)) {
    throw new Error('Cannot compile flow: confirmation selection is stale');
  }
  const questions = new Map(envelope.questions.map((question) => [question.id, question]));
  const transitions = [...envelope.flow.transitions, ...envelope.decisions.map((decision) => transitionFromDecision(decision, questions.get(decision.questionId))).filter((transition): transition is FlowTransition => Boolean(transition))];
  const actions = [...(envelope.flow.actions ?? []), ...envelope.decisions.map(actionFromDecision).filter((action): action is FlowAction => Boolean(action))];
  return validateFlowIR({ ...envelope.flow, transitions, actions });
}
