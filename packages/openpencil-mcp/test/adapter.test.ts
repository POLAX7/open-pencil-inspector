import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OpenPencilMcpAdapter } from '../src/adapter.ts';
import type { McpClient } from '../src/client.ts';
import { OpenPencilStdioMcpClient, parseToolResult, resolveOpenPencilMcpEnvironment } from '../src/stdio-client.ts';

test('MCP adapter reads page inventory through the discovered read-only page tool', async () => {
  let received: { name: string; input: Record<string, unknown> } | undefined;
  const client: McpClient = {
    async listTools() { return [{ name: 'get_pages' }]; },
    async callTool(name, input) { received = { name, input }; return { pages: [{ id: '0:5', name: 'Screens', nodes: 4 }] }; },
  };
  const pages = await new OpenPencilMcpAdapter(client).getPages({ documentId: 'tab-1' });
  assert.deepEqual(received, { name: 'get_pages', input: { document_id: 'tab-1' } });
  assert.deepEqual(pages, [{ id: '0:5', name: 'Screens', nodeCount: 4 }]);
});

test('MCP adapter discovers available tools instead of assuming a fixed inventory', async () => {
  const calls: string[] = [];
  const client: McpClient = {
    async listTools() { return [{ name: 'get_page_tree' }, { name: 'query_nodes' }]; },
    async callTool(name) {
      calls.push(name);
      return { id: 'doc-1', name: 'Login', nodes: [{ id: 'screen-1', name: 'Login', type: 'FRAME', children: [] }] };
    },
  };
  const adapter = new OpenPencilMcpAdapter(client);
  const report = await adapter.getCapabilities();
  const document = await adapter.inspect();

  assert.equal(report.available.inspect, 'get_page_tree');
  assert.ok(report.missing.includes('tokens'));
  assert.deepEqual(calls, ['get_page_tree']);
  assert.equal(document.provenance[0]?.source, 'open-pencil-mcp');
});

test('MCP adapter maps node inspection to the official get_node schema', async () => {
  let received: { name: string; input: Record<string, unknown> } | undefined;
  const client: McpClient = {
    async listTools() { return [{ name: 'get_page_tree' }, { name: 'get_node' }]; },
    async callTool(name, input) {
      received = { name, input };
      return { id: 'screen-1', name: 'Home', type: 'FRAME', children: [] };
    },
  };

  const document = await new OpenPencilMcpAdapter(client).inspect({ nodeId: 'screen-1', documentId: 'tab-1', pageId: '0:3', depth: 1 });
  assert.deepEqual(received, {
    name: 'get_node',
    input: { id: 'screen-1', document_id: 'tab-1', page_id: '0:3', depth: 1 },
  });
  assert.equal(document.nodes[0]?.id, 'screen-1');
});

test('MCP adapter reads the current OpenPencil selection when requested', async () => {
  let received: { name: string; input: Record<string, unknown> } | undefined;
  const client: McpClient = {
    async listTools() { return [{ name: 'get_selection' }]; },
    async callTool(name, input) {
      received = { name, input };
      return { page: 'Screens', children: [{ id: 'screen-1', name: 'Home', type: 'FRAME', children: [] }] };
    },
  };
  const document = await new OpenPencilMcpAdapter(client).inspect({ selection: true, documentId: 'tab-1', pageId: '0:3' });
  assert.deepEqual(received, { name: 'get_selection', input: { document_id: 'tab-1', page_id: '0:3' } });
  assert.equal(document.nodes[0]?.id, 'screen-1');
});

test('MCP adapter normalizes current selection into the shared selection manifest', async () => {
  const client: McpClient = {
    async listTools() { return [{ name: 'get_selection' }]; },
    async callTool() { return { page_id: '0:5', page: 'Screens', children: [{ id: 'screen-1', name: 'Home', type: 'FRAME' }] }; },
  };
  const selection = await new OpenPencilMcpAdapter(client).getSelection({ source: 'CryptoAndFoodApp.fig' });
  assert.deepEqual(selection, {
    version: '1.0', source: 'CryptoAndFoodApp.fig', page: { id: '0:5', name: 'Screens' },
    rootNodes: [{ id: 'screen-1', name: 'Home', type: 'FRAME' }], scope: 'selected-subtree',
  });
});

test('MCP adapter maps the official page tree children into design nodes', async () => {
  const client: McpClient = {
    async listTools() { return [{ name: 'get_page_tree' }]; },
    async callTool() { return { page: 'Page 1', children: [{ id: '0:5', type: 'FRAME', name: 'home', w: 430, h: 932 }] }; },
  };
  const document = await new OpenPencilMcpAdapter(client).inspect({ documentId: 'tab-1', pageId: '0:3', depth: 1 });
  assert.equal(document.name, 'Page 1');
  assert.equal(document.nodes[0]?.id, '0:5');
  assert.equal(document.nodes[0]?.type, 'FRAME');
});

test('MCP adapter reports missing capability without making a speculative tool call', async () => {
  let called = false;
  const client: McpClient = {
    async listTools() { return []; },
    async callTool() { called = true; return {}; },
  };
  const adapter = new OpenPencilMcpAdapter(client);
  await assert.rejects(() => adapter.inspect(), (error: unknown) => {
    const diagnostic = (error as { diagnostic?: { code?: string; severity?: string; path?: string } }).diagnostic;
    return diagnostic?.code === 'OPENPENCIL_MCP_CAPABILITY'
      && diagnostic.severity === 'error'
      && diagnostic.path === 'inspect';
  });
  assert.equal(called, false);
});

test('MCP adapter exports a design asset through the discovered export capability', async () => {
  let received: { name: string; input: Record<string, unknown> } | undefined;
  const client: McpClient = {
    async listTools() { return [{ name: 'export_image' }]; },
    async callTool(name, input) {
      received = { name, input };
      return { id: 'image-1', name: 'Hero', path: '/tmp/hero.svg' };
    },
  };
  const asset = await new OpenPencilMcpAdapter(client).exportAsset({ nodeId: 'image-1', format: 'svg', outputPath: '/tmp/hero.svg' });

  assert.deepEqual(received, { name: 'export_image', input: { nodeId: 'image-1', format: 'svg', outputPath: '/tmp/hero.svg' } });
  assert.equal(asset.kind, 'svg');
  assert.equal(asset.path, '/tmp/hero.svg');
  assert.equal(asset.sourceNodeId, 'image-1');
});

test('stdio MCP result parser prefers structured content and decodes text content', () => {
  assert.deepEqual(parseToolResult<{ id: string }>({ structuredContent: { id: 'structured' } }), { id: 'structured' });
  assert.deepEqual(parseToolResult<{ id: string }>({ content: [{ type: 'text', text: '{"id":"text"}' }] }), { id: 'text' });
});

test('stdio MCP client discovers a local auth token without overriding explicit env', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-mcp-discovery-'));
  const discoveryFile = join(directory, 'mcp.json');
  await writeFile(discoveryFile, JSON.stringify({ authToken: 'discovered-token' }), 'utf8');
  assert.equal((await resolveOpenPencilMcpEnvironment({}, discoveryFile)).OPENPENCIL_MCP_AUTH_TOKEN, 'discovered-token');
  assert.equal((await resolveOpenPencilMcpEnvironment({ OPENPENCIL_MCP_AUTH_TOKEN: 'explicit-token' }, discoveryFile)).OPENPENCIL_MCP_AUTH_TOKEN, 'explicit-token');
});

test('stdio MCP client includes bridge stderr when the process exits', async () => {
  const client = new OpenPencilStdioMcpClient({ command: process.execPath, args: ['-e', 'console.error("socket unavailable"); process.exit(1)'], discoveryFile: '/nonexistent/openpencil-mcp.json' });
  await assert.rejects(() => client.listTools(), /socket unavailable/);
});
