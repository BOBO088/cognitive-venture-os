/**
 * Mock SourceConnector — 确定性占位实现。
 *
 * 未来真实实现接入时只换 createMockSourceConnector → createRealSourceConnector，
 * 调用方零改动。
 */

import type { SourceConnector, SourceDraft } from '../../connectors/source';

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return 'unknown';
  }
}

function guessTypeFromUrl(url: string): SourceDraft['type'] {
  const lower = url.toLowerCase();
  if (lower.includes('arxiv.org') || lower.includes('doi.org')) return 'paper';
  if (lower.includes('youtube.com') || lower.includes('vimeo.com')) return 'video';
  if (lower.includes('spotify.com') || lower.includes('podcasts.apple.com')) return 'podcast';
  if (lower.endsWith('.pdf')) return 'paper';
  if (lower.includes('blog') || lower.includes('/article') || lower.includes('medium.com')) return 'article';
  if (lower.includes('mckinsey') || lower.includes('/reports/') || lower.includes('/research/')) return 'report';
  return 'website';
}

export function createMockSourceConnector(): SourceConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async fetchFromUrl(url: string) {
      const domain = extractDomain(url);
      const type = guessTypeFromUrl(url);
      return {
        title: `[mock] ${domain} — auto-extracted title`,
        url,
        type,
        summary: `[mock] Auto-extracted summary from ${url}. Replace via real connector (Browser MCP / Playwright / cheerio).`,
        suggestedTags: [domain.split('.').slice(-2, -1)[0] ?? 'unknown'],
        suggestedCredibilityScore: 65,
      } satisfies SourceDraft;
    },

    async fetchFromUpload(file: { name: string; content: string }) {
      const firstLine = file.content.split('\n').find((l) => l.trim().length > 0) ?? '';
      return {
        title: file.name.replace(/\.[^.]+$/, ''),
        type: 'note',
        summary: firstLine.slice(0, 200),
        author: 'uploaded',
        publishedAt: '2026-06-25T00:00:00.000Z',
        suggestedTags: ['upload'],
        suggestedCredibilityScore: 50,
      } satisfies SourceDraft;
    },

    async fetchRssFeed(feedUrl: string) {
      return [0, 1, 2].map((i) => ({
        title: `[mock rss] Entry ${i + 1} from ${feedUrl}`,
        url: `${feedUrl}#entry-${i + 1}`,
        type: 'article',
        summary: `[mock] RSS entry ${i + 1} summary.`,
        publishedAt: '2026-06-20T00:00:00.000Z',
        suggestedTags: ['rss', 'feed'],
        suggestedCredibilityScore: 60,
      })) satisfies SourceDraft[];
    },
  };
}
