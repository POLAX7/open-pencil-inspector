import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDesignDocument } from '../../core/src/design-ast.ts';
import { inferFlowFromDesign } from '../src/fig-flow.ts';

test('design flow inference records screens but does not invent navigation', () => {
  const design = normalizeDesignDocument({
    id: 'food-app',
    name: 'Food App',
    nodes: [
      { id: '0:5', name: 'home', type: 'FRAME', children: [] },
      { id: '0:74', name: 'product 1', type: 'FRAME', children: [] },
    ],
  });
  const flow = inferFlowFromDesign(design, 'figs/FoodApp.fig');

  assert.deepEqual(flow.screens.map((screen) => screen.id), ['home', 'product-1']);
  assert.equal(flow.screens[0]?.designNodeId, '0:5');
  assert.equal(flow.screens[0]?.presentation, 'root');
  assert.deepEqual(flow.transitions, []);
  assert.equal(flow.screens[1]?.provenance[0]?.source, 'fig');
});

test('design flow inference discovers phone-sized screen frames inside a selected app subtree', () => {
  const design = normalizeDesignDocument({
    id: 'crypto-food',
    name: 'CryptoAndFoodApp',
    nodes: [{ id: 'food-app', name: 'Food App', type: 'SECTION', children: [
      { id: 'home', name: 'Home Fixed', type: 'FRAME', layout: { width: 360, height: 800 }, children: [] },
      { id: 'payment', name: 'Payment Address', type: 'FRAME', layout: { width: 360, height: 800 }, children: [] },
    ] }],
  });

  const flow = inferFlowFromDesign(design, 'figs/CryptoAndFoodApp.fig');

  assert.deepEqual(flow.screens.map((screen) => screen.id), ['home-fixed', 'payment-address']);
  assert.deepEqual(flow.screens.map((screen) => screen.designNodeId), ['home', 'payment']);
  assert.deepEqual(flow.transitions, []);
});
