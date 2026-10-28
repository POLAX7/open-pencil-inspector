import test from 'node:test';
import assert from 'node:assert/strict';
import { assertExistingIOSIntegrationPlatform, type ExistingIOSIntegrationProfile } from '../src/existing-ios-integration.ts';

const swiftOnly: ExistingIOSIntegrationProfile = {
  version: '1.0', projectPath: 'App.xcodeproj', module: 'Feature', feature: 'checkout',
  entryPoints: { swiftUI: { typeName: 'CheckoutView' } },
  navigation: { coordinatorType: 'Coordinator', entryMethod: 'showCheckout' },
  dependencyInjection: { containerType: 'Container', registrationMethod: 'registerCheckout' },
  assetDestination: { relativePath: 'Resources/Checkout', bundle: 'main' },
};

test('integration platform gate accepts a matching SwiftUI profile', () => {
  assert.doesNotThrow(() => assertExistingIOSIntegrationPlatform(swiftOnly, 'swiftui'));
});

test('integration platform gate rejects a profile missing the requested backend', () => {
  assert.throws(() => assertExistingIOSIntegrationPlatform(swiftOnly, 'both'), /uikit is required/);
});
