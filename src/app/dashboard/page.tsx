'use client';

import { USE_CALL_HEADER } from '@/src/env';
import { Team } from '@/src/types/crew';
import { useState } from 'react';

import { CallDetails } from './call';
import { Elevation } from './elevation';
import { Info } from './info';
import { Map } from './map';
import { OverallStatus, Teams } from './team';

export default function Dashboard() {
  const callDetails = {
    callType: 'Smoke Investigation',
    location: '2180 Post St',
    cross: 'Scott St & Sutter St',
    units: ['ST26', 'M673', 'ST67'],
    date: 'March 5, 2024 at 6:30:52 PM PST',
  };

  // const [crewMembers, setCrewMembers] = useState<Crew[]>(initialTeams);

  const updateCrewTemperature = (index: number, temp: number) => {
    // setCrewMembers((prev) => {
    //   const newCrew = [...prev];
    //   newCrew[index].temperature = temp;
    //   return newCrew;
    // });
  };

  const updateCrewThesiaCount = (index: number, count: number) => {
    // setCrewMembers((prev) => {
    //   const newCrew = [...prev];
    //   newCrew[index].thesia_count = count;
    //   return newCrew;
    // });
  };

  const updateCrewRelativeElevation = (index: number, elevation: number) => {
    // setCrewMembers((prev) => {
    //   const newCrew = [...prev];
    //   newCrew[index].relative_elevation = elevation;
    //   return newCrew;
    // });
  };

  return (
    <main className="flex h-screen w-full gap-x-3 bg-bg-gray-1 p-4">
      <div className="flex w-[28%] flex-col items-start gap-y-4">
        {USE_CALL_HEADER && <Info />}
        <CallDetails {...callDetails} />
        {/* <CrewDetails
          crewMembers={crewMembers}
          updateTemperature={updateCrewTemperature}
          updateThesiaCount={updateCrewThesiaCount}
          updateRelativeElevation={updateCrewRelativeElevation}
        /> */}
        <OverallStatus />
        <Teams />
      </div>
      <div className="flex w-[53%] items-center justify-center rounded-lg bg-bg-gray-2 p-3">
        <Map
          updateCrewTemperature={updateCrewTemperature}
          updateCrewThesiaCount={updateCrewThesiaCount}
          updateCrewRelativeElevation={updateCrewRelativeElevation}
        />
      </div>
      <div className="flex w-[19%]">
        <Elevation />
      </div>
    </main>
  );
}
