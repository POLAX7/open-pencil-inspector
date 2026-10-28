import type { FlowIR } from '../../core/src/flow-ir.ts';
import type { SelectionManifest } from '../../core/src/selection-scope.ts';

export type ConfirmationStatus = 'candidate' | 'confirmed' | 'rejected';
export type FlowQuestionKind = 'transition' | 'presentation' | 'state' | 'content';

export interface ConfirmationSource {
  source: 'agent' | 'user';
  reference: string;
  field?: string;
}

export interface FlowQuestion {
  id: string;
  kind: FlowQuestionKind;
  screen?: string;
  prompt: string;
  options?: string[];
  evidence: string[];
  blocking: boolean;
}

export interface FlowDecision {
  questionId: string;
  answer: Record<string, unknown>;
  provenance: ConfirmationSource[];
  revision: number;
}

export interface ConfirmationEnvelope {
  version: '1.0';
  status: ConfirmationStatus;
  source: { file: string; parser: string };
  selection?: { manifest: SelectionManifest; fingerprint: string };
  candidateHash: string;
  flow: FlowIR;
  questions: FlowQuestion[];
  decisions: FlowDecision[];
  revision: number;
  parentRevision?: number;
  staleReasons: string[];
}

export interface ConfirmationValidationResult {
  valid: boolean;
  errors: string[];
  blockingQuestionIds: string[];
}
