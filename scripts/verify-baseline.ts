import { spawn } from 'node:child_process';

export type BaselineStatus = 'pass' | 'fail' | 'blocked';

export interface BaselineCheck {
  name: string;
  command: string;
  status: BaselineStatus;
  exitCode: number;
  output: string;
}

export interface FixtureResult {
  file: string;
  status: 'pass' | 'blocked' | 'fail';
  rootNodes?: number;
  diagnostics?: number;
  error?: string;
}

export interface BaselineSummary {
  status: BaselineStatus;
  checks: BaselineCheck[];
  fixtureResults: FixtureResult[];
}

function parseFixtureResults(output: string): FixtureResult[] {
  try {
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start < 0 || end < start) return [];
    const parsed = JSON.parse(output.slice(start, end + 1)) as { results?: FixtureResult[] };
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch {
    return [];
  }
}

export function summarizeBaseline(checks: BaselineCheck[]): BaselineSummary {
  const fixtureCheck = checks.find((check) => check.name === 'fixtures');
  const fixtureResults = fixtureCheck ? parseFixtureResults(fixtureCheck.output) : [];
  const status: BaselineStatus = checks.some((check) => check.status === 'blocked')
    ? 'blocked'
    : checks.some((check) => check.status === 'fail')
      ? 'fail'
      : 'pass';
  return { status, checks, fixtureResults };
}

function runCommand(command: string, args: string[]) {
  return new Promise<{ exitCode: number; output: string }>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: process.cwd() });
    let output = '';
    child.stdout.on('data', (chunk) => { output += String(chunk); });
    child.stderr.on('data', (chunk) => { output += String(chunk); });
    child.on('error', reject);
    child.on('close', (exitCode) => resolvePromise({ exitCode: exitCode ?? 1, output }));
  });
}

async function runCheck(name: string, command: string, args: string[]): Promise<BaselineCheck> {
  const result = await runCommand(command, args);
  const fixtureResults = name === 'fixtures' ? parseFixtureResults(result.output) : [];
  const status: BaselineStatus = fixtureResults.some((item) => item.status === 'blocked')
    ? 'blocked'
    : result.exitCode === 0 ? 'pass' : 'fail';
  return { name, command: [command, ...args].join(' '), status, exitCode: result.exitCode, output: result.output };
}

function renderReport(summary: BaselineSummary, version: string): string {
  const lines = [
    '# OpenPencil Inspector Baseline',
    '',
    `Date: ${new Date().toISOString()}`,
    `Status: ${summary.status}`,
    `OpenPencil packages: ${version}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Exit code | Command |',
    '|---|---|---:|---|',
    ...summary.checks.map((check) => `| ${check.name} | ${check.status} | ${check.exitCode} | \`${check.command}\` |`),
    '',
    '## Fixture results',
    '',
    '| Fixture | Status | Details |',
    '|---|---|---|',
    ...summary.fixtureResults.map((fixture) => {
      const details = fixture.error
        ? (fixture.error.split('\n').map((line) => line.trim()).find(Boolean) ?? 'blocked')
        : `rootNodes=${fixture.rootNodes ?? 'n/a'}, diagnostics=${fixture.diagnostics ?? 'n/a'}`;
      return `| ${fixture.file} | ${fixture.status} | ${details.replaceAll('|', '\\|')} |`;
    }),
    '',
    'A blocked or failed check is retained as evidence and causes the baseline command to exit non-zero.',
    '',
  ];
  return lines.join('\n');
}

export async function runBaseline(): Promise<BaselineSummary> {
  const checks = [
    await runCheck('unit', 'bun', ['test', 'packages']),
    await runCheck('typescript', 'bun', ['run', 'check']),
    await runCheck('fixtures', 'bun', ['run', 'verify:figs']),
    await runCheck('selection', 'bun', ['run', 'verify:selection']),
  ];
  const summary = summarizeBaseline(checks);
  return summary;
}

if (process.argv[1]?.endsWith('/verify-baseline.ts')) {
  runBaseline().then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== 'pass') process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
