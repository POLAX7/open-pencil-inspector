import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenPencilMcpAdapter } from '../src/adapter.ts';
import type { McpClient } from '../src/client.ts';

function adapter() {
  const client: McpClient = {
    async listTools() { return []; },
    async callTool() { throw new Error('confirmation workflow must not call Pencil MCP'); },
  };
  return new OpenPencilMcpAdapter(client);
}

test('MCP adapter exposes local candidate, decision, validation, and compile workflow', () => {
  const design = {
    id: 'food', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [],
    nodes: [
      { id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'order', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
      { id: 'payment', name: 'payment', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] },
    ],
  } as any;
  const bridge = adapter();
  const candidate = bridge.proposeFlow(design, { source: 'FoodApp.fig' });
  assert.equal(candidate.status, 'candidate');
  assert.equal(bridge.validateFlow(candidate).valid, true);
  const question = candidate.questions[0];
  assert.ok(question);
  const draft = bridge.saveFlowDecisions(candidate, [{
    questionId: question.id,
    answer: { from: 'home', event: 'tap order now', to: 'payment' },
    provenance: [{ source: 'user', reference: 'test-answer' }],
    revision: 1,
  }]);
  const confirmed = bridge.confirmFlow(draft);
  const flow = bridge.compileConfirmedFlow(confirmed);
  assert.equal(flow.transitions[0]?.to, 'payment');
});

test('MCP adapter does not mutate a candidate when confirmation is rejected', () => {
  const bridge = adapter();
  const candidate = bridge.proposeFlow({ id: 'draft', name: 'Draft', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'ok', name: 'OK', type: 'TEXT', text: { content: 'OK' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }] } as any, { source: 'draft.fig' });
  assert.throws(() => bridge.confirmFlow(candidate), /Cannot confirm flow/);
  assert.equal(candidate.status, 'candidate');
  assert.equal(candidate.revision, 1);
});
