import { FireFighterCircle } from '@/src/components/ff-circle';
import { USE_DISTINCT_FLOORS_FOR_ELEVATION } from '@/src/env';
import { cn } from '@/src/lib/utils';
import { CrewMember } from '@/src/types/crew';
import { LockIcon, UsersIcon } from 'lucide-react';
import { useCallback } from 'react';

import { useFireground } from '../providers/fireground';

const TOPMOST_FLOOR = 4;
const floorColors: { [key: number]: string } = {
  1: '#3880A9',
  2: '#9259A0',
  3: '#AE8C5A',
};
const PRESSOMETER_WEIGHT = 0.7;
const INERTIAL_WEIGHT = 0.3;

function estimateFloor(pressometer: number, inertialZ: number): number {
  const blendedAltitude =
    pressometer * PRESSOMETER_WEIGHT + inertialZ * INERTIAL_WEIGHT;
  if (blendedAltitude > -30) {
    return 1;
  } else if (blendedAltitude > -100) {
    return 2;
  } else {
    return 3;
  }
}

export function Elevation() {
  const { teams, getLatestSensorData } = useFireground();

  function getHorizontalPosition(idx: number) {
    const totalCount = teams.flatMap((team) => team.crew).length;
    return `${((idx + 0.2) / totalCount) * 100}%`;
  }

  function getVerticalPosition(member: CrewMember): string {
    const sensorData = getLatestSensorData(member.id);
    if (!sensorData) {
      return '';
    }

    const pressometer = sensorData['Altitude Estimation Pressometer'];
    const inertialZ = sensorData['Position Estimation Inertial Z'];
    const altitude =
      pressometer * PRESSOMETER_WEIGHT + inertialZ * INERTIAL_WEIGHT;

    let verticalPos: number;

    if (altitude >= 0) {
      verticalPos = 0;
    } else if (altitude >= -30) {
      // Map [0, -30] to [0%, 33%]
      const t = (0 - altitude) / 30;
      verticalPos = 0 + t * 33;
    } else if (altitude >= -100) {
      // Map [-30, -100] to [34%, 67%]
      const t = (altitude - -30) / (-100 - -30); // denominator is -70
      verticalPos = 34 + t * (67 - 34);
    } else if (altitude >= -160) {
      // Map [-100, -160] to [68%, 100%]
      const t = (altitude - -100) / (-160 - -100); // denominator is -60
      verticalPos = 68 + t * (100 - 68);
    } else {
      verticalPos = 100;
    }

    return `${verticalPos}%`;
  }

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

      <div className="relative flex h-full w-full flex-col">
        <FloorLevel level="Roof" />
        <FloorLevel level={3} />
        <FloorLevel level={2} />
        <FloorLevel level={1} />
        {!USE_DISTINCT_FLOORS_FOR_ELEVATION && (
          <div>
            {teams
              .flatMap((team) => team.crew)
              .map((member, idx) => (
                <FireFighterCircle
                  key={member.id}
                  initials={member.initials}
                  color={member.color}
                  style={{
                    position: 'absolute',
                    left: getHorizontalPosition(idx),
                    bottom: getVerticalPosition(member),
                  }}
                />
              ))}
          </div>
        )}
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

function FloorLevel({ level }: { level: 'Roof' | number }) {
  const { teams } = useFireground();

  const getCrewOnLevels = useCallback(() => {
    const crewByLevel: { [level: string]: CrewMember[] } = {
      3: [],
      2: [],
      1: [],
    };

    teams.forEach((team) => {
      team.crew.forEach((member) => {
        const altitude = Number(
          member.sensorData[member.sensorData.length - 1]?.[
            'Altitude Estimation Pressometer'
          ],
        );
        const position = Number(
          member.sensorData[member.sensorData.length - 1]?.[
            'Position Estimation Inertial Z'
          ],
        );

        if (!isNaN(altitude) && !isNaN(position)) {
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

  const loadCrew = getCrewOnLevels();
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

      {USE_DISTINCT_FLOORS_FOR_ELEVATION && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-x-2">
          {crew.map((member) => (
            <FireFighterCircle
              key={member.id}
              initials={member.initials}
              color={member.color}
            />
          ))}
        </div>
      )}

      <div className="flex w-full items-center gap-x-2">
        <hr className="flex-1 border-[0.12rem] border-[#868686]" />
        <h4 className="text-xs">{level}</h4>
        <hr className="flex-1 border-[0.12rem] border-[#868686]" />
      </div>
    </div>
  );
}
