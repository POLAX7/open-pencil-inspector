import { normalizeDesignDocument, type DesignAsset, type DesignDocument } from '../../core/src/design-ast.ts';
import { validateFlowIR, type FlowIR } from '../../core/src/flow-schema.ts';
import type { SourceProvenance } from '../../core/src/diagnostics.ts';
import { assertValidScreenContract, type ScreenContract } from '../../codegen-core/src/screen-contract.ts';
import type { DesignEvidenceChecklist } from '../../codegen-core/src/design-evidence.ts';
import type { ScreenDiscoveryReport } from '../../flow-extractor/src/screen-discovery.ts';
import type { NativePatternMappingReport } from '../../native-patterns/src/evidence.ts';
import { validateExistingIOSIntegrationProfile, type ExistingIOSIntegrationProfile } from '../../codegen-core/src/existing-ios-integration.ts';
import { buildRuntimeRoutePlan, type RuntimeRoutePlan } from '../../verification/src/runtime-route-plan.ts';

export const DESIGN_PACKAGE_SCHEMA_VERSION = '1.0' as const;

export interface LayoutContract {
  nodeId: string;
  parentNodeId?: string;
  relation: 'flow' | 'stack' | 'grid' | 'overlay' | 'absolute' | 'unknown';
  frame?: { x?: number; y?: number; width?: number; height?: number };
  provenance: SourceProvenance[];
}

export interface LayoutContractsDocument {
  contracts: LayoutContract[];
}

export type AuditSeverity = 'info' | 'warning' | 'error' | 'blocked';

export interface AuditSource {
  reference: string;
  nodeId?: string;
}

export interface AuditEntry {
  severity: AuditSeverity;
  source: AuditSource;
  pipelineStage: 'Discover Sources' | 'Read' | 'Normalize' | 'Analyze' | 'Generate' | 'Validate' | 'Report';
  reason: string;
  fallback?: string;
  affectedOutput: string;
  blocking: boolean;
}

export interface AuditDocument {
  entries: AuditEntry[];
}

export interface ProvenanceEntry {
  path: string;
  source: SourceProvenance;
}

export interface ProvenanceDocument {
  entries: ProvenanceEntry[];
}

export interface DesignPackageInput {
  schemaVersion?: string;
  design: DesignDocument | unknown;
  flow: FlowIR | unknown;
  assets: { assets: DesignAsset[] };
  layoutContracts: LayoutContractsDocument;
  screenContracts?: ScreenContract[] | unknown;
  audit: AuditDocument;
  provenance: ProvenanceDocument;
  screenDiscovery?: ScreenDiscoveryReport | unknown;
  designEvidence?: DesignEvidenceChecklist | unknown;
  nativePatternMapping?: NativePatternMappingReport | unknown;
  integrationProfile?: ExistingIOSIntegrationProfile | unknown;
  runtimeRoutePlan?: RuntimeRoutePlan | unknown;
}

export interface DesignPackage {
  schemaVersion: typeof DESIGN_PACKAGE_SCHEMA_VERSION;
  design: DesignDocument;
  flow: FlowIR;
  assets: { assets: DesignAsset[] };
  layoutContracts: LayoutContractsDocument;
  screenContracts: ScreenContract[];
  audit: AuditDocument;
  provenance: ProvenanceDocument;
  screenDiscovery: ScreenDiscoveryReport;
  designEvidence: DesignEvidenceChecklist;
  nativePatternMapping: NativePatternMappingReport;
  integrationProfile?: ExistingIOSIntegrationProfile;
  runtimeRoutePlan: RuntimeRoutePlan;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function requiredArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value;
}

function validateAssets(input: unknown): { assets: DesignAsset[] } {
  if (!isRecord(input)) throw new TypeError('assets must be an object');
  const assets = requiredArray(input.assets, 'assets.assets');
  for (const [index, asset] of assets.entries()) {
    if (!isRecord(asset)) throw new TypeError(`assets.assets[${index}] must be an object`);
    requiredString(asset.id, `assets.assets[${index}].id`);
    requiredString(asset.name, `assets.assets[${index}].name`);
  }
  return { assets: assets as DesignAsset[] };
}

function validateLayoutContracts(input: unknown): LayoutContractsDocument {
  if (!isRecord(input)) throw new TypeError('layoutContracts must be an object');
  const contracts = requiredArray(input.contracts, 'layoutContracts.contracts');
  for (const [index, contract] of contracts.entries()) {
    if (!isRecord(contract)) throw new TypeError(`layoutContracts.contracts[${index}] must be an object`);
    requiredString(contract.nodeId, `layoutContracts.contracts[${index}].nodeId`);
    requiredString(contract.relation, `layoutContracts.contracts[${index}].relation`);
    if (!Array.isArray(contract.provenance)) throw new TypeError(`layoutContracts.contracts[${index}].provenance must be an array`);
  }
  return { contracts: contracts as LayoutContract[] };
}

function validateScreenContracts(input: unknown, design: DesignDocument, flow: FlowIR): ScreenContract[] {
  if (input === undefined) return [];
  const contracts = isRecord(input) && Array.isArray(input.screenContracts) ? input.screenContracts : input;
  if (!Array.isArray(contracts)) throw new TypeError('screenContracts must be an array');
  for (const [index, contract] of contracts.entries()) {
    if (!isRecord(contract)) throw new TypeError(`screenContracts[${index}] must be an object`);
    try {
      assertValidScreenContract(contract as ScreenContract);
    } catch (error) {
      throw new TypeError(`screenContracts[${index}] is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
    const value = contract as ScreenContract;
    const nodeIds = new Set<string>();
    const collect = (nodes: DesignDocument['nodes']) => {
      for (const node of nodes) {
        nodeIds.add(node.id);
        collect(node.children);
      }
    };
    collect(design.nodes);
    if (!nodeIds.has(value.designNodeId)) throw new TypeError(`screenContracts[${index}].designNodeId references unknown node: ${value.designNodeId}`);
    for (const component of value.components) {
      if (!nodeIds.has(component.nodeId)) throw new TypeError(`screenContracts[${index}].components.${component.id}.nodeId references unknown node: ${component.nodeId}`);
    }
    for (const asset of value.assets) {
      if (!nodeIds.has(asset.nodeId)) throw new TypeError(`screenContracts[${index}].assets.${asset.nodeId} references unknown node`);
    }
    const flowScreenIds = new Set(flow.screens.map((screen) => screen.id));
    for (const interaction of value.interactions) {
      if (!nodeIds.has(interaction.nodeId)) throw new TypeError(`screenContracts[${index}].interactions.${interaction.id}.nodeId references unknown node: ${interaction.nodeId}`);
      if (interaction.transition && !flowScreenIds.has(interaction.transition.to)) throw new TypeError(`screenContracts[${index}].interactions.${interaction.id}.transition.to references unknown flow screen: ${interaction.transition.to}`);
    }
  }
  return contracts as ScreenContract[];
}

function validateAudit(input: unknown): AuditDocument {
  if (!isRecord(input)) throw new TypeError('audit must be an object');
  const entries = requiredArray(input.entries, 'audit.entries');
  for (const [index, entry] of entries.entries()) {
    if (!isRecord(entry)) throw new TypeError(`audit.entries[${index}] must be an object`);
    const path = `audit.entries[${index}]`;
    if (!isRecord(entry.source)) throw new TypeError(`${path}.source must be an object`);
    requiredString(entry.source.reference, `${path}.source.reference`);
    requiredString(entry.pipelineStage, `${path}.pipelineStage`);
    requiredString(entry.reason, `${path}.reason`);
    requiredString(entry.affectedOutput, `${path}.affectedOutput`);
    if (typeof entry.blocking !== 'boolean') throw new TypeError(`${path}.blocking must be a boolean`);
  }
  return { entries: entries as AuditEntry[] };
}

function validateProvenance(input: unknown): ProvenanceDocument {
  if (!isRecord(input)) throw new TypeError('provenance must be an object');
  const entries = requiredArray(input.entries, 'provenance.entries');
  for (const [index, entry] of entries.entries()) {
    if (!isRecord(entry)) throw new TypeError(`provenance.entries[${index}] must be an object`);
    const path = `provenance.entries[${index}]`;
    requiredString(entry.path, `${path}.path`);
    if (!isRecord(entry.source)) throw new TypeError(`${path}.source must be an object`);
    requiredString(entry.source.source, `${path}.source.source`);
  }
  return { entries: entries as ProvenanceEntry[] };
}

function validateArtifact<T extends { version: string; source: string; diagnostics: unknown[] }>(input: unknown, path: string): T {
  if (!isRecord(input)) throw new TypeError(`${path} must be an object`);
  requiredString(input.version, `${path}.version`);
  requiredString(input.source, `${path}.source`);
  if (!Array.isArray(input.diagnostics)) throw new TypeError(`${path}.diagnostics must be an array`);
  return input as T;
}

export function validateDesignPackage(input: DesignPackageInput): DesignPackage {
  if (!isRecord(input)) throw new TypeError('Design Package must be an object');
  if (input.schemaVersion !== undefined && input.schemaVersion !== DESIGN_PACKAGE_SCHEMA_VERSION) {
    throw new TypeError(`schemaVersion must be ${DESIGN_PACKAGE_SCHEMA_VERSION}`);
  }
  const design = normalizeDesignDocument(input.design);
  const flow = validateFlowIR(input.flow);
  const runtimeRoutePlan = buildRuntimeRoutePlan(flow);
  const suppliedRuntimeRoutePlan = isRecord(input.runtimeRoutePlan)
    ? Object.fromEntries(Object.entries(input.runtimeRoutePlan).filter(([key]) => key !== 'schemaVersion'))
    : input.runtimeRoutePlan;
  if (suppliedRuntimeRoutePlan !== undefined && JSON.stringify(suppliedRuntimeRoutePlan) !== JSON.stringify(runtimeRoutePlan)) {
    throw new TypeError('runtimeRoutePlan does not match the confirmed Flow IR');
  }
  return {
    schemaVersion: DESIGN_PACKAGE_SCHEMA_VERSION,
    design,
    flow,
    assets: validateAssets(input.assets),
    layoutContracts: validateLayoutContracts(input.layoutContracts),
    screenContracts: validateScreenContracts(input.screenContracts, design, flow),
    audit: validateAudit(input.audit),
    provenance: validateProvenance(input.provenance),
    screenDiscovery: validateArtifact<ScreenDiscoveryReport>(input.screenDiscovery ?? { version: '1.0', source: 'unknown', scope: 'page', screens: [], diagnostics: [] }, 'screenDiscovery'),
    designEvidence: validateArtifact<DesignEvidenceChecklist>(input.designEvidence ?? { version: '1.0', source: 'unknown', entries: [], diagnostics: [] }, 'designEvidence'),
    nativePatternMapping: validateArtifact<NativePatternMappingReport>(input.nativePatternMapping ?? { version: '1.0', source: 'unknown', entries: [], diagnostics: [] }, 'nativePatternMapping'),
    ...(input.integrationProfile === undefined ? {} : { integrationProfile: validateExistingIOSIntegrationProfile(input.integrationProfile) }),
    runtimeRoutePlan,
  };
}
