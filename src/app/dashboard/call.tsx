'use client';

import { InfoIcon } from 'lucide-react';

export function CallDetails(props: {
  callType: string;
  location: string;
  cross: string;
  units: string[];
  date: string;
}) {
  return (
    <div className="flex w-full flex-col rounded-lg bg-bg-gray-2 p-4">
      <div className="flex items-center justify-between gap-x-2">
        <h1 className="">Call Details</h1>
        <hr className="flex-1 border-bg-gray-3" />
        <InfoIcon size={18} className="text-primary" />
      </div>
      <div className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
        <div className="text-text-muted">Call Type:</div>
        <div>{props.callType}</div>

        <div className="text-text-muted">Location:</div>
        <div>{props.location}</div>

        <div className="text-text-muted">Cross:</div>
        <div>{props.cross}</div>

        <div className="text-text-muted">Units:</div>
        <div>{props.units.join(', ')}</div>

        <div className="text-text-muted">Date:</div>
        <div>{props.date}</div>
      </div>
    </div>
  );
}
