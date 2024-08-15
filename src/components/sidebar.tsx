'use client';

import logo from '@/public/HatchetLogo.svg';
import { ClipboardListIcon, ContactIcon, TargetIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '../lib/utils';

enum View {
  Overview = 'overview',
  ActiveCall = 'active-call',
  Sensor = 'sensor',
}

export function Sidebar() {
  const [view, setView] = useState<View>(View.Overview);

  return (
    <div className="flex flex-col w-20 p-2 items-center bg-bg-gray-1">
      <Image src={logo} alt="Hatchet" className="my-10 w-3/5" />
      <div className="flex flex-col gap-y-4">
        <Icon
          isSelected={view === View.Overview}
          setView={() => setView(View.Overview)}
          Icon={TargetIcon}
        />
        <Icon
          isSelected={view === View.ActiveCall}
          setView={() => setView(View.ActiveCall)}
          Icon={ClipboardListIcon}
        />
        <Icon
          isSelected={view === View.Sensor}
          setView={() => setView(View.Sensor)}
          Icon={ContactIcon}
        />
      </div>
    </div>
  );
}

function Icon({
  isSelected,
  setView,
  Icon,
}: {
  isSelected: boolean;
  setView: () => void;
  Icon: React.ElementType;
}) {
  return (
    <button
      className={cn(
        'border p-2 rounded-sm cursor-pointer hover:text-white hover:border-white transition-all',
        isSelected
          ? 'border-primary text-primary bg-primary/20'
          : 'border-bg-gray-3 text-bg-gray-3',
      )}
      onClick={setView}
    >
      <Icon />
    </button>
  );
}
