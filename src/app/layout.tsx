import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { Sidebar } from '../components/sidebar';
import { cn } from '../lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '🪓 Hatchet',
  description: 'Firefighting Safety, Reimagined',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn('flex gap-x-2', inter.className)}>
        <Sidebar />
        <div className="flex-grow overflow-auto">{children}</div>
      </body>
    </html>
  );
}
