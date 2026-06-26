/**
 * Mock LaunchMetricsConnector — 确定性占位实现。
 *
 * 接入真实 SDK（Stripe SDK / Plausible API / Mixpanel API）时只换本文件，
 * 调用方零改动。
 *
 * 数值生成规则：基于 mvpProjectId 字符串做 hash32，叠加 since 字符串得到
 * 稳定但有变化的输出，确保每次"拉数据"结果不空但又不会跑偏。
 */

import type {
  LaunchMetricsConnector,
  FetchSinceOptions,
} from '../../connectors/launch-metrics';

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 把 hash 映射到 [min, max] 区间。 */
function mapRange(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

export function createMockLaunchMetricsConnector(): LaunchMetricsConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async fetchStripeRevenue(opts: FetchSinceOptions): Promise<number> {
      // 默认 0 ~ 8000 美元；某些项目用 id 强制给个高 revenue 看效果
      const seed = hash32(`rev:${opts.mvpProjectId}:${opts.since ?? 'all'}`);
      if (opts.mvpProjectId === 'mvp_geo_pulse_paid') return 6000;
      return mapRange(seed, 0, 8000);
    },

    async fetchAnalyticsTraffic(opts: FetchSinceOptions): Promise<number> {
      const seed = hash32(`traf:${opts.mvpProjectId}:${opts.since ?? 'all'}`);
      return mapRange(seed, 100, 12000);
    },

    async fetchMixpanelRetention(opts: FetchSinceOptions): Promise<number> {
      const seed = hash32(`ret:${opts.mvpProjectId}:${opts.since ?? 'all'}`);
      return mapRange(seed, 5, 70);
    },
  };
}
