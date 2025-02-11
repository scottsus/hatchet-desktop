import { FireFighterCircle } from '@/src/components/ff-circle';
import { cn } from '@/src/lib/utils';
import { CrewMember } from '@/src/types/crew';
import { LockIcon, UsersIcon } from 'lucide-react';
import { useCallback } from 'react';

import { useFireground } from '../providers/fireground';

const TOPMOST_FLOOR = 4;

export function Elevation() {
  const { teams } = useFireground();

  const getCrewOnLevels = useCallback(() => {
    const crewByLevel: { [level: string]: CrewMember[] } = {
      3: [],
      2: [],
      1: [],
    };

    teams.forEach((team) => {
      team.crew.forEach((member) => {
        const level = member.sensorData[member.sensorData.length - 1]?.Altitude;
        if (level) {
          crewByLevel[Math.floor((level % 3) + 1)]?.push(member);
        }
      });
    });

    const getCrewOnLevel = (level: 'Roof' | number) => {
      const levelIndex = level === 'Roof' ? 0 : level;
      return crewByLevel[levelIndex] || [];
    };

    return getCrewOnLevel;
  }, [teams]);

  return (
    <div className="flex h-full w-full flex-col items-start rounded-md bg-bg-gray-2 p-4">
      <div className="flex w-full items-center gap-x-3">
        <h1>Elevation</h1>
        <p>Len: {teams[0].crew[0].sensorData.length}</p>
        <hr className="flex-1 border-bg-gray-3" />
        <LockIcon size={14} />
      </div>

      <div className="my-4 flex flex-col items-start gap-y-3">
        {teams.map((team) => (
          <TeamBadge key={team.name} name={team.name} color={team.color} />
        ))}
      </div>

      <div className="flex h-full w-full flex-col">
        <FloorLevel level="Roof" getCrew={getCrewOnLevels} />
        <FloorLevel level={3} getCrew={getCrewOnLevels} />
        <FloorLevel level={2} getCrew={getCrewOnLevels} />
        <FloorLevel level={1} getCrew={getCrewOnLevels} />
      </div>
    </div>
  );
}

function TeamBadge({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-x-2 rounded border-2 border-bg-gray-3 bg-bg-gray-3 px-1.5 py-0 hover:border-bg-gray-4 hover:brightness-110">
      <UsersIcon color={color} size={15} />
      <p className="font-light text-text-muted hover:text-white">{name}</p>
    </div>
  );
}

function FloorLevel({
  level,
  getCrew,
}: {
  level: 'Roof' | number;
  getCrew: () => (level: number) => CrewMember[];
}) {
  const loadCrew = getCrew();
  const crew = loadCrew(level === 'Roof' ? TOPMOST_FLOOR : level);

  return (
    <div className="relative flex w-full flex-col">
      <div className="border-border-default mb-2 ml-auto mr-0 flex items-center justify-center rounded-sm border bg-bg-gray-3 px-3.5 py-0.5">
        <p>{crew.length}</p>
      </div>

      {level !== 'Roof' && (
        <div
          className={cn(
            'mt-3 flex w-full flex-col gap-y-8',
            level !== 1 && 'pb-12',
          )}
        >
          <div className="flex items-center justify-around">
            <div className="h-6 w-10 bg-[#383838]" />
            <div className="h-6 w-10 bg-[#383838]" />
            <div className="h-6 w-10 bg-[#383838]" />
          </div>
          {level !== 1 ? (
            <div className="flex items-center justify-around">
              <div className="h-6 w-10 bg-[#383838]" />
              <div className="h-6 w-10 bg-[#383838]" />
              <div className="h-6 w-10 bg-[#383838]" />
            </div>
          ) : (
            <div className="mx-auto h-20 w-16 bg-[#383838]" />
          )}
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-x-2">
        {crew.map((member) => (
          <FireFighterCircle
            key={member.id}
            initials={member.initials}
            color={member.color}
          />
        ))}
      </div>

      <div className="flex w-full items-center gap-x-2">
        <hr className="flex-1 border-[0.12rem] border-[#868686]" />
        <h4 className="text-xs">{level}</h4>
        <hr className="flex-1 border-[0.12rem] border-[#868686]" />
      </div>
    </div>
  );
}
