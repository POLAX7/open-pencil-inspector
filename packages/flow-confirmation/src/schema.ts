import { canonicalizeFlow } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';
import type { ConfirmationEnvelope, ConfirmationValidationResult, FlowDecision, FlowQuestion } from './contracts.ts';
import { selectionFingerprint, validateSelectionManifest } from '../../core/src/selection-scope.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function validateQuestion(question: unknown, index: number): FlowQuestion {
  if (!isRecord(question)) throw new TypeError(`questions[${index}] must be an object`);
  requiredString(question.id, `questions[${index}].id`);
  if (!['transition', 'presentation', 'state', 'content'].includes(String(question.kind))) throw new TypeError(`questions[${index}].kind is invalid`);
  requiredString(question.prompt, `questions[${index}].prompt`);
  if (question.screen !== undefined) requiredString(question.screen, `questions[${index}].screen`);
  if (question.options !== undefined && (!Array.isArray(question.options) || question.options.some((item) => typeof item !== 'string'))) {
    throw new TypeError(`questions[${index}].options must be an array of strings`);
  }
  if (!Array.isArray(question.evidence) || question.evidence.some((item) => typeof item !== 'string')) throw new TypeError(`questions[${index}].evidence must be an array of strings`);
  if (typeof question.blocking !== 'boolean') throw new TypeError(`questions[${index}].blocking must be a boolean`);
  return question as unknown as FlowQuestion;
}

function validateDecision(decision: unknown, index: number): FlowDecision {
  if (!isRecord(decision)) throw new TypeError(`decisions[${index}] must be an object`);
  requiredString(decision.questionId, `decisions[${index}].questionId`);
  if (!isRecord(decision.answer)) throw new TypeError(`decisions[${index}].answer must be an object`);
  if (!Array.isArray(decision.provenance)) throw new TypeError(`decisions[${index}].provenance must be an array`);
  for (const [sourceIndex, source] of decision.provenance.entries()) {
    if (!isRecord(source)) throw new TypeError(`decisions[${index}].provenance[${sourceIndex}] must be an object`);
    if (!['agent', 'user'].includes(String(source.source))) throw new TypeError(`decisions[${index}].provenance[${sourceIndex}].source is invalid`);
    requiredString(source.reference, `decisions[${index}].provenance[${sourceIndex}].reference`);
  }
  if (!Number.isInteger(decision.revision) || Number(decision.revision) < 1) throw new TypeError(`decisions[${index}].revision must be a positive integer`);
  return decision as unknown as FlowDecision;
}

export function validateConfirmationEnvelope(input: unknown): ConfirmationValidationResult {
  if (!isRecord(input)) throw new TypeError('Confirmation envelope must be an object');
  if (input.version !== '1.0') throw new TypeError('Confirmation envelope version must be 1.0');
  if (!['candidate', 'confirmed', 'rejected'].includes(String(input.status))) throw new TypeError('Confirmation envelope status is invalid');
  if (!isRecord(input.source)) throw new TypeError('Confirmation envelope source must be an object');
  requiredString(input.source.file, 'source.file');
  requiredString(input.source.parser, 'source.parser');
  if (input.selection !== undefined) {
    if (!isRecord(input.selection) || !isRecord(input.selection.manifest)) throw new TypeError('selection must contain a manifest');
    const manifest = validateSelectionManifest(input.selection.manifest);
    requiredString(input.selection.fingerprint, 'selection.fingerprint');
    if (input.selection.fingerprint !== selectionFingerprint(manifest)) throw new TypeError('selection.fingerprint does not match selection.manifest');
  }
  requiredString(input.candidateHash, 'candidateHash');
  if (!Number.isInteger(input.revision) || Number(input.revision) < 1) throw new TypeError('revision must be a positive integer');
  if (input.parentRevision !== undefined && (!Number.isInteger(input.parentRevision) || Number(input.parentRevision) < 1)) throw new TypeError('parentRevision must be a positive integer');
  if (!Array.isArray(input.staleReasons) || input.staleReasons.some((item) => typeof item !== 'string')) throw new TypeError('staleReasons must be an array of strings');
  const flow = validateFlowIR(input.flow);
  if (!Array.isArray(input.questions) || !Array.isArray(input.decisions)) throw new TypeError('Confirmation envelope questions and decisions must be arrays');
  const questions = input.questions.map(validateQuestion);
  const decisions = input.decisions.map(validateDecision);
  const questionIds = new Set<string>();
  const errors: string[] = [];
  for (const question of questions) {
    if (questionIds.has(question.id)) errors.push(`Duplicate question ID: ${question.id}`);
    questionIds.add(question.id);
  }
  const decisionIds = new Set<string>();
  for (const decision of decisions) {
    if (!questionIds.has(decision.questionId)) errors.push(`Decision references unknown question: ${decision.questionId}`);
    if (decisionIds.has(decision.questionId)) errors.push(`Duplicate decision for question: ${decision.questionId}`);
    decisionIds.add(decision.questionId);
    const target = decision.answer.to;
    if (target !== undefined && (typeof target !== 'string' || !flow.screens.some((screen) => screen.id === target))) errors.push(`Decision target screen does not exist: ${String(target)}`);
  }
  const blockingQuestionIds = questions.filter((question) => question.blocking && !decisionIds.has(question.id)).map((question) => question.id);
  if (input.status === 'confirmed' && blockingQuestionIds.length > 0) errors.push(`Unresolved blocking questions: ${blockingQuestionIds.join(', ')}`);
  if (input.status === 'confirmed' && input.staleReasons.length > 0) errors.push(`Confirmation is stale: ${input.staleReasons.join('; ')}`);
  return { valid: errors.length === 0, errors, blockingQuestionIds };
}

export function canonicalizeConfirmationEnvelope(envelope: ConfirmationEnvelope): string {
  return JSON.stringify({
    version: envelope.version,
    status: envelope.status,
    source: envelope.source,
    selection: envelope.selection,
    candidateHash: envelope.candidateHash,
    flow: JSON.parse(canonicalizeFlow(envelope.flow)),
    questions: envelope.questions,
    decisions: envelope.decisions,
    revision: envelope.revision,
    parentRevision: envelope.parentRevision,
    staleReasons: envelope.staleReasons,
  });
}
