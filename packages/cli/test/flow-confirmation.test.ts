import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/main.ts';

test('CLI proposes, saves, validates, and confirms a flow without inventing transitions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-confirmation-'));
  const candidatePath = join(directory, 'candidate.json');
  const draftPath = join(directory, 'draft.json');
  const confirmedPath = join(directory, 'confirmed.json');
  const design = {
    id: 'food', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [],
    nodes: [
      { id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'card', name: 'ORDER NOW', type: 'TEXT', text: { content: 'ORDER NOW' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
      { id: 'payment', name: 'payment', type: 'FRAME', children: [{ id: 'pay', name: 'PAY NOW', type: 'TEXT', text: { content: 'PAY NOW' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
      { id: 'popup', name: 'popup', type: 'FRAME', children: [{ id: 'ok', name: 'OK', type: 'TEXT', text: { content: 'OK' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] },
    ],
  };
  const adapter = { async inspect() { return design as any; }, async exportAsset() { throw new Error('not used'); } };
  const proposed = JSON.parse(await runCli(['propose-flow', 'FoodApp.fig', '--output', candidatePath], adapter));
  assert.equal(proposed.status, 'candidate');
  const candidate = JSON.parse(await readFile(candidatePath, 'utf8'));
  assert.deepEqual(candidate.flow.transitions, []);
  const answersPath = join(directory, 'answers.json');
  await writeFile(answersPath, JSON.stringify(candidate.questions.map((question: any, index: number) => ({ questionId: question.id, answer: { from: index === 0 ? 'home' : index === 1 ? 'payment' : 'popup', event: index === 0 ? 'tap order now' : index === 1 ? 'tap pay now' : 'tap ok', to: index === 0 ? 'payment' : index === 1 ? 'popup' : 'home' }, provenance: [{ source: 'user', reference: `answer-${index}` }], revision: 1 }))));
  const draft = JSON.parse(await runCli(['save-flow-decisions', candidatePath, '--decisions', answersPath, '--output', draftPath]));
  assert.equal(draft.status, 'candidate');
  await runCli(['confirm-flow', draftPath, '--output', confirmedPath]);
  const confirmed = JSON.parse(await readFile(confirmedPath, 'utf8'));
  assert.equal(confirmed.status, 'confirmed');
  const validation = JSON.parse(await runCli(['validate-flow', confirmedPath]));
  assert.equal(validation.valid, true);
});

test('CLI refuses to confirm a draft with unanswered blocking questions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-confirmation-blocked-'));
  const candidatePath = join(directory, 'candidate.json');
  await runCli(['propose-flow', 'FoodApp.fig', '--output', candidatePath], { async inspect() { return { id: 'food', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{ id: 'ok', name: 'OK', type: 'TEXT', text: { content: 'OK' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }] } as any; }, async exportAsset() { throw new Error('not used'); } });
  await assert.rejects(() => runCli(['confirm-flow', candidatePath, '--output', join(directory, 'confirmed.json')]), /Cannot confirm flow/);
});

test('CLI refuses to generate from an unconfirmed envelope before exporting assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpencil-confirmation-gate-'));
  const candidatePath = join(directory, 'candidate.json');
  let exported = false;
  await runCli(['propose-flow', 'FoodApp.fig', '--output', candidatePath], {
    async inspect() {
      return { id: 'food', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [] } as any;
    },
    async exportAsset() {
      exported = true;
      throw new Error('asset export must not run');
    },
  });
  await assert.rejects(
    () => runCli(['generate', 'FoodApp.fig', '--output', join(directory, 'generated'), '--confirmed-flow', candidatePath], {
      async inspect() {
        return { id: 'food', name: 'FoodApp', diagnostics: [], provenance: [], tokens: [], assets: [], nodes: [] } as any;
      },
      async exportAsset() {
        exported = true;
        throw new Error('asset export must not run');
      },
    }),
    /Cannot compile unconfirmed flow/,
  );
  assert.equal(exported, false);
});
