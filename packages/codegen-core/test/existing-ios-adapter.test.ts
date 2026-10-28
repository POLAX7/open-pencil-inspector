import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExistingIOSIntegration } from '../src/existing-ios-adapter.ts';
import type { ExistingIOSIntegrationProfile } from '../src/existing-ios-integration.ts';

const profile: ExistingIOSIntegrationProfile = {
  version: '1.0', projectPath: 'App.xcodeproj', module: 'ShoppingFeature', feature: 'checkout',
  entryPoints: { swiftUI: { typeName: 'CheckoutView' }, uikit: { typeName: 'CheckoutViewController' } },
  navigation: { coordinatorType: 'AppCoordinator', entryMethod: 'showCheckout' },
  dependencyInjection: { containerType: 'AppContainer', registrationMethod: 'registerCheckout' },
  assetDestination: { relativePath: 'Resources/Checkout', bundle: 'main' },
};

test('existing-app adapter emits explicit feature integration metadata', () => {
  const result = generateExistingIOSIntegration({
    featureName: 'checkout', integrationProfile: profile,
    design: { id: 'doc', name: 'Design', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.equal(result.files[0]?.path, 'CheckoutExistingAppIntegration.swift');
  assert.match(result.files[0]?.contents ?? '', /coordinatorType = "AppCoordinator"/);
  assert.match(result.files[0]?.contents ?? '', /swiftUIEntryPoint = "CheckoutView"/);
  assert.match(result.files[0]?.contents ?? '', /dependencyRegistrationMethod = "registerCheckout"/);
  assert.match(result.files[0]?.contents ?? '', /protocol CheckoutExistingAppAdapter/);
  assert.match(result.files[0]?.contents ?? '', /present\(route: CheckoutRoute, transition: CheckoutTransition\)/);
});

test('generic generation has no existing-app adapter without an explicit profile', () => {
  const result = generateExistingIOSIntegration({
    featureName: 'checkout',
    design: { id: 'doc', name: 'Design', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.deepEqual(result.files, []);
});
