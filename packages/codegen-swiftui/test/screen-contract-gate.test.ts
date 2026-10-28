import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSwiftUIView } from '../src/generator.ts';

test('SwiftUI generation blocks an explicitly unconfirmed screen contract', () => {
  assert.throws(() => generateSwiftUIView({
    featureName: 'Checkout',
    design: { id: 'design', name: 'Checkout', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product-1', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product-1', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'checkout', designNodeId: 'checkout-node', screenSize: { width: 390, height: 844 },
      safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [], assets: [], interactions: [],
      unresolvedQuestions: [{ id: 'q1', question: 'What happens on submit?', status: 'unconfirmed', provenance: [{ source: 'spec', reference: 'flow.md#submit' }] }],
      provenance: [{ source: 'spec', reference: 'contract.json#checkout' }],
    },
  } as any));
});

test('SwiftUI Contract input uses generic UI IR instead of FoodApp screen generation', () => {
  const result = generateSwiftUIView({
    featureName: 'FoodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 390, height: 844 }, children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product-1', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product-1', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'home', designNodeId: 'home', screenSize: { width: 390, height: 844 }, safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
      components: [], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#home' }],
    },
  });
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR SwiftUI backend/);
  assert.match(result.files[0]?.contents ?? '', /GeometryReader \{ proxy in/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /Button\("tap ORDER NOW"\)/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /FoodAppProductDetailView/);
});

test('SwiftUI FoodApp name alone does not activate the compatibility adapter', () => {
  const result = generateSwiftUIView({
    featureName: 'FoodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
    compatibilityAdapter: 'foodApp',
  } as any);
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR SwiftUI backend/);
});

test('SwiftUI generic generator ignores the legacy compatibility selector', () => {
  const result = generateSwiftUIView({
    featureName: 'FoodApp',
    compatibilityAdapter: 'foodApp',
    design: { id: 'design', name: 'FoodApp', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  assert.match(result.files[0]?.contents ?? '', /Generic UI IR SwiftUI backend/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /FoodAppProductDetailView/);
});

test('SwiftUI Contract selects the contracted design root instead of the first canvas root', () => {
  const result = generateSwiftUIView({
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
  assert.match(result.files[0]?.contents ?? '', /Button\("ORDER NOW"\)/);
  assert.doesNotMatch(result.files[0]?.contents ?? '', />Home</);
});

test('SwiftUI contract does not duplicate an already interactive AST node', () => {
  const result = generateSwiftUIView({
    featureName: 'PilotProduct',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'screen', name: 'screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'cta', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, layout: { x: 64, y: 23, width: 111, height: 24 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'product', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'product', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'product', designNodeId: 'screen', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [19, 19, 19, 19],
      components: [{ id: 'cta', nodeId: 'cta', kind: 'button', frame: { x: 64, y: 23, width: 111, height: 24 }, provenance: [{ source: 'spec', reference: 'contract.json#cta' }] }], assets: [], interactions: [{ id: 'cta-to-payment', nodeId: 'cta', event: 'tap ORDER NOW', transition: { to: 'payment', kind: 'push' }, provenance: [{ source: 'user', reference: 'confirmation#cta' }] }], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#product' }],
    },
  });
  const source = result.files[0]?.contents ?? '';
  assert.equal(source.match(/Button\("ORDER NOW"\)/g)?.length, 1);
});

test('SwiftUI contract interaction overlay is top-left anchored to the host viewport', () => {
  const result = generateSwiftUIView({
    featureName: 'PilotHome',
    design: { id: 'design', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'card-title', name: 'Card title', type: 'TEXT', text: { content: "Cheeseburger Wendy's Burger" }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'product-1', provenance: [] }], transitions: [{ from: 'home', event: 'tap Cheeseburger Wendy\'s Burger', to: 'product-1', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
    screenContract: {
      id: 'home', designNodeId: 'home', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [19, 19, 19, 19],
      components: [{ id: 'card-title', nodeId: 'card-title', kind: 'text', frame: { x: 11, y: 136, width: 117, height: 44 }, typography: 'Poppins 14px', color: '#fbf2cf', provenance: [{ source: 'spec', reference: 'contract.json#card-title' }] }], assets: [], interactions: [{ id: 'card-to-product', nodeId: 'card-title', event: 'tap', transition: { to: 'product-1', kind: 'push' }, provenance: [{ source: 'user', reference: 'flow-confirmation#card' }] }], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: 'contract.json#home' }],
    },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /GeometryReader \{ proxy in/);
  assert.match(source, /frame\(maxWidth: \.infinity, maxHeight: \.infinity, alignment: \.topLeading\)/);
  assert.match(source, /clipped\(\)/);
  assert.match(source, /scaleEffect\(min\(proxy\.size\.width \/ 430, proxy\.size\.height \/ 932\), anchor:/);
  assert.match(source, /offset\(x: 11, y: 136\)/);
  assert.match(source, /Button\("Cheeseburger Wendy's Burger"\).*font\(\.custom\("Poppins", size: 14\)\.weight\(\.regular\)\)/);
  assert.doesNotMatch(source, /Button\("tap Cheeseburger Wendy's Burger"\)/);
  assert.doesNotMatch(source, /position\(x: 69\.5, y: 158\)/);
});
