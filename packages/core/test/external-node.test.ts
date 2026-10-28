import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExternalNode } from '../src/external-node.ts';

test('CLI and MCP raw aliases normalize to the same render-critical node contract', () => {
  const cli = normalizeExternalNode({
    id: 'card', name: 'Card', type: 'FRAME', x: 8, y: 12, width: 200, height: 120,
    layoutMode: 'HORIZONTAL', itemSpacing: 16, paddingTop: 4, paddingRight: 8, paddingBottom: 12, paddingLeft: 16,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0, a: 0.8 } }],
    strokes: [{ color: { r: 0, g: 0, b: 0, a: 1 } }], cornerRadius: 12, opacity: 0.9,
    text: 'Buy', fontFamily: 'Inter', fontSize: 16, fontWeight: 600, lineHeight: 20, textAlignHorizontal: 'CENTER',
    componentKey: 'button', componentProperties: { disabled: false }, variant: 'primary', assetRef: 'button-icon', children: [],
  }, [{ source: 'open-pencil-cli', reference: 'design.fig', field: 'nodes[0]' }]);
  const mcp = normalizeExternalNode({
    id: 'card', name: 'Card', type: 'FRAME', x: 8, y: 12, w: 200, h: 120,
    layoutMode: 'HORIZONTAL', itemSpacing: 16, paddingTop: 4, paddingRight: 8, paddingBottom: 12, paddingLeft: 16,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0, a: 0.8 } }],
    strokes: [{ color: { r: 0, g: 0, b: 0, a: 1 } }], cornerRadius: 12, opacity: 0.9,
    characters: 'Buy', fontFamily: 'Inter', fontSize: 16, fontWeight: 600, lineHeight: 20, textAlignHorizontal: 'CENTER',
    component: { key: 'button', properties: { disabled: false }, variant: 'primary' }, assetRef: 'button-icon', children: [],
  }, [{ source: 'open-pencil-mcp', reference: 'get_node', field: 'id=card' }]);

  const stripProvenance = (value: ReturnType<typeof normalizeExternalNode>) => ({ node: { ...value.node, provenance: [] }, diagnostics: value.diagnostics });
  assert.deepEqual(stripProvenance(cli), stripProvenance(mcp));
  assert.deepEqual(cli.node.layout, { x: 8, y: 12, width: 200, height: 120, direction: 'ROW', gap: 16, padding: [4, 8, 12, 16] });
  assert.deepEqual(cli.node.text, { content: 'Buy', fontFamily: 'Inter', fontSize: 16, fontWeight: 600, lineHeight: 20, color: '#ff8000cc', alignment: 'CENTER' });
  assert.deepEqual(cli.node.component, { key: 'button', properties: { disabled: false }, variant: 'primary' });
  assert.equal(cli.node.assetRef, 'button-icon');
});

test('unsupported render properties and child-count hydration gaps become source diagnostics', () => {
  const result = normalizeExternalNode({ id: 'vector', name: 'Icon', type: 'VECTOR', children: 3 }, [{ source: 'open-pencil-cli', reference: 'design.fig', field: 'nodes[2]' }]);

  assert.ok(result.node.unsupportedProperties.includes('render:vector'));
  assert.ok(result.node.unsupportedProperties.includes('children:count:3'));
  assert.deepEqual(result.diagnostics.map((item) => ({ code: item.code, severity: item.severity, path: item.path })), [
    { code: 'UNSUPPORTED_NODE_RENDER', severity: 'warning', path: 'vector' },
    { code: 'CHILDREN_NOT_HYDRATED', severity: 'warning', path: 'vector' },
  ]);
});

test('image fills do not become guessed solid colors', () => {
  const result = normalizeExternalNode({
    id: 'image-fill', name: 'image 16', type: 'ROUNDED_RECTANGLE', width: 200, height: 221,
    fills: [{ type: 'IMAGE', color: { r: 0, g: 0, b: 0, a: 1 }, imageHash: 'hash' }], children: [],
  }, [{ source: 'open-pencil-cli', reference: 'CryptoAndFoodApp.fig', field: 'nodes[0]' }]);

  assert.equal(result.node.style?.fill, undefined);
  assert.equal(result.node.type, 'RECTANGLE');
  assert.equal(result.node.assetRef, 'hash');
});

test('section nodes remain structural containers instead of becoming unknown nodes', () => {
  const result = normalizeExternalNode({
    id: 'section-1', name: 'Food App', type: 'SECTION', width: 390, height: 844,
    children: [{ id: 'screen-1', name: 'Home', type: 'FRAME', width: 390, height: 844, children: [] }],
  }, [{ source: 'open-pencil-cli', reference: 'CryptoAndFoodApp.fig', field: 'nodes[0]' }]);

  assert.equal(result.node.type, 'SECTION');
  assert.equal(result.node.children[0]?.type, 'FRAME');
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.node.unsupportedProperties, []);
});

test('vector-like Figma shapes use the asset-backed vector contract', () => {
  const result = normalizeExternalNode({
    id: 'star', name: 'Rating star', type: 'STAR', children: [],
  }, [{ source: 'open-pencil-cli', reference: 'CryptoAndFoodApp.fig', field: 'nodes[1]' }]);

  assert.equal(result.node.type, 'VECTOR');
  assert.deepEqual(result.node.unsupportedProperties, ['render:vector']);
  assert.deepEqual(result.diagnostics.map((item) => item.code), ['UNSUPPORTED_NODE_RENDER']);
});
