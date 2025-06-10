"use client";

import { cn } from "../lib/utils";

export function ProgressBar({
  progress,
  color = "bg-primary",
}: {
  progress: number; // [0, 100]
  color?: string;
}) {
  return (
    <div className="h-1.5 w-full flex-1 overflow-hidden rounded-full bg-bg-gray-4">
      <div
        className={cn("h-full rounded-full transition-all ease-in-out", color)}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
