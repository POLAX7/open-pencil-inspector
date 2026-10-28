import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMarkdownFlow } from '../src/markdown-loader.ts';

test('Markdown loader extracts screens, transitions, and states', () => {
  const flow = loadMarkdownFlow('# Login\n- tap register goes to Register\n- state: loading\n# Register', 'login.md');
  assert.deepEqual(flow.screens.map((screen) => screen.id), ['login', 'register']);
  assert.equal(flow.transitions[0]?.to, 'register');
  assert.equal(flow.states[0]?.name, 'loading');
});

test('Markdown loader reports unresolved transition targets', () => {
  const flow = loadMarkdownFlow('# Login\n- submit goes to Home', 'login.md');
  assert.match(flow.diagnostics[0] ?? '', /transition targets/);
});

test('Markdown loader reports missing screen headings', () => {
  const flow = loadMarkdownFlow('- state: loading', 'empty.md');
  assert.match(flow.diagnostics[0] ?? '', /No screen headings/);
});
