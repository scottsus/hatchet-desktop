'use client';

import { ChevronDown, MapPinnedIcon, TargetIcon } from 'lucide-react';

export function Info() {
  return (
    <div className="flex h-12 w-full gap-x-2">
      <div className="flex w-3/5 flex-1 items-center justify-between rounded-lg border border-primary bg-bg-gray-2 p-4">
        <p className="text-xs">SMOKE INVESTIGATION</p>
        <ChevronDown className="text-primary" />
      </div>

      <div className="flex w-2/5 flex-1 gap-x-2">
        <button className="flex aspect-square h-full w-1/3 cursor-pointer items-center justify-center rounded-md border border-primary bg-primary/20 p-2 text-primary transition-all hover:border-white hover:text-white">
          <MapPinnedIcon />
        </button>
        <button className="text-bg-gray-5 flex aspect-square h-full w-1/3 cursor-pointer items-center justify-center rounded-md bg-bg-gray-2 p-2 transition-all hover:border-white hover:text-white">
          <TargetIcon />
        </button>
        <button className="text-bg-gray-5 flex aspect-square h-full w-1/3 cursor-pointer items-center justify-center rounded-md bg-bg-gray-2 p-2 transition-all hover:border-white hover:text-white">
          <TargetIcon />
        </button>
      </div>
    </div>
  );
}
