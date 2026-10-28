import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenPencilCliAdapter } from '../src/adapter.ts';
import { OpenPencilCliClient, type CliRunner } from '../src/client.ts';

function fakeRunner(calls: string[][]): CliRunner {
  return async (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === 'export') return { stdout: '', stderr: '', exitCode: 0 };
    return {
      stdout: JSON.stringify({
        id: 'doc-1', name: 'Login', nodes: [{ id: 'screen-1', name: 'Login', type: 'FRAME', children: [] }],
      }),
      stderr: '', exitCode: 0,
    };
  };
}

test('CLI adapter scopes inspection to a node and normalizes JSON output', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(fakeRunner(calls)));
  const document = await adapter.inspect('design.fig', { nodeId: 'screen-1', depth: 2 });

  assert.match(calls[0]?.[0] ?? '', /node_modules\/\.bin\/openpencil$/);
  assert.deepEqual(calls[0]?.slice(1), ['node', 'design.fig', '--id', 'screen-1', '--json']);
  assert.equal(document.nodes[0]?.id, 'screen-1');
  assert.equal(document.provenance[0]?.source, 'open-pencil-cli');
});

test('CLI adapter lists all pages instead of treating the cover as the document', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'info') {
      return {
        stdout: JSON.stringify({ pageCounts: { Cover: 3, '🟠 Apps': 1301 } }),
        stderr: '', exitCode: 0,
      };
    }
    return {
      stdout: JSON.stringify([
        { id: '0:3', name: 'Cover', nodes: 3 },
        { id: '0:5', name: '🟠 Apps', nodes: 0 },
      ]),
      stderr: '', exitCode: 0,
    };
  }));

  const pages = await adapter.listPages('figs/CryptoAndFoodApp.fig');

  assert.deepEqual(pages, [
    { id: '0:3', name: 'Cover', nodeCount: 3 },
    { id: '0:5', name: '🟠 Apps', nodeCount: 1301 },
  ]);
  assert.deepEqual(calls, [
    ['pages', 'figs/CryptoAndFoodApp.fig', '--json'],
    ['info', 'figs/CryptoAndFoodApp.fig', '--json'],
  ]);
});

test('CLI adapter forwards an explicit page to tree inspection', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    return {
      stdout: JSON.stringify([{ id: '0:88', name: 'Food App', type: 'SECTION', children: [] }]),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('figs/CryptoAndFoodApp.fig', { page: '🟠 Apps' });

  assert.equal(document.nodes[0]?.id, '0:88');
  assert.deepEqual(calls[0], ['tree', 'figs/CryptoAndFoodApp.fig', '--page', '🟠 Apps', '--json']);
});

test('CLI adapter forwards explicit page identity to node inspection', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    return {
      stdout: JSON.stringify({ id: '0:88', name: 'Food App', type: 'SECTION', children: 0 }),
      stderr: '', exitCode: 0,
    };
  }));

  await adapter.inspect('figs/CryptoAndFoodApp.fig', { pageId: '0:5', nodeId: '0:88' });

  assert.deepEqual(calls[0], ['node', 'figs/CryptoAndFoodApp.fig', '--id', '0:88', '--page-id', '0:5', '--json']);
});

test('CLI adapter hydrates a selected node from its bounded page tree', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    return {
      stdout: JSON.stringify([{ id: 'page-root', name: 'Screens', type: 'SECTION', children: [
        { id: 'screen-1', name: 'Home', type: 'FRAME', children: [{ id: 'title', name: 'Title', type: 'TEXT', children: [] }] },
      ] }]),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('design.fig', { page: 'Screens', nodeId: 'screen-1', hydrate: true, hydrateDepth: 6, hydrateStrategy: 'tree' });

  assert.equal(document.nodes[0]?.id, 'screen-1');
  assert.equal(document.nodes[0]?.children[0]?.id, 'title');
  assert.deepEqual(calls[0], ['tree', 'design.fig', '--depth', '6', '--page', 'Screens', '--json']);
});

test('CLI tree hydration fetches details only for image candidates so asset hashes survive normalization', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') {
      return {
        stdout: JSON.stringify([{ id: 'screen', name: 'Home', type: 'FRAME', children: [
          { id: 'image', name: 'image 16', type: 'ROUNDED_RECTANGLE', children: [] },
          { id: 'title', name: 'Title', type: 'TEXT', children: [] },
        ] }]),
        stderr: '', exitCode: 0,
      };
    }
    return {
      stdout: JSON.stringify({ id: 'image', name: 'image 16', type: 'ROUNDED_RECTANGLE', fills: [
        { type: 'IMAGE', imageHash: 'missing-hash', visible: true },
      ], children: 0 }),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('design.fig', { hydrate: true, hydrateStrategy: 'tree' });

  assert.deepEqual(calls, [
    ['tree', 'design.fig', '--depth', '1', '--json'],
    ['node', 'design.fig', '--id', 'image', '--json'],
  ]);
  assert.equal(document.nodes[0]?.children[0]?.assetRef, 'missing-hash');
});

test('CLI tree hydration fetches render-critical details for named background vectors', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') {
      return {
        stdout: JSON.stringify([{ id: 'screen', name: 'Details', type: 'FRAME', children: [
          { id: 'background', name: 'bg', type: 'VECTOR', children: [] },
        ] }]),
        stderr: '', exitCode: 0,
      };
    }
    return {
      stdout: JSON.stringify({ id: 'background', name: 'bg', type: 'VECTOR', fills: [
        { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true },
      ], children: 0 }),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('design.fig', { hydrate: true, hydrateStrategy: 'tree' });

  assert.deepEqual(calls, [
    ['tree', 'design.fig', '--depth', '1', '--json'],
    ['node', 'design.fig', '--id', 'background', '--json'],
  ]);
  assert.equal(document.nodes[0]?.children[0]?.style?.fill, '#ffffff');
});

test('CLI tree hydration fetches stroke details for rounded rectangles', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') return { stdout: JSON.stringify([{ id: 'screen', name: 'Details', type: 'FRAME', children: [{ id: 'control', name: 'Rectangle 5', type: 'ROUNDED_RECTANGLE', children: [] }] }]), stderr: '', exitCode: 0 };
    return { stdout: JSON.stringify({ id: 'control', name: 'Rectangle 5', type: 'ROUNDED_RECTANGLE', cornerRadius: 8, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true }], children: 0 }), stderr: '', exitCode: 0 };
  }));
  const document = await adapter.inspect('design.fig', { hydrate: true, hydrateStrategy: 'tree' });
  assert.deepEqual(calls, [['tree', 'design.fig', '--depth', '1', '--json'], ['node', 'design.fig', '--id', 'control', '--json']]);
  assert.equal(document.nodes[0]?.children[0]?.style?.stroke, '#000000');
});

test('CLI adapter can hydrate selected subtree styles through bounded node details', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') {
      return {
        stdout: JSON.stringify([{ id: 'screen', name: 'Home', type: 'FRAME', children: [
          { id: 'button', name: 'Button', type: 'GROUP', children: [{ id: 'label', name: 'Label', type: 'TEXT', children: [] }] },
        ] }]),
        stderr: '', exitCode: 0,
      };
    }
    const id = args[3];
    return {
      stdout: JSON.stringify({
        id,
        name: id,
        type: id === 'label' ? 'TEXT' : id === 'button' ? 'ROUNDED_RECTANGLE' : 'FRAME',
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
        cornerRadius: id === 'button' ? 8 : 0,
        text: id === 'label' ? 'Buy' : null,
        children: 0,
      }),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('design.fig', { nodeId: 'screen', hydrate: true, hydrateDepth: 6, hydrateStrategy: 'nodes' });

  assert.deepEqual(calls, [
    ['tree', 'design.fig', '--depth', '6', '--json'],
    ['node', 'design.fig', '--id', 'screen', '--json'],
    ['node', 'design.fig', '--id', 'button', '--json'],
    ['node', 'design.fig', '--id', 'label', '--json'],
  ]);
  assert.equal(document.nodes[0]?.children[0]?.style?.fill, '#ff0000');
  assert.equal(document.nodes[0]?.children[0]?.style?.radius, 8);
  assert.equal(document.nodes[0]?.children[0]?.children[0]?.text?.content, 'Buy');
});

test('CLI adapter merges multiple selected roots from one explicit page', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    const id = args[3];
    return {
      stdout: JSON.stringify({ id, name: id === '0:88' ? 'Food App' : 'Crypto', type: 'SECTION', children: 0 }),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('figs/CryptoAndFoodApp.fig', { pageId: '0:5', rootNodeIds: ['0:88', '0:1013'] });

  assert.deepEqual(document.nodes.map((node) => node.id), ['0:88', '0:1013']);
  assert.deepEqual(calls, [
    ['node', 'figs/CryptoAndFoodApp.fig', '--id', '0:88', '--page-id', '0:5', '--json'],
    ['node', 'figs/CryptoAndFoodApp.fig', '--id', '0:1013', '--page-id', '0:5', '--json'],
  ]);
});

test('CLI adapter exports a node to an explicit asset path', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(fakeRunner(calls)));
  const asset = await adapter.exportAsset('design.fig', { nodeId: 'icon-1', format: 'svg', outputPath: '/tmp/icon.svg' });

  assert.match(calls[0]?.[0] ?? '', /node_modules\/\.bin\/openpencil$/);
  assert.deepEqual(calls[0]?.slice(1), ['export', 'design.fig', '--format', 'svg', '--output', '/tmp/icon.svg', '--node', 'icon-1']);
  assert.equal(asset.path, '/tmp/icon.svg');
});

test('CLI adapter accepts the real tree array and node child-count shapes', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') {
      return {
        stdout: JSON.stringify([{ id: '0:5', name: 'home', type: 'FRAME', children: [{ id: '0:6', name: 'Title', type: 'TEXT', children: [] }] }]),
        stderr: '', exitCode: 0,
      };
    }
    return {
      stdout: JSON.stringify({ id: '0:5', name: 'home', type: 'FRAME', children: 13 }),
      stderr: '', exitCode: 0,
    };
  }));

  const tree = await adapter.inspect('figs/FoodApp.fig');
  const node = await adapter.inspect('figs/FoodApp.fig', { nodeId: '0:5' });

  assert.equal(tree.nodes[0]?.children[0]?.id, '0:6');
  assert.equal(node.nodes[0]?.id, '0:5');
  assert.deepEqual(calls, [
    ['tree', 'figs/FoodApp.fig', '--json'],
    ['node', 'figs/FoodApp.fig', '--id', '0:5', '--json'],
  ]);
});

test('CLI adapter preserves geometry and maps text content from real tree nodes', async () => {
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async () => ({
    stdout: JSON.stringify([{
      id: '0:5', name: 'home', type: 'FRAME', x: -1010, y: -1006, width: 430, height: 932,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
      children: [{ id: '0:6', name: 'Foodgo', type: 'TEXT', x: 19, y: 28, width: 129, height: 61 }],
    }]),
    stderr: '', exitCode: 0,
  })));
  const document = await adapter.inspect('figs/FoodApp.fig');
  const screen = document.nodes[0];
  const title = screen?.children[0];
  assert.deepEqual(screen?.layout, { x: -1010, y: -1006, width: 430, height: 932 });
  assert.deepEqual(title?.layout, { x: 19, y: 28, width: 129, height: 61 });
  assert.equal(title?.text?.content, 'Foodgo');
});

test('CLI adapter hydrates tree nodes without losing tree children', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    if (args[0] === 'tree') return { stdout: JSON.stringify([{ id: 'screen', name: 'Home', type: 'FRAME', children: [{ id: 'title', name: 'Title', type: 'TEXT', children: [] }] }]), stderr: '', exitCode: 0 };
    const id = args[3];
    return { stdout: JSON.stringify({ id, name: id === 'title' ? 'Title' : 'Home', type: id === 'title' ? 'TEXT' : 'FRAME', text: id === 'title' ? 'Hydrated title' : null, fontSize: 28, children: 0 }), stderr: '', exitCode: 0 };
  }));
  const document = await adapter.inspect('design.fig', { hydrate: true, hydrateDepth: 1, hydrateRootCount: 1 });
  assert.equal(document.nodes[0]?.children[0]?.text?.content, 'Hydrated title');
  assert.deepEqual(calls, [
    ['tree', 'design.fig', '--json'],
    ['node', 'design.fig', '--id', 'screen', '--json'],
    ['node', 'design.fig', '--id', 'title', '--json'],
  ]);
});

test('CLI adapter hydrates wide trees without spawning one process per sibling concurrently', async () => {
  let active = 0;
  let maxActive = 0;
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    if (args[0] === 'tree') {
      return {
        stdout: JSON.stringify([{ id: 'screen', name: 'Home', type: 'FRAME', children: Array.from({ length: 8 }, (_, index) => ({ id: `child-${index}`, name: `Child ${index}`, type: 'TEXT', children: [] })) }]),
        stderr: '', exitCode: 0,
      };
    }
    return { stdout: JSON.stringify({ id: args[3], name: args[3], type: 'TEXT', children: 0 }), stderr: '', exitCode: 0 };
  }));

  await adapter.inspect('design.fig', { hydrate: true, hydrateDepth: 1, hydrateRootCount: 1 });

  assert.equal(maxActive, 1);
});

test('CLI adapter tree hydration uses one depth-scoped process without per-node calls', async () => {
  const calls: string[][] = [];
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async (_command, args) => {
    calls.push(args);
    return {
      stdout: JSON.stringify([{ id: 'screen', name: 'Home', type: 'FRAME', children: [{ id: 'title', name: 'Title', type: 'TEXT', children: [] }] }]),
      stderr: '', exitCode: 0,
    };
  }));

  const document = await adapter.inspect('design.fig', { hydrate: true, hydrateDepth: 2, hydrateStrategy: 'tree' });

  assert.equal(document.nodes[0]?.children[0]?.id, 'title');
  assert.deepEqual(calls, [['tree', 'design.fig', '--depth', '2', '--json']]);
});

test('CLI parser failure exposes a source error diagnostic', async () => {
  const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(async () => ({
    stdout: '', stderr: 'Ambiguous resource 324:5', exitCode: 1,
  })));
  await assert.rejects(() => adapter.inspect('figs/OpenFashion.fig'), (error: unknown) => {
    const diagnostic = (error as { diagnostic?: { code?: string; severity?: string; path?: string } }).diagnostic;
    return diagnostic?.code === 'OPENPENCIL_CLI_FAILURE'
      && diagnostic.severity === 'error'
      && diagnostic.path === 'figs/OpenFashion.fig';
  });
});
