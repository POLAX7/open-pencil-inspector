import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/main.ts';

test('fresh directory completes selection, confirmation, Design Package, and native generation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-e2e-'));
  const selectionPath = join(directory, 'selection.json');
  const candidatePath = join(directory, 'candidate.json');
  const confirmedPath = join(directory, 'confirmed.json');
  const packageDirectory = join(directory, 'package');
  const nativeDirectory = join(directory, 'native');
  await writeFile(selectionPath, JSON.stringify({
    version: '1.0', source: 'CryptoAndFoodApp.fig', page: { id: '0:5', name: '🟠 Apps' },
    rootNodes: [{ id: '0:88', name: 'Food App', type: 'FRAME' }], scope: 'selected-subtree',
  }), 'utf8');
  const adapter = {
    async listPages() { return [{ id: '0:5', name: '🟠 Apps', nodeCount: 1 }]; },
    async inspect() {
      return { id: 'doc', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: '0:88', name: 'Food App', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] } as any;
    },
    async exportAsset() { throw new Error('no assets expected in this minimal selected scope'); },
  };
  await runCli(['propose-flow', 'CryptoAndFoodApp.fig', '--selection', selectionPath, '--output', candidatePath], adapter);
  await runCli(['confirm-flow', candidatePath, '--output', confirmedPath]);
  const flowValidation = JSON.parse(await runCli(['validate-flow', confirmedPath, '--selection', selectionPath]));
  assert.equal(flowValidation.valid, true);
  await runCli(['preflight', 'CryptoAndFoodApp.fig', '--selection', selectionPath, '--confirmed-flow', confirmedPath, '--output', packageDirectory], adapter);
  const validation = JSON.parse(await runCli(['validate', packageDirectory]));
  assert.equal(validation.status, 'pass');
  await runCli(['generate', 'CryptoAndFoodApp.fig', '--selection', selectionPath, '--confirmed-flow', confirmedPath, '--output', nativeDirectory, '--platform', 'swiftui'], adapter);
  assert.match(await readFile(join(nativeDirectory, 'CryptoAndFoodAppView.swift'), 'utf8'), /struct CryptoAndFoodAppView/);
});
