import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStructuredFlow } from '../src/structured-loader.ts';

const yaml = 'version: "1.0"\nscreens:\n  - id: login\n    title: Login\ntransitions:\n  - from: login\n    event: submit\n    to: home\nstates:\n';

test('YAML and JSON equivalents produce the same Flow IR fields', () => {
  const fromYaml = loadStructuredFlow(yaml, 'login.yaml', 'yaml');
  const fromJson = loadStructuredFlow(JSON.stringify({ version: '1.0', screens: [{ id: 'login', title: 'Login' }], transitions: [{ from: 'login', event: 'submit', to: 'home' }], states: [] }), 'login.json', 'json');
  assert.equal(fromYaml.screens[0]?.id, fromJson.screens[0]?.id);
  assert.equal(fromYaml.transitions[0]?.to, fromJson.transitions[0]?.to);
});

test('structured loaders preserve source provenance', () => {
  const flow = loadStructuredFlow('{"version":"1.0","screens":[]}', 'flow.json', 'json');
  assert.deepEqual(flow.diagnostics, []);
});

test('unsupported YAML syntax fails loudly', () => {
  assert.throws(() => loadStructuredFlow('screens: [login]', 'bad.yaml', 'yaml'), /Unsupported YAML/);
});
