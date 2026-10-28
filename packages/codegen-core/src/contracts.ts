import type { FlowIR } from '../../core/src/flow-ir.ts';
import type { DesignDocument } from '../../core/src/design-ast.ts';
import type { ScreenContract } from './screen-contract.ts';
import type { NativePatternMappingReport } from '../../native-patterns/src/evidence.ts';
import type { NavigationScaffold } from './navigation-scaffold.ts';
import type { ExistingIOSIntegrationProfile } from './existing-ios-integration.ts';

export interface CodegenInput {
  featureName: string;
  design: DesignDocument;
  flow: FlowIR;
  assetBindings?: Array<{ sourceNodeId: string; resourceName: string }>;
  resourceBundle?: 'module' | 'main';
  screenContract?: ScreenContract;
  nativePatternMapping?: NativePatternMappingReport;
  navigationScaffold?: NavigationScaffold;
  integrationProfile?: ExistingIOSIntegrationProfile;
}

export interface GeneratedFile {
  path: string;
  contents: string;
}

export interface CodegenResult {
  files: GeneratedFile[];
  diagnostics: string[];
}

export function swiftTypeName(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const result = words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join('');
  return result || 'GeneratedFeature';
}

export function swiftCaseName(value: string, fallback: string): string {
  const words = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const result = words.map((word, index) => {
    const normalized = word[0]?.toUpperCase() + word.slice(1);
    return index === 0 ? normalized.toLowerCase() : normalized;
  }).join('');
  return /^[a-zA-Z_]/.test(result) ? result : fallback;
}
