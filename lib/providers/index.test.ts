/**
 * Provider/Connector factory + health aggregator smoke test。
 *
 * 锁定契约：4 个 provider + 8 个 connector = 12 个 factory 必须全部可用。
 * 任何工厂漏挂载或 health 聚合遗漏都会让这个测试 fail。
 */
import { describe, it, expect } from 'vitest';
import {
  getLLMProvider,
  getResearchProvider,
  getGEOProvider,
  getEvaluationProvider,
  getDataSourceConnector,
  getSourceConnector,
  getGitHubConnector,
  getMCPConnector,
  getStorageProvider,
  getLaunchMetricsConnector,
  getCitationMonitorConnector,
  getSignalSourceConnector,
  getAllProvidersHealth,
} from './index';

describe('provider/connector factories', () => {
  it('returns 4 provider instances', async () => {
    expect(await getLLMProvider()).toBeDefined();
    expect(await getResearchProvider()).toBeDefined();
    expect(await getGEOProvider()).toBeDefined();
    expect(await getEvaluationProvider()).toBeDefined();
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
  });
});

describe('getAllProvidersHealth', () => {
  it('aggregates 12 entries (4 providers + 8 connectors)', async () => {
    const entries = await getAllProvidersHealth();
    expect(entries).toHaveLength(12);
    const names = entries.map((e) => e.name);
    expect(names).toEqual([
      'LLMProvider',
      'ResearchProvider',
      'GEOProvider',
      'EvaluationProvider',
      'DataSourceConnector',
      'SourceConnector',
      'GitHubConnector',
      'MCPConnector',
      'StorageProvider',
      'LaunchMetricsConnector',
      'CitationMonitorConnector',
      'SignalSourceConnector',
    ]);
  });

  it('every entry has a boolean ok flag', async () => {
    const entries = await getAllProvidersHealth();
    for (const e of entries) {
      expect(typeof e.ok).toBe('boolean');
    }
  });
});
