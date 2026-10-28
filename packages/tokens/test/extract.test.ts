import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSemanticTokens } from '../src/extract.ts';

test('normalizes provided design tokens without inventing values', () => {
  const result = extractSemanticTokens({
    id: 'doc-1', name: 'Tokens', nodes: [], assets: [], diagnostics: [], provenance: [],
    tokens: [
      { name: 'color/brand/primary', value: '#EF2A39', category: 'color', provenance: [{ source: 'fig', reference: 'node-1' }] },
      { name: 'spacing/card-gap', value: 16, category: 'spacing', provenance: [{ source: 'fig', reference: 'node-2' }] },
    ],
  });
  assert.deepEqual(result.tokens, [
    { name: 'color.brand.primary', value: '#EF2A39', category: 'color', provenance: [{ source: 'fig', reference: 'node-1' }] },
    { name: 'spacing.card-gap', value: 16, category: 'spacing', provenance: [{ source: 'fig', reference: 'node-2' }] },
  ]);
});

test('host bindings are explicit and do not alter token values', () => {
  const result = extractSemanticTokens({ id: 'doc-1', name: 'Tokens', nodes: [], assets: [], diagnostics: [], provenance: [], tokens: [
    { name: 'radius/card', value: 20, category: 'radius', provenance: [] },
  ]}, { host: 'swiftui', prefix: 'App' });
  assert.deepEqual(result.bindings, [{ tokenName: 'radius.card', host: 'swiftui', reference: 'App.radius.card' }]);
  assert.equal(result.tokens[0]?.value, 20);
});
