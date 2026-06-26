/**
 * MCPConnector — Model Context Protocol 工具接入。
 *
 * 通过 @modelcontextprotocol/sdk 列出可用的 server / tool，并发起 tool call。
 * 任何 "调外部 tool" 的能力必须走本接口。
 */

/** MCP server 简述。 */
export interface MCPServerSummary {
  name: string;
  status: 'connected' | 'degraded' | 'disconnected';
  toolCount: number;
  transport?: 'stdio' | 'http' | 'websocket';
}

/** 工具描述。 */
export interface MCPToolSummary {
  name: string;
  description: string;
  /** 简化的 JSON schema 字符串，避免直接依赖 SDK 类型。 */
  inputSchemaJson: string;
}

/** tool call 的结果（透传 SDK 返回值，限定可序列化）。 */
export interface MCPCallResult {
  server: string;
  tool: string;
  content: unknown;
  isError: boolean;
  /** mock 实现用字面量；真实 SDK 透传。 */
  calledAt: string;
}

export interface MCPConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 列出所有已配置的 server。 */
  listServers(): Promise<MCPServerSummary[]>;

  /** 列出某 server 的可用工具。 */
  listTools(server: string): Promise<MCPToolSummary[]>;

  /** 发起一次 tool call。失败时把 isError 置 true 而非抛错，便于上层聚合。 */
  callTool(
    server: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<MCPCallResult>;
}
