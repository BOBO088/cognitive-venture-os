/**
 * LaunchMetricsConnector — 上线指标外部接入。
 *
 * 把"上线后从外部系统拉指标"这件事收口到本接口：
 *   - Stripe    → revenue
 *   - Plausible / GA4 / PostHog → traffic
 *   - Mixpanel / Amplitude → retention
 *   - 内部 DB / auth service → signups
 *
 * 当前为 mock 实现；接入真实 SDK 时保持方法签名不变。
 *
 * 设计取舍：每个 fetch 方法只返回一个标量，不返回整个 LaunchResult —
 * service 层负责把多个数据源拼装成一条 LaunchResult，并写入仓储。
 * 这样做的好处：
 *   1. 不同指标可以来自不同 connector（更解耦）
 *   2. 任何一个 connector 失败不会让整条数据丢失
 *   3. service 端可以做数据 freshness 标记（"rev: 2h old"）
 */

export interface FetchSinceOptions {
  /** MVPProject.id，限定数据范围。 */
  mvpProjectId: string;
  /** 起始时间（ISO 8601 datetime），可选；不传则取"最近一次 launch 之后"。 */
  since?: string;
}

export interface LaunchMetricsConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 拉取自 since 以来的累计收入（货币单位：US cents 或元，自行定义）。 */
  fetchStripeRevenue(opts: FetchSinceOptions): Promise<number>;

  /** 拉取自 since 以来的总流量（PV / sessions，自行定义）。 */
  fetchAnalyticsTraffic(opts: FetchSinceOptions): Promise<number>;

  /** 拉取自 since 以来的 7 日留存率（0-100）。 */
  fetchMixpanelRetention(opts: FetchSinceOptions): Promise<number>;
}
