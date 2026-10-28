import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateIOSFiles, writeIOSPackageManifest } from '../src/generate.ts';

test('generate writes shared, SwiftUI, and UIKit outputs reproducibly', async () => {
  const output = await mkdtemp(join(tmpdir(), 'open-pencil-inspector-'));
  const input = { featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0' as const, screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } };
  const files = await generateIOSFiles(input, output);
  assert.deepEqual(files.map((file) => file.path), ['LoginContracts.swift', 'LoginView.swift', 'LoginViewController.swift']);
  assert.match(await readFile(join(output, 'LoginView.swift'), 'utf8'), /struct LoginView/);
});

test('package manifest omits an empty resource bundle when the design has no assets', async () => {
  const output = await mkdtemp(join(tmpdir(), 'open-pencil-inspector-manifest-'));
  const input = { featureName: 'coffee shop', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0' as const, screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } };
  const manifest = await writeIOSPackageManifest(input, output);
  assert.doesNotMatch(manifest.contents, /resources:/);
});
