import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExistingIOSIntegrationProfile } from '../src/existing-ios-integration.ts';

const profile = {
  version: '1.0',
  projectPath: 'App.xcodeproj',
  module: 'ShoppingFeature',
  feature: 'checkout',
  entryPoints: { swiftUI: { typeName: 'CheckoutView' }, uikit: { typeName: 'CheckoutViewController' } },
  navigation: { coordinatorType: 'AppCoordinator', entryMethod: 'showCheckout' },
  dependencyInjection: { containerType: 'AppContainer', registrationMethod: 'registerCheckout' },
  assetDestination: { relativePath: 'Resources/Checkout', bundle: 'main' },
};

test('integration profile preserves explicit host symbols without guessing', () => {
  assert.deepEqual(validateExistingIOSIntegrationProfile(profile), profile);
});

test('integration profile rejects a missing entry point', () => {
  assert.throws(() => validateExistingIOSIntegrationProfile({ ...profile, entryPoints: {} }), /entryPoints must declare/);
});

test('integration profile rejects an invalid asset bundle', () => {
  assert.throws(() => validateExistingIOSIntegrationProfile({ ...profile, assetDestination: { ...profile.assetDestination, bundle: 'guess' } }), /bundle is invalid/);
});
