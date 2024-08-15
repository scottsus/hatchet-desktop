import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { Sidebar } from '../components/sidebar';
import { cn } from '../lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '🪓 Hatchet',
  description: 'Firefighting Safety - Reimagined',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'flex bg-bg-gray-1 min-h-screen text-text-default text-sm font-normal',
          inter.className,
        )}
      >
        <Sidebar />
        <div className="flex flex-1 overflow-auto">{children}</div>
      </body>
    </html>
  );
}
