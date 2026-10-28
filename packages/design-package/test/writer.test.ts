import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateDesignPackage, type DesignPackageInput } from '../src/schema.ts';
import { writeDesignPackage } from '../src/writer.ts';

function input(): DesignPackageInput {
  return {
    design: { id: 'doc-1', name: 'Example', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
    assets: { assets: [] },
    layoutContracts: { contracts: [] },
    audit: { entries: [] },
    provenance: { entries: [] },
    screenDiscovery: {
      version: '1.0', source: 'fixture.fig', scope: 'selected-subtree', screens: [], diagnostics: [],
    },
    designEvidence: {
      version: '1.0', source: 'fixture.fig', entries: [], diagnostics: [],
    },
    nativePatternMapping: {
      version: '1.0', source: 'fixture.fig', entries: [], diagnostics: [],
    },
  };
}

describe('Design Package writer', () => {
  test('writes stable Design Package documents including discovery and evidence reports', async () => {
    const first = await mkdtemp(join(tmpdir(), 'open-pencil-package-'));
    const second = await mkdtemp(join(tmpdir(), 'open-pencil-package-'));
    try {
      await writeDesignPackage(first, input());
      await writeDesignPackage(second, input());
      const names = ['design.json', 'flow.json', 'assets.json', 'layout-contracts.json', 'screen-contracts.json', 'audit.json', 'provenance.json', 'screen-discovery.json', 'design-evidence.json', 'native-patterns.json', 'runtime-route-plan.json'];
      const firstContents = await Promise.all(names.map((name) => readFile(join(first, name), 'utf8')));
      const secondContents = await Promise.all(names.map((name) => readFile(join(second, name), 'utf8')));

      expect(firstContents).toEqual(secondContents);
      expect(JSON.parse(firstContents[0]!)).toMatchObject({ schemaVersion: '1.0' });
      expect(validateDesignPackage({
        ...input(),
        design: JSON.parse(firstContents[0]!).document,
        flow: JSON.parse(firstContents[1]!).flow,
        assets: JSON.parse(firstContents[2]!),
        layoutContracts: JSON.parse(firstContents[3]!),
        screenContracts: JSON.parse(firstContents[4]!),
        audit: JSON.parse(firstContents[5]!),
        provenance: JSON.parse(firstContents[6]!),
        screenDiscovery: JSON.parse(firstContents[7]!),
        designEvidence: JSON.parse(firstContents[8]!),
        nativePatternMapping: JSON.parse(firstContents[9]!),
        runtimeRoutePlan: JSON.parse(firstContents[10]!),
      }).schemaVersion).toBe('1.0');
    } finally {
      await rm(first, { recursive: true, force: true });
      await rm(second, { recursive: true, force: true });
    }
  });

  test('writes and validates an explicit existing-app integration profile', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'open-pencil-package-integration-'));
    try {
      await writeDesignPackage(directory, {
        ...input(),
        integrationProfile: {
          version: '1.0', projectPath: 'App.xcodeproj', module: 'Checkout', feature: 'checkout',
          entryPoints: { swiftUI: { typeName: 'CheckoutView' } },
          navigation: { coordinatorType: 'AppCoordinator', entryMethod: 'showCheckout' },
          dependencyInjection: { containerType: 'AppContainer', registrationMethod: 'registerCheckout' },
          assetDestination: { relativePath: 'Resources/Checkout', bundle: 'main' },
        },
      });
      const document = JSON.parse(await readFile(join(directory, 'integration.json'), 'utf8'));
      expect(document.integration.module).toBe('Checkout');
      expect(validateDesignPackage({ ...input(), integrationProfile: document.integration }).integrationProfile?.feature).toBe('checkout');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
