'use client';

import { Crew } from '@/src/types/crew';
import { useState } from 'react';

import { CallDetails } from './call';
import { CrewDetails } from './crew';
import { Info } from './info';
import { Map } from './map';

export default function Dashboard() {
  const callDetails = {
    callType: 'Smoke Investigation',
    location: '2180 Post St',
    cross: 'Scott St & Sutter St',
    units: ['ST26', 'M673', 'ST67'],
    date: 'March 5, 2024 at 6:30:52 PM PST',
  };

  const initialCrewMembers: Crew[] = [
    {
      name: 'Alex Forgosh',
      time: '0:0:0',
      temperature: 0,
      thesia_count: 0,
      relative_elevation: 0,
    },
    {
      name: 'Russell Tan',
      time: '0:0:0',
      temperature: 0,
      thesia_count: 0,
      relative_elevation: 0,
    },
    {
      name: 'Scott Susanto',
      time: '0:0:0',
      temperature: 0,
      thesia_count: 0,
      relative_elevation: 0,
    },
  ];

  const [crewMembers, setCrewMembers] = useState<Crew[]>(initialCrewMembers);

  const updateCrewTemperature = (index: number, temp: number) => {
    setCrewMembers((prev) => {
      const newCrew = [...prev];
      newCrew[index].temperature = temp;
      return newCrew;
    });
  };

  const updateCrewThesiaCount = (index: number, count: number) => {
    setCrewMembers((prev) => {
      const newCrew = [...prev];
      newCrew[index].thesia_count = count;
      return newCrew;
    });
  };

  const updateCrewRelativeElevation = (index: number, elevation: number) => {
    setCrewMembers((prev) => {
      const newCrew = [...prev];
      newCrew[index].relative_elevation = elevation;
      return newCrew;
    });
  };

  return (
    <main className="flex h-screen w-full gap-x-3 bg-bg-gray-1 p-4">
      <div className="flex w-[37%] flex-col items-start gap-y-4">
        <Info />
        <CallDetails {...callDetails} />
        <CrewDetails
          crewMembers={crewMembers}
          updateTemperature={updateCrewTemperature}
          updateThesiaCount={updateCrewThesiaCount}
          updateRelativeElevation={updateCrewRelativeElevation}
        />
      </div>
      <div className="flex w-[63%] items-center justify-center rounded-lg bg-bg-gray-2 p-3">
        <Map
          updateCrewTemperature={updateCrewTemperature}
          updateCrewThesiaCount={updateCrewThesiaCount}
          updateCrewRelativeElevation={updateCrewRelativeElevation}
        />
      </div>
    </main>
  );
}
