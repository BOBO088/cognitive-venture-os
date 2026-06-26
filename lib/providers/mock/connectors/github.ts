/**
 * Mock GitHubConnector — 确定性占位实现。
 */

import type {
  GitHubConnector,
  GitHubRepoSummary,
  GitHubIssueSummary,
  GitHubReadme,
} from '../../connectors/github';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

function reposFor(org: string): GitHubRepoSummary[] {
  return [
    {
      id: `mock-repo-${org}-1`,
      name: 'web',
      fullName: `${org}/web`,
      defaultBranch: 'main',
      stars: 142,
      description: `[mock] ${org} web app`,
      htmlUrl: `https://github.com/${org}/web`,
    },
    {
      id: `mock-repo-${org}-2`,
      name: 'docs',
      fullName: `${org}/docs`,
      defaultBranch: 'main',
      stars: 23,
      description: `[mock] ${org} public docs`,
      htmlUrl: `https://github.com/${org}/docs`,
    },
  ];
}

function issuesFor(repo: string, state: 'open' | 'closed' | 'all' = 'open'): GitHubIssueSummary[] {
  const all: GitHubIssueSummary[] = [
    {
      id: `mock-issue-${repo}-1`,
      number: 12,
      title: '[mock] Onboarding flow drops users at step 3',
      state: 'open',
      htmlUrl: `https://github.com/${repo}/issues/12`,
      authorLogin: 'mima-dev',
      createdAt: '2026-06-10T00:00:00.000Z',
      labels: ['ux', 'priority/high'],
    },
    {
      id: `mock-issue-${repo}-2`,
      number: 9,
      title: '[mock] Migrate billing to new pricing engine',
      state: 'open',
      htmlUrl: `https://github.com/${repo}/issues/9`,
      authorLogin: 'finance-bot',
      createdAt: '2026-05-28T00:00:00.000Z',
      labels: ['billing'],
    },
    {
      id: `mock-issue-${repo}-3`,
      number: 4,
      title: '[mock] Old: improve test coverage',
      state: 'closed',
      htmlUrl: `https://github.com/${repo}/issues/4`,
      authorLogin: 'qa-eng',
      createdAt: '2026-04-01T00:00:00.000Z',
      labels: ['test'],
    },
  ];
  if (state === 'all') return all;
  return all.filter((i) => i.state === state);
}

export function createMockGitHubConnector(): GitHubConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async listRepos(org: string) {
      return reposFor(org);
    },

    async listIssues(repo: string, state?: 'open' | 'closed' | 'all') {
      return issuesFor(repo, state);
    },

    async getReadme(repo: string) {
      if (repo === 'none/none') return null;
      return {
        repo,
        content: `# ${repo}\n\n[mock] Auto-generated README. Replace via real connector.`,
        sha: `mock-sha-${repo}`,
        fetchedAt: MOCK_NOW,
      } satisfies GitHubReadme;
    },
  };
}
