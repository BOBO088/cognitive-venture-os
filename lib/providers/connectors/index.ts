/**
 * Connector 接口汇总。
 * 应用代码从 '@\/lib/providers' 引入具体实现，不要直接 import 此处。
 */

export type { DataSourceConnector, NormalizedBundle } from './data-source';
export type {
  GitHubConnector,
  GitHubRepoSummary,
  GitHubIssueSummary,
  GitHubReadme,
} from './github';
export type {
  MCPConnector,
  MCPServerSummary,
  MCPToolSummary,
  MCPCallResult,
} from './mcp';
export type {
  StorageProvider,
  ListOptions,
  ListResult,
} from './storage';
export type {
  LaunchMetricsConnector,
  FetchSinceOptions,
} from './launch-metrics';
export type {
  CitationMonitorConnector,
  RunCitationCheckInput,
  ConnectorCitationDraft,
} from './citation-monitor';
