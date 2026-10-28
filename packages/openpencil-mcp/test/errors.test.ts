import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnostic, IngestionError } from '../../core/src/diagnostics.ts';
import { formatMcpError, mcpCapabilityError } from '../src/errors.ts';

test('MCP error envelope preserves diagnostic code and path', () => {
  const error = new IngestionError(diagnostic('OPENPENCIL_MCP_CAPABILITY', 'error', 'missing selection', { path: 'selection' }));
  assert.deepEqual(formatMcpError(error), { status: 'error', code: 'OPENPENCIL_MCP_CAPABILITY', message: 'missing selection', path: 'selection' });
});

test('MCP capability errors use the same structured envelope boundary', () => {
  const error = mcpCapabilityError('pages');
  assert.deepEqual(formatMcpError(error), {
    status: 'error', code: 'OPENPENCIL_MCP_CAPABILITY', message: 'OpenPencil MCP capability is unavailable: pages', path: 'pages',
  });
});
