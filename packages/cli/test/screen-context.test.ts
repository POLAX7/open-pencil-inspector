import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScreenContext } from '../src/screen-context.ts';

test('builds screen-scoped agent context with subtree assets and matching flow', () => {
  const result = buildScreenContext({
    id: 'design', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [
      { id: 'asset-1', name: 'burger', kind: 'png', sourceNodeId: 'image-1', provenance: [] },
      { id: 'asset-2', name: 'other', kind: 'png', sourceNodeId: 'other', provenance: [] },
    ], nodes: [{ id: 'home', name: 'Home', type: 'FRAME', children: [{ id: 'image-1', name: 'Burger', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }],
  }, {
    version: '1.0', screens: [{ id: 'home', designNodeId: 'home', provenance: [] }, { id: 'detail', designNodeId: 'detail', provenance: [] }],
    transitions: [{ from: 'home', event: 'tap burger', to: 'detail', provenance: [] }], states: [], conflicts: [], diagnostics: [],
  }, 'home');

  assert.equal(result.screen.id, 'home');
  assert.equal(result.screen.node.name, 'Home');
  assert.deepEqual(result.assets.map((asset) => asset.id), ['asset-1']);
  assert.deepEqual(result.flow.screens.map((screen) => screen.id), ['home']);
  assert.deepEqual(result.flow.transitions.map((transition) => transition.to), ['detail']);
});

test('fails loudly when the requested screen node does not exist', () => {
  assert.throws(() => buildScreenContext({ id: 'design', name: 'Empty', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [] }, { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] }, 'missing'), /Screen node not found: missing/);
});
