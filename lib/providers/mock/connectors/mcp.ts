/**
 * Mock MCPConnector — 确定性占位实现。
 */

import type {
  MCPConnector,
  MCPServerSummary,
  MCPToolSummary,
  MCPCallResult,
} from '../../connectors/mcp';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

const SERVERS: MCPServerSummary[] = [
  { name: 'filesystem', status: 'connected', toolCount: 2, transport: 'stdio' },
  { name: 'github', status: 'connected', toolCount: 3, transport: 'http' },
  { name: 'web-search', status: 'degraded', toolCount: 1, transport: 'http' },
];

const TOOLS: Record<string, MCPToolSummary[]> = {
  filesystem: [
    {
      name: 'read_file',
      description: 'Read a file from the local filesystem',
      inputSchemaJson: '{"path":{"type":"string"}}',
    },
    {
      name: 'list_dir',
      description: 'List contents of a directory',
      inputSchemaJson: '{"path":{"type":"string"}}',
    },
  ],
  github: [
    {
      name: 'create_issue',
      description: 'Open a new issue in a repository',
      inputSchemaJson: '{"repo":{"type":"string"},"title":{"type":"string"}}',
    },
    {
      name: 'list_repos',
      description: 'List repositories for an org',
      inputSchemaJson: '{"org":{"type":"string"}}',
    },
    {
      name: 'get_readme',
      description: 'Fetch a repo README',
      inputSchemaJson: '{"repo":{"type":"string"}}',
    },
  ],
  'web-search': [
    {
      name: 'search',
      description: 'Run a web search and return top results',
      inputSchemaJson: '{"query":{"type":"string"},"top_k":{"type":"number"}}',
    },
  ],
};

export function createMockMCPConnector(): MCPConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async listServers() {
      return SERVERS;
    },

    async listTools(server: string) {
      return TOOLS[server] ?? [];
    },

    async callTool(
      server: string,
      tool: string,
      args: Record<string, unknown>,
    ) {
      const known = TOOLS[server]?.some((t) => t.name === tool);
      if (!known) {
        return {
          server,
          tool,
          content: { error: 'tool not found in mock' },
          isError: true,
          calledAt: MOCK_NOW,
        } satisfies MCPCallResult;
      }
      return {
        server,
        tool,
        content: { ok: true, echoed: args },
        isError: false,
        calledAt: MOCK_NOW,
      } satisfies MCPCallResult;
    },
  };
}
