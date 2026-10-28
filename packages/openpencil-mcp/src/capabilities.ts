import type { McpToolDescription } from './client.ts';

export type OpenPencilCapability = 'inspect' | 'pages' | 'selection' | 'node' | 'query' | 'tokens' | 'export';

const aliases: Record<OpenPencilCapability, string[]> = {
  inspect: ['get_page_tree'],
  pages: ['get_pages', 'list_pages'],
  selection: ['get_selection'],
  node: ['get_node', 'inspect_node'],
  query: ['query_nodes', 'find_nodes', 'find'],
  tokens: ['get_variables', 'variables', 'get_design_tokens'],
  export: ['export_image', 'export_svg', 'export_pdf'],
};

export interface CapabilityReport {
  available: Record<OpenPencilCapability, string | undefined>;
  missing: OpenPencilCapability[];
}

export function discoverCapabilities(tools: McpToolDescription[]): CapabilityReport {
  const names = new Set(tools.map((tool) => tool.name));
  const available = Object.fromEntries(
    (Object.keys(aliases) as OpenPencilCapability[]).map((capability) => [
      capability,
      aliases[capability].find((name) => names.has(name)),
    ]),
  ) as Record<OpenPencilCapability, string | undefined>;
  return {
    available,
    missing: (Object.keys(available) as OpenPencilCapability[]).filter((key) => !available[key]),
  };
}
