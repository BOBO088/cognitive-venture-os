/**
 * /mvp/new — 创建 MVP 项目。
 *   ?opportunityId=<id> 预选来源 opportunity
 */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { MVPForm } from '@/components/mvp/MVPForm';
import { createMVPProjectAction } from '../actions';
import { listOpportunities } from '@/lib/services/opportunityService';
import type { OpportunityStatus } from '@/types';

export const metadata = {
  title: 'New MVP project · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ opportunityId?: string }>;
}

export default async function NewMVPPage({ searchParams }: PageProps) {
  const { opportunityId } = await searchParams;
  const opps = await listOpportunities();

  // 默认按 title 字母序排，方便挑选
  const options = opps
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((o) => ({ id: o.id, title: o.title, status: o.status as OpportunityStatus }));

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/mvp" className="text-sm text-muted hover:text-text">
          ← Back to MVP pipeline
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">New MVP project</h1>
        <p className="text-sm text-muted">
          {opportunityId
            ? `Pre-filled from opportunity ${opportunityId}. Pick a stage, owner, and start date.`
            : 'Spin off an MVP from a high-score opportunity, or create one from scratch.'}
        </p>
      </div>
      <Card>
        <MVPForm
          opportunities={options}
          preselectOpportunityId={opportunityId}
          submitLabel="Create MVP project"
          formAction={createMVPProjectAction}
        />
      </Card>
    </div>
  );
}
