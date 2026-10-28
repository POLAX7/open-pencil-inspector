import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { exportDesignAssets } from '../src/assets.ts';
import { CliError } from '../src/errors.ts';

test('asset export identifies a missing source resource when a referenced raster has no visible pixels', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-empty-asset-'));
  const transparent = new PNG({ width: 2, height: 2 });
  await assert.rejects(
    () => exportDesignAssets({
      id: 'doc', name: 'Design', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'hero', name: 'Hero', type: 'IMAGE', assetRef: 'missing-hash', children: [], unsupportedProperties: [], provenance: [] }],
    }, 'Design.fig', outputDirectory, {
      async exportAsset(_file, request) {
        if (request.format === 'svg') throw new Error('SVG unavailable');
        await writeFile(request.outputPath, PNG.sync.write(transparent));
        return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
      },
    }),
    (error) => error instanceof CliError && error.code === 'ASSET_SOURCE_RESOURCE_MISSING' && error.message.includes('missing-hash'),
  );
});

test('asset export identifies a missing source resource when OpenPencil has nothing to export', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-missing-source-'));
  await assert.rejects(
    () => exportDesignAssets({
      id: 'doc', name: 'Design', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'hero', name: 'Hero', type: 'IMAGE', assetRef: 'missing-hash', children: [], unsupportedProperties: [], provenance: [] }],
    }, 'Design.fig', outputDirectory, {
      async exportAsset() {
        throw new Error('ERROR Nothing to export');
      },
    }),
    (error) => error instanceof CliError
      && error.code === 'ASSET_SOURCE_RESOURCE_MISSING'
      && error.message.includes('missing-hash')
      && error.message.includes('hero'),
  );
});
