import type { CodegenInput, CodegenResult } from '../../codegen-core/src/contracts.ts';
import { swiftTypeName } from '../../codegen-core/src/contracts.ts';
import { generateFoodAppNativeViewController } from './legacy-food-app-adapter.ts';

/** Explicit legacy entry point for the FoodApp acceptance fixture. */
export function generateFoodAppCompatibilityViewController(input: CodegenInput): CodegenResult {
  const root = input.design.nodes.find((node) => node.type === 'FRAME') ?? input.design.nodes[0];
  return generateFoodAppNativeViewController(input, root, swiftTypeName(input.featureName));
}
