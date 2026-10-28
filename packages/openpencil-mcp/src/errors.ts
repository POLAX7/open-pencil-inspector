import { diagnostic, IngestionError, type Diagnostic } from '../../core/src/diagnostics.ts';

export interface McpErrorEnvelope {
  status: 'error';
  code: string;
  message: string;
  path?: string;
}

export function mcpCapabilityError(capability: string): IngestionError {
  return new IngestionError(diagnostic('OPENPENCIL_MCP_CAPABILITY', 'error', `OpenPencil MCP capability is unavailable: ${capability}`, {
    path: capability,
    provenance: [{ source: 'open-pencil-mcp', reference: 'capabilities' }],
  }));
}

export function mcpFailure(code: string, message: string, path: string, reference: string, cause?: unknown): IngestionError {
  return new IngestionError(diagnostic(code, 'error', message, {
    path,
    provenance: [{ source: 'open-pencil-mcp', reference }],
  }), { cause });
}

export function formatMcpError(error: unknown): McpErrorEnvelope {
  const diagnosticValue: Diagnostic | undefined = error instanceof IngestionError ? error.diagnostic : undefined;
  return {
    status: 'error',
    code: diagnosticValue?.code ?? 'OPENPENCIL_MCP_ERROR',
    message: diagnosticValue?.message ?? (error instanceof Error ? error.message : String(error)),
    ...(diagnosticValue?.path ? { path: diagnosticValue.path } : {}),
  };
}
