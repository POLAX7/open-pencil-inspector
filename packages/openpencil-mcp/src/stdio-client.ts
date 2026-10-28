import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { McpClient, McpToolDescription } from './client.ts';

interface JsonRpcResponse {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
}

export interface StdioMcpClientOptions {
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  discoveryFile?: string;
}

export async function resolveOpenPencilMcpEnvironment(base: NodeJS.ProcessEnv = process.env, discoveryFile = join(homedir(), 'Library/Application Support/OpenPencil/mcp.json')): Promise<NodeJS.ProcessEnv> {
  if (base.OPENPENCIL_MCP_AUTH_TOKEN) return { ...base };
  try {
    const discovery = JSON.parse(await readFile(discoveryFile, 'utf8')) as { authToken?: unknown };
    return typeof discovery.authToken === 'string' ? { ...base, OPENPENCIL_MCP_AUTH_TOKEN: discovery.authToken } : { ...base };
  } catch {
    return { ...base };
  }
}

export function parseToolResult<T>(result: Record<string, unknown>): T {
  if ('structuredContent' in result && result.structuredContent !== undefined) {
    return result.structuredContent as T;
  }

  const content = Array.isArray(result.content) ? result.content : [];
  const text = content.find((item) => {
    return typeof item === 'object' && item !== null && (item as { type?: unknown }).type === 'text';
  }) as { text?: unknown } | undefined;
  if (typeof text?.text === 'string') {
    try {
      return JSON.parse(text.text) as T;
    } catch {
      return text.text as T;
    }
  }
  return result as T;
}

export class OpenPencilStdioMcpClient implements McpClient {
  private readonly command: string;
  private readonly args: string[];
  private readonly env?: NodeJS.ProcessEnv;
  private readonly cwd?: string;
  private readonly discoveryFile?: string;
  private process: ReturnType<typeof spawn> | undefined;
  private lines: ReturnType<typeof createInterface> | undefined;
  private stderrOutput = '';
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>();

  constructor(options: StdioMcpClientOptions = {}) {
    this.command = options.command ?? 'openpencil-mcp';
    this.args = options.args ?? [];
    this.env = options.env;
    this.cwd = options.cwd;
    this.discoveryFile = options.discoveryFile;
  }

  async start(): Promise<void> {
    if (this.process) return;
    const environment = await resolveOpenPencilMcpEnvironment(this.env ? { ...process.env, ...this.env } : process.env, this.discoveryFile);
    this.stderrOutput = '';
    this.process = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.lines = createInterface({ input: this.process.stdout });
    this.lines.on('line', (line) => this.handleLine(line));
    this.process.stderr.on('data', (chunk) => { this.stderrOutput += String(chunk); });
    this.process.on('error', (error) => this.rejectPending(error));
    this.process.on('exit', (code, signal) => {
      const detail = this.stderrOutput.trim();
      this.rejectPending(new Error(`OpenPencil MCP exited (${code ?? 'null'}${signal ? `, ${signal}` : ''})${detail ? `: ${detail}` : ''}`));
      this.process = undefined;
      this.lines = undefined;
    });

    await this.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'open-pencil-inspector', version: '0.1.0' },
    });
    this.notify('notifications/initialized', {});
  }

  async listTools(): Promise<McpToolDescription[]> {
    await this.start();
    const result = await this.request('tools/list', {});
    return Array.isArray(result.tools) ? result.tools as McpToolDescription[] : [];
  }

  async callTool<T>(name: string, input: Record<string, unknown>): Promise<T> {
    await this.start();
    return parseToolResult<T>(await this.request('tools/call', { name, arguments: input }));
  }

  async close(): Promise<void> {
    this.lines?.close();
    this.process?.kill();
    this.lines = undefined;
    this.process = undefined;
    this.rejectPending(new Error('OpenPencil MCP client closed'));
  }

  private request(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const stdin = this.process?.stdin;
      if (!stdin) {
        this.pending.delete(id);
        reject(new Error('OpenPencil MCP process is not running'));
        return;
      }
      stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.process?.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    let message: JsonRpcResponse;
    try {
      message = JSON.parse(line) as JsonRpcResponse;
    } catch {
      return;
    }
    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message ?? 'OpenPencil MCP request failed'));
    else pending.resolve(message.result ?? {});
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
