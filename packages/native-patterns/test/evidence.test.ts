import { describe, expect, test } from 'bun:test';
import type { DesignDocument } from '../../core/src/design-ast.ts';
import { buildNativePatternMapping } from '../src/evidence.ts';

const document: DesignDocument = {
  id: 'doc',
  name: 'Design',
  nodes: [{
    id: 'screen', name: 'Home', type: 'FRAME', layout: { width: 360, height: 800 },
    children: [
      { id: 'button', name: 'Checkout', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [{ source: 'fig', reference: 'design.fig', field: 'node:button' }] },
      { id: 'unknown', name: 'Plugin Widget', type: 'UNKNOWN', children: [], unsupportedProperties: [], provenance: [{ source: 'fig', reference: 'design.fig', field: 'node:unknown' }] },
    ],
    unsupportedProperties: [], provenance: [{ source: 'fig', reference: 'design.fig', field: 'node:screen' }],
  }],
  tokens: [], assets: [], diagnostics: [], provenance: [],
};

describe('buildNativePatternMapping', () => {
  test('records an evidence-backed native pattern for every selected node', () => {
    const report = buildNativePatternMapping(document, ['screen'], 'design.fig');
    const button = report.entries.find((entry) => entry.nodeId === 'button');

    expect(button).toMatchObject({
      nodeId: 'button',
      pattern: 'button',
      evidence: ['node-type', 'node-name'],
      verificationMethod: 'design-ast',
    });
    expect(button?.provenance.length).toBeGreaterThan(0);
  });

  test('keeps unsupported native patterns as diagnostics instead of guessing', () => {
    const report = buildNativePatternMapping(document, ['screen'], 'design.fig');

    expect(report.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNSUPPORTED_NATIVE_PATTERN', severity: 'warning' }),
    ]));
    expect(report.entries.find((entry) => entry.nodeId === 'unknown')?.pattern).toBe('unknown');
  });

  test('uses explicit screen-contract asset evidence for artwork nodes', () => {
    const report = buildNativePatternMapping(document, ['screen'], 'design.fig', new Set(['unknown']));
    const asset = report.entries.find((entry) => entry.nodeId === 'unknown');

    expect(asset).toMatchObject({ pattern: 'image', evidence: ['screen-contract-asset'] });
    expect(report.diagnostics.some((item) => item.path === 'unknown')).toBe(false);
  });
});
