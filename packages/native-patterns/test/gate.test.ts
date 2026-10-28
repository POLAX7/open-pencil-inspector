import { describe, expect, test } from 'bun:test';
import { assertValidNativePatternMapping } from '../src/evidence.ts';

const base = {
  version: '1.0' as const,
  source: 'design.fig',
  diagnostics: [],
};

describe('assertValidNativePatternMapping', () => {
  test('accepts mappings with explicit evidence', () => {
    expect(() => assertValidNativePatternMapping({
      ...base,
      entries: [{ nodeId: 'button', pattern: 'button', evidence: ['node-type'], verificationMethod: 'design-ast', provenance: [] }],
    })).not.toThrow();
  });

  test('blocks unknown or evidence-free mappings before native generation', () => {
    expect(() => assertValidNativePatternMapping({
      ...base,
      entries: [{ nodeId: 'plugin', pattern: 'unknown', evidence: [], verificationMethod: 'design-ast', provenance: [] }],
    })).toThrow(/NATIVE_PATTERN_MAPPING_BLOCKED/);
  });
});
