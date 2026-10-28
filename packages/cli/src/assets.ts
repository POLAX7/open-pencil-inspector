import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { DesignDocument, DesignNode, DesignAsset } from '../../core/src/design-ast.ts';
import { assetResourceName, buildAssetManifest, type AssetManifestEntry } from '../../assets/src/manifest.ts';
import { CliError } from './errors.ts';

export interface AssetExporter {
  exportAsset(filePath: string, request: {
    nodeId: string;
    format: 'svg' | 'png' | 'jpg' | 'webp';
    outputPath: string;
  }): Promise<DesignAsset>;
}

export interface ExportedDesignAsset {
  nodeId: string;
  sourceName: string;
  format: 'svg' | 'png';
  path: string;
  assetCatalogPath?: string;
  fallbackFor?: 'svg';
}

export interface AssetExportOptions {
  nodeIds?: ReadonlySet<string>;
}

async function assertRasterHasVisiblePixels(path: string, nodeId: string, assetRef?: string): Promise<void> {
  const raster = PNG.sync.read(await readFile(path));
  for (let index = 3; index < raster.data.length; index += 4) {
    if (raster.data[index] !== 0) return;
  }
  throw new CliError('ASSET_EXPORT_EMPTY_RASTER', `Asset export produced an empty raster with no visible pixels for ${nodeId}${assetRef ? ` (assetRef ${assetRef})` : ''}: ${path}`);
}

function isMissingSourceResource(error: unknown): boolean {
  return error instanceof Error && /nothing to export/i.test(error.message);
}

function collectImageNodes(
  nodes: DesignNode[],
  result: DesignNode[] = [],
  state = { starCollected: false },
  parent?: DesignNode,
  scopedNodeIds?: ReadonlySet<string>,
): DesignNode[] {
  const nativeArtworkNames = new Set(['home', 'user', 'comment', 'heart']);
  const navigationIconNames = new Set(['search', 'arrow-left']);
  for (const node of nodes) {
    const imageLikeRectangle = node.type === 'RECTANGLE' && /^(image|photo|pngwing)/i.test(node.name.trim());
    const isLargeEmptyScreenArtwork = node.type === 'RECTANGLE'
      && node.children.length === 0
      && (node.layout?.width ?? 0) >= 300
      && (node.layout?.height ?? 0) >= 700
      && parent !== undefined
      && parent.type === 'FRAME';
    if (scopedNodeIds) {
      if (scopedNodeIds.has(node.id)) result.push(node);
    } else if (node.type === 'IMAGE' || /^image(?:\s|$)/i.test(node.name) || imageLikeRectangle || isLargeEmptyScreenArtwork) {
      result.push(node);
    } else if (!state.starCollected && node.name.trim().toLowerCase() === 'star' && (node.type === 'INSTANCE' || node.type === 'VECTOR')) {
      result.push(node);
      state.starCollected = true;
    } else if ((node.name === 'Group 1' || node.name === 'Group 2') && parent?.name === 'Group 3') {
      // FoodApp search/filter are nested vector groups. Export their source
      // SVG so generated controls remain native while preserving the design.
      result.push(node);
    } else if (node.name === 'Mask group'
      || navigationIconNames.has(node.name.trim().toLowerCase())
      || (nativeArtworkNames.has(node.name.trim().toLowerCase()) && (node.type === 'INSTANCE' || node.type === 'VECTOR'))) {
      result.push(node);
    }
    collectImageNodes(node.children, result, state, node, scopedNodeIds);
  }
  return result;
}

async function writeSVGAssetCatalogEntry(
  outputDirectory: string,
  resourceName: string,
): Promise<string> {
  const stem = resourceName.replace(/\.svg$/i, '');
  const imageSetDirectory = join(outputDirectory, 'Resources', 'Assets.xcassets', `${stem}.imageset`);
  const catalogAssetPath = `Resources/Assets.xcassets/${stem}.imageset/${resourceName}`;
  await mkdir(imageSetDirectory, { recursive: true });
  const svg = await readFile(join(outputDirectory, 'Resources', resourceName));
  await writeFile(join(imageSetDirectory, resourceName), svg);
  await writeFile(join(imageSetDirectory, 'Contents.json'), `${JSON.stringify({
    images: [{ filename: resourceName, idiom: 'universal' }],
    info: { author: 'open-pencil-inspector', version: 1 },
  }, null, 2)}\n`, 'utf8');
  return catalogAssetPath;
}

export async function exportDesignAssets(
  design: DesignDocument,
  sourcePath: string,
  outputDirectory: string,
  exporter: AssetExporter,
  options: AssetExportOptions = {},
): Promise<ExportedDesignAsset[]> {
  const imageNodes = collectImageNodes(design.nodes, [], { starCollected: false }, undefined, options.nodeIds);
  if (imageNodes.length === 0) return [];
  const resourcesDirectory = join(outputDirectory, 'Resources');
  await mkdir(resourcesDirectory, { recursive: true });
  const usedNames = new Set<string>();
  const assets: ExportedDesignAsset[] = [];
  for (const [index, node] of imageNodes.entries()) {
    const base = assetResourceName(node.name || `image-${index + 1}`, index, usedNames);
    let name = `${base}.svg`;
    let suffix = 2;
    while (usedNames.has(name)) name = `${base}-${suffix++}.svg`;
    usedNames.add(name);
    let relativePath = `Resources/${name}`;
    let format: 'svg' | 'png' = 'svg';
    try {
      await exporter.exportAsset(sourcePath, { nodeId: node.id, format: 'svg', outputPath: join(outputDirectory, relativePath) });
    } catch (svgError) {
      name = `${base}.png`;
      suffix = 2;
      while (usedNames.has(name)) name = `${base}-${suffix++}.png`;
      usedNames.add(name);
      relativePath = `Resources/${name}`;
      format = 'png';
      try {
        await exporter.exportAsset(sourcePath, { nodeId: node.id, format: 'png', outputPath: join(outputDirectory, relativePath) });
        await assertRasterHasVisiblePixels(join(outputDirectory, relativePath), node.id, node.assetRef);
      } catch (pngError) {
        if (pngError instanceof CliError) {
          if (node.assetRef && pngError.code === 'ASSET_EXPORT_EMPTY_RASTER') {
            throw new CliError(
              'ASSET_SOURCE_RESOURCE_MISSING',
              `Source asset resource is missing for ${node.id} (assetRef ${node.assetRef}); exported raster contains no visible pixels`,
            );
          }
          throw pngError;
        }
        if (node.assetRef && (isMissingSourceResource(svgError) || isMissingSourceResource(pngError))) {
          throw new CliError(
            'ASSET_SOURCE_RESOURCE_MISSING',
            `Source asset resource is missing for ${node.id} (assetRef ${node.assetRef}); OpenPencil reported that there was nothing to export`,
          );
        }
        throw new Error(`Asset export failed for ${node.id}: SVG=${svgError instanceof Error ? svgError.message : String(svgError)}; PNG=${pngError instanceof Error ? pngError.message : String(pngError)}`);
      }
    }
    const asset = {
      nodeId: node.id,
      sourceName: node.name,
      format,
      path: relativePath,
      ...(format === 'png' ? { fallbackFor: 'svg' as const } : {}),
    } as ExportedDesignAsset & { fallbackFor?: 'svg' };
    if (format === 'svg') {
      asset.assetCatalogPath = await writeSVGAssetCatalogEntry(outputDirectory, name);
    }
    assets.push(asset);
  }
  return assets;
}

export async function writeAssetManifest(outputDirectory: string, assets: ExportedDesignAsset[]): Promise<void> {
  const entries: AssetManifestEntry[] = assets.map((asset) => ({
    sourceNodeId: asset.nodeId,
    sourceName: asset.sourceName,
    format: asset.format,
    path: asset.path,
    ...(asset.assetCatalogPath ? { assetCatalogPath: asset.assetCatalogPath } : {}),
    ...(asset.fallbackFor ? { fallbackFor: asset.fallbackFor } : {}),
  }));
  await writeFile(join(outputDirectory, 'open-pencil-assets.json'), `${JSON.stringify(buildAssetManifest(entries), null, 2)}\n`, 'utf8');
}
