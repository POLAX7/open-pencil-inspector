import { readFile } from 'node:fs/promises';
import type { InspectOptions, OpenPencilCliAdapter } from '../../openpencil-cli/src/adapter.ts';
import { validateSelectionManifest, type SelectionManifest } from '../../core/src/selection-scope.ts';
import type { SourceProvenance } from '../../core/src/diagnostics.ts';
import { CliError } from './errors.ts';

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function repeatedOptionValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) {
      const value = args[index + 1];
      if (!value) throw new Error(`Usage requires a value after ${name}`);
      values.push(value);
    }
  }
  return values;
}

export async function readSelectionManifest(path: string): Promise<SelectionManifest> {
  return validateSelectionManifest(JSON.parse(await readFile(path, 'utf8')));
}

export async function resolveInspectOptions(
  adapter: Pick<OpenPencilCliAdapter, 'listPages'> | { listPages?: OpenPencilCliAdapter['listPages'] },
  filePath: string,
  args: string[],
): Promise<InspectOptions> {
  const selectionPath = optionValue(args, '--selection');
  const page = optionValue(args, '--page');
  const pageId = optionValue(args, '--page-id');
  const nodeIds = repeatedOptionValues(args, '--node');
  if (selectionPath && (page || pageId || nodeIds.length > 0)) {
    throw new CliError('SCOPE_OPTIONS_CONFLICT', 'Use --selection instead of --page, --page-id, or --node', 2);
  }
  if (page && pageId) throw new CliError('SCOPE_OPTIONS_CONFLICT', 'Use either --page or --page-id, not both', 2);
  if (selectionPath) {
    const selection = await readSelectionManifest(selectionPath);
    if (selection.source !== filePath) {
      throw new CliError('SELECTION_SOURCE_MISMATCH', `Selection source does not match input file: ${selection.source}`, 2);
    }
    return {
      page: selection.page.name,
      pageId: selection.page.id,
      ...(selection.scope === 'selected-subtree' ? { rootNodeIds: selection.rootNodes.map((root) => root.id) } : {}),
    };
  }
  if (nodeIds.length > 0 && !page && !pageId) {
    throw new CliError('SCOPE_REQUIRED', '--node requires --page or --page-id so the selected scope is unambiguous', 2);
  }
  if (page || pageId || nodeIds.length > 0) {
    if (page) {
      const pages = await adapter.listPages(filePath);
      if (!pages.some((candidate) => candidate.name === page)) throw new CliError('UNKNOWN_PAGE', `Unknown page: ${page}`, 2);
    }
    if (pageId) {
      const pages = await adapter.listPages(filePath);
      const selected = pages.find((candidate) => candidate.id === pageId);
      if (!selected) throw new CliError('UNKNOWN_PAGE_ID', `Unknown page id: ${pageId}`, 2);
      return { page: selected.name, pageId, ...(nodeIds.length > 0 ? { rootNodeIds: nodeIds } : {}) };
    }
    return { page, ...(nodeIds.length > 0 ? { rootNodeIds: nodeIds } : {}) };
  }
  if (typeof adapter.listPages === 'function') {
    const pages = await adapter.listPages(filePath);
    if (pages.length > 1) throw new CliError('SCOPE_REQUIRED', `Input contains ${pages.length} pages; specify --page, --page-id, or --selection before inspection`, 2);
  }
  return {};
}

export function selectionProvenance(filePath: string, options: InspectOptions): SourceProvenance | undefined {
  if (!options.page && !options.pageId && !options.rootNodeIds) return undefined;
  const page = options.pageId ?? options.page ?? 'selected-page';
  const roots = options.rootNodeIds?.join(',') ?? '*';
  return { source: 'fig', reference: filePath, field: `scope:page=${page};roots=${roots}` };
}
