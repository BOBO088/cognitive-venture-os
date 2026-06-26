/**
 * Mock 实现汇总：4 个 provider mock + 5 个 connector mock。
 *
 * 切真实 SDK 时只换 factory 函数体，调用方零改动。
 */

export { createMockLLMProvider } from './llm';
export { createMockResearchProvider } from './research';
export { createMockGEOProvider } from './geo';
export { createMockEvaluationProvider } from './evaluation';

export { createMockDataSourceConnector } from './connectors/data-source';
export { createMockSourceConnector } from './connectors/source';
export { createMockGitHubConnector } from './connectors/github';
export { createMockMCPConnector } from './connectors/mcp';
export {
  createMockStorageProvider,
  __resetMockStorage,
} from './connectors/storage';
export { createMockLaunchMetricsConnector } from './connectors/launch-metrics';
