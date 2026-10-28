import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/main.ts';

const document = { id: 'doc', name: 'doc', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] };

test('CLI help documents explicit scope selection', async () => {
  const output = await runCli(['--help']);
  assert.ok(output.includes('--selection <selection.json>'));
  assert.ok(output.includes('--node <id>                   select one or more roots (requires --page/--page-id)'));
});

test('CLI lists pages so a user can choose a design scope before inspection', async () => {
  const output = JSON.parse(await runCli(['pages', 'CryptoAndFoodApp.fig'], {
    async listPages() { return [{ id: '0:3', name: 'Cover', nodeCount: 3 }, { id: '0:5', name: '🟠 Apps', nodeCount: 1301 }]; },
    async inspect() { return document; },
    async exportAsset() { throw new Error('not used'); },
  }));
  assert.equal(output.pages[1].name, '🟠 Apps');
  assert.equal(output.pages[1].nodeCount, 1301);
});

test('CLI forwards page scope and node roots to the adapter', async () => {
  let received: unknown;
  await runCli(['inspect', 'CryptoAndFoodApp.fig', '--page', '🟠 Apps', '--node', '0:88', '--node', '0:1013'], {
    async listPages() { return [{ id: '0:5', name: '🟠 Apps', nodeCount: 1301 }]; },
    async inspect(_file, options) { received = options; return document; },
    async exportAsset() { throw new Error('not used'); },
  });
  assert.deepEqual(received, { page: '🟠 Apps', rootNodeIds: ['0:88', '0:1013'] });
});

test('CLI resolves a stable page id to the page name required by tree inspection', async () => {
  let received: unknown;
  await runCli(['inspect', 'CryptoAndFoodApp.fig', '--page-id', '0:5'], {
    async listPages() { return [{ id: '0:5', name: '🟠 Apps', nodeCount: 1301 }]; },
    async inspect(_file, options) { received = options; return document; },
    async exportAsset() { throw new Error('not used'); },
  });
  assert.deepEqual(received, { page: '🟠 Apps', pageId: '0:5' });
});

test('CLI loads a selection manifest and forwards its selected subtree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-selection-cli-'));
  const selectionPath = join(directory, 'selection.json');
  await writeFile(selectionPath, JSON.stringify({
    version: '1.0', source: 'CryptoAndFoodApp.fig', page: { id: '0:5', name: '🟠 Apps' },
    rootNodes: [{ id: '0:88', name: 'Food App', type: 'SECTION' }], scope: 'selected-subtree',
  }), 'utf8');
  let received: unknown;
  await runCli(['inspect', 'CryptoAndFoodApp.fig', '--selection', selectionPath], {
    async listPages() { return []; },
    async inspect(_file, options) { received = options; return document; },
    async exportAsset() { throw new Error('not used'); },
  });
  assert.deepEqual(received, { page: '🟠 Apps', pageId: '0:5', rootNodeIds: ['0:88'] });
});

test('CLI rejects an unscoped multi-page input instead of selecting the first page', async () => {
  await assert.rejects(() => runCli(['inspect', 'RealEstateApp.fig'], {
    async listPages() { return [{ id: 'cover', name: 'Cover', nodeCount: 1 }, { id: 'screens', name: 'Screens', nodeCount: 20 }]; },
    async inspect() { return document; },
    async exportAsset() { throw new Error('not used'); },
  }), /specify --page/);
});
