'use client';

import { ProgressBar } from '@/src/components/progress';
import { cn } from '@/src/lib/utils';
import { Crew } from '@/src/types/crew';
import { SquarePlusIcon, TargetIcon } from 'lucide-react';

export function CrewDetails({ crewMembers }: { crewMembers: Crew[] }) {
  return (
    <div className="flex w-full flex-col rounded-lg bg-bg-gray-2 p-4">
      <div className="flex items-center justify-between gap-x-2">
        <h1 className="">Call Details</h1>
        <hr className="flex-1 border-bg-gray-3" />
        <SquarePlusIcon size={18} className="text-primary" />
      </div>

      <div className="mt-5 flex flex-col gap-y-3">
        {crewMembers.map((crew, index) => (
          <CrewDetail key={crew.name} crew={crew} index={index} />
        ))}
      </div>
    </div>
  );
}

function CrewDetail({ crew, index }: { crew: Crew; index: number }) {
  const colors = [
    'border-green-500',
    'border-orange-500',
    'border-purple-500',
    'border-blue-500',
    'border-red-500',
    'border-yellow-500',
  ];

  return (
    <div className="flex items-center gap-x-3">
      <button
        className={cn(
          'cursor-pointer rounded-md border bg-bg-gray-3 p-2 transition-all hover:brightness-125',
          colors[index % colors.length],
        )}
      >
        <TargetIcon size={18} />
      </button>
      <p>{crew.name}</p>
      <ProgressBar progress={47} />
    </div>
  );
}
