export interface AssetManifestEntry {
  sourceNodeId: string;
  sourceName: string;
  format: 'svg' | 'png' | 'jpg' | 'webp';
  path: string;
  assetCatalogPath?: string;
  fallbackFor?: 'svg';
  contentMode?: 'scaleAspectFit' | 'scaleAspectFill';
}

export interface AssetManifest { version: '1.0'; assets: AssetManifestEntry[] }

export function assetResourceName(sourceName: string, index: number, usedNames: Set<string> = new Set()): string {
  const slug = sourceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `asset-${index + 1}`;
  let name = slug;
  let suffix = 2;
  while (usedNames.has(name)) name = `${slug}-${suffix++}`;
  usedNames.add(name);
  return name;
}

export function buildAssetManifest(assets: AssetManifestEntry[]): AssetManifest {
  return { version: '1.0', assets: assets.map((asset) => ({ ...asset })) };
}
