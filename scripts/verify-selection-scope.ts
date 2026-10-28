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

const adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(run));
const scopes = [
  { file: 'figs/CryptoAndFoodApp.fig', page: '🟠 Apps', expectedRoots: ['0:88', '0:1013'] },
  { file: 'figs/RealEstateApp.fig', page: 'Screens' },
  { file: 'figs/E-learning.fig', page: '🎨 Designs' },
];
const results = [];

for (const scope of scopes) {
  const pages = await adapter.listPages(scope.file);
  const page = pages.find((candidate) => candidate.name === scope.page);
  if (!page) throw new Error(`Missing expected page ${scope.page} in ${scope.file}`);
  const document = await adapter.inspect(scope.file, { page: page.name, pageId: page.id });
  const rootIds = document.nodes.map((node) => node.id);
  for (const expectedRoot of scope.expectedRoots ?? []) {
    if (!rootIds.includes(expectedRoot)) throw new Error(`Missing expected root ${expectedRoot} in ${scope.file}#${scope.page}`);
  }
  results.push({ file: scope.file, page: { id: page.id, name: page.name }, roots: rootIds.length, diagnostics: document.diagnostics.length, errors: document.diagnostics.filter((item) => item.severity === 'error').length });
}

console.log(JSON.stringify({ status: 'pass', scopes: results }, null, 2));
