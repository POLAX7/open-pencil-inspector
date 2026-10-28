import { createHash } from 'node:crypto';

export interface SelectionPage {
  id: string;
  name: string;
}

export interface SelectionRoot {
  id: string;
  name: string;
  type: string;
}

export interface SelectionManifest {
  version: '1.0';
  source: string;
  page: SelectionPage;
  rootNodes: SelectionRoot[];
  scope: 'page' | 'selected-subtree';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${field} must be a non-empty string`);
  return value;
}

export function validateSelectionManifest(value: unknown): SelectionManifest {
  if (!isRecord(value)) throw new TypeError('selection manifest must be an object');
  if (value.version !== '1.0') throw new TypeError('selection manifest version must be 1.0');
  const source = requiredString(value.source, 'source');
  if (!isRecord(value.page)) throw new TypeError('page must be an object');
  const page = {
    id: requiredString(value.page.id, 'page.id'),
    name: requiredString(value.page.name, 'page.name'),
  };
  if (value.scope !== 'page' && value.scope !== 'selected-subtree') throw new TypeError('scope must be page or selected-subtree');
  if (!Array.isArray(value.rootNodes) || value.rootNodes.length === 0) throw new TypeError('rootNodes must contain at least one root');
  const ids = new Set<string>();
  const rootNodes = value.rootNodes.map((root, index) => {
    if (!isRecord(root)) throw new TypeError(`rootNodes[${index}] must be an object`);
    const id = requiredString(root.id, `rootNodes[${index}].id`);
    if (ids.has(id)) throw new TypeError(`rootNodes contains duplicate root: ${id}`);
    ids.add(id);
    return {
      id,
      name: requiredString(root.name, `rootNodes[${index}].name`),
      type: requiredString(root.type, `rootNodes[${index}].type`),
    };
  });
  return { version: '1.0', source, page, rootNodes, scope: value.scope };
}

export function selectionFingerprint(selection: SelectionManifest): string {
  const normalized = validateSelectionManifest(selection);
  const canonical = JSON.stringify({
    version: normalized.version,
    source: normalized.source,
    page: normalized.page,
    rootNodes: [...normalized.rootNodes].sort((left, right) => left.id.localeCompare(right.id)),
    scope: normalized.scope,
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
