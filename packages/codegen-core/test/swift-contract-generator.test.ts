import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSwiftContracts } from '../src/swift-contract-generator.ts';

test('shared Swift contracts include MVVM-C routes, state, and DI boundary', () => {
  const result = generateSwiftContracts({
    featureName: 'login screen',
    design: { id: 'doc', name: 'Login', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'login', provenance: [] }, { id: 'home', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.equal(result.files[0]?.path, 'LoginScreenContracts.swift');
  assert.match(result.files[0]?.contents ?? '', /enum LoginScreenRoute/);
  assert.match(result.files[0]?.contents ?? '', /RepositoryProtocol/);
  assert.match(result.files[0]?.contents ?? '', /failed\(message: String\)/);
});

test('shared Swift contracts expose explicit flow transitions to a coordinator', () => {
  const result = generateSwiftContracts({
    featureName: 'food app',
    design: { id: 'doc', name: 'Food', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0',
      screens: [{ id: 'home', provenance: [] }, { id: 'product-1', provenance: [] }],
      transitions: [{ from: 'home', event: 'tap product', to: 'product-1', provenance: [] }],
      states: [], conflicts: [], diagnostics: [],
    },
  });
  assert.match(result.files[0]?.contents ?? '', /enum FoodAppTransition/);
  assert.match(result.files[0]?.contents ?? '', /@MainActor public protocol FoodAppCoordinator/);
  assert.match(result.files[0]?.contents ?? '', /func navigate\(to route: FoodAppRoute/);
  assert.match(result.files[0]?.contents ?? '', /case homeToProduct1TapProduct/);
});

test('shared Swift contracts expose a ViewModel protocol and explicit state/event ownership', () => {
  const result = generateSwiftContracts({
    featureName: 'checkout',
    design: { id: 'doc', name: 'Checkout', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0',
      screens: [{ id: 'checkout', presentation: 'root', provenance: [] }, { id: 'success', presentation: 'replace', provenance: [] }],
      transitions: [{ from: 'checkout', event: 'submit', to: 'success', effect: 'show success', provenance: [] }],
      states: [{ screenId: 'checkout', name: 'form', fields: ['email', 'address'], provenance: [] }],
      conflicts: [], diagnostics: [],
    },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /@MainActor public protocol CheckoutViewModelProtocol/);
  assert.match(source, /enum CheckoutFeatureState/);
  assert.match(source, /case submit/);
  assert.match(source, /case checkoutToSuccessSubmit/);
  assert.doesNotMatch(source, /https?:\/\//);
});
