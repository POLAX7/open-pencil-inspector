import type { FlowIR, FlowProvenance } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';

function parseScalar(value: string): string | boolean | number {
  const original = value.trim();
  const quoted = (original.startsWith('"') && original.endsWith('"')) || (original.startsWith("'") && original.endsWith("'"));
  const trimmed = original.replace(/^['"]|['"]$/g, '');
  if (quoted) return trimmed;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseSimpleYaml(input: string, reference: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let section: string | undefined;
  let current: Record<string, unknown> | undefined;
  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ') && line.endsWith(':')) {
      section = line.slice(0, -1).trim(); root[section] = []; continue;
    }
    if (!line.startsWith(' ') && /:\s*[\[\{]/.test(line)) throw new Error(`Unsupported YAML inline collection at ${reference}:${index + 1}`);
    if (line.trimStart().startsWith('- ')) {
      if (!section || !Array.isArray(root[section])) throw new Error(`Unsupported YAML list at ${reference}:${index + 1}`);
      current = {}; (root[section] as unknown[]).push(current);
      const pair = line.trimStart().slice(2).split(/:\s*/, 2);
      if (pair.length === 2) current[pair[0]] = parseScalar(pair[1]);
      continue;
    }
    const pair = line.trim().split(/:\s*/, 2);
    if (pair.length !== 2) throw new Error(`Unsupported YAML syntax at ${reference}:${index + 1}`);
    if (current && line.startsWith('  ')) current[pair[0]] = parseScalar(pair[1]);
    else root[pair[0]] = parseScalar(pair[1]);
  }
  return root;
}

function normalize(raw: Record<string, unknown>, source: 'yaml' | 'json', reference: string): FlowIR {
  const origin: FlowProvenance = { source, reference };
  const list = (value: unknown) => Array.isArray(value) ? value : [];
  return validateFlowIR({
    version: raw.version ?? '1.0',
    screens: list(raw.screens).map((item) => ({ ...(item as object), provenance: [origin] })),
    transitions: list(raw.transitions).map((item) => ({ ...(item as object), provenance: [origin] })),
    states: list(raw.states).map((item) => ({ ...(item as object), provenance: [origin] })),
    conflicts: list(raw.conflicts),
    diagnostics: list(raw.diagnostics),
  });
}

export function loadStructuredFlow(input: string, reference: string, format: 'yaml' | 'json'): FlowIR {
  const raw = format === 'json' ? JSON.parse(input) as Record<string, unknown> : parseSimpleYaml(input, reference);
  return normalize(raw, format, reference);
}
