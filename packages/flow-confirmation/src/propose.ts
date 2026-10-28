import { createHash } from 'node:crypto';
import type { DesignDocument, DesignNode } from '../../core/src/design-ast.ts';
import { inferFlowFromDesign } from '../../flow-extractor/src/fig-flow.ts';
import type { ConfirmationEnvelope, FlowQuestion } from './contracts.ts';
import { selectionFingerprint, type SelectionManifest } from '../../core/src/selection-scope.ts';

const HOME_CARD_TEXT = /^(?:cheeseburger wendy's burger|hamburger\s+(?:veggie|chicken) burger|hamburger\s+fried chicken burger|fried chicken burger)$/i;
const CONTROL_TEXT = /^(?:order now|pay now|place order|checkout|submit|confirm|ok(?:,.*)?|user profile|customer support|edit profile)$/i;

function visibleText(node: DesignNode): string | undefined {
  const text = node.type === 'TEXT' && node.text?.content?.trim() ? node.text.content.trim() : node.name.trim();
  return text || undefined;
}

function isInteractionLabel(label: string, rootScreenId: string): boolean {
  const normalized = label.replace(/\s+/g, ' ').trim();
  return CONTROL_TEXT.test(normalized) || (rootScreenId === 'home' && HOME_CARD_TEXT.test(normalized));
}

function findNode(nodes: DesignNode[], nodeId: string): DesignNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children, nodeId);
    if (child) return child;
  }
  return undefined;
}

function buildQuestions(design: DesignDocument, screenIdByNode: Map<string, string>, flow: ReturnType<typeof inferFlowFromDesign>): FlowQuestion[] {
  const questions: FlowQuestion[] = [];
  const seen = new Set<string>();
  const walk = (node: DesignNode, rootScreenId: string) => {
    const label = visibleText(node);
    if (label && isInteractionLabel(label, rootScreenId)) {
      const id = `${rootScreenId}-interaction-${node.id.replace(/[^a-zA-Z0-9]+/g, '-')}`;
      if (!seen.has(id)) {
        questions.push({
          id,
          kind: 'transition',
          screen: rootScreenId,
          prompt: `Confirm the action for visible element "${label.replace(/\s+/g, ' ').trim()}" on ${rootScreenId}.`,
          options: screenIdByNode.size > 0 ? [...screenIdByNode.values()] : undefined,
          evidence: [`design-node:${node.id}`, `text:${label}`],
          blocking: true,
        });
        seen.add(id);
      }
    }
    for (const child of node.children) walk(child, rootScreenId);
  };
  for (const screen of flow.screens) {
    const screenNode = screen.designNodeId ? findNode(design.nodes, screen.designNodeId) : undefined;
    if (screenNode) walk(screenNode, screen.id);
  }
  if (flow.screens.some((screen) => screen.id === 'pop-up-message') && !questions.some((question) => question.screen === 'pop-up-message')) {
    questions.push({
      id: 'pop-up-message-confirmation',
      kind: 'transition',
      screen: 'pop-up-message',
      prompt: 'Confirm that tapping OK on the order confirmation returns to home.',
      options: [...screenIdByNode.values()],
      evidence: ['design-screen:pop-up-message', 'agent-required-confirmation:ok-action'],
      blocking: true,
    });
  }
  return questions;
}

export function buildFlowQuestions(design: DesignDocument, flow = inferFlowFromDesign(design, 'design')): FlowQuestion[] {
  const screenIdByNode = new Map(flow.screens.flatMap((screen) => screen.designNodeId ? [[screen.designNodeId, screen.id] as const] : []));
  return buildQuestions(design, screenIdByNode, flow);
}

export function calculateCandidateHash(envelope: Omit<ConfirmationEnvelope, 'candidateHash'>): string {
  const canonical = JSON.stringify({
    version: envelope.version,
    source: envelope.source,
    selection: envelope.selection,
    flow: envelope.flow,
    questions: envelope.questions,
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function proposeFlow(design: DesignDocument, source: string, parserVersion: string, selection?: SelectionManifest): ConfirmationEnvelope {
  const flow = inferFlowFromDesign(design, source);
  const envelopeWithoutHash: Omit<ConfirmationEnvelope, 'candidateHash'> = {
    version: '1.0',
    status: 'candidate',
    source: { file: source, parser: parserVersion },
    ...(selection ? { selection: { manifest: selection, fingerprint: selectionFingerprint(selection) } } : {}),
    flow,
    questions: buildFlowQuestions(design, flow),
    decisions: [],
    revision: 1,
    staleReasons: [],
  };
  const envelope = { ...envelopeWithoutHash, candidateHash: '' } as ConfirmationEnvelope;
  envelope.candidateHash = calculateCandidateHash(envelopeWithoutHash);
  return envelope;
}
