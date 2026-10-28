import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDesignDocument } from '../src/design-ast.ts';

test('normalization preserves hierarchy and render-critical fields', () => {
  const document = normalizeDesignDocument({
    id: 'doc-1',
    name: 'Login',
    nodes: [{
      id: 'frame-1',
      name: 'Login Screen',
      type: 'FRAME',
      layout: { direction: 'COL', gap: 16, width: 320, height: 640 },
      children: [{ id: 'text-1', name: 'Title', type: 'TEXT', text: { content: 'Sign in' }, children: [] }],
    }],
  });

  assert.equal(document.nodes[0]?.children[0]?.text?.content, 'Sign in');
  assert.equal(document.nodes[0]?.layout?.gap, 16);
  assert.equal(document.nodes[0]?.children.length, 1);
});

test('unknown node types remain visible as diagnostics metadata', () => {
  const document = normalizeDesignDocument({
    id: 'doc-1',
    name: 'Unknown',
    nodes: [{ id: 'node-1', name: 'Plugin Layer', type: 'PLUGIN_LAYER', children: [] }],
  });

  assert.equal(document.nodes[0]?.type, 'UNKNOWN');
  assert.deepEqual(document.nodes[0]?.unsupportedProperties, ['type:PLUGIN_LAYER']);
});

test('invalid documents fail loudly instead of producing partial AST', () => {
  assert.throws(() => normalizeDesignDocument({ id: 'doc-1', name: 'Missing nodes' }), /nodes must be an array/);
  assert.throws(() => normalizeDesignDocument({ id: '', name: 'Invalid', nodes: [] }), /document id/);
});
