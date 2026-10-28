import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftTypeName } from '../../codegen-core/src/contracts.ts';
import { generateFoodAppNativeSwiftUIView } from './legacy-food-app-adapter.ts';

/** Explicit legacy entry point for the FoodApp acceptance fixture. */
export function generateFoodAppCompatibilityView(input: CodegenInput): CodegenResult {
  return generateFoodAppNativeSwiftUIView(input, swiftTypeName(input.featureName));
}
