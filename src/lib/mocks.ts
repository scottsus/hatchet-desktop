import { Team } from '../types/crew';

export const mockedCallDetails = {
  callType: 'Smoke Investigation',
  location: '2180 Post St',
  cross: 'Scott St & Sutter St',
  units: ['ST26', 'M673', 'ST67'],
  date: 'March 5, 2024 at 6:30:52 PM PST',
};

export const mockedTeams: Team[] = [
  {
    name: 'Heavy Rescue',
    color: '#C69956',
    crew: [
      {
        id: 89,
        name: 'S. Susanto 2205',
        initials: 'SS',
        color: '#9259A0',
        time: '0:0:0',
        signalStrength: 'high',
        temperature: 0,
        thesia_count: 0,
        relative_elevation: 3,
        sensorSrc: 'level.csv',
        sensorData: [],
        calibrationOpts: {
          rotationAngle: -120,
          shrinkFactorX: 1,
          shrinkFactorY: 0.8,
        },
      },
      {
        id: 2,
        name: 'A. Alan 2208',
        initials: 'AA',
        color: '#AE8C5A',
        time: '0:0:0',
        signalStrength: 'med',
        temperature: 0,
        thesia_count: 0,
        relative_elevation: 1,
        sensorSrc: 'level4.csv',
        sensorData: [],
        calibrationOpts: {
          rotationAngle: 185,
          shrinkFactorX: 1,
          shrinkFactorY: 0.8,
        },
      },
      {
        id: 3,
        name: 'A. Crenshaw 2209',
        initials: 'AC',
        color: '#AE8C5A',
        time: '0:0:0',
        signalStrength: 'high',
        temperature: 0,
        thesia_count: 0,
        relative_elevation: 1,
        sensorSrc: 'level5.csv',
        sensorData: [],
        calibrationOpts: {
          rotationAngle: 165,
          shrinkFactorX: 1,
          shrinkFactorY: 0.8,
        },
      },
    ],
  },
];

export const mockedDataSources = [
  'apt.csv',
  'apt2.csv',
  'apt3.csv',
  'apt4.1.csv',
  'level.csv',
  'level4.csv',
  'level5.csv',
];
