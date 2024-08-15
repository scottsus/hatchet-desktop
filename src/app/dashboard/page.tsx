import { Crew } from '@/src/types/crew';

import { CallDetails } from './call';
import { CrewDetails } from './crew';
import { Info } from './info';
import { Map } from './map';

export default async function Dashboard() {
  const callDetails = {
    callType: 'Smoke Investigation',
    location: '2180 Post St',
    cross: 'Scott St & Sutter St',
    units: ['ST26', 'M673', 'ST67'],
    date: 'March 5, 2024 at 6:30:52 PM PST',
  };

  const crewMembers: Crew[] = [
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
    {
      name: 'Alex Forgosh',
      time: '5 : 32 : 07',
      temperature: 185,
    },
  ];

  return (
    <main className="flex size-full gap-x-10 bg-bg-gray-1 p-6">
      <div className="flex w-2/5 flex-col items-start gap-y-4">
        <Info />
        <CallDetails {...callDetails} />
        <CrewDetails crewMembers={crewMembers} />
      </div>
      <div className="flex w-3/5 items-center justify-center rounded-lg bg-bg-gray-2 p-3">
        <Map />
      </div>
    </main>
  );
}
