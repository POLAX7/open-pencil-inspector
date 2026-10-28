export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface SourceProvenance {
  source: 'open-pencil-cli' | 'open-pencil-mcp' | 'fig' | 'spec' | 'inferred';
  reference?: string;
  field?: string;
}

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
  provenance?: SourceProvenance[];
}

export class IngestionError extends Error {
  readonly diagnostic: Diagnostic;

  constructor(value: Diagnostic, options?: { cause?: unknown }) {
    super(value.message, options);
    this.name = 'IngestionError';
    this.diagnostic = value;
  }
}

export function diagnostic(
  code: string,
  severity: DiagnosticSeverity,
  message: string,
  details: Omit<Diagnostic, 'code' | 'severity' | 'message'> = {},
): Diagnostic {
  return { code, severity, message, ...details };
}
