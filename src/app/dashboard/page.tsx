"use client";

import { USE_CALL_HEADER } from "@/src/env";

import { FiregroundProvider } from "../providers/fireground";
import { CallDetails } from "./call";
import { Elevation } from "./elevation";
import { Info } from "./info";
import { Map } from "./map";
import { OverallStatus } from "./status";
import { Teams } from "./team";

export default function Dashboard() {
  return (
    <FiregroundProvider>
      <main className="flex h-screen w-full gap-x-3 bg-bg-gray-1 p-4">
        <div className="flex w-[28%] flex-col items-start gap-y-4">
          {USE_CALL_HEADER && <Info />}
          <CallDetails />
          <OverallStatus />
          <Teams />
        </div>

        <div className="flex w-[53%] items-center justify-center rounded-lg bg-bg-gray-2 p-3">
          <Map />
        </div>

        <div className="flex w-[19%]">
          <Elevation />
        </div>
      </main>
    </FiregroundProvider>
  );
}
