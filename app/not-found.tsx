import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-semibold text-text">404 — not found</h1>
      <p className="text-sm text-muted">这条路径还没接上。</p>
      <Link href="/" className="text-sm text-accent hover:underline">回到 Dashboard</Link>
    </div>
  );
}
