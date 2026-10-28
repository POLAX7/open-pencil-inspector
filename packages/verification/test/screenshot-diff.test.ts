import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { verifyScreenshot } from '../src/screenshot-diff.ts';

async function writeSolidPng(path: string, red: number, width = 2, height = 2): Promise<void> {
  const png = new PNG({ width, height });
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = red;
    png.data[index + 1] = 0;
    png.data[index + 2] = 0;
    png.data[index + 3] = 255;
  }
  await writeFile(path, PNG.sync.write(png));
}

test('missing reference is not treated as a visual pass', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeFile(join(dir, 'candidate.png'), 'candidate');
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'));
  assert.equal(result.status, 'reference-unavailable');
});

test('existing reference without approved threshold remains pending', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeFile(join(dir, 'reference.png'), 'reference');
  await writeFile(join(dir, 'candidate.png'), 'candidate');
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'));
  assert.equal(result.status, 'reference-threshold-pending');
});

test('approved threshold produces an explicit pass result', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeSolidPng(join(dir, 'reference.png'), 32);
  await writeSolidPng(join(dir, 'candidate.png'), 32);
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'), 0.01);
  assert.equal(result.status, 'pass');
  assert.equal(result.differenceRatio, 0);
});

test('pixel differences fail when they exceed the approved threshold', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeSolidPng(join(dir, 'reference.png'), 0);
  await writeSolidPng(join(dir, 'candidate.png'), 255);
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'), 0.01);
  assert.equal(result.status, 'fail');
  assert.equal(result.differenceRatio, 1);
});

test('dimension mismatches fail explicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeSolidPng(join(dir, 'reference.png'), 32, 2, 2);
  await writeSolidPng(join(dir, 'candidate.png'), 32, 1, 1);
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'), 0.01);
  assert.equal(result.status, 'fail');
  assert.equal(result.differenceRatio, 1);
  assert.match(result.message, /dimensions differ/);
});

test('invalid PNG data fails explicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  await writeSolidPng(join(dir, 'reference.png'), 32);
  await writeFile(join(dir, 'candidate.png'), 'not a png');
  const result = await verifyScreenshot(join(dir, 'reference.png'), join(dir, 'candidate.png'), 0.01);
  assert.equal(result.status, 'fail');
  assert.match(result.message, /PNG comparison failed/);
});

test('pixel verification can persist a diff image for the node-matched reference pair', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-verify-'));
  const reference = join(dir, 'screen-home-reference.png');
  const candidate = join(dir, 'screen-home-candidate.png');
  const diff = join(dir, 'screen-home-diff.png');
  await writeSolidPng(reference, 0);
  await writeSolidPng(candidate, 255);
  const result = await verifyScreenshot(reference, candidate, 0.01, diff);
  assert.equal(result.status, 'fail');
  await access(diff);
  assert.equal(result.diffPath, diff);
});
