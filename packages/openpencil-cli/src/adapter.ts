import type { DesignDocument, DesignAsset } from '../../core/src/design-ast.ts';
import { normalizeDesignDocument } from '../../core/src/design-ast.ts';
import { diagnostic, IngestionError, type SourceProvenance } from '../../core/src/diagnostics.ts';
import { normalizeExternalNode } from '../../core/src/external-node.ts';
import { OpenPencilCliClient } from './client.ts';

export interface InspectOptions {
  page?: string;
  pageId?: string;
  nodeId?: string;
  rootNodeIds?: string[];
  depth?: number;
  hydrate?: boolean;
  hydrateDepth?: number;
  hydrateRootCount?: number;
  hydrateStrategy?: 'nodes' | 'tree';
}

export interface PageSummary {
  id: string;
  name: string;
  nodeCount: number;
}

export interface AssetExportRequest {
  nodeId: string;
  format: 'svg' | 'png' | 'jpg' | 'webp';
  outputPath: string;
}

interface RawDocument {
  id?: string;
  name?: string;
  nodes?: unknown[];
  tokens?: unknown[];
  assets?: unknown[];
  type?: string;
}

function normalizeCliPayload(raw: unknown, filePath: string): RawDocument {
  const nodes = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as RawDocument).nodes)
      ? (raw as RawDocument).nodes
      : raw && typeof raw === 'object' && typeof (raw as RawDocument).id === 'string'
        ? [raw]
        : [];
  const document = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as RawDocument : {};
  return {
    id: document.id ?? filePath,
    name: document.name ?? filePath,
    nodes: nodes.map((node) => {
      if (!node || typeof node !== 'object') return node;
      const value = node as Record<string, unknown>;
      return { ...value, children: Array.isArray(value.children) ? value.children : [] };
    }),
    tokens: document.tokens ?? [],
    assets: document.assets ?? [],
  };
}

function provenance(reference: string): SourceProvenance[] {
  return [{ source: 'open-pencil-cli', reference }];
}

function findRawNode(nodes: unknown[], nodeId: string): unknown | undefined {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const value = node as Record<string, unknown>;
    if (value.id === nodeId) return value;
    if (Array.isArray(value.children)) {
      const child = findRawNode(value.children, nodeId);
      if (child) return child;
    }
  }
  return undefined;
}

function isAssetCandidate(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const value = node as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  return value.type === 'IMAGE'
    || /^image(?:\s|$)/i.test(name)
    || (value.type === 'VECTOR' && name.toLowerCase() === 'bg')
    || value.type === 'ROUNDED_RECTANGLE'
    || /^Rectangle 5$/i.test(name);
}

async function hydrateAssetDetails(
  client: OpenPencilCliClient,
  filePath: string,
  node: unknown,
  pageArgs: string[],
): Promise<unknown> {
  if (!node || typeof node !== 'object') return node;
  const value = node as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id : undefined;
  const detail = id && isAssetCandidate(value)
    ? await client.runJson<Record<string, unknown>>(['node', filePath, '--id', id, ...pageArgs])
    : undefined;
  const children = Array.isArray(value.children)
    ? await Promise.all(value.children.map((child) => hydrateAssetDetails(client, filePath, child, pageArgs)))
    : [];
  return { ...value, ...(detail ?? {}), children };
}

export class OpenPencilCliAdapter {
  private readonly client: OpenPencilCliClient;

  constructor(client: OpenPencilCliClient) {
    this.client = client;
  }

  async listPages(filePath: string): Promise<PageSummary[]> {
    const raw = await this.client.runJson<unknown>(['pages', filePath]);
    if (!Array.isArray(raw)) throw new TypeError(`OpenPencil pages response must be an array for ${filePath}`);
    const info = await this.client.runJson<unknown>(['info', filePath]);
    const pageCounts = info && typeof info === 'object' && !Array.isArray(info)
      && 'pageCounts' in info && info.pageCounts && typeof info.pageCounts === 'object' && !Array.isArray(info.pageCounts)
      ? info.pageCounts as Record<string, unknown>
      : {};
    return raw.map((page, index) => {
      if (!page || typeof page !== 'object') throw new TypeError(`OpenPencil page at index ${index} must be an object`);
      const value = page as { id?: unknown; name?: unknown; nodes?: unknown };
      if (typeof value.id !== 'string' || typeof value.name !== 'string') {
        throw new TypeError(`OpenPencil page at index ${index} is missing id or name`);
      }
      const reportedCount = typeof value.nodes === 'number' ? value.nodes : 0;
      const infoCount = pageCounts[value.name];
      return { id: value.id, name: value.name, nodeCount: reportedCount || (typeof infoCount === 'number' ? infoCount : 0) };
    });
  }

  async inspect(filePath: string, options: InspectOptions = {}): Promise<DesignDocument> {
    try {
      return await this.inspectInternal(filePath, options);
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new IngestionError(diagnostic('OPENPENCIL_CLI_FAILURE', 'error', message, { path: filePath, provenance: provenance(filePath) }), { cause: error });
    }
  }

  private async inspectInternal(filePath: string, options: InspectOptions = {}): Promise<DesignDocument> {
    if (options.rootNodeIds !== undefined) {
      if (options.rootNodeIds.length === 0) throw new TypeError('rootNodeIds must contain at least one node');
      if (options.nodeId !== undefined) throw new TypeError('nodeId and rootNodeIds cannot be used together');
      const documents: DesignDocument[] = [];
      for (const nodeId of options.rootNodeIds) {
        documents.push(await this.inspectInternal(filePath, { ...options, rootNodeIds: undefined, nodeId }));
      }
      return {
        id: filePath,
        name: filePath,
        nodes: documents.flatMap((document) => document.nodes),
        tokens: documents.flatMap((document) => document.tokens),
        assets: documents.flatMap((document) => document.assets),
        diagnostics: documents.flatMap((document) => document.diagnostics),
        provenance: provenance(filePath),
      };
    }
    const hydrateSelectedNode = Boolean(options.nodeId && options.hydrate && (options.hydrateStrategy === 'tree' || options.hydrateStrategy === 'nodes'));
    const args = hydrateSelectedNode
      ? ['tree', filePath, '--depth', String(options.depth ?? options.hydrateDepth ?? 1)]
      : options.nodeId ? ['node', filePath, '--id', options.nodeId] : ['tree', filePath];
    if (options.page !== undefined) args.push('--page', options.page);
    if (options.pageId !== undefined) args.push('--page-id', options.pageId);
    if (!hydrateSelectedNode && !options.nodeId && (options.depth !== undefined || (options.hydrate && options.hydrateStrategy === 'tree'))) {
      args.push('--depth', String(options.depth ?? options.hydrateDepth ?? 1));
    }
    const rawPayload = await this.client.runJson<unknown>(args);
    if (hydrateSelectedNode) {
      const treePayload = normalizeCliPayload(rawPayload, filePath);
      const pageArgs = options.page !== undefined
        ? ['--page', options.page]
        : options.pageId !== undefined
          ? ['--page-id', options.pageId]
          : [];
      const hydratedTreeNodes = options.hydrateStrategy === 'tree'
        ? await Promise.all((treePayload.nodes ?? []).map((node) => (
          hydrateAssetDetails(this.client, filePath, node, pageArgs)
        )))
        : treePayload.nodes ?? [];
      let selected = findRawNode(hydratedTreeNodes, options.nodeId!);
      if (!selected) throw new TypeError(`Selected node was not found in hydrated tree: ${options.nodeId}`);
      if (options.hydrateStrategy === 'nodes') {
        const hydrateSelected = async (rawNode: unknown, level: number): Promise<unknown> => {
          if (!rawNode || typeof rawNode !== 'object') return rawNode;
          const value = rawNode as Record<string, unknown>;
          const id = typeof value.id === 'string' ? value.id : undefined;
          if (!id || level > (options.hydrateDepth ?? 1)) return rawNode;
          const detail = await this.client.runJson<Record<string, unknown>>(['node', filePath, '--id', id, ...pageArgs]);
          const children = Array.isArray(value.children)
            ? await Promise.all(value.children.map((child) => hydrateSelected(child, level + 1)))
            : [];
          return { ...value, ...detail, children };
        };
        selected = await hydrateSelected(selected, 0);
      }
      const normalized = normalizeExternalNode(selected, provenance(filePath));
      return normalizeDesignDocument({
        id: treePayload.id ?? filePath,
        name: treePayload.name ?? filePath,
        nodes: [normalized.node],
        tokens: treePayload.tokens ?? [],
        assets: treePayload.assets ?? [],
        diagnostics: normalized.diagnostics,
        provenance: provenance(filePath),
      });
    }
    if (!options.nodeId && options.hydrate) {
      const treePayload = normalizeCliPayload(rawPayload, filePath);
      const hydrateDepth = options.hydrateDepth ?? 1;
      if (options.hydrateStrategy === 'tree') {
        const pageArgs = options.page !== undefined
          ? ['--page', options.page]
          : options.pageId !== undefined
            ? ['--page-id', options.pageId]
            : [];
        const hydratedNodes = await Promise.all((treePayload.nodes ?? []).map((node) => (
          hydrateAssetDetails(this.client, filePath, node, pageArgs)
        )));
        const normalized = hydratedNodes.map((node) => normalizeExternalNode(node, provenance(filePath)));
        return normalizeDesignDocument({
          id: treePayload.id ?? filePath,
          name: treePayload.name ?? filePath,
          nodes: normalized.map((result) => result.node),
          tokens: treePayload.tokens ?? [],
          assets: treePayload.assets ?? [],
          diagnostics: normalized.flatMap((result) => result.diagnostics),
          provenance: provenance(filePath),
        });
      }
      const hydrateNode = async (node: unknown, level: number): Promise<unknown> => {
        if (!node || typeof node !== 'object') return node;
        if (level > hydrateDepth) return node;
        const value = node as Record<string, unknown>;
        const detail = await this.client.runJson<Record<string, unknown>>(['node', filePath, '--id', String(value.id)]);
        const children: unknown[] = [];
        if (Array.isArray(value.children)) {
          for (const child of value.children) {
            children.push(await hydrateNode(child, level + 1));
          }
        }
        return { ...value, ...detail, children };
      };
      const rootCount = options.hydrateRootCount ?? (treePayload.nodes?.length ?? 0);
      treePayload.nodes = await Promise.all((treePayload.nodes ?? []).map((node, index) => (
        index < rootCount ? hydrateNode(node, 0) : node
      )));
      const normalized = treePayload.nodes?.map((node) => normalizeExternalNode(node, provenance(filePath))) ?? [];
      return normalizeDesignDocument({
        id: treePayload.id ?? filePath,
        name: treePayload.name ?? filePath,
        nodes: normalized.map((result) => result.node),
        tokens: treePayload.tokens ?? [],
        assets: treePayload.assets ?? [],
        diagnostics: normalized.flatMap((result) => result.diagnostics),
        provenance: provenance(filePath),
      });
    }
    const raw = normalizeCliPayload(rawPayload, filePath);
    const normalized = (raw.nodes ?? []).map((node) => normalizeExternalNode(node, provenance(filePath)));
    return normalizeDesignDocument({
      id: raw.id ?? filePath,
      name: raw.name ?? filePath,
      nodes: normalized.map((result) => result.node),
      tokens: raw.tokens ?? [],
      assets: raw.assets ?? [],
      diagnostics: normalized.flatMap((result) => result.diagnostics),
      provenance: provenance(filePath),
    });
  }

  async exportAsset(filePath: string, request: AssetExportRequest): Promise<DesignAsset> {
    try {
      await this.client.run([
        'export', filePath,
        '--format', request.format,
        '--output', request.outputPath,
        '--node', request.nodeId,
      ]);
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new IngestionError(diagnostic('OPENPENCIL_CLI_EXPORT_FAILURE', 'error', message, { path: filePath, provenance: provenance(filePath) }), { cause: error });
    }
    return {
      id: request.nodeId,
      name: request.nodeId,
      kind: request.format,
      path: request.outputPath,
      sourceNodeId: request.nodeId,
      provenance: provenance(filePath),
    };
  }
}
