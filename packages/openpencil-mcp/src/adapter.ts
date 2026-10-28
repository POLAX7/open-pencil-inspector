import type { DesignAsset, DesignDocument } from '../../core/src/design-ast.ts';
import { normalizeDesignDocument } from '../../core/src/design-ast.ts';
import { diagnostic, IngestionError } from '../../core/src/diagnostics.ts';
import { normalizeExternalNode } from '../../core/src/external-node.ts';
import type { McpClient } from './client.ts';
import { discoverCapabilities, type CapabilityReport } from './capabilities.ts';
import { compileConfirmedFlow, confirmEnvelope, saveDecisions } from '../../flow-confirmation/src/decisions.ts';
import { proposeFlow } from '../../flow-confirmation/src/propose.ts';
import { validateConfirmationEnvelope } from '../../flow-confirmation/src/schema.ts';
import type { ConfirmationEnvelope, ConfirmationValidationResult, FlowDecision } from '../../flow-confirmation/src/contracts.ts';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import { validateSelectionManifest, type SelectionManifest } from '../../core/src/selection-scope.ts';
import { mcpCapabilityError, mcpFailure } from './errors.ts';

export interface PageSummary {
  id: string;
  name: string;
  nodeCount: number;
}

export interface InspectRequest {
  selection?: boolean;
  nodeId?: string;
  query?: string;
  documentId?: string;
  pageId?: string;
  depth?: number;
}

export interface PageRequest { documentId?: string }
export interface SelectionRequest { source?: string; documentId?: string; pageId?: string }

export interface AssetExportRequest {
  nodeId: string;
  format: 'svg' | 'png' | 'jpg' | 'webp';
  outputPath: string;
}

export interface FlowProposalRequest {
  source: string;
  parserVersion?: string;
}

export class OpenPencilMcpAdapter {
  private capabilities: CapabilityReport | undefined;
  private readonly client: McpClient;

  constructor(client: McpClient) {
    this.client = client;
  }

  async getCapabilities(): Promise<CapabilityReport> {
    if (!this.capabilities) this.capabilities = discoverCapabilities(await this.client.listTools());
    return this.capabilities;
  }

  async getPages(request: PageRequest = {}): Promise<PageSummary[]> {
    const capabilities = await this.getCapabilities();
    const tool = capabilities.available.pages;
    if (!tool) throw mcpCapabilityError('pages');
    let raw: Record<string, unknown>;
    try {
      raw = await this.client.callTool<Record<string, unknown>>(tool, request.documentId ? { document_id: request.documentId } : {});
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      throw mcpFailure('OPENPENCIL_MCP_PAGES_FAILURE', error instanceof Error ? error.message : String(error), 'pages', tool, error);
    }
    const pages = Array.isArray(raw.pages) ? raw.pages : Array.isArray(raw) ? raw : [];
    return pages.map((page, index) => {
      if (!page || typeof page !== 'object') throw new TypeError(`OpenPencil MCP page at index ${index} must be an object`);
      const value = page as { id?: unknown; name?: unknown; nodes?: unknown; nodeCount?: unknown };
      if (typeof value.id !== 'string' || typeof value.name !== 'string') throw new TypeError(`OpenPencil MCP page at index ${index} is missing id or name`);
      return { id: value.id, name: value.name, nodeCount: typeof value.nodeCount === 'number' ? value.nodeCount : typeof value.nodes === 'number' ? value.nodes : 0 };
    });
  }

  async getSelection(request: SelectionRequest = {}): Promise<SelectionManifest> {
    const capabilities = await this.getCapabilities();
    const tool = capabilities.available.selection;
    if (!tool) throw mcpCapabilityError('selection');
    let raw: Record<string, unknown>;
    try {
      raw = await this.client.callTool<Record<string, unknown>>(tool, {
      ...(request.documentId ? { document_id: request.documentId } : {}),
      ...(request.pageId ? { page_id: request.pageId } : {}),
      });
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      throw mcpFailure('OPENPENCIL_MCP_SELECTION_FAILURE', error instanceof Error ? error.message : String(error), 'selection', tool, error);
    }
    const rawPageId = raw.page_id ?? raw.pageId ?? request.pageId;
    const rawPageName = raw.page_name ?? raw.pageName ?? raw.page;
    const rawRoots = Array.isArray(raw.children) ? raw.children : Array.isArray(raw.nodes) ? raw.nodes : [];
    const manifest = {
      version: '1.0' as const,
      source: request.source ?? request.documentId ?? 'open-pencil-selection',
      page: { id: rawPageId, name: rawPageName },
      rootNodes: rawRoots.map((root) => {
        const value = root as { id?: unknown; name?: unknown; type?: unknown };
        return { id: value.id, name: value.name ?? value.id, type: value.type ?? 'UNKNOWN' };
      }),
      scope: 'selected-subtree' as const,
    };
    try {
      return validateSelectionManifest(manifest);
    } catch (error) {
      throw mcpFailure('OPENPENCIL_MCP_SELECTION_INVALID', error instanceof Error ? error.message : String(error), 'selection', tool, error);
    }
  }

  async inspectSelection(selection: SelectionManifest): Promise<DesignDocument> {
    const normalized = validateSelectionManifest(selection);
    if (normalized.scope === 'page') return this.inspect({ pageId: normalized.page.id });
    const documents = await Promise.all(normalized.rootNodes.map((root) => this.inspect({ nodeId: root.id, pageId: normalized.page.id })));
    return normalizeDesignDocument({
      id: normalized.source, name: normalized.page.name,
      nodes: documents.flatMap((document) => document.nodes), tokens: documents.flatMap((document) => document.tokens),
      assets: documents.flatMap((document) => document.assets), diagnostics: documents.flatMap((document) => document.diagnostics),
      provenance: documents.flatMap((document) => document.provenance),
    });
  }

  async inspect(request: InspectRequest = {}): Promise<DesignDocument> {
    const capabilities = await this.getCapabilities();
    const capability = request.selection ? 'selection' : request.query ? 'query' : request.nodeId ? 'node' : 'inspect';
    const tool = capabilities.available[capability];
    if (!tool) {
      throw new IngestionError(diagnostic('OPENPENCIL_MCP_CAPABILITY', 'error', `OpenPencil MCP capability is unavailable: ${capability}`, {
        path: capability,
        provenance: [{ source: 'open-pencil-mcp', reference: 'capabilities' }],
      }));
    }
    const scope = {
      ...(request.documentId ? { document_id: request.documentId } : {}),
      ...(request.pageId ? { page_id: request.pageId } : {}),
    };
    const input = request.selection
      ? { ...scope, ...(request.depth === undefined ? {} : { depth: request.depth }) }
      : request.query
      ? { selector: request.query, ...scope }
      : request.nodeId
        ? { id: request.nodeId, ...scope, ...(request.depth === undefined ? {} : { depth: request.depth }) }
        : { ...scope, depth: request.depth ?? 1 };
    let raw: Record<string, unknown>;
    try {
      raw = await this.client.callTool<Record<string, unknown>>(tool, input);
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new IngestionError(diagnostic('OPENPENCIL_MCP_FAILURE', 'error', message, {
        path: capability,
        provenance: [{ source: 'open-pencil-mcp', reference: tool }],
      }), { cause: error });
    }
    const nodes = raw.id
      ? [raw]
      : Array.isArray(raw.nodes)
        ? raw.nodes
        : Array.isArray(raw.children)
          ? raw.children
          : [];
    const provenance = [{ source: 'open-pencil-mcp' as const, reference: tool }];
    const normalized = nodes.map((node) => normalizeExternalNode(node, provenance));
    return normalizeDesignDocument({
      id: typeof raw.id === 'string' ? raw.id : 'live-document',
      name: typeof raw.name === 'string' ? raw.name : typeof raw.page === 'string' ? raw.page : 'OpenPencil document',
      nodes: normalized.map((result) => result.node),
      tokens: Array.isArray(raw.tokens) ? raw.tokens : [],
      assets: Array.isArray(raw.assets) ? raw.assets : [],
      diagnostics: normalized.flatMap((result) => result.diagnostics),
      provenance,
    });
  }

  async exportAsset(request: AssetExportRequest): Promise<DesignAsset> {
    const capabilities = await this.getCapabilities();
    const tool = capabilities.available.export;
    if (!tool) throw mcpCapabilityError('export');
    let raw: Record<string, unknown>;
    try {
      raw = await this.client.callTool<Record<string, unknown>>(tool, request);
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new IngestionError(diagnostic('OPENPENCIL_MCP_EXPORT_FAILURE', 'error', message, {
        path: request.nodeId,
        provenance: [{ source: 'open-pencil-mcp', reference: tool }],
      }), { cause: error });
    }
    return {
      id: typeof raw.id === 'string' ? raw.id : request.nodeId,
      name: typeof raw.name === 'string' ? raw.name : request.nodeId,
      kind: request.format,
      path: typeof raw.path === 'string' ? raw.path : request.outputPath,
      sourceNodeId: request.nodeId,
      provenance: [{ source: 'open-pencil-mcp', reference: tool }],
    };
  }

  /**
   * Local confirmation workflow. These methods are deliberately implemented
   * beside the read/export bridge; they never call an official Pencil MCP
   * mutation tool and only transform the normalized document locally.
   */
  proposeFlow(document: DesignDocument, request: FlowProposalRequest): ConfirmationEnvelope {
    return proposeFlow(document, request.source, request.parserVersion ?? 'open-pencil-mcp@0.16.0');
  }

  saveFlowDecisions(candidate: ConfirmationEnvelope, decisions: FlowDecision[]): ConfirmationEnvelope {
    return saveDecisions(candidate, decisions);
  }

  validateFlow(envelope: ConfirmationEnvelope): ConfirmationValidationResult {
    return validateConfirmationEnvelope(envelope);
  }

  confirmFlow(envelope: ConfirmationEnvelope): ConfirmationEnvelope {
    return confirmEnvelope(envelope);
  }

  compileConfirmedFlow(envelope: ConfirmationEnvelope): FlowIR {
    return compileConfirmedFlow(envelope);
  }
}
