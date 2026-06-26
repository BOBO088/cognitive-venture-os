import Link from 'next/link';
import { SignalForm } from '@/components/opportunities/SignalForm';
import { createSignalAction } from '../actions';

export const metadata = {
  title: 'New signal · Cognitive Venture OS',
};

export default function NewSignalPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/opportunities/signals" className="text-sm text-muted hover:text-text">
          ← Back to signals
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">New signal</h1>
        <p className="text-sm text-muted">
          Record a market signal with category, source, evidence, and confidence.
        </p>
      </div>
      <SignalForm
        submitLabel="Create signal"
        formAction={createSignalAction}
      />
    </div>
  );
}
