export interface McpToolDescription {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpClient {
  listTools(): Promise<McpToolDescription[]>;
  callTool<T>(name: string, input: Record<string, unknown>): Promise<T>;
}
