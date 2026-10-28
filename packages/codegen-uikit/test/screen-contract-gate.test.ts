import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUIKitViewController } from '../src/generator.ts';

test('UIKit Contract input uses generic UI IR instead of FoodApp screen generation', () => {
  const result = generateUIKitViewController({
    featureName: 'FoodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 390, height: 844 }, children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product-1', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product-1', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'home', designNodeId: 'home', screenSize: { width: 390, height: 844 }, safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#home' }],
    },
  });
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR UIKit backend/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /FoodAppProductDetailViewController/);
});

test('UIKit FoodApp name alone does not activate the compatibility adapter', () => {
  const result = generateUIKitViewController({
    featureName: 'FoodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product-1', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product-1', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR UIKit backend/);
});

test('UIKit generic generator ignores the legacy compatibility selector', () => {
  const result = generateUIKitViewController({
    featureName: 'FoodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
    compatibilityAdapter: 'foodApp',
  } as any);
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR UIKit backend/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /FoodAppProductDetailViewController/);
});

test('UIKit Contract selects the contracted design root instead of the first canvas root', () => {
  const result = generateUIKitViewController({
    featureName: 'FoodAppPilot',
    design: { id: 'design', name: 'FoodApp', nodes: [
      { id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'home-label', name: 'Home', type: 'TEXT', text: { content: 'Home' }, layout: { x: 0, y: 0, width: 80, height: 24 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
      { id: 'product-1', name: 'product 1', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'order', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, layout: { x: 0, y: 0, width: 111, height: 24 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
    ], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product-1', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product-1', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'product-1', designNodeId: 'product-1', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [19, 19, 19, 19],
      components: [{ id: 'order', nodeId: 'order', kind: 'button', frame: { x: 0, y: 0, width: 111, height: 24 }, provenance: [{ source: 'spec', reference: 'contract.json#order' }] }], assets: [], interactions: [{ id: 'order-to-payment', nodeId: 'order', event: 'tap ORDER NOW', transition: { to: 'payment', kind: 'push' }, provenance: [{ source: 'user', reference: 'confirmation#order' }] }], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#product-1' }],
    },
  });
  assert.match(result.files[0]?.contents ?? '', /ORDER NOW/);
  assert.match(result.files[0]?.contents ?? '', /UIButton/);
  assert.match(result.files[0]?.contents ?? '', /bringSubviewToFront/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', />Home</);
});
