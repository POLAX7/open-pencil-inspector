import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDesignDocument } from '../../core/src/design-ast.ts';
import { buildFlowQuestions, proposeFlow } from '../src/propose.ts';

test('candidate proposal preserves every design root and does not invent navigation', () => {
  const design = normalizeDesignDocument({
    id: 'food-app', name: 'FoodApp', nodes: [
      { id: '0:5', name: 'home', type: 'FRAME', children: [{ id: '0:32', name: 'Group 10', type: 'GROUP', children: [{ id: '0:34', name: "Cheeseburger Wendy's Burger", type: 'TEXT', text: { content: "Cheeseburger Wendy's Burger" }, children: [] }] }] },
      { id: '0:74', name: 'product 1', type: 'FRAME', children: [] },
      { id: '0:427', name: 'Payment', type: 'FRAME', children: [{ id: '0:469', name: 'Pay Now', type: 'GROUP', children: [] }] },
    ],
  });
  const candidate = proposeFlow(design, 'figs/FoodApp.fig', 'open-pencil-cli@0.16.0');
  assert.deepEqual(candidate.flow.screens.map((screen) => screen.id), ['home', 'product-1', 'payment']);
  assert.deepEqual(candidate.flow.transitions, []);
  assert.ok(candidate.questions.some((question) => question.evidence.includes('design-node:0:34')));
  assert.ok(candidate.questions.some((question) => question.evidence.includes('design-node:0:469')));
  assert.match(candidate.candidateHash, /^sha256:[a-f0-9]{64}$/);
});

test('candidate questions retain exact node evidence and screen scope', () => {
  const design = normalizeDesignDocument({ id: 'd', name: 'd', nodes: [{ id: 'screen', name: 'home', type: 'FRAME', children: [{ id: 'cta', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, children: [] }] }] });
  const questions = buildFlowQuestions(design);
  assert.equal(questions.length, 1);
  assert.equal(questions[0]?.screen, 'home');
  assert.deepEqual(questions[0]?.evidence, ['design-node:cta', 'text:ORDER NOW']);
});

test('candidate binds flow confirmation to the selected design scope', () => {
  const design = normalizeDesignDocument({ id: 'd', name: 'd', nodes: [{ id: 'screen', name: 'Home', type: 'FRAME', children: [] }] });
  const selection = { version: '1.0' as const, source: 'CryptoAndFoodApp.fig', page: { id: '0:5', name: '🟠 Apps' }, rootNodes: [{ id: 'screen', name: 'Home', type: 'FRAME' }], scope: 'selected-subtree' as const };
  const candidate = proposeFlow(design, selection.source, 'parser', selection);
  assert.equal(candidate.selection?.fingerprint.startsWith('sha256:'), true);
  assert.equal(candidate.selection?.manifest.page.id, '0:5');
});

test('candidate assigns nested interactions to the phone screen that contains the control', () => {
  const design = normalizeDesignDocument({
    id: 'food',
    name: 'Food',
    nodes: [{ id: 'app', name: 'Food App', type: 'SECTION', children: [
      { id: 'details', name: 'Food Details', type: 'FRAME', layout: { width: 360, height: 800 }, children: [
        { id: 'order', name: 'Order Now', type: 'TEXT', text: { content: 'Order Now' }, children: [] },
      ] },
      { id: 'payment', name: 'Payment Address', type: 'FRAME', layout: { width: 360, height: 800 }, children: [] },
    ] }],
  });

  const candidate = proposeFlow(design, 'food.fig', 'test');

  assert.deepEqual(candidate.questions.map((question) => question.screen), ['food-details']);
  assert.deepEqual(candidate.questions[0]?.evidence, ['design-node:order', 'text:Order Now']);
});
