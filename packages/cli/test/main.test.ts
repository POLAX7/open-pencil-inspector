import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { runCli } from '../src/main.ts';
import type { InspectOptions } from '../../openpencil-cli/src/adapter.ts';

async function writeSolidPng(path: string, red: number): Promise<void> {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = red;
  png.data[3] = 255;
  await writeFile(path, PNG.sync.write(png));
}

test('CLI entrypoint routes inspect to an explicitly page-scoped node call', async () => {
  let received: { file: string; options: InspectOptions } | undefined;
  const output = await runCli(['inspect', 'design.fig', '--page', 'Screens', '--node', 'screen-1'], {
    async listPages() { return [{ id: 'page-1', name: 'Screens', nodeCount: 1 }]; },
    async inspect(file, options) {
      received = { file, options };
      return { id: 'doc-1', name: 'Login', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] };
    },
    async exportAsset() { throw new Error('not used'); },
  });

  assert.deepEqual(received, { file: 'design.fig', options: { page: 'Screens', rootNodeIds: ['screen-1'] } });
  assert.match(output, /"id": "doc-1"/);
});

test('CLI screen-discovery writes a report for nested phone-sized screens', async () => {
  const outputPath = join(await mkdtemp(join(tmpdir(), 'openpencil-screen-discovery-')), 'report.json');
  const result = JSON.parse(await runCli(['screen-discovery', 'design.fig', '--output', outputPath], {
    async inspect() {
      return {
        id: 'doc', name: 'Design', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{
          id: 'section', name: 'App', type: 'SECTION', layout: { width: 1000, height: 1600 },
          children: [{ id: 'payment', name: 'Payment Address', type: 'FRAME', layout: { width: 360, height: 800 }, children: [], unsupportedProperties: [], provenance: [] }],
          unsupportedProperties: [], provenance: [],
        }],
      };
    },
    async exportAsset() { throw new Error('screen-discovery must not export assets'); },
  }));

  const report = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(result.output, outputPath);
  assert.equal(report.screens[0].nodeId, 'payment');
  assert.equal(report.screens[0].confidence, 'phone-sized-frame');
});

test('CLI entrypoint rejects incomplete commands loudly', async () => {
  await assert.rejects(() => runCli(['inspect']), /Usage: .*inspect/);
});

test('CLI screen-context emits an explicitly page-scoped design and flow context for an agent', async () => {
  const result = JSON.parse(await runCli(['screen-context', 'FoodApp.fig', '--page', 'Screens', '--node', 'home'], {
    async listPages() { return [{ id: 'page-1', name: 'Screens', nodeCount: 1 }]; },
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [],
        assets: [{ id: 'asset-1', name: 'burger', kind: 'png', sourceNodeId: 'image-1', provenance: [] }],
        nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'image-1', name: 'Burger', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset() { throw new Error('screen-context must not export assets'); },
  }));
  assert.equal(result.screen.id, 'home');
  assert.equal(result.screen.node.id, 'home');
  assert.deepEqual(result.assets.map((asset: { id: string }) => asset.id), ['asset-1']);
});

test('CLI screen-contract writes a selected node contract with bounded style hydration', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-screen-contract-'));
  const contractPath = join(outputDirectory, 'home.json');
  let receivedOptions: InspectOptions | undefined;
  const result = JSON.parse(await runCli(['screen-contract', 'Design.fig', '--page', 'Screens', '--node', 'home', '--output', contractPath], {
    async listPages() { return [{ id: 'page-1', name: 'Screens', nodeCount: 1 }]; },
    async inspect(_file, options) {
      receivedOptions = options;
      return { id: 'doc', name: 'Design', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{
        id: 'home', name: 'Home', type: 'FRAME', layout: { x: 0, y: 0, width: 390, height: 844 },
        children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 16, y: 20, width: 100, height: 24 }, text: { content: 'Home' }, children: [], unsupportedProperties: [], provenance: [] }],
        unsupportedProperties: [], provenance: [],
      }] };
    },
    async exportAsset() { throw new Error('screen-contract must not export assets'); },
  }));
  const contractDocument = JSON.parse(await readFile(contractPath, 'utf8'));
  assert.equal(result.designNodeId, 'home');
  assert.equal(contractDocument.screenContracts.length, 1);
  assert.equal(contractDocument.screenContracts[0].screenSize.width, 390);
  assert.equal(contractDocument.screenContracts[0].components[0].nodeId, 'title');
  assert.equal(receivedOptions?.hydrateStrategy, 'nodes');
});

test('CLI preflight writes the validated Design Package documents including screen contracts', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-preflight-'));
  const result = JSON.parse(await runCli(['preflight', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'home', name: 'Home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset() { throw new Error('preflight must not export assets'); },
  }));

  assert.deepEqual(result.files, ['design.json', 'flow.json', 'assets.json', 'layout-contracts.json', 'screen-contracts.json', 'audit.json', 'provenance.json', 'screen-discovery.json', 'design-evidence.json', 'native-patterns.json', 'runtime-route-plan.json']);
  assert.deepEqual((await readdir(outputDirectory)).sort(), result.files.slice().sort());
  assert.equal(await readFile(join(outputDirectory, 'FoodAppView.swift')).catch(() => undefined), undefined);
  assert.match(await readFile(join(outputDirectory, 'design.json'), 'utf8'), /"schemaVersion": "1\.0"/);
});

test('CLI preflight persists layout contracts for the selected design hierarchy', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-preflight-layout-'));
  await runCli(['preflight', 'design.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'doc-1', name: 'Design', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{
          id: 'screen', name: 'Home', type: 'FRAME', layout: { x: 0, y: 0, width: 390, height: 844, direction: 'COL', gap: 12 },
          children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 16, y: 20, width: 100, height: 24 }, text: { content: 'Home' }, children: [], unsupportedProperties: [], provenance: [] }],
          unsupportedProperties: [], provenance: [],
        }],
      };
    },
    async exportAsset() { throw new Error('preflight must not export assets'); },
  });

  const saved = JSON.parse(await readFile(join(outputDirectory, 'layout-contracts.json'), 'utf8'));
  assert.equal(saved.contracts.length, 2);
  assert.deepEqual(saved.contracts[0], {
    nodeId: 'screen', relation: 'flow', frame: { x: 0, y: 0, width: 390, height: 844 },
    provenance: [],
  });
  assert.deepEqual(saved.contracts[1], {
    nodeId: 'title', parentNodeId: 'screen', relation: 'absolute', frame: { x: 16, y: 20, width: 100, height: 24 },
    provenance: [],
  });
});

test('CLI preflight persists an explicitly supplied screen contract document', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-preflight-contract-'));
  const contractPath = join(outputDirectory, 'contracts.json');
  await writeFile(contractPath, JSON.stringify({ screenContracts: [{
    id: 'home', designNodeId: 'home', screenSize: { width: 390, height: 844 },
    safeArea: { top: 47, bottom: 34, leading: 0, trailing: 0 }, contentPadding: [16, 16, 16, 16],
    components: [], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: contractPath }],
  }] }), 'utf8');
  await runCli(['preflight', 'FoodApp.fig', '--output', outputDirectory, '--screen-contracts', contractPath], {
    async inspect() {
      return { id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'home', name: 'Home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset() { throw new Error('preflight must not export assets'); },
  });
  const saved = JSON.parse(await readFile(join(outputDirectory, 'screen-contracts.json'), 'utf8'));
  assert.equal(saved.screenContracts[0].id, 'home');
});

test('CLI preflight records the selected page and roots in package provenance', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-preflight-scope-'));
  await runCli(['preflight', 'CryptoAndFoodApp.fig', '--output', outputDirectory, '--page', '🟠 Apps', '--node', '0:88'], {
    async listPages() { return [{ id: '0:5', name: '🟠 Apps', nodeCount: 1301 }]; },
    async inspect() {
      return { id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: '0:88', name: 'Food App', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset() { throw new Error('preflight must not export assets'); },
  });
  const provenance = JSON.parse(await readFile(join(outputDirectory, 'provenance.json'), 'utf8'));
  assert.deepEqual(provenance.entries[0], {
    path: 'selection',
    source: { source: 'fig', reference: 'CryptoAndFoodApp.fig', field: 'scope:page=🟠 Apps;roots=0:88' },
  });
});

test('CLI preflight uses bounded tree hydration instead of per-node hydration', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-preflight-tree-'));
  let receivedOptions: InspectOptions | undefined;
  await runCli(['preflight', 'CryptoAndFoodApp.fig', '--output', outputDirectory, '--page', '🟠 Apps'], {
    async listPages() { return [{ id: '0:5', name: '🟠 Apps', nodeCount: 7 }]; },
    async inspect(_file, options) {
      receivedOptions = options;
      return { id: 'doc', name: 'Apps', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: '0:88', name: 'Food App', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset() { throw new Error('preflight must not export assets'); },
  });
  assert.equal(receivedOptions?.hydrateStrategy, 'tree');
});

test('CLI verify returns the measured screenshot difference', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-verify-cli-'));
  const reference = join(directory, 'reference.png');
  const candidate = join(directory, 'candidate.png');
  await writeSolidPng(reference, 0);
  await writeSolidPng(candidate, 255);

  const result = JSON.parse(await runCli(['verify', reference, candidate, '--threshold', '0.01']));
  assert.equal(result.status, 'fail');
  assert.equal(result.differenceRatio, 1);
  assert.equal(result.threshold, 0.01);
});

test('CLI generate creates SwiftUI and UIKit outputs from a design document', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-'));
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: '0:5', name: 'home', type: 'FRAME', children: [{ id: 'image-1', name: 'Hero image', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.deepEqual(result.files, ['FoodAppContracts.swift', 'FoodAppView.swift', 'FoodAppViewController.swift']);
  assert.equal(result.screens, 1);
  assert.equal(result.transitions, 0);
  assert.match(await readFile(join(outputDirectory, 'FoodAppView.swift'), 'utf8'), /struct FoodAppView/);
});

test('CLI generate consumes an explicit screen contract for the selected screen', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-contract-'));
  const contractPath = join(outputDirectory, 'product-1.json');
  let receivedOptions: InspectOptions | undefined;
  await writeFile(contractPath, JSON.stringify({ screenContracts: [{
    id: 'product-1', designNodeId: 'product-1', screenSize: { width: 430, height: 932 },
    safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [19, 19, 19, 19],
    components: [], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'spec', reference: contractPath }],
  }] }), 'utf8');
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory, '--screen-contract', contractPath, '--screen-id', 'product-1'], {
    async inspect(_file, options) {
      receivedOptions = options;
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [
          { id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'home-label', name: 'Home', type: 'TEXT', text: { content: 'Home' }, layout: { x: 0, y: 0, width: 80, height: 24 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
          { id: 'product-1', name: 'product 1', type: 'FRAME', layout: { width: 430, height: 932 }, children: [
            { id: 'product-image', name: 'image product', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] },
            { id: 'order', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, layout: { x: 0, y: 0, width: 111, height: 24 }, children: [], unsupportedProperties: [], provenance: [] },
          ], unsupportedProperties: [], provenance: [] },
        ],
      };
    },
    async exportAsset() { throw new Error('contract test has no assets'); },
  }));
  assert.deepEqual(result.files, ['FoodAppContracts.swift', 'FoodAppView.swift', 'FoodAppViewController.swift']);
  assert.deepEqual(receivedOptions, { hydrate: true, hydrateDepth: 18, hydrateRootCount: 1, hydrateStrategy: 'tree' });
  assert.match(await readFile(join(outputDirectory, 'FoodAppView.swift'), 'utf8'), /ORDER NOW/);
  assert.doesNotMatch(await readFile(join(outputDirectory, 'FoodAppView.swift'), 'utf8'), />Home</);
});

test('CLI generate package mode writes a compilable Swift Package layout', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-package-'));
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory, '--package'], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: '0:5', name: 'home', type: 'FRAME', children: [{ id: 'image-1', name: 'Hero image', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.equal(result.package, true);
  assert.deepEqual(result.files, [
    'Sources/FoodAppSwiftUI/FoodAppContracts.swift',
    'Sources/FoodAppSwiftUI/FoodAppView.swift',
    'Sources/FoodAppUIKit/FoodAppContracts.swift',
    'Sources/FoodAppUIKit/FoodAppViewController.swift',
    'Package.swift',
    'screen-acceptance.json',
  ]);
  assert.match(await readFile(join(outputDirectory, 'Package.swift'), 'utf8'), /\.target\(name: "FoodAppSwiftUI", resources: \[\.process\("Resources"\)\]\)/);
  assert.match(await readFile(join(outputDirectory, 'Sources/FoodAppSwiftUI/FoodAppView.swift'), 'utf8'), /struct FoodAppView/);
  const screenManifest = JSON.parse(await readFile(join(outputDirectory, 'screen-acceptance.json'), 'utf8'));
  assert.equal(screenManifest.schemaVersion, '1.0');
  assert.equal(screenManifest.primaryScreenId, 'home');
  assert.equal(screenManifest.screens[0].generated, true);
  assert.equal(await readFile(join(outputDirectory, 'Sources/FoodAppSwiftUI/Resources/Assets.xcassets/hero-image.imageset/hero-image.svg'), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const manifest = JSON.parse(await readFile(join(outputDirectory, 'open-pencil-assets.json'), 'utf8'));
  assert.equal(manifest.assets[0].sourceNodeId, 'image-1');
  assert.equal(manifest.assets[0].path, 'Sources/FoodAppSwiftUI/Resources/hero-image.svg');
});

test('CLI generate merges an explicit Markdown flow without inventing transitions', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-flow-'));
  const flowPath = join(outputDirectory, 'food-flow.md');
  await writeFile(flowPath, '# home\n\n- tap product goes to product-1\n\n# product-1\n', 'utf8');
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory, '--flow', flowPath], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [
          { id: '0:5', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] },
          { id: '0:74', name: 'product 1', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] },
        ],
      };
    },
    async exportAsset() { throw new Error('not used'); },
  }));

  assert.equal(result.flowPath, flowPath);
  assert.equal(result.screens, 2);
  assert.equal(result.transitions, 1);
  assert.match(await readFile(join(outputDirectory, 'FoodAppContracts.swift'), 'utf8'), /case product1/);
});

test('CLI generate exports image nodes into a Resources directory', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-assets-'));
  const exports: Array<{ nodeId: string; format: string; outputPath: string }> = [];
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [
          { id: 'image-1', name: 'Burger photo', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] },
          { id: 'group', name: 'group', type: 'GROUP', children: [
            { id: 'image-2', name: 'image 6', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [] },
          ], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      exports.push({ nodeId: request.nodeId, format: request.format, outputPath: request.outputPath });
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.deepEqual(exports.map((item) => item.format), ['svg', 'svg']);
  assert.deepEqual(exports.map((item) => item.nodeId), ['image-1', 'image-2']);
  assert.match(exports[0]?.outputPath ?? '', /Resources\/burger-photo\.svg$/);
  assert.deepEqual(result.assets, ['Resources/burger-photo.svg', 'Resources/image-6.svg']);
  const manifest = JSON.parse(await readFile(join(outputDirectory, 'open-pencil-assets.json'), 'utf8'));
  assert.deepEqual(manifest.assets, [
    { sourceNodeId: 'image-1', sourceName: 'Burger photo', format: 'svg', path: 'Resources/burger-photo.svg', assetCatalogPath: 'Resources/Assets.xcassets/burger-photo.imageset/burger-photo.svg' },
    { sourceNodeId: 'image-2', sourceName: 'image 6', format: 'svg', path: 'Resources/image-6.svg', assetCatalogPath: 'Resources/Assets.xcassets/image-6.imageset/image-6.svg' },
  ]);
  assert.match(await readFile(join(outputDirectory, 'Resources/Assets.xcassets/burger-photo.imageset/Contents.json'), 'utf8'), /"filename": "burger-photo\.svg"/);
  assert.equal(await readFile(join(outputDirectory, 'Resources/Assets.xcassets/image-6.imageset/image-6.svg'), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('CLI generate exports image-like rectangles', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-image-like-assets-'));
  const exports: string[] = [];
  await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [
          { id: 'hero', name: 'pngwing 12', type: 'RECTANGLE', layout: { width: 217, height: 297 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      exports.push(request.nodeId);
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  });

  assert.deepEqual(exports, ['hero']);
});

test('CLI generate exports named navigation icon instances', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-navigation-icons-'));
  const exports: string[] = [];
  await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'product', name: 'product', type: 'FRAME', children: [
          { id: 'search', name: 'search', type: 'INSTANCE', layout: { width: 20, height: 20 }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'back', name: 'arrow-left', type: 'INSTANCE', layout: { width: 28, height: 28 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      exports.push(request.nodeId);
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  });

  assert.deepEqual(exports, ['search', 'back']);
});

test('CLI generate exports large empty screen rectangles as SVG artwork fallbacks', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-screen-artwork-'));
  const exports: string[] = [];
  await runCli(['generate', 'FoodDeliveryApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-delivery', name: 'Food Delivery', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'canvas', name: 'Full View_04', type: 'FRAME', layout: { width: 2112, height: 2267 }, children: [
          { id: 'screen', name: 'Running Orders', type: 'RECTANGLE', layout: { x: 10, y: 10, width: 375, height: 812 }, style: { fill: '#000000' }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      exports.push(request.nodeId);
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  });
  assert.deepEqual(exports, ['screen']);
});

test('CLI generate exports the Figma star instance used by native ratings', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-star-'));
  const exports: Array<{ nodeId: string; outputPath: string }> = [];
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return {
        id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [],
        nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{
          id: 'star-1', name: 'star', type: 'INSTANCE', children: [], unsupportedProperties: [], provenance: [],
        }], unsupportedProperties: [], provenance: [] }],
      };
    },
    async exportAsset(_file, request) {
      exports.push({ nodeId: request.nodeId, outputPath: request.outputPath });
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.deepEqual(exports, [{ nodeId: 'star-1', outputPath: join(outputDirectory, 'Resources/star.svg') }]);
  assert.deepEqual(result.assets, ['Resources/star.svg']);
});

test('CLI generate falls back to PNG when SVG export fails', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-asset-fallback-'));
  const formats: string[] = [];
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory], {
    async inspect() {
      return { id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'image-1', name: 'Hero image', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset(_file, request) {
      formats.push(request.format);
      if (request.format === 'svg') throw new Error('SVG export unavailable');
      await writeSolidPng(request.outputPath, 255);
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.deepEqual(formats, ['svg', 'png']);
  assert.deepEqual(result.assets, ['Resources/hero-image.png']);
  const manifest = JSON.parse(await readFile(join(outputDirectory, 'open-pencil-assets.json'), 'utf8'));
  assert.equal(manifest.assets[0].fallbackFor, 'svg');
});

test('CLI generate exports contract-scoped boolean artwork assets', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-contract-artwork-'));
  const contractPath = join(outputDirectory, 'contract.json');
  await writeFile(contractPath, JSON.stringify({
    id: 'home', designNodeId: 'screen', screenSize: { width: 430, height: 932 },
    safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0],
    components: [{ id: 'root', nodeId: 'screen', kind: 'screen', frame: { x: 0, y: 0, width: 430, height: 932 }, provenance: [{ source: 'test', reference: 'contract' }] }],
    assets: [{ nodeId: 'nav', resourceName: 'bottom-nav', provenance: [{ source: 'test', reference: 'contract' }] }],
    interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'contract' }],
  }), 'utf8');
  const exports: string[] = [];
  const result = JSON.parse(await runCli(['generate', 'FoodApp.fig', '--output', outputDirectory, '--screen-contract', contractPath], {
    async inspect() {
      return { id: 'food-app', name: 'Food App', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'screen', name: 'home', type: 'FRAME', children: [{ id: 'nav', name: 'Subtract', type: 'VECTOR', layout: { width: 456, height: 90 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset(_file, request) {
      exports.push(request.nodeId);
      await writeFile(request.outputPath, '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
      return { id: request.nodeId, name: request.nodeId, kind: request.format, path: request.outputPath, sourceNodeId: request.nodeId, provenance: [] };
    },
  }));

  assert.deepEqual(exports, ['nav']);
  assert.deepEqual(result.assets, ['Resources/subtract.svg']);
});

test('CLI generate platform selects only the requested native backend', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-generate-platform-'));
  const result = JSON.parse(await runCli(['generate', 'Login.fig', '--output', outputDirectory, '--platform', 'swiftui'], {
    async inspect() {
      return { id: 'login', name: 'Login', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'login', name: 'Login', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset() { throw new Error('not used'); },
  }));

  assert.deepEqual(result.files, ['LoginContracts.swift', 'LoginView.swift']);
  assert.equal(await readFile(join(outputDirectory, 'LoginViewController.swift')).catch(() => undefined), undefined);
});

test('CLI validate and report consume a Design Package directory', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-package-report-'));
  const adapter = {
    async inspect() {
      return { id: 'login', name: 'Login', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'login', name: 'Login', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] };
    },
    async exportAsset() { throw new Error('not used'); },
  };
  await runCli(['preflight', 'Login.fig', '--output', outputDirectory], adapter);
  const validation = JSON.parse(await runCli(['validate', outputDirectory]));
  const report = JSON.parse(await runCli(['report', outputDirectory]));

  assert.deepEqual(validation, { status: 'pass', packageDirectory: outputDirectory });
  assert.equal(report.packageDirectory, outputDirectory);
  assert.equal(report.documents.design, true);
  assert.equal(report.audit.entries, 1);
  const audit = JSON.parse(await readFile(join(outputDirectory, 'audit.json'), 'utf8'));
  assert.match(audit.entries[0].reason, /no complete layout frame/i);
  assert.equal(report.gates.runtime, 'pending');
  assert.equal(report.gates.visual, 'pending');
  assert.equal(report.coverage.nodes.total, 1);
});

test('CLI validate fails loudly when an integration artifact is malformed', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'openpencil-package-invalid-integration-'));
  await writeFile(join(outputDirectory, 'integration.json'), '{invalid', 'utf8');
  await assert.rejects(() => runCli(['validate', outputDirectory]), /Unexpected token|JSON/);
});
