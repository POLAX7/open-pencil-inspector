import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateDesignPackage, type DesignPackage, type DesignPackageInput } from './schema.ts';

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeDesignPackage(directory: string, input: DesignPackageInput): Promise<DesignPackage> {
  const packageValue = validateDesignPackage(input);
  await mkdir(directory, { recursive: true });

  const files: Record<string, unknown> = {
    'design.json': { schemaVersion: packageValue.schemaVersion, document: packageValue.design },
    'flow.json': { schemaVersion: packageValue.schemaVersion, flow: packageValue.flow },
    'assets.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.assets },
    'layout-contracts.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.layoutContracts },
    'screen-contracts.json': { schemaVersion: packageValue.schemaVersion, screenContracts: packageValue.screenContracts },
    'audit.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.audit },
    'provenance.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.provenance },
    'screen-discovery.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.screenDiscovery },
    'design-evidence.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.designEvidence },
    'native-patterns.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.nativePatternMapping },
    'runtime-route-plan.json': { schemaVersion: packageValue.schemaVersion, ...packageValue.runtimeRoutePlan },
  };
  if (packageValue.integrationProfile) files['integration.json'] = { schemaVersion: packageValue.schemaVersion, integration: packageValue.integrationProfile };

  for (const [name, value] of Object.entries(files)) {
    await writeFile(join(directory, name), serialize(value), 'utf8');
  }
  return packageValue;
}
