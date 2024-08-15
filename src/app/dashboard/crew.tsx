'use client';

import { ProgressBar } from '@/src/components/progress';
import { cn } from '@/src/lib/utils';
import { Crew } from '@/src/types/crew';
import {
  ChevronRightIcon,
  PauseIcon,
  SquarePlusIcon,
  TargetIcon,
} from 'lucide-react';
import { useState } from 'react';

export function CrewDetails({ crewMembers }: { crewMembers: Crew[] }) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-scroll rounded-lg bg-bg-gray-2 p-4">
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
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpansion = () => setIsExpanded((isExpanded) => !isExpanded);

  const colors = [
    'border-green-500',
    'border-orange-500',
    'border-purple-500',
    'border-blue-500',
    'border-red-500',
    'border-yellow-500',
  ];

  return (
    <div className="flex items-start gap-x-3">
      <button
        className={cn(
          'cursor-pointer rounded-md border bg-bg-gray-3 p-2 transition-all hover:brightness-125',
          colors[index % colors.length],
        )}
      >
        <TargetIcon size={18} />
      </button>

      <div className="mt-2 grid w-3/4 grid-cols-5 gap-2 transition-all">
        <div className="col-span-2">{crew.name}</div>
        <div className="col-span-3 flex items-center">
          <ProgressBar progress={47} />
        </div>
        <div
          className={cn(
            'col-span-5 overflow-hidden transition-all',
            isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2 flex items-center">Time</div>
            <div className="col-span-3 flex items-center">
              <Timer time={crew.time} />
            </div>
            <div className="col-span-2 flex items-center">Temperature</div>
            <div className="col-span-3 flex items-center">
              <Temperature temperature={crew.temperature} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={toggleExpansion} className="mt-2">
        <ChevronRightIcon
          className={cn(
            'text-primary transition-all',
            isExpanded && 'rotate-90',
          )}
          size={18}
        />
      </button>
    </div>
  );
}

function Timer({ time }: { time: string }) {
  const [isCounting, setIsCounting] = useState(true);
  const toggleIsCounting = () => setIsCounting((isCounting) => !isCounting);

  return (
    <div className="border-bg-gray-4 flex w-full items-center justify-between rounded-sm border bg-bg-gray-3 px-2 py-1.5">
      <span className="text-xs font-thin">{time}</span>
      <PauseIcon
        size={18}
        className="text-primary"
        onClick={toggleIsCounting}
      />
    </div>
  );
}

function Temperature({ temperature }: { temperature: number }) {
  const progress = (temperature / 300) * 100;

  return (
    <div className="border-bg-gray-4 flex w-full items-center justify-between gap-x-4 rounded-sm border bg-bg-gray-3 px-2 py-1.5">
      <span className="text-xs font-thin">{temperature}°F</span>
      <ProgressBar progress={progress} color="bg-green-500" />
    </div>
  );
}
