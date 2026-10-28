import test from 'node:test';
import assert from 'node:assert/strict';
import { extractScreenContract } from '../src/screen-contract-extractor.ts';

test('extracts a selected screen contract with relative frames, native kinds, assets, and provenance', () => {
  const result = extractScreenContract({
    id: 'doc', name: 'Design', tokens: [], diagnostics: [], provenance: [],
    assets: [{ id: 'hero', name: 'hero.svg', kind: 'svg', sourceNodeId: 'hero', provenance: [{ source: 'fig', reference: 'design.fig', field: 'hero' }] }],
    nodes: [{ id: 'screen', name: 'Home', type: 'FRAME', layout: { x: 100, y: 200, width: 390, height: 844 }, children: [
      { id: 'title', name: 'Title', type: 'TEXT', layout: { x: 16, y: 20, width: 100, height: 24 }, text: { content: 'Home', fontSize: 24 }, children: [], unsupportedProperties: [], provenance: [{ source: 'fig', reference: 'design.fig', field: 'title' }] },
      { id: 'hero', name: 'Hero', type: 'IMAGE', layout: { x: 0, y: 60, width: 390, height: 200 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'image-fill', name: 'image 16', type: 'RECTANGLE', layout: { x: 0, y: 300, width: 200, height: 221 }, style: { fill: '#000000' }, children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [{ source: 'fig', reference: 'design.fig', field: 'screen' }] }],
  }, 'screen', 'design.fig');

  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.contract.screenSize, { width: 390, height: 844 });
  assert.deepEqual(result.contract.components.map((component) => component.frame), [
    { x: 16, y: 20, width: 100, height: 24 },
    { x: 0, y: 60, width: 390, height: 200 },
    { x: 0, y: 300, width: 200, height: 221 },
  ]);
  assert.equal(result.contract.components[0]?.kind, 'text');
  assert.deepEqual(result.contract.assets.map((asset) => asset.resourceName), ['hero.svg', 'image 16']);
});

test('fails instead of inventing a screen size when the selected root has no frame', () => {
  assert.throws(() => extractScreenContract({ id: 'doc', name: 'Design', tokens: [], assets: [], diagnostics: [], provenance: [], nodes: [{ id: 'screen', name: 'Home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] }, 'screen', 'design.fig'), /no complete frame/);
});
