import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNaturalLanguageFlow } from '../src/natural-language.ts';

const candidate = { version: '1.0', screens: [{ id: 'login', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] } as const;

test('natural-language extraction validates model output before returning Flow IR', async () => {
  const flow = await extractNaturalLanguageFlow('登入後進入 login', 'prompt-1', { async extract() { return candidate; } });
  assert.equal(flow.screens[0]?.provenance[0]?.source, 'natural-language');
});

test('malformed model output fails instead of becoming guessed navigation', async () => {
  await assert.rejects(() => extractNaturalLanguageFlow('go somewhere', 'prompt-2', { async extract() { return { screens: [] }; } }), /version/);
});

test('empty natural-language input is rejected before model invocation', async () => {
  let called = false;
  await assert.rejects(() => extractNaturalLanguageFlow(' ', 'prompt-3', { async extract() { called = true; return candidate; } }), /must not be empty/);
  assert.equal(called, false);
});
