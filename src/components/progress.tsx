'use client';

export function ProgressBar({
  progress,
}: {
  progress: number; // [0, 100]
}) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-gray-3">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
