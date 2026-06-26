/**
 * Mock SearchConsoleConnector — 确定性占位实现。
 *
 * 真实接入 Google Search Console API 时只换本文件，调用方零改动。
 *
 * 数值生成规则：
 *   - 基于 siteUrl + startDate + endDate hash 派生确定性结果
 *   - 返回 3-5 行稳定的 SearchAnalyticsRow + 一条 index 状态
 */

import type {
  SearchConsoleConnector,
  FetchSearchAnalyticsInput,
  FetchSearchAnalyticsResult,
  FetchUrlInspectionInput,
  FetchUrlInspectionResult,
} from '../../connectors/search-console';

const MOCK_FETCHED_AT = '2026-06-25T00:00:00.000Z';

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function validateDate(v: string, field: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  return v;
}

function validateSiteUrl(v: string): string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error('siteUrl is required');
  }
  return v;
}

export function createMockSearchConsoleConnector(): SearchConsoleConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async fetchSearchAnalytics(
      input: FetchSearchAnalyticsInput,
    ): Promise<FetchSearchAnalyticsResult> {
      const siteUrl = validateSiteUrl(input.siteUrl);
      const startDate = validateDate(input.startDate, 'startDate');
      const endDate = validateDate(input.endDate, 'endDate');
      const seed = hash32(`${siteUrl}|${startDate}|${endDate}`);
      const rowCount = 3 + (seed % 3);
      const rows = Array.from({ length: rowCount }, (_, i) => {
        const clicks = 50 + ((seed + i * 7) % 950);
        const impressions = clicks * (8 + ((seed + i) % 12));
        const ctr = Math.round((clicks / impressions) * 1000) / 1000;
        const position = Math.round((1 + ((seed + i * 3) % 18)) * 10) / 10;
        return {
          query: `geo platform ${i + 1}`,
          page: `${siteUrl}geo/${i + 1}`,
          clicks,
          impressions,
          ctr,
          position,
        };
      });
      return {
        siteUrl,
        startDate,
        endDate,
        rows,
        fetchedAt: MOCK_FETCHED_AT,
      };
    },

    async fetchUrlInspection(
      input: FetchUrlInspectionInput,
    ): Promise<FetchUrlInspectionResult> {
      const siteUrl = validateSiteUrl(input.siteUrl);
      const inspectionUrl = input.inspectionUrl;
      if (typeof inspectionUrl !== 'string' || inspectionUrl.length === 0) {
        throw new Error('inspectionUrl is required');
      }
      const seed = hash32(`${siteUrl}|${inspectionUrl}`);
      const status: FetchUrlInspectionResult['indexStatus'] =
        seed % 4 === 0 ? 'not_indexed' : 'indexed';
      return {
        inspectionUrl,
        siteUrl,
        indexStatus: status,
        mobileUsable: seed % 5 !== 0,
        ...(status === 'indexed'
          ? { lastCrawledAt: '2026-06-20T08:30:00.000Z' }
          : {}),
        fetchedAt: MOCK_FETCHED_AT,
      };
    },
  };
}
