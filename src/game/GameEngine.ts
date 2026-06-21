import { PLACES } from './places';
import { SCORING, haversineKm, scoreForDistance } from './scoring';
import type {
  LatLng,
  Place,
  RoundState,
  SessionState,
  SessionStats,
  SessionStatus,
} from './types';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRound(place: Place): RoundState {
  return {
    place,
    status: 'guessing',
    guess: null,
    distanceKm: null,
    score: 0,
  };
}

export function createSession(): SessionState {
  const selected = shuffle(PLACES).slice(0, SCORING.ROUNDS_PER_SESSION);
  return {
    status: 'playing',
    rounds: selected.map(makeRound),
    currentIndex: 0,
    totalScore: 0,
  };
}

export function initialSession(): SessionState {
  return {
    status: 'idle',
    rounds: [],
    currentIndex: 0,
    totalScore: 0,
  };
}

export interface GuessOutcome {
  distanceKm: number;
  score: number;
  place: Place;
}

/** Lock in the player's pin: compute distance + score and reveal the answer. */
export function submitGuess(
  state: SessionState,
  guess: LatLng,
): { state: SessionState; outcome: GuessOutcome | null } {
  const idx = state.currentIndex;
  const round = state.rounds[idx];
  if (!round || round.status !== 'guessing') {
    return { state, outcome: null };
  }

  const distanceKm = haversineKm(guess, {
    lat: round.place.lat,
    lng: round.place.lng,
  });
  const score = scoreForDistance(distanceKm);

  const updated: RoundState = {
    ...round,
    status: 'revealed',
    guess,
    distanceKm,
    score,
  };
  const rounds = state.rounds.slice();
  rounds[idx] = updated;

  return {
    state: { ...state, rounds, totalScore: state.totalScore + score },
    outcome: { distanceKm, score, place: round.place },
  };
}

export function advanceToNextRound(state: SessionState): SessionState {
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.rounds.length) {
    return { ...state, status: 'finished' as SessionStatus };
  }
  return { ...state, currentIndex: nextIndex };
}

export function summarise(state: SessionState): SessionStats {
  const distances = state.rounds
    .filter((r) => r.status === 'revealed' && r.distanceKm !== null)
    .map((r) => r.distanceKm as number);

  const total = distances.reduce((a, b) => a + b, 0);
  return {
    rounds: distances.length,
    totalScore: state.totalScore,
    bestDistanceKm: distances.length ? Math.min(...distances) : null,
    avgDistanceKm: distances.length ? total / distances.length : null,
    bullseyes: distances.filter((d) => d <= SCORING.BULLSEYE_KM).length,
  };
}
