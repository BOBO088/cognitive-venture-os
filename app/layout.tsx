import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'Cognitive Venture OS',
  description: 'AI-native operating system for cognitive ventures',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
