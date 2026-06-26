/**
 * /learning/loops/new — 新建一条 loop version。
 *
 *   ?name=<name>   预填 name 去做"v+1" 迭代。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LoopForm } from '@/components/iteration/LoopForm';
import { createLoopVersionAction } from '../actions';

export const metadata = {
  title: 'New loop · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ name?: string }>;
}

export default async function NewLoopPage({ searchParams }: PageProps) {
  const { name } = await searchParams;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link
          href="/learning/loops"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to loops
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">
          {name ? 'New version of an existing loop' : 'New loop version'}
        </h1>
        <p className="text-sm text-muted">
          {name
            ? 'Service auto-increments version on the same name.'
            : 'A loop is a sequence of steps you run repeatedly. Define the steps, the stop condition, and how you judge each iteration.'}
        </p>
      </div>
      <Card>
        <LoopForm
          mode="create"
          onSubmit={createLoopVersionAction}
          {...(name ? { defaultName: name } : {})}
        />
      </Card>
    </div>
  );
}
