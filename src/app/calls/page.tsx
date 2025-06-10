import Link from "next/link";

const calls = [
  {
    callType: "F Controlled Burn",
    address: "4762 Duck Creek Road",
    time: "5:16pm",
    date: "5/22",
  },
  {
    callType: "F Alarm Test",
    address: "2409 Water Street",
    time: "2:08pm",
    date: "5/22",
  },
  {
    callType: "F Structure Fire",
    address: "789 Main Street",
    time: "11:45am",
    date: "5/22",
  },
  {
    callType: "F Vehicle Fire",
    address: "456 Oak Avenue",
    time: "3:30pm",
    date: "5/22",
  },
  {
    callType: "F Medical Emergency",
    address: "123 Elm Road",
    time: "9:15pm",
    date: "5/22",
  },
];

export default function CallsPage() {
  return (
    <main className="flex size-full flex-col items-center justify-center gap-y-6">
      <div className="w-1/3 rounded-md bg-bg-gray-2 p-6">
        <h2 className="mb-3">Active Calls</h2>
        <div className="flex w-full flex-col">
          {calls.map((call) => (
            <Link href="/dashboard" key={call.address}>
              <CallInfo
                callType={call.callType}
                address={call.address}
                date={call.date}
                time={call.time}
              />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function CallInfo({
  callType,
  address,
  date,
  time,
}: {
  callType: string;
  address: string;
  date: string;
  time: string;
}) {
  return (
    <div className="flex w-full flex-col rounded-md p-2 hover:bg-bg-gray-3">
      <div className="flex w-full">
        <div className="flex w-full flex-col items-start gap-y-1">
          <h3>{callType}</h3>
          <p className="font-thin text-bg-gray-5">{address}</p>
        </div>
        <div className="flex w-full flex-col items-end gap-y-1">
          <p>{time}</p>
          <p>{date}</p>
        </div>
      </div>
      <div className="my-2 border border-t-0 border-bg-gray-4" />
    </div>
  );
}
