import test from 'node:test';
import assert from 'node:assert/strict';
import { assetResourceName, buildAssetManifest } from '../src/manifest.ts';

test('asset resource names are stable, safe, and collision-resolvable', () => {
  assert.equal(assetResourceName('Hero Burger', 0), 'hero-burger');
  assert.equal(assetResourceName('!!!', 1), 'asset-2');
  assert.equal(assetResourceName('Hero Burger', 0, new Set(['hero-burger'])), 'hero-burger-2');
});

test('asset manifest preserves source mapping and explicit fallback metadata', () => {
  const manifest = buildAssetManifest([
    { sourceNodeId: 'node-1', sourceName: 'Hero', format: 'svg', path: 'Resources/hero.svg', contentMode: 'scaleAspectFit' },
    { sourceNodeId: 'node-2', sourceName: 'Photo', format: 'png', path: 'Resources/photo.png', fallbackFor: 'svg', contentMode: 'scaleAspectFill' },
  ]);
  assert.deepEqual(manifest, {
    version: '1.0',
    assets: [
      { sourceNodeId: 'node-1', sourceName: 'Hero', format: 'svg', path: 'Resources/hero.svg', contentMode: 'scaleAspectFit' },
      { sourceNodeId: 'node-2', sourceName: 'Photo', format: 'png', path: 'Resources/photo.png', fallbackFor: 'svg', contentMode: 'scaleAspectFill' },
    ],
  });
});
