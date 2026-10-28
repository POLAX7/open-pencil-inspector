import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { swiftTypeName, type CodegenInput, type GeneratedFile } from '../../codegen-core/src/contracts.ts';
import { generateSwiftContracts } from '../../codegen-core/src/swift-contract-generator.ts';
import { generateSwiftUIView } from '../../codegen-swiftui/src/generator.ts';
import { generateUIKitViewController } from '../../codegen-uikit/src/generator.ts';
import { generateExistingIOSIntegration } from '../../codegen-core/src/existing-ios-adapter.ts';

export type IOSPlatform = 'swiftui' | 'uikit' | 'both';

function packageBackendDirectory(input: CodegenInput, outputDirectory: string, platform: Exclude<IOSPlatform, 'both'>): string {
  return join(outputDirectory, 'Sources', `${swiftTypeName(input.featureName)}${platform === 'swiftui' ? 'SwiftUI' : 'UIKit'}`);
}

export function iosPackageSourceDirectories(input: CodegenInput, outputDirectory: string, platform: IOSPlatform = 'both'): string[] {
  return [
    ...(platform === 'swiftui' || platform === 'both' ? [packageBackendDirectory(input, outputDirectory, 'swiftui')] : []),
    ...(platform === 'uikit' || platform === 'both' ? [packageBackendDirectory(input, outputDirectory, 'uikit')] : []),
  ];
}

export async function generateIOSFiles(input: CodegenInput, outputDirectory: string, platform: IOSPlatform = 'both'): Promise<GeneratedFile[]> {
  const files = [
    ...generateSwiftContracts(input).files,
    ...(platform === 'swiftui' || platform === 'both' ? generateSwiftUIView(input).files : []),
    ...(platform === 'uikit' || platform === 'both' ? generateUIKitViewController(input).files : []),
    ...generateExistingIOSIntegration(input).files,
  ];
  await mkdir(outputDirectory, { recursive: true });
  for (const file of files) await writeFile(join(outputDirectory, file.path), file.contents, 'utf8');
  return files;
}

export async function generateIOSPackageFiles(input: CodegenInput, outputDirectory: string, platform: IOSPlatform = 'both'): Promise<GeneratedFile[]> {
  const generated: GeneratedFile[] = [];
  for (const backend of ['swiftui', 'uikit'] as const) {
    if (platform !== 'both' && platform !== backend) continue;
    const directory = packageBackendDirectory(input, outputDirectory, backend);
    const files = [
      ...generateSwiftContracts(input).files,
      ...(backend === 'swiftui' ? generateSwiftUIView(input).files : generateUIKitViewController(input).files),
      ...generateExistingIOSIntegration(input).files,
    ];
    await mkdir(directory, { recursive: true });
    if (input.assetBindings?.length) await mkdir(join(directory, 'Resources'), { recursive: true });
    for (const file of files) {
      await writeFile(join(directory, file.path), file.contents, 'utf8');
      generated.push({ path: `Sources/${swiftTypeName(input.featureName)}${backend === 'swiftui' ? 'SwiftUI' : 'UIKit'}/${file.path}`, contents: file.contents });
    }
  }
  return generated;
}

export function iosPackageSourceDirectory(input: CodegenInput, outputDirectory: string): string {
  return packageBackendDirectory(input, outputDirectory, 'swiftui');
}

export async function writeIOSPackageManifest(input: CodegenInput, outputDirectory: string, platform: IOSPlatform = 'both'): Promise<GeneratedFile> {
  const typeName = swiftTypeName(input.featureName);
  const hasResources = (input.assetBindings?.length ?? 0) > 0;
  const targets = [
    ...(platform === 'swiftui' || platform === 'both' ? [`        .target(name: "${typeName}SwiftUI"${hasResources ? ', resources: [.process("Resources")]' : ''}),`] : []),
    ...(platform === 'uikit' || platform === 'both' ? [`        .target(name: "${typeName}UIKit"${hasResources ? ', resources: [.process("Resources")]' : ''}),`] : []),
  ].join('\n');
  const products = [
    ...(platform === 'swiftui' || platform === 'both' ? [`        .library(name: "${typeName}SwiftUI", targets: ["${typeName}SwiftUI"]),`] : []),
    ...(platform === 'uikit' || platform === 'both' ? [`        .library(name: "${typeName}UIKit", targets: ["${typeName}UIKit"]),`] : []),
  ].join('\n');
  const contents = `// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "${typeName}Generated",
    platforms: [.iOS(.v17)],
    products: [
${products}
    ],
    targets: [
${targets}
    ]
)
`;
  await writeFile(join(outputDirectory, 'Package.swift'), contents, 'utf8');
  return { path: 'Package.swift', contents };
}
