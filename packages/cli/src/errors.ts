export interface CliErrorPayload {
  status: 'error';
  code: string;
  message: string;
}

export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(code: string, message: string, exitCode = 1) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function formatCliError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof CliError
    ? error.code
    : message.startsWith('Usage:')
      ? 'CLI_USAGE'
      : 'CLI_ERROR';
  return JSON.stringify({ status: 'error', code, message } satisfies CliErrorPayload);
}

export function cliExitCode(error: unknown): number {
  if (error instanceof CliError) return error.exitCode;
  return error instanceof Error && error.message.startsWith('Usage:') ? 2 : 1;
}
