import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { spawn } from 'node:child_process';
import { OpenPencilCliAdapter } from '../packages/openpencil-cli/src/adapter.ts';
import { OpenPencilCliClient } from '../packages/openpencil-cli/src/client.ts';

function run(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ stdout, stderr, exitCode: exitCode ?? 1 }));
  });
}

const directory = process.argv[2] ?? 'figs';
const files = (await readdir(directory)).filter((file) => file.endsWith('.fig')).sort();
const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(run));
const results = [];

for (const file of files) {
  const path = join(directory, file);
  try {
    const document = await adapter.inspect(path);
    results.push({ file: basename(path), status: 'pass', rootNodes: document.nodes.length, diagnostics: document.diagnostics.length });
  } catch (error) {
    results.push({ file: basename(path), status: 'blocked', error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ directory, total: results.length, results }, null, 2));
if (results.some((result) => result.status === 'blocked')) process.exitCode = 1;
