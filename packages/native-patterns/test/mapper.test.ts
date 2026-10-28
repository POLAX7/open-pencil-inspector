import test from 'node:test';
import assert from 'node:assert/strict';
import { mapNativePattern } from '../src/mapper.ts';

test('maps native-safe UI kinds to explicit platform-neutral patterns', () => {
  assert.equal(mapNativePattern({ id: 'a', name: 'Search', type: 'TEXT', text: { content: '' }, children: [] }).pattern, 'textField');
  assert.deepEqual(mapNativePattern({ id: 'b', name: 'Checkout', type: 'RECTANGLE', children: [] }).evidence, ['node-type', 'node-name']);
  assert.equal(mapNativePattern({ id: 'c', name: 'Hero image', type: 'IMAGE', children: [] }).pattern, 'image');
});

test('maps Figma sections to structural containers', () => {
  const result = mapNativePattern({ id: 'section', name: 'Food App', type: 'SECTION', children: [] });
  assert.equal(result.pattern, 'container');
  assert.equal(result.warning, undefined);
});

test('maps named back-navigation vectors to an evidence-backed native pattern', () => {
  const result = mapNativePattern({
    id: '0:1226',
    name: 'icon/navigation/arrow_back_ios_24px',
    type: 'VECTOR',
    children: [],
  });
  assert.equal(result.pattern, 'navigationBackButton');
  assert.deepEqual(result.evidence, ['node-type', 'node-name']);
  assert.equal(result.warning, undefined);
});

test('maps an explicitly named filled background vector to a container', () => {
  const result = mapNativePattern({
    id: '0:533',
    name: 'bg',
    type: 'VECTOR',
    style: { fill: '#ffffff' },
    children: [],
  });
  assert.equal(result.pattern, 'container');
  assert.deepEqual(result.evidence, ['node-type', 'node-name', 'style-fill']);
  assert.equal(result.warning, undefined);
});

test('maps explicitly named rating stars to image artwork', () => {
  const result = mapNativePattern({
    id: '0:552',
    name: 'Star 1',
    type: 'VECTOR',
    children: [],
  });
  assert.equal(result.pattern, 'image');
  assert.deepEqual(result.evidence, ['node-type', 'node-name', 'artwork-name']);
  assert.equal(result.warning, undefined);
});

test('returns unknown with warning instead of inventing a native mapping', () => {
  const result = mapNativePattern({ id: 'plugin', name: 'Plugin', type: 'UNKNOWN', children: [] });
  assert.equal(result.pattern, 'unknown');
  assert.equal(result.warning?.code, 'UNSUPPORTED_NATIVE_PATTERN');
});
