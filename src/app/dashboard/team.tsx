'use client';

import './dashboard.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { ProgressBar } from '@/src/components/progress';
import { IS_DEMO } from '@/src/env';
import { mockedTeams } from '@/src/lib/mocks';
import { cn } from '@/src/lib/utils';
import type { CrewMember, Team } from '@/src/types/crew';
import {
  closestCenter,
  closestCorners,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BatteryFullIcon,
  BatteryMediumIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  PauseIcon,
  RefreshCwIcon,
  SquarePlusIcon,
  TargetIcon,
  UsersIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SyncLoader } from 'react-spinners';

const USE_MORE_METRICS = false;

export function Teams(
  {
    // updateTemperature,
    // updateThesiaCount,
    // updateRelativeElevation,
  }: {
    // updateTemperature: (index: number, temp: number) => void;
    // updateThesiaCount: (index: number, count: number) => void;
    // updateRelativeElevation: (index: number, elevation: number) => void;
  },
) {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>(mockedTeams);
  // const sensors = useSensors(
  //   useSensor(PointerSensor),
  //   useSensor(KeyboardSensor, {
  //     coordinateGetter: sortableKeyboardCoordinates,
  //   }),
  // );

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (IS_DEMO) {
      timeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="no-scrollbar flex w-full flex-col overflow-y-scroll rounded-lg bg-bg-gray-2 p-4">
      {loading ? (
        <SyncLoader color="#ED7D31" size={10} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-x-3">
            <h1>Crew Details</h1>
            <hr className="flex-1 border-bg-gray-3" />
            <BatteryFullIcon color="#5EC166" />
            <div className="size-2 rounded-full bg-[#5EC166]" />
            <FolderPlusIcon size={18} color="#B2B2B2" />
          </div>

          <div className="mt-5 flex flex-col gap-y-3">
            {/* <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={onDragEnd}
            > */}
            {teams.map((team, idx) => (
              <Team name={team.name} crew={team.crew} />
            ))}
            {/* </DndContext> */}
          </div>
        </>
      )}
    </div>
  );
}

export function OverallStatus() {
  const teams = mockedTeams;
  const total = teams.reduce((acc, team) => acc + team.crew.length, 0);
  const signalStrengths = teams.reduce(
    (acc, team) => {
      team.crew.forEach((crewMember) => {
        switch (crewMember.signalStrength) {
          case 'high':
            acc.high++;
            break;
          case 'med':
            acc.med++;
            break;
          case 'low':
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

function Team({ name, crew }: { name: string; crew: CrewMember[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: name });
  const style = {};

  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapseButton = () => {
    setIsCollapsed((c) => !c);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-x-2 pb-3 pt-2">
        <UsersIcon />
        <h3>{name}</h3>
        <button className="ml-auto mr-0" onClick={toggleCollapseButton}>
          <ChevronDownIcon
            className={cn(
              'transition-all',
              isCollapsed ? 'rotate-0' : '-rotate-180',
            )}
            size={18}
          />
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col items-start justify-start gap-y-2">
          {crew.map((crewMember, idx) => (
            <CrewMember
              key={idx}
              index={idx}
              teamName={name}
              crewMember={crewMember}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CrewMember({
  index,
  teamName,
  crewMember,
  // updateTemperature,
  // updateThesiaCount,
  // updateRelativeElevation,
}: {
  index: number;
  teamName: string;
  crewMember: CrewMember;
  // updateTemperature: (index: number, temp: number) => void;
  // updateThesiaCount: (index: number, count: number) => void;
  // updateRelativeElevation: (index: number, elevation: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpansion = () => setIsExpanded((isExpanded) => !isExpanded);
  const signalColors = {
    low: '#C55D4C',
    med: '#CEA064',
    high: '#9CF984',
  };

  // const { attributes, listeners, setNodeRef, transform, transition } =
  //   useSortable({
  //     id: crewMember.id,
  //   });
  // const style = {
  //   transform: CSS.Transform.toString(transform),
  //   transition,
  // };

  // const handleTemperatureChange = (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const newTemp = parseFloat(event.target.value);
  //   updateTemperature(index, newTemp);
  // };

  // const handleThesiaCountChange = (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const newCount = parseInt(event.target.value, 10);
  //   updateThesiaCount(index, newCount);
  // };

  // const handleRelativeElevationChange = (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const newElevation = parseFloat(event.target.value);
  //   updateRelativeElevation(index, newElevation);
  // };

  return (
    <div
      // ref={setNodeRef}
      // style={style}
      // {...attributes}
      // {...listeners}
      className="flex w-full cursor-pointer items-start gap-x-3 rounded-md p-1 hover:brightness-125"
    >
      <div className="flex items-center gap-x-1">
        <GripVerticalIcon
          size={15}
          color="#979797"
          className="cursor-grab active:cursor-grabbing"
        />
        <button
          className="hover:brightness-125' cursor-pointer rounded-md border-2 bg-bg-gray-3 p-2 transition-all"
          style={{ borderColor: crewMember.color }}
        >
          <TargetIcon size={18} />
        </button>
      </div>

      <div className="w-full transition-all">
        <div className="flex flex-col justify-center gap-y-1">
          <h4 className="h-[12px] text-[12px]">{crewMember.id}</h4>
          <p className="h-[10px] text-[10px] text-text-muted">
            {crewMember.name}
          </p>
        </div>

        {USE_MORE_METRICS && (
          <div
            className={cn(
              'col-span-5 overflow-hidden transition-all',
              isExpanded ? 'opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="flex w-[90%] flex-col gap-2 gap-y-2">
              <div className="flex items-center">
                <ProgressBar
                  progress={50 - crewMember.relative_elevation / 2}
                />
              </div>
              <div className="flex items-center">Time</div>
              <div className="flex items-center">
                <Timer time={crewMember.thesia_count} />
              </div>
              <div className="flex items-center">Temperature</div>
              <div className="flex items-center">
                <Temperature temperature={crewMember.temperature} />
              </div>
            </div>
          </div>
        )}
      </div>

      {USE_MORE_METRICS ? (
        <button onClick={toggleExpansion} className="mt-2">
          <ChevronRightIcon
            className={cn(
              'text-primary transition-all',
              isExpanded && 'rotate-90',
            )}
            size={18}
          />
        </button>
      ) : (
        <div className="flex items-center gap-x-6">
          <div
            className="size-1 rounded-full"
            style={{ backgroundColor: signalColors[crewMember.signalStrength] }}
          />
          <BatteryMediumIcon color="#CEA064" />
        </div>
      )}
    </div>
  );
}

function Timer({ time }: { time: number }) {
  const [isCounting, setIsCounting] = useState(true);
  const toggleIsCounting = () => setIsCounting((isCounting) => !isCounting);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
  };

  return (
    <div className="flex w-full items-center justify-between rounded-sm border border-bg-gray-4 bg-bg-gray-3 px-2 py-1.5">
      <span className="text-xs font-thin">{formatTime(time)}</span>
      <PauseIcon
        size={18}
        className="cursor-pointer text-primary"
        onClick={toggleIsCounting}
      />
    </div>
  );
}

function Temperature({ temperature }: { temperature: number }) {
  const progress = (temperature / 300) * 100;

  return (
    <div className="flex w-full items-center justify-between gap-x-4 rounded-sm border border-bg-gray-4 bg-bg-gray-3 px-2 py-1.5">
      <span className="text-xs font-thin">{temperature.toFixed(1)}°C</span>
      <ProgressBar progress={progress} color="bg-green-500" />
    </div>
  );
}
