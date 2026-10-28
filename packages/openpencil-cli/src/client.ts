import { fileURLToPath } from 'node:url';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CliRunner = (command: string, args: string[]) => Promise<CliResult>;

export function resolveProjectOpenPencilCommand(): string {
  return process.env.OPENPENCIL_CLI ?? fileURLToPath(new URL('../../../node_modules/.bin/openpencil', import.meta.url));
}

export class OpenPencilCliError extends Error {
  readonly command: string;
  readonly result: CliResult;

  constructor(
    message: string,
    command: string,
    result: CliResult,
  ) {
    super(message);
    this.name = 'OpenPencilCliError';
    this.command = command;
    this.result = result;
  }
}

export class OpenPencilCliClient {
  private readonly runner: CliRunner;
  private readonly command: string;

  constructor(
    runner: CliRunner,
    command = resolveProjectOpenPencilCommand(),
  ) {
    this.runner = runner;
    this.command = command;
  }

  async run(args: string[]): Promise<CliResult> {
    const result = await this.runner(this.command, args);
    if (result.exitCode !== 0) {
      throw new OpenPencilCliError(
        result.stderr || `OpenPencil CLI exited with code ${result.exitCode}`,
        [this.command, ...args].join(' '),
        result,
      );
    }
    return result;
  }

  async runJson<T>(args: string[]): Promise<T> {
    const result = await this.run([...args, '--json']);
    try {
      return JSON.parse(result.stdout) as T;
    } catch (error) {
      throw new Error(`OpenPencil CLI returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

