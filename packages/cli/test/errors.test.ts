import test from 'node:test';
import assert from 'node:assert/strict';
import { cliExitCode, CliError, formatCliError } from '../src/errors.ts';

test('CLI errors are machine-readable and usage errors have exit code 2', () => {
  const output = JSON.parse(formatCliError(new Error('Usage: inspect <file.fig>')));
  assert.deepEqual(output, { status: 'error', code: 'CLI_USAGE', message: 'Usage: inspect <file.fig>' });
  assert.equal(cliExitCode(new Error('Usage: inspect <file.fig>')), 2);
});

test('CLI errors preserve explicit codes and exit codes', () => {
  const error = new CliError('SCOPE_REQUIRED', 'Select a page before inspection', 2);
  assert.deepEqual(JSON.parse(formatCliError(error)), { status: 'error', code: 'SCOPE_REQUIRED', message: error.message });
  assert.equal(cliExitCode(error), 2);
});

test('scope errors expose a stable machine-readable code', async () => {
  const { runCli } = await import('../src/main.ts');
  await assert.rejects(() => runCli(['inspect', 'RealEstateApp.fig'], {
    async listPages() { return [{ id: 'cover', name: 'Cover', nodeCount: 1 }, { id: 'screens', name: 'Screens', nodeCount: 2 }]; },
    async inspect() { throw new Error('must not inspect'); },
    async exportAsset() { throw new Error('not used'); },
  }), (error: unknown) => error instanceof CliError && error.code === 'SCOPE_REQUIRED' && error.exitCode === 2);
});
