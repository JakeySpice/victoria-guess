export type Tier = 'city' | 'suburb' | 'region' | 'smalltown';

export type RegionId =
  | 'inner-metro'
  | 'northern-metro'
  | 'southern-metro'
  | 'eastern-metro'
  | 'western-metro'
  | 'barwon-south-west'
  | 'grampians'
  | 'loddon-mallee'
  | 'hume'
  | 'goulburn'
  | 'gippsland';

export interface Place {
  id: string;
  name: string;
  aliases?: string[];
  lat: number;
  lng: number;
  tier: Tier;
  region: RegionId;
  scaleKm: number;
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

export type GameMode =
  | 'quick'
  | 'review'
  | 'region'
  | 'discovery'
  | 'daily'
  | 'endless';

export interface SessionStats {
  rounds: number;
  totalScore: number;
  bestDistanceKm: number | null;
  avgDistanceKm: number | null;
  bullseyes: number;
  failed: boolean;
}

export interface SessionState {
  status: SessionStatus;
  mode: GameMode;
  rounds: RoundState[];
  currentIndex: number;
  totalScore: number;
  failed: boolean;
}
