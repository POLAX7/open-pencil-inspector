import { describe, expect, test } from 'bun:test';
import type { DesignDocument } from '../../core/src/design-ast.ts';
import { buildDesignEvidence } from '../src/design-evidence.ts';

const document: DesignDocument = {
  id: 'fixture',
  name: 'Fixture',
  nodes: [{
    id: 'screen',
    name: 'Payment Address',
    type: 'FRAME',
    layout: { x: 0, y: 0, width: 360, height: 800 },
    children: [{
      id: 'button',
      name: 'Save Address',
      type: 'RECTANGLE',
      layout: { x: 16, y: 700, width: 328, height: 48 },
      style: { fill: '#FF0000', radius: 12 },
      children: [],
      unsupportedProperties: [],
      provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'node:button' }],
    }],
    unsupportedProperties: [],
    provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'node:screen' }],
  }],
  tokens: [],
  assets: [],
  diagnostics: [],
  provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'document' }],
};

describe('buildDesignEvidence', () => {
  test('records source node, frame, style, native mapping, and verification method', () => {
    const checklist = buildDesignEvidence(document, ['screen'], 'fixture.fig');
    const button = checklist.entries.find((entry) => entry.nodeId === 'button');

    expect(button).toMatchObject({
      kind: 'component',
      frame: { x: 16, y: 700, width: 328, height: 48 },
      style: { fill: '#FF0000', radius: 12 },
      nativePattern: 'button',
      nativeEvidence: ['node-type', 'node-name'],
      verificationMethod: 'screen-contract',
    });
    expect(button?.provenance.length).toBeGreaterThan(0);
  });

  test('reports a diagnostic when an evidence node has no measurable frame', () => {
    const incomplete = structuredClone(document);
    delete incomplete.nodes[0].children[0].layout;
    const checklist = buildDesignEvidence(incomplete, ['screen'], 'fixture.fig');

    expect(checklist.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DESIGN_EVIDENCE_FRAME_REQUIRED', severity: 'warning' }),
    ]));
  });
});
