'use client';

import logo from '@/public/HatchetLogo.svg';
import { ClipboardListIcon, ContactIcon, TargetIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { useMemo } from 'react';

import { cn } from '../lib/utils';

export function Sidebar() {
  const segments = useSelectedLayoutSegments();
  const sidebarItems = useMemo(() => getSidebarItems({ segments }), [segments]);

  return (
    <div className="flex w-16 flex-col items-center bg-bg-gray-2 p-2">
      <Link href="/" className="my-6">
        <Image src={logo} alt="Hatchet" width={40} />
      </Link>
      <div className="flex flex-col gap-y-4">
        {sidebarItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <button
              className={cn(
                'cursor-pointer rounded-sm border p-2 transition-all hover:border-white hover:text-white',
                item.isActive
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-bg-gray-5 text-bg-gray-5',
              )}
            >
              <span>{item.icon}</span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getSidebarItems({ segments }: { segments: string[] }) {
  return [
    {
      title: 'Active Call',
      href: '/calls',
      isActive: segments.includes('active-call'),
      icon: <ClipboardListIcon />,
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      isActive: segments.includes('dashboard'),
      icon: <TargetIcon />,
    },
    {
      title: 'Sensor',
      href: '/sensor',
      isActive: segments.includes('sensor'),
      icon: <ContactIcon />,
    },
  ];
}
