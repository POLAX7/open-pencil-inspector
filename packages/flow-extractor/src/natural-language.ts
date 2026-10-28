import type { FlowIR } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';

export interface FlowCandidateExtractor {
  extract(description: string): Promise<unknown>;
}

export async function extractNaturalLanguageFlow(
  description: string,
  reference: string,
  extractor: FlowCandidateExtractor,
): Promise<FlowIR> {
  if (!description.trim()) throw new Error('Natural-language flow description must not be empty');
  const candidate = await extractor.extract(description);
  const flow = validateFlowIR(candidate);
  const provenance = { source: 'natural-language' as const, reference };
  return {
    ...flow,
    screens: flow.screens.map((screen) => ({ ...screen, provenance: [...screen.provenance, provenance] })),
    transitions: flow.transitions.map((transition) => ({ ...transition, provenance: [...transition.provenance, provenance] })),
    states: flow.states.map((state) => ({ ...state, provenance: [...state.provenance, provenance] })),
  };
}
