"use client";

import { IS_DEMO } from "@/src/env";
import { cn } from "@/src/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SyncLoader } from "react-spinners";

import { useFireground } from "../providers/fireground";

export type CallDetails = {
  callType: string;
  location: string;
  cross: string;
  units: string[];
  date: string;
};

export function CallDetails() {
  const { callDetails } = useFireground();
  const { callType, location, cross, units, date } = callDetails;

  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const toggleCollapseButton = () => {
    setIsCollapsed((c) => !c);
  };
  const toggleViewAllButton = () => {
    setShowFullDetails((d) => !d);
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (IS_DEMO) {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex w-full flex-col rounded-lg bg-bg-gray-2 p-4">
      {loading ? (
        <SyncLoader color="#ED7D31" size={10} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-x-2">
            <h1 className="">Call Details</h1>
            <hr className="flex-1 border-bg-gray-3" />
            <button onClick={toggleCollapseButton}>
              <ChevronDownIcon
                className={cn(
                  "transition-all",
                  isCollapsed ? "rotate-0" : "-rotate-180",
                )}
              />
            </button>
          </div>
          {!isCollapsed && (
            <>
              <div className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
                <div className="text-text-muted">Call Type:</div>
                <div>{callType}</div>

                <div className="text-text-muted">Location:</div>
                <div>{location}</div>

                <div className="text-text-muted">Cross:</div>
                <div>{cross}</div>

                <div className="text-text-muted">Units:</div>
                <div>{units.join(", ")}</div>

                <div className="text-text-muted">Date:</div>
                <div>{date}</div>
              </div>
              <button
                className="mt-5 w-full rounded-md border border-[#484848] bg-[#3D3D3D] p-1.5 hover:brightness-110"
                onClick={toggleViewAllButton}
              >
                View All
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
