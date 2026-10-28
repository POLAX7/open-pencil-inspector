export interface ExistingIOSIntegrationProfile {
  version: '1.0';
  projectPath: string;
  module: string;
  feature: string;
  entryPoints: {
    swiftUI?: { typeName: string };
    uikit?: { typeName: string };
  };
  navigation: { coordinatorType: string; entryMethod: string };
  dependencyInjection: { containerType: string; registrationMethod: string };
  assetDestination: { relativePath: string; bundle: 'main' | 'module' | 'framework' };
}

export type ExistingIOSGenerationPlatform = 'swiftui' | 'uikit' | 'both';

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

export function validateExistingIOSIntegrationProfile(input: unknown): ExistingIOSIntegrationProfile {
  const value = record(input, 'integration');
  if (value.version !== '1.0') throw new TypeError('integration.version must be 1.0');
  requiredString(value.projectPath, 'integration.projectPath');
  requiredString(value.module, 'integration.module');
  requiredString(value.feature, 'integration.feature');

  const entryPoints = record(value.entryPoints, 'integration.entryPoints');
  const hasSwiftUI = entryPoints.swiftUI !== undefined;
  const hasUIKit = entryPoints.uikit !== undefined;
  if (!hasSwiftUI && !hasUIKit) throw new TypeError('integration.entryPoints must declare swiftUI or uikit');
  for (const platform of ['swiftUI', 'uikit'] as const) {
    if (entryPoints[platform] !== undefined) requiredString(record(entryPoints[platform], `integration.entryPoints.${platform}`).typeName, `integration.entryPoints.${platform}.typeName`);
  }

  const navigation = record(value.navigation, 'integration.navigation');
  requiredString(navigation.coordinatorType, 'integration.navigation.coordinatorType');
  requiredString(navigation.entryMethod, 'integration.navigation.entryMethod');
  const dependencyInjection = record(value.dependencyInjection, 'integration.dependencyInjection');
  requiredString(dependencyInjection.containerType, 'integration.dependencyInjection.containerType');
  requiredString(dependencyInjection.registrationMethod, 'integration.dependencyInjection.registrationMethod');
  const assetDestination = record(value.assetDestination, 'integration.assetDestination');
  requiredString(assetDestination.relativePath, 'integration.assetDestination.relativePath');
  if (!['main', 'module', 'framework'].includes(String(assetDestination.bundle))) throw new TypeError('integration.assetDestination.bundle is invalid');
  return input as ExistingIOSIntegrationProfile;
}

export function assertExistingIOSIntegrationPlatform(profile: ExistingIOSIntegrationProfile, platform: ExistingIOSGenerationPlatform): void {
  const hasSwiftUI = profile.entryPoints.swiftUI !== undefined;
  const hasUIKit = profile.entryPoints.uikit !== undefined;
  if ((platform === 'swiftui' || platform === 'both') && !hasSwiftUI) throw new TypeError('integration.entryPoints.swiftUI is required for the selected platform');
  if ((platform === 'uikit' || platform === 'both') && !hasUIKit) throw new TypeError('integration.entryPoints.uikit is required for the selected platform');
}
