import type { FlowIR, FlowTransition } from '../../core/src/flow-ir.ts';
import type { ScreenContract, ContractInteraction } from './screen-contract.ts';

function transitionKind(flow: FlowIR, transition: FlowTransition): NonNullable<ContractInteraction['transition']>['kind'] {
  const presentation = flow.screens.find((screen) => screen.id === transition.to)?.presentation;
  if (presentation === 'sheet') return 'sheet';
  if (presentation === 'modal') return 'modal';
  if (presentation === 'replace') return 'replace';
  return 'push';
}

function transitionProvenance(transition: FlowTransition, index: number) {
  return [{
    source: 'inferred' as const,
    reference: transition.provenance[0]?.reference ?? `flow-transition:${index + 1}`,
    field: 'confirmed-flow.nodeId',
  }];
}

export function bindScreenContractsToFlow(contracts: ScreenContract[], flow: FlowIR): ScreenContract[] {
  return contracts.map((contract) => {
    const screen = flow.screens.find((candidate) => candidate.designNodeId === contract.designNodeId || candidate.id === contract.id);
    if (!screen) return contract;
    const transitions = flow.transitions.filter((transition) => transition.from === screen.id);
    const additions = transitions.map((transition, index) => {
      if (!transition.nodeId) throw new Error(`Confirmed transition ${transition.from} -> ${transition.to} (${transition.event}) requires an evidence-backed nodeId`);
      if (!contract.components.some((component) => component.nodeId === transition.nodeId)) {
        throw new Error(`Confirmed transition nodeId ${transition.nodeId} is outside Screen Contract ${contract.id}`);
      }
      return {
        id: `flow-interaction-${flow.transitions.indexOf(transition) + 1}`,
        nodeId: transition.nodeId,
        event: transition.event,
        transition: { to: transition.to, kind: transitionKind(flow, transition) },
        provenance: transitionProvenance(transition, flow.transitions.indexOf(transition) >= 0 ? flow.transitions.indexOf(transition) : index),
      } satisfies ContractInteraction;
    });
    const existing = new Set(contract.interactions.map((interaction) => `${interaction.nodeId}:${interaction.event}:${interaction.transition?.to ?? ''}`));
    return {
      ...contract,
      interactions: [...contract.interactions, ...additions.filter((interaction) => !existing.has(`${interaction.nodeId}:${interaction.event}:${interaction.transition?.to ?? ''}`))],
    };
  });
}
