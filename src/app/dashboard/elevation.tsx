import { FireFighterCircle } from '@/src/components/ff-circle';
import { cn } from '@/src/lib/utils';
import { CrewMember } from '@/src/types/crew';
import { LockIcon, UsersIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useFireground } from '../providers/fireground';

const TOPMOST_FLOOR = 4;
// Modify member color based on floor
const floorColors: { [key: number]: string } = {
  1: '#3880A9',  // blue for first floor
  2: '#9259A0',  // purple for second floor
  3: '#AE8C5A'   // yellow for third floor
  };

function estimateFloor(pressometer: number, inertialZ: number): number {
  // Weighted blend of sensors
  const blendedAltitude = (pressometer * 0.7) + (inertialZ * 0.3);
  
  // Floor thresholds
  if (blendedAltitude > -30) {
    return 1; // First floor
  } else if (blendedAltitude > -100) {
    return 2; // Second floor
  } else {
    return 3; // Third floor
  }
}

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
        const altitude = Number(member.sensorData[member.sensorData.length - 1]?.['Altitude Estimation Pressometer']);
        const position = Number(member.sensorData[member.sensorData.length - 1]?.['Position Estimation Inertial Z']);
        if (!isNaN(altitude) && !isNaN(position)) {
          // Use 70% altitude and 30% inertial for better stability
          // const level = -(altitude * 0.8 + position * 0.2);
          // console.log(member.initials, level);
          // const floor = Math.min(Math.max(Math.ceil(level / 45), 1), 3);
          const floor = estimateFloor(altitude, position);
          crewByLevel[floor]?.push(member);
          member.color = floorColors[floor];
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
      <div className="mb-2 ml-auto mr-0 flex items-center justify-center rounded-sm border border-border-default bg-bg-gray-3 px-3.5 py-0.5">
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
