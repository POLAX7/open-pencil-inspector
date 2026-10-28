import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLayoutContracts } from '../src/extractor.ts';
import { validateLayoutContracts } from '../src/validator.ts';
import type { DesignDocument } from '../../core/src/design-ast.ts';

function documentWith(nodes: DesignDocument['nodes']): DesignDocument {
  return { id: 'doc-1', name: 'Layout', nodes, tokens: [], assets: [], diagnostics: [], provenance: [] };
}

test('extracts parent-relative frames and source layout metrics for every child', () => {
  const result = extractLayoutContracts(documentWith([{
    id: 'screen', name: 'Home', type: 'FRAME', layout: {
      x: 10, y: 20, width: 320, height: 640, direction: 'COL', gap: 12,
      padding: [16, 20, 24, 20], alignment: 'MIN', sizing: 'FIXED',
    }, children: [{
      id: 'title', name: 'Title', type: 'TEXT', layout: { x: 30, y: 36, width: 180, height: 28 },
      text: { content: 'Home', fontFamily: 'Inter', fontSize: 24, lineHeight: 28, fontWeight: 700 }, children: [],
    }, {
      id: 'logo', name: 'Logo', type: 'IMAGE', layout: { x: 40, y: 80, width: 48, height: 48 }, assetRef: 'logo.svg', children: [],
    }], unsupportedProperties: [], provenance: [],
  }]));

  assert.deepEqual(result.nodes.find((node) => node.id === 'title')?.frame, { x: 30, y: 36, width: 180, height: 28 });
  assert.deepEqual(result.nodes.find((node) => node.id === 'screen')?.container, {
    direction: 'COL', gap: 12, padding: [16, 20, 24, 20], alignment: 'MIN', sizing: 'FIXED',
  });
  assert.deepEqual(result.nodes.find((node) => node.id === 'title')?.text, {
    content: 'Home', fontFamily: 'Inter', fontSize: 24, lineHeight: 28, fontWeight: 700,
  });
  assert.deepEqual(result.nodes.find((node) => node.id === 'logo')?.asset, { assetRef: 'logo.svg', contentMode: 'scaleAspectFit' });
});

test('classifies explicit stack, grid-like, overlay, and absolute containers without guessing child positions', () => {
  const result = extractLayoutContracts(documentWith([
    { id: 'stack', name: 'Stack', type: 'FRAME', layout: { width: 100, height: 100, direction: 'ROW' }, children: [], unsupportedProperties: [], provenance: [] },
    { id: 'absolute', name: 'Absolute', type: 'FRAME', layout: { width: 100, height: 100 }, children: [], unsupportedProperties: [], provenance: [] },
  ]));
  assert.equal(result.nodes.find((node) => node.id === 'stack')?.mode, 'stack');
  assert.equal(result.nodes.find((node) => node.id === 'absolute')?.mode, 'absolute');
});

test('classifies flow, grid, and overlay only from explicit metrics and measured child frames', () => {
  const result = extractLayoutContracts(documentWith([
    { id: 'flow', name: 'Flow', type: 'FRAME', layout: { width: 100, height: 100, direction: 'COL', gap: 8 }, children: [], unsupportedProperties: [], provenance: [] },
    { id: 'grid', name: 'Grid', type: 'FRAME', layout: { width: 100, height: 100 }, children: [
      { id: 'grid-a', name: 'A', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 40, height: 40 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'grid-b', name: 'B', type: 'RECTANGLE', layout: { x: 50, y: 0, width: 40, height: 40 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'grid-c', name: 'C', type: 'RECTANGLE', layout: { x: 0, y: 50, width: 40, height: 40 }, children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] },
    { id: 'overlay', name: 'Overlay', type: 'FRAME', layout: { width: 100, height: 100 }, children: [
      { id: 'overlay-a', name: 'A', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 60, height: 60 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'overlay-b', name: 'B', type: 'RECTANGLE', layout: { x: 20, y: 20, width: 60, height: 60 }, children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] },
  ]));
  assert.equal(result.nodes.find((node) => node.id === 'flow')?.mode, 'flow');
  assert.equal(result.nodes.find((node) => node.id === 'grid')?.mode, 'grid');
  assert.equal(result.nodes.find((node) => node.id === 'overlay')?.mode, 'overlay');
});

test('reports out-of-bounds children, overlaps, missing frames, and mixed layout modes', () => {
  const result = extractLayoutContracts(documentWith([{
    id: 'screen', name: 'Screen', type: 'FRAME', layout: { x: 0, y: 0, width: 100, height: 100, direction: 'ROW' }, children: [
      { id: 'first', name: 'First', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 70, height: 50 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'second', name: 'Second', type: 'RECTANGLE', layout: { x: 40, y: 10, width: 70, height: 50 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'missing', name: 'Missing', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [],
  }]));
  const codes = result.diagnostics.map((item) => item.code);
  assert.ok(codes.includes('LAYOUT_CHILD_OUT_OF_BOUNDS'));
  assert.ok(codes.includes('LAYOUT_CHILD_OVERLAP'));
  assert.ok(codes.includes('LAYOUT_MISSING_FRAME'));
  assert.ok(codes.includes('LAYOUT_MIXED_MODE'));
});

test('validation returns diagnostics without changing extracted frames', () => {
  const result = extractLayoutContracts(documentWith([{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 100, height: 100 }, children: [], unsupportedProperties: [], provenance: [] }]));
  const before = JSON.stringify(result.nodes);
  const validated = validateLayoutContracts(result);
  assert.equal(JSON.stringify(validated.nodes), before);
  assert.ok(validated.diagnostics.every((item) => item.path));
});
