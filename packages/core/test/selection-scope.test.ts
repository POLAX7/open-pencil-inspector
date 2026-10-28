import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionFingerprint, validateSelectionManifest } from '../src/selection-scope.ts';

const page = { id: '0:5', name: '🟠 Apps' };
const foodRoot = { id: '0:88', name: 'Food App', type: 'SECTION' };

test('selection manifest accepts a page scope and produces a stable fingerprint', () => {
  const selection = validateSelectionManifest({
    version: '1.0',
    source: 'figs/CryptoAndFoodApp.fig',
    page,
    rootNodes: [foodRoot],
    scope: 'page',
  });

  assert.equal(selection.page.name, '🟠 Apps');
  assert.equal(selectionFingerprint(selection), selectionFingerprint({ ...selection, rootNodes: [{ ...foodRoot }] }));
});

test('selection manifest accepts multiple selected roots from one page', () => {
  const selection = validateSelectionManifest({
    version: '1.0',
    source: 'figs/CryptoAndFoodApp.fig',
    page,
    rootNodes: [foodRoot, { id: '0:1013', name: 'Crypto', type: 'SECTION' }],
    scope: 'selected-subtree',
  });

  assert.equal(selection.rootNodes.length, 2);
});

test('selection manifest rejects empty or duplicate roots', () => {
  assert.throws(() => validateSelectionManifest({ version: '1.0', source: 'design.fig', page, rootNodes: [], scope: 'selected-subtree' }), /rootNodes/);
  assert.throws(() => validateSelectionManifest({ version: '1.0', source: 'design.fig', page, rootNodes: [foodRoot, foodRoot], scope: 'selected-subtree' }), /duplicate/);
});

test('selection manifest rejects missing page identity', () => {
  assert.throws(() => validateSelectionManifest({ version: '1.0', source: 'design.fig', page: { id: '', name: 'Apps' }, rootNodes: [foodRoot], scope: 'page' }), /page\.id/);
});
