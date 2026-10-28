import test from 'node:test';
import assert from 'node:assert/strict';
import { convertToUIIR, selectPrimaryScreen } from '../src/convert.ts';
import type { DesignDocument } from '../../core/src/design-ast.ts';

function document(): DesignDocument {
  return {
    id: 'doc-1', name: 'Home', assets: [], diagnostics: [], provenance: [], tokens: [], nodes: [{
      id: 'screen', name: 'Home', type: 'FRAME', layout: { width: 320, height: 640, direction: 'COL' }, children: [
        { id: 'title', name: 'Title', type: 'TEXT', text: { content: 'Welcome' }, children: [], unsupportedProperties: [], provenance: [] },
        { id: 'hero', name: 'Hero image', type: 'IMAGE', assetRef: 'hero.svg', children: [], unsupportedProperties: [], provenance: [] },
        { id: 'checkout', name: 'Checkout', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [],
    }],
  };
}

test('converts the complete source tree and preserves layout references and coverage', () => {
  const result = convertToUIIR(document());
  assert.equal(result.root.sourceNodeId, 'screen');
  assert.deepEqual(result.root.children.map((node) => node.sourceNodeId), ['title', 'hero', 'checkout']);
  assert.equal(result.root.layout?.width, 320);
  assert.equal(result.coverage.filter((entry) => entry.status === 'generated').length, 4);
  assert.equal(result.coverage.length, 4);
});

test('does not omit unsupported source nodes and reports their coverage warning', () => {
  const result = convertToUIIR({ ...document(), nodes: [{ ...document().nodes[0]!, children: [{ id: 'plugin', name: 'Plugin', type: 'UNKNOWN', children: [], unsupportedProperties: ['type:PLUGIN'], provenance: [] }] }] });
  assert.equal(result.root.children[0]?.kind, 'unknown');
  assert.equal(result.coverage[1]?.status, 'unsupported');
  assert.match(result.diagnostics[0]?.message ?? '', /unsupported/i);
});

test('preserves render-critical style for native container generation', () => {
  const result = convertToUIIR({
    ...document(),
    nodes: [{
      ...document().nodes[0]!,
      children: [{
        id: 'panel', name: 'Panel', type: 'RECTANGLE',
        layout: { x: 12, y: 24, width: 180, height: 90 },
        style: { fill: '#112233', radius: 12, opacity: 0.8 },
        children: [], unsupportedProperties: [], provenance: [],
      }],
    }],
  });
  assert.deepEqual(result.root.children[0]?.style, { fill: '#112233', radius: 12, opacity: 0.8 });
});

test('preserves local child coordinates from design nodes for native rendering', () => {
  const result = convertToUIIR({
    ...document(),
    nodes: [{
      ...document().nodes[0]!,
      layout: { x: 0, y: 0, width: 430, height: 932 },
      children: [{
        id: 'group', name: 'Group', type: 'FRAME', layout: { x: 249, y: 327, width: 154, height: 69 },
        children: [{
          id: 'label', name: 'Label', type: 'TEXT', layout: { x: 0, y: 0, width: 47, height: 19 },
          text: { content: 'Portion' }, children: [], unsupportedProperties: [], provenance: [],
        }], unsupportedProperties: [], provenance: [],
      }],
    }],
  });
  assert.deepEqual(result.root.children[0]?.layout, { x: 249, y: 327, width: 154, height: 69 });
  assert.deepEqual(result.root.children[0]?.children[0]?.layout, { x: 0, y: 0, width: 47, height: 19 });
});

test('selects a phone-sized child screen from a large design canvas', () => {
  const source = document().nodes[0]!;
  const result = selectPrimaryScreen({
    ...document(),
    nodes: [{ ...source, layout: { width: 2112, height: 2267 }, children: [
      { id: 'artboard', name: 'Running Orders', type: 'RECTANGLE', layout: { x: 100, y: 100, width: 375, height: 812 }, children: [], unsupportedProperties: [], provenance: [] },
    ] }],
  });
  assert.deepEqual(result.nodes.map((node) => node.id), ['artboard']);
  assert.equal(result.nodes[0]?.layout?.x, 0);
  assert.equal(result.nodes[0]?.layout?.y, 0);
});

test('selects a phone-sized screen from a later top-level root', () => {
  const source = document().nodes[0]!;
  const result = selectPrimaryScreen({
    ...document(),
    nodes: [
      { ...source, id: 'style-guide', layout: { width: 4416, height: 3720 }, children: [] },
      { ...source, id: 'preview', layout: { width: 1200, height: 1324 }, children: [
        { id: 'phone', name: 'Screen 2', type: 'RECTANGLE', layout: { x: 616, y: 97, width: 345, height: 747 }, children: [], unsupportedProperties: [], provenance: [] },
      ] },
    ],
  });
  assert.deepEqual(result.nodes.map((node) => node.id), ['phone']);
  assert.equal(result.nodes[0]?.layout?.x, 0);
  assert.equal(result.nodes[0]?.layout?.y, 0);
});
