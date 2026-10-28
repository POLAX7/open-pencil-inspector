import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from 'bun:test';

const root = join(import.meta.dir, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('iOS demo keeps separate native entries without a legacy FoodApp generator dependency', () => {
  const project = read('demo-ios/Project.swift');
  const swiftUI = read('demo-ios/SwiftUIApp/OpenPencilSwiftUIDemoApp.swift');
  const uiKit = read('demo-ios/UIKitApp/AppDelegate.swift');

  expect(project).toContain('OpenPencilSwiftUIDemo');
  expect(project).toContain('OpenPencilUIKitDemo');
  expect(project).not.toContain('GeneratedSwiftUI');
  expect(project).not.toContain('GeneratedUIKit');
  expect(swiftUI).toContain('CryptoAndFoodAppView');
  expect(uiKit).toContain('CryptoAndFoodAppViewController');
  expect(swiftUI).not.toContain('generateFoodAppCompatibilityView');
  expect(uiKit).not.toContain('generateFoodAppCompatibilityView');
  expect(swiftUI).not.toContain('FoodAppProductDetailView');
  expect(uiKit).not.toContain('FoodAppProductDetailView');
});
