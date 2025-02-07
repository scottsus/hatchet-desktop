export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  time: string;
  signalStrength: 'low' | 'med' | 'high';
  temperature: number;
  thesia_count: number;
  relative_elevation: number;
}

export interface Team {
  name: string;
  color: string;
  crew: CrewMember[];
}
