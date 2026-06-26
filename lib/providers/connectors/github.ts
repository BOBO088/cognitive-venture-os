/**
 * GitHubConnector — GitHub 接入。
 *
 * 通过 @octokit/rest 拉 repo / issue / readme 等元数据。
 * 当前为 mock 实现；接入真实 SDK 时保持方法签名不变。
 */

/** 仓库简要信息。 */
export interface GitHubRepoSummary {
  id: string;
  name: string;
  fullName: string;        // "owner/name"
  defaultBranch: string;
  stars: number;
  description?: string;
  htmlUrl: string;
}

/** Issue 简要信息。 */
export interface GitHubIssueSummary {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  authorLogin?: string;
  createdAt: string;       // ISO 8601
  labels: string[];
}

/** README 抓取结果。 */
export interface GitHubReadme {
  repo: string;            // "owner/name"
  content: string;         // 原始 markdown
  sha: string;
  fetchedAt: string;       // ISO 8601
}

export interface GitHubConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 列出 org / user 下的仓库。 */
  listRepos(org: string): Promise<GitHubRepoSummary[]>;

  /** 列出某仓库的 issues（默认 open）。 */
  listIssues(repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubIssueSummary[]>;

  /** 拉取 README 原始 markdown。 */
  getReadme(repo: string): Promise<GitHubReadme | null>;
}
