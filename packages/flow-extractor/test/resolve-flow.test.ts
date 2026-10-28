import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDesignDocument } from '../../core/src/design-ast.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import { resolveFlowScope } from '../src/resolve-flow.ts';

const flow: FlowIR = {
  version: '1.0',
  screens: [
    { id: 'home', title: 'Home', provenance: [{ source: 'json', reference: 'flow.json' }] },
    { id: 'product-detail', title: 'Product Detail', provenance: [{ source: 'json', reference: 'flow.json' }] },
    { id: 'checkout', title: 'Checkout', provenance: [{ source: 'json', reference: 'flow.json' }] },
  ],
  transitions: [{ from: 'home', event: 'tap product', to: 'product-detail', provenance: [{ source: 'json', reference: 'flow.json' }] }],
  states: [{ screenId: 'checkout', name: 'loading', provenance: [{ source: 'json', reference: 'flow.json' }] }],
  conflicts: [],
  diagnostics: [],
};

test('source-first flow scope maps declared screens to design roots without adding screens', () => {
  const design = normalizeDesignDocument({
    id: 'doc', name: 'Food', nodes: [
      { id: 'node-home', name: 'Home', type: 'FRAME', children: [] },
      { id: 'node-product', name: 'Product Detail', type: 'FRAME', children: [] },
    ],
  });
  const resolved = resolveFlowScope(design, flow, 'flow.json');

  assert.deepEqual(resolved.screens.map((screen) => screen.designNodeId), ['node-home', 'node-product', undefined]);
  assert.equal(resolved.screens.length, 3);
  assert.ok(resolved.diagnostics.some((item) => item.includes('Unresolved design screen: checkout')));
  assert.ok(resolved.diagnostics.some((item) => item.includes('Unresolved design state screen: checkout')));
});

test('an explicit designNodeId is preserved when it exists in the design document', () => {
  const design = normalizeDesignDocument({ id: 'doc', name: 'Food', nodes: [{ id: 'node-home', name: 'Home', type: 'FRAME', children: [] }] });
  const explicit: FlowIR = { ...flow, screens: [{ ...flow.screens[0]!, designNodeId: 'node-home' }], transitions: [], states: [] };
  const resolved = resolveFlowScope(design, explicit, 'flow.json');
  assert.equal(resolved.screens[0]?.designNodeId, 'node-home');
  assert.equal(resolved.diagnostics.length, 0);
});
