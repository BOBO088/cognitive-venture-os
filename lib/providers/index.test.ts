/**
 * Provider/Connector factory + health aggregator smoke test。
 *
 * 锁定契约：4 个 provider + 10 个 connector = 14 个 factory 必须全部可用。
 * 任何工厂漏挂载或 health 聚合遗漏都会让这个测试 fail。
 *
 * 工厂清单（与 lib/providers/index.ts 完全同步）：
 *   Providers  : LLMProvider / ResearchProvider / GEOProvider /
 *                EvaluationProvider / AuthProvider
 *   Connectors : DataSource / Source / GitHub / MCP / Storage /
 *                LaunchMetrics / CitationMonitor / SignalSource /
 *                SearchConsole / BrowserMCP
 */
import { describe, it, expect } from 'vitest';
import {
  getLLMProvider,
  getResearchProvider,
  getGEOProvider,
  getEvaluationProvider,
  getAuthProvider,
  getDataSourceConnector,
  getSourceConnector,
  getGitHubConnector,
  getMCPConnector,
  getStorageProvider,
  getLaunchMetricsConnector,
  getCitationMonitorConnector,
  getSignalSourceConnector,
  getSearchConsoleConnector,
  getBrowserMCPConnector,
  getAllProvidersHealth,
} from './index';

describe('provider/connector factories', () => {
  it('returns 5 provider instances (LLM/Research/GEO/Evaluation/Auth)', async () => {
    expect(await getLLMProvider()).toBeDefined();
    expect(await getResearchProvider()).toBeDefined();
    expect(await getGEOProvider()).toBeDefined();
    expect(await getEvaluationProvider()).toBeDefined();
    expect(await getAuthProvider()).toBeDefined();
  });

  it('AuthProvider has health() returning ok:true (mock mode in test)', async () => {
    const auth = await getAuthProvider();
    const h = await auth.health();
    expect(h.ok).toBe(true);
    expect(h.detail).toBeTruthy();
  });

  it('returns 8 connector instances (含 SourceConnector 与 SignalSourceConnector)', async () => {
    expect(await getDataSourceConnector()).toBeDefined();
    expect(await getSourceConnector()).toBeDefined();
    expect(await getGitHubConnector()).toBeDefined();
    expect(await getMCPConnector()).toBeDefined();
    expect(await getStorageProvider()).toBeDefined();
    expect(await getLaunchMetricsConnector()).toBeDefined();
    expect(await getCitationMonitorConnector()).toBeDefined();
    expect(await getSignalSourceConnector()).toBeDefined();
    expect(await getSearchConsoleConnector()).toBeDefined();
    expect(await getBrowserMCPConnector()).toBeDefined();
  });
});

describe('getAllProvidersHealth', () => {
  it('aggregates 15 entries (5 providers + 10 connectors)', async () => {
    const entries = await getAllProvidersHealth();
    expect(entries).toHaveLength(15);
    const names = entries.map((e) => e.name);
    expect(names).toEqual([
      'LLMProvider',
      'ResearchProvider',
      'GEOProvider',
      'EvaluationProvider',
      'AuthProvider',
      'DataSourceConnector',
      'SourceConnector',
      'GitHubConnector',
      'MCPConnector',
      'StorageProvider',
      'LaunchMetricsConnector',
      'CitationMonitorConnector',
      'SignalSourceConnector',
      'SearchConsoleConnector',
      'BrowserMCPConnector',
    ]);
  });

  it('every entry has a boolean ok flag', async () => {
    const entries = await getAllProvidersHealth();
    for (const e of entries) {
      expect(typeof e.ok).toBe('boolean');
    }
  });
});
