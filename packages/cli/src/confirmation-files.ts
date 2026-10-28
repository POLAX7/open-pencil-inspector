import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ConfirmationEnvelope, FlowDecision } from '../../flow-confirmation/src/contracts.ts';
import { confirmEnvelope, saveDecisions } from '../../flow-confirmation/src/decisions.ts';
import { proposeFlow } from '../../flow-confirmation/src/propose.ts';
import { validateConfirmationEnvelope } from '../../flow-confirmation/src/schema.ts';
import type { DesignDocument } from '../../core/src/design-ast.ts';
import type { SelectionManifest } from '../../core/src/selection-scope.ts';

export async function readConfirmation(path: string): Promise<ConfirmationEnvelope> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;
  validateConfirmationEnvelope(parsed);
  return parsed as ConfirmationEnvelope;
}

export async function writeConfirmation(path: string, envelope: ConfirmationEnvelope): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${path.split('/').pop() ?? 'confirmation.json'}.tmp`);
  await writeFile(temporary, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export async function proposeConfirmation(design: DesignDocument, source: string, parserVersion: string, selection?: SelectionManifest): Promise<ConfirmationEnvelope> {
  return proposeFlow(design, source, parserVersion, selection);
}

export { confirmEnvelope, saveDecisions };
export type { FlowDecision };
