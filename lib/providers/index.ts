/**
 * Provider / Connector 总入口。
 *
 * 应用代码（页面 / API route / 组件）通过本文件的工厂函数获取能力：
 *   import { getLLMProvider } from '@/lib/providers';
 *   const llm = await getLLMProvider();
 *   const card = await llm.generateResearchCard(topic, ids);
 *
 * 禁止在 UI 里直接 import 'openai' / '@octokit/rest' / '@modelcontextprotocol/sdk'。
 *
 * 当前实现 = 全部 mock。接入真实 SDK 时只改工厂函数体，调用方零改动。
 */

import { createMockLLMProvider } from './mock/llm';
import { createMockResearchProvider } from './mock/research';
import { createMockGEOProvider } from './mock/geo';
import { createMockEvaluationProvider } from './mock/evaluation';
import { createMockDataSourceConnector } from './mock/connectors/data-source';
import { createMockSourceConnector } from './mock/connectors/source';
import { createMockGitHubConnector } from './mock/connectors/github';
import { createMockMCPConnector } from './mock/connectors/mcp';
import { createMockStorageProvider } from './mock/connectors/storage';
import { createMockLaunchMetricsConnector } from './mock/connectors/launch-metrics';
import { createMockCitationMonitorConnector } from './mock/connectors/citation-monitor';
import { createMockSignalSourceConnector } from './mock/connectors/signal-source';

import type { LLMProvider } from './llm';
import type { ResearchProvider } from './research';
import type { GEOProvider } from './geo';
import type { EvaluationProvider } from './evaluation';
import type { DataSourceConnector } from './connectors/data-source';
import type { SourceConnector } from './connectors/source';
import type { GitHubConnector } from './connectors/github';
import type { MCPConnector } from './connectors/mcp';
import type { StorageProvider } from './connectors/storage';
import type { LaunchMetricsConnector } from './connectors/launch-metrics';
import type { CitationMonitorConnector } from './connectors/citation-monitor';
import type { SignalSourceConnector } from './connectors/signal-source';

// ---------- Provider 工厂 ----------

let _llm: LLMProvider | null = null;
let _research: ResearchProvider | null = null;
let _geo: GEOProvider | null = null;
let _evaluation: EvaluationProvider | null = null;

export async function getLLMProvider(): Promise<LLMProvider> {
  if (!_llm) _llm = createMockLLMProvider();
  return _llm;
}

export async function getResearchProvider(): Promise<ResearchProvider> {
  if (!_research) _research = createMockResearchProvider();
  return _research;
}

export async function getGEOProvider(): Promise<GEOProvider> {
  if (!_geo) _geo = createMockGEOProvider();
  return _geo;
}

export async function getEvaluationProvider(): Promise<EvaluationProvider> {
  if (!_evaluation) _evaluation = createMockEvaluationProvider();
  return _evaluation;
}

// ---------- Connector 工厂 ----------

let _dataSource: DataSourceConnector | null = null;
let _github: GitHubConnector | null = null;
let _mcp: MCPConnector | null = null;
let _storage: StorageProvider | null = null;
let _launchMetrics: LaunchMetricsConnector | null = null;
let _citationMonitor: CitationMonitorConnector | null = null;

export async function getDataSourceConnector(): Promise<DataSourceConnector> {
  if (!_dataSource) _dataSource = createMockDataSourceConnector();
  return _dataSource;
}

let _sourceConn: SourceConnector | null = null;

export async function getSourceConnector(): Promise<SourceConnector> {
  if (!_sourceConn) _sourceConn = createMockSourceConnector();
  return _sourceConn;
}

export async function getGitHubConnector(): Promise<GitHubConnector> {
  if (!_github) _github = createMockGitHubConnector();
  return _github;
}

export async function getMCPConnector(): Promise<MCPConnector> {
  if (!_mcp) _mcp = createMockMCPConnector();
  return _mcp;
}

export async function getStorageProvider(): Promise<StorageProvider> {
  if (!_storage) _storage = createMockStorageProvider();
  return _storage;
}

export async function getLaunchMetricsConnector(): Promise<LaunchMetricsConnector> {
  if (!_launchMetrics) _launchMetrics = createMockLaunchMetricsConnector();
  return _launchMetrics;
}

export async function getCitationMonitorConnector(): Promise<CitationMonitorConnector> {
  if (!_citationMonitor) _citationMonitor = createMockCitationMonitorConnector();
  return _citationMonitor;
}

let _signalSource: SignalSourceConnector | null = null;

export async function getSignalSourceConnector(): Promise<SignalSourceConnector> {
  if (!_signalSource) _signalSource = createMockSignalSourceConnector();
  return _signalSource;
}


// ---------- 聚合 health 入口（供 dashboard SystemStatus 使用） ----------

export interface ProviderHealth {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function getAllProvidersHealth(): Promise<ProviderHealth[]> {
  const [
    llm,
    research,
    geo,
    ev,
    ds,
    sourceConn,
    gh,
    mcp,
    storage,
    launchMetrics,
    citationMonitor,
    signalSource,
  ] = await Promise.all([
    getLLMProvider(),
    getResearchProvider(),
    getGEOProvider(),
    getEvaluationProvider(),
    getDataSourceConnector(),
    getSourceConnector(),
    getGitHubConnector(),
    getMCPConnector(),
    getStorageProvider(),
    getLaunchMetricsConnector(),
    getCitationMonitorConnector(),
    getSignalSourceConnector(),
  ]);
  const results = await Promise.all([
    llm.health(),
    research.health(),
    geo.health(),
    ev.health(),
    ds.health(),
    sourceConn.health(),
    gh.health(),
    mcp.health(),
    storage.health(),
    launchMetrics.health(),
    citationMonitor.health(),
    signalSource.health(),
  ]);
  const names = [
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
  ];
  return results.map((r, i) => ({ name: names[i]!, ok: r.ok, detail: r.detail }));
}
