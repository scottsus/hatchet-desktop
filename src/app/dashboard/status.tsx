import { mockedTeams } from "@/src/lib/mocks";
import { RefreshCwIcon } from "lucide-react";

export function OverallStatus() {
  const teams = mockedTeams;
  const total = teams.reduce((acc, team) => acc + team.crew.length, 0);
  const signalStrengths = teams.reduce(
    (acc, team) => {
      team.crew.forEach((crewMember) => {
        switch (crewMember.signalStrength) {
          case "high":
            acc.high++;
            break;
          case "med":
            acc.med++;
            break;
          case "low":
            acc.low++;
            break;
        }
      });
      return acc;
    },
    { high: 0, med: 0, low: 0 },
  );
  const { high, med, low } = signalStrengths;

  return (
    <div className="flex w-full justify-around rounded-lg bg-bg-gray-2 p-3">
      <div className="flex flex-col rounded-lg border border-[#414141] px-3 py-1">
        <p className="text-[10px] text-text-muted">Online</p>
        <p className="text-xs">
          {total}/{total} Online
        </p>
      </div>

      <div className="flex flex-col rounded-lg border border-[#414141] px-3 py-1">
        <p className="text-[10px] text-text-muted">Signal Strength</p>
        <div className="flex gap-x-10">
          <div className="flex items-center gap-x-1">
            <div className="size-[6px] rounded-full bg-[#9CF984]" />
            <p className="text-xs">
              {high}/{total}
            </p>
          </div>
          <div className="flex items-center gap-x-1">
            <div className="size-[6px] rounded-full bg-[#CEA064]" />
            <p className="text-xs">
              {med}/{total}
            </p>
          </div>
          <div className="flex items-center gap-x-1">
            <div className="size-[6px] rounded-full bg-[#C55D4C]" />
            <p className="text-xs">
              {low}/{total}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-[#414141] px-4 py-1">
        <RefreshCwIcon size={15} color="#B2B2B2" />
      </div>
    </div>
  );
}
