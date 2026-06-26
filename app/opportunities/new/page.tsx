import Link from 'next/link';
import { OpportunityForm } from '@/components/opportunities/OpportunityForm';
import { createOpportunityAction } from '../actions';

export const metadata = {
  title: 'New opportunity · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ signalId?: string }>;
}

/**
 * /opportunities/new?signalId=<id>  — 从某条 Signal 启动一次 opportunity 草拟。
 */
export default async function NewOpportunityPage({ searchParams }: PageProps) {
  const { signalId } = await searchParams;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/opportunities" className="text-sm text-muted hover:text-text">
          ← Back to opportunities
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">New opportunity</h1>
        <p className="text-sm text-muted">
          {signalId
            ? 'Pre-filled with one signal. Add more ids, then click "Generate AI draft" to synthesize starter content.'
            : 'Manually capture an opportunity, or pre-fill from signals via the URL.'}
        </p>
      </div>
      <OpportunityForm
        submitLabel="Create opportunity"
        formAction={createOpportunityAction}
        signalId={signalId}
      />
    </div>
  );
}
