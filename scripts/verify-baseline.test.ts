import { describe, expect, test } from 'bun:test';
import { summarizeBaseline, type BaselineCheck } from './verify-baseline.ts';

describe('summarizeBaseline', () => {
  test('does not require removed legacy asset verification commands', () => {
    const checks: BaselineCheck[] = [
      { name: 'unit', command: 'bun test packages', status: 'pass', exitCode: 0, output: '215 pass' },
      { name: 'typescript', command: 'bun run check', status: 'pass', exitCode: 0, output: '' },
      { name: 'fixtures', command: 'bun run verify:figs', status: 'pass', exitCode: 0, output: JSON.stringify({ results: [] }) },
    ];

    expect(summarizeBaseline(checks).status).toBe('pass');
    expect(checks.some((check) => check.command.includes('verify:ios-assets'))).toBe(false);
  });

  test('keeps blocked fixture evidence and fails the aggregate gate', () => {
    const checks: BaselineCheck[] = [
      { name: 'unit', command: 'bun test packages', status: 'pass', exitCode: 0, output: '66 pass' },
      { name: 'fixtures', command: 'verify:figs', status: 'blocked', exitCode: 1, output: `$ node scripts/verify-fig-fixtures.ts\n${JSON.stringify({
        results: [
          { file: 'CryptoAndFoodApp.fig', status: 'pass' },
          { file: 'RealEstateApp.fig', status: 'blocked', error: 'diagnostic threshold' },
        ],
      })}\nerror: script exited with code 1` },
    ];

    const summary = summarizeBaseline(checks);

    expect(summary.status).toBe('blocked');
    expect(summary.checks).toHaveLength(2);
    expect(summary.fixtureResults).toEqual([
      { file: 'CryptoAndFoodApp.fig', status: 'pass' },
      { file: 'RealEstateApp.fig', status: 'blocked', error: 'diagnostic threshold' },
    ]);
  });
});
