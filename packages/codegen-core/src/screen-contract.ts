import type { Diagnostic, SourceProvenance } from '../../core/src/diagnostics.ts';
import { diagnostic } from '../../core/src/diagnostics.ts';

export interface ScreenSize { width: number; height: number }
export interface ScreenInsets { top: number; bottom: number; leading: number; trailing: number }
export interface ContractFrame { x: number; y: number; width: number; height: number }

export interface ContractComponent {
  id: string;
  nodeId: string;
  kind: string;
  frame?: ContractFrame;
  spacing?: number;
  radius?: number;
  color?: string;
  typography?: string;
  shadow?: { color: string; opacity?: number; radius: number; x?: number; y?: number };
  provenance: SourceProvenance[];
}

export interface ContractAsset {
  nodeId: string;
  resourceName: string;
  contentMode?: 'fit' | 'fill';
  provenance: SourceProvenance[];
}

export interface ContractInteraction {
  id: string;
  nodeId: string;
  event: string;
  transition?: { to: string; kind: 'push' | 'sheet' | 'modal' | 'replace' | 'dismiss' };
  provenance: SourceProvenance[];
}

export interface UnresolvedQuestion {
  id: string;
  question: string;
  status: 'unconfirmed' | 'confirmed' | 'rejected';
  provenance: SourceProvenance[];
}

export interface ScreenContract {
  id: string;
  designNodeId: string;
  screenSize: ScreenSize;
  safeArea: ScreenInsets;
  contentPadding: [number, number, number, number];
  components: ContractComponent[];
  assets: ContractAsset[];
  interactions: ContractInteraction[];
  unresolvedQuestions: UnresolvedQuestion[];
  provenance: SourceProvenance[];
}

function hasProvenance(value: { provenance: SourceProvenance[] }): boolean {
  return value.provenance.length > 0;
}

export function validateScreenContract(contract: ScreenContract): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const component of contract.components) {
    if (!component.frame) diagnostics.push(diagnostic('SCREEN_COMPONENT_FRAME_REQUIRED', 'error', `Component requires a measured frame: ${component.id}`, { path: `components.${component.id}`, provenance: component.provenance }));
    if (!hasProvenance(component)) diagnostics.push(diagnostic('SCREEN_COMPONENT_PROVENANCE_REQUIRED', 'error', `Component requires provenance: ${component.id}`, { path: `components.${component.id}` }));
  }
  for (const asset of contract.assets) {
    if (!hasProvenance(asset)) diagnostics.push(diagnostic('SCREEN_ASSET_PROVENANCE_REQUIRED', 'error', `Asset requires provenance: ${asset.nodeId}`, { path: `assets.${asset.nodeId}` }));
  }
  for (const interaction of contract.interactions) {
    if (!interaction.transition) diagnostics.push(diagnostic('SCREEN_INTERACTION_TRANSITION_REQUIRED', 'error', `Interaction requires an explicit transition: ${interaction.id}`, { path: `interactions.${interaction.id}`, provenance: interaction.provenance }));
    if (!hasProvenance(interaction)) diagnostics.push(diagnostic('SCREEN_INTERACTION_PROVENANCE_REQUIRED', 'error', `Interaction requires provenance: ${interaction.id}`, { path: `interactions.${interaction.id}` }));
  }
  for (const question of contract.unresolvedQuestions) {
    if (question.status === 'unconfirmed') diagnostics.push(diagnostic('SCREEN_UNRESOLVED_QUESTION', 'error', `Screen has an unconfirmed flow question: ${question.id}`, { path: `unresolvedQuestions.${question.id}`, provenance: question.provenance }));
  }
  if (!hasProvenance(contract)) diagnostics.push(diagnostic('SCREEN_PROVENANCE_REQUIRED', 'error', `Screen requires provenance: ${contract.id}`, { path: 'provenance' }));
  return diagnostics;
}

export function assertValidScreenContract(contract: ScreenContract): void {
  const errors = validateScreenContract(contract).filter((item) => item.severity === 'error');
  if (errors.length > 0) throw new Error(`Invalid Screen Contract: ${errors.map((item) => item.message).join('; ')}`);
}
