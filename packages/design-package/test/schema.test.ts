import { describe, expect, test } from 'bun:test';
import { validateDesignPackage, type DesignPackageInput } from '../src/schema.ts';

const validPackage = (): DesignPackageInput => ({
  design: {
    id: 'doc-1',
    name: 'Example',
    nodes: [{
      id: 'screen-1',
      name: 'Home',
      type: 'FRAME',
      children: [{
        id: 'unknown-1',
        name: 'Plugin layer',
        type: 'UNKNOWN',
        children: [],
        unsupportedProperties: ['type:PLUGIN_LAYER'],
        provenance: [{ source: 'fig', reference: 'figs/example.fig', field: 'nodes[0].children[0]' }],
      }],
      unsupportedProperties: [],
      provenance: [{ source: 'fig', reference: 'figs/example.fig', field: 'nodes[0]' }],
    }],
    tokens: [],
    assets: [],
    diagnostics: [],
    provenance: [{ source: 'fig', reference: 'figs/example.fig' }],
  },
  flow: {
    version: '1.0',
    screens: [{ id: 'home', designNodeId: 'screen-1', provenance: [] }],
    transitions: [],
    states: [],
    conflicts: [],
    diagnostics: [],
  },
  assets: { assets: [] },
  layoutContracts: { contracts: [] },
  audit: { entries: [{
    severity: 'info',
    source: { reference: 'figs/example.fig', nodeId: 'screen-1' },
    pipelineStage: 'Normalize',
    reason: 'preserved source node',
    affectedOutput: 'design.json',
    blocking: false,
  }] },
  provenance: { entries: [{
    path: 'design.nodes[0]',
    source: { source: 'fig', reference: 'figs/example.fig', field: 'nodes[0]' },
  }] },
});

describe('Design Package schema', () => {
  test('preserves validated screen contracts as a first-class package document', () => {
    const input = validPackage();
    input.screenContracts = [{
      id: 'home', designNodeId: 'screen-1', screenSize: { width: 390, height: 844 },
      safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [{ id: 'title', nodeId: 'screen-1', kind: 'text', frame: { x: 16, y: 16, width: 100, height: 24 }, provenance: [{ source: 'fig', reference: 'figs/example.fig#screen-1' }] }],
      assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'fig', reference: 'figs/example.fig#screen-1' }],
    }];
    const result = validateDesignPackage(input);
    expect(result.screenContracts).toHaveLength(1);
    expect(result.screenContracts[0]?.designNodeId).toBe('screen-1');
  });

  test('rejects a screen contract with unresolved flow questions', () => {
    const input = validPackage();
    input.screenContracts = [{
      id: 'home', designNodeId: 'screen-1', screenSize: { width: 390, height: 844 },
      safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [], assets: [], interactions: [],
      unresolvedQuestions: [{ id: 'q1', question: 'Push or sheet?', status: 'unconfirmed', provenance: [{ source: 'fig', reference: 'screen-1' }] }],
      provenance: [{ source: 'fig', reference: 'figs/example.fig#screen-1' }],
    }];
    expect(() => validateDesignPackage(input)).toThrow(/unconfirmed flow question/);
  });

  test('rejects a screen contract that points to unknown design nodes or flow targets', () => {
    const input = validPackage();
    input.screenContracts = [{
      id: 'home', designNodeId: 'missing-screen', screenSize: { width: 390, height: 844 },
      safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [{ id: 'title', nodeId: 'missing-title', kind: 'text', frame: { x: 16, y: 16, width: 100, height: 24 }, provenance: [{ source: 'spec', reference: 'contract.json#title' }] }],
      assets: [], interactions: [{ id: 'open', nodeId: 'screen-1', event: 'tap', transition: { to: 'missing-flow', kind: 'push' }, provenance: [{ source: 'spec', reference: 'contract.json#open' }] }],
      unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#home' }],
    }];
    expect(() => validateDesignPackage(input)).toThrow(/designNodeId.*missing-screen/);
  });

  test('validates all package documents and preserves unknown design nodes', () => {
    const result = validateDesignPackage(validPackage());

    expect(result.schemaVersion).toBe('1.0');
    expect(result.design.nodes[0]?.children[0]?.type).toBe('UNKNOWN');
    expect(result.design.nodes[0]?.children[0]?.unsupportedProperties).toContain('type:PLUGIN_LAYER');
    expect(result.audit.entries[0]?.pipelineStage).toBe('Normalize');
  });

  test('rejects a missing package document and invalid audit entry', () => {
    const input = validPackage();
    delete (input as { audit?: unknown }).audit;
    expect(() => validateDesignPackage(input)).toThrow(/audit/);

    const invalidAudit = validPackage();
    invalidAudit.audit.entries[0]!.affectedOutput = '';
    expect(() => validateDesignPackage(invalidAudit)).toThrow(/affectedOutput/);
  });

  test('rejects an unsupported schema version before package consumers use it', () => {
    const input = validPackage() as DesignPackageInput & { schemaVersion?: string };
    input.schemaVersion = '2.0';
    expect(() => validateDesignPackage(input)).toThrow(/schemaVersion/);
  });
});
