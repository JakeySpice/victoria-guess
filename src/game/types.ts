export type Tier = 'city' | 'suburb' | 'region' | 'smalltown';

export interface Place {
  id: string;
  name: string;
  aliases?: string[];
  lat: number;
  lng: number;
  tier: Tier;
  region: string;
  hints: [string, string, string];
}

export const TIER_LABELS: Record<Tier, string> = {
  city: 'City',
  suburb: 'Suburb',
  region: 'Region',
  smalltown: 'Small Town',
};

export interface LatLng {
  lat: number;
  lng: number;
}

export type RoundStatus = 'guessing' | 'revealed';

export interface RoundState {
  place: Place;
  status: RoundStatus;
  /** Where the player dropped their pin (null until they submit). */
  guess: LatLng | null;
  /** Straight-line distance from the guess to the true location, in km. */
  distanceKm: number | null;
  /** Points earned this round. */
  score: number;
}

export type SessionStatus = 'idle' | 'playing' | 'finished';

export interface SessionStats {
  rounds: number;
  totalScore: number;
  bestDistanceKm: number | null;
  avgDistanceKm: number | null;
  bullseyes: number;
}

export interface SessionState {
  status: SessionStatus;
  rounds: RoundState[];
  currentIndex: number;
  totalScore: number;
}
