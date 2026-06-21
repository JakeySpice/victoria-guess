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

export type RoundStatus = 'playing' | 'correct' | 'struck_out';

export interface RoundState {
  place: Place;
  status: RoundStatus;
  strikes: number;
  revealedHints: number;
  zoomOuts: number;
  wrongGuesses: number;
  scoreEarned: number;
  hintsUsed: number;
}

export type SessionStatus = 'idle' | 'playing' | 'finished';

export interface SessionStats {
  correct: number;
  struckOut: number;
  totalHints: number;
  totalZoomOuts: number;
  totalWrong: number;
}

export interface SessionState {
  status: SessionStatus;
  rounds: RoundState[];
  currentIndex: number;
  totalScore: number;
  deck: Place[];
}
