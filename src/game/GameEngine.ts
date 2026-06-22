import { PLACES, placesInRegion, scaleKmFor } from './places';
import {
  SCORING,
  hashStringToSeed,
  haversineKm,
  mulberry32,
  ratingForDistance,
  scoreForDistance,
} from './scoring';
import { emptyProgress } from './progress';
import type { Progress, PlaceStat } from './progress';
import type {
  GameMode,
  LatLng,
  Place,
  RegionId,
  RoundState,
  SessionState,
  SessionStats,
  SessionStatus,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const MAX_NORMALISED_ERROR = 10;
const MAX_DUE_DAYS = 30;
const STRONG_E_THRESHOLD = 1.5;
const REVIEW_OLD_DAYS = 3;
const ENDLESS_FAIL_KM = 300;
const ENDLESS_DRAW_CAP = 50;

export interface SelectRoundsOptions {
  mode: GameMode;
  regionId?: RegionId;
  rounds?: number;
  seed?: number | string;
}

interface ModeWeights {
  w_new: number;
  w_weak: number;
  w_due: number;
  w_jitter: number;
}

export const MODE_WEIGHTS: Record<GameMode, ModeWeights> = {
  quick: { w_new: 1, w_weak: 1, w_due: 0.5, w_jitter: 0.5 },
  review: { w_new: 0, w_weak: 1.5, w_due: 1.5, w_jitter: 0.3 },
  region: { w_new: 1, w_weak: 1, w_due: 0.5, w_jitter: 0.5 },
  discovery: { w_new: 1, w_weak: 0, w_due: 0, w_jitter: 1 },
  daily: { w_new: 1, w_weak: 1, w_due: 0.5, w_jitter: 0.5 },
  endless: { w_new: 1, w_weak: 1, w_due: 0.5, w_jitter: 0.5 },
};

interface ScoredPlace {
  place: Place;
  priority: number;
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

function normalisedError(place: Place, stat: PlaceStat | undefined): number {
  if (!stat || stat.plays === 0) return 0;
  return Math.min(stat.emaKm / scaleKmFor(place), MAX_NORMALISED_ERROR);
}

function dueness(stat: PlaceStat | undefined, now: number): number {
  if (!stat || stat.plays === 0 || stat.lastPlayedAt === 0) return 0;
  const days = (now - stat.lastPlayedAt) / DAY_MS;
  return Math.min(Math.max(days, 0), MAX_DUE_DAYS);
}

function isReviewEligible(place: Place, stat: PlaceStat | undefined, now: number): boolean {
  if (!stat || stat.plays === 0) return false;
  const e = stat.emaKm / scaleKmFor(place);
  const daysSince = (now - stat.lastPlayedAt) / DAY_MS;
  return e > STRONG_E_THRESHOLD || daysSince > REVIEW_OLD_DAYS;
}

function resolveRounds(opts: SelectRoundsOptions): number {
  if (opts.mode === 'endless') return ENDLESS_DRAW_CAP;
  return opts.rounds ?? SCORING.ROUNDS_PER_SESSION;
}

function candidatesFor(
  progress: Progress,
  opts: SelectRoundsOptions,
  rounds: number,
): Place[] {
  const now = Date.now();
  switch (opts.mode) {
    case 'region': {
      const id = opts.regionId;
      return id ? placesInRegion(id) : PLACES.slice();
    }
    case 'review':
      return PLACES.filter((p) =>
        isReviewEligible(p, progress.places[p.id], now),
      );
    case 'discovery': {
      const neverSeen = PLACES.filter((p) => {
        const s = progress.places[p.id];
        return !s || s.plays === 0;
      });
      if (neverSeen.length >= rounds) return neverSeen;
      const lightlySeen = PLACES.filter((p) => {
        const s = progress.places[p.id];
        return s && s.plays > 0 && s.plays <= 2;
      });
      return [...neverSeen, ...lightlySeen];
    }
    default:
      return PLACES.slice();
  }
}

function pickRng(opts: SelectRoundsOptions): () => number {
  if (opts.mode === 'daily' && opts.seed !== undefined) {
    const seed =
      typeof opts.seed === 'number'
        ? opts.seed
        : hashStringToSeed(String(opts.seed));
    return mulberry32(seed);
  }
  return Math.random;
}

function computeInterleaveCap(rounds: number): number {
  return Math.max(2, Math.ceil(rounds / 3));
}

function pickWithCap(
  scored: ScoredPlace[],
  rounds: number,
  cap: number,
): Place[] {
  const selected: Place[] = [];
  const regionCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  for (const { place } of scored) {
    if (selected.length >= rounds) break;
    if (regionCount[place.region] >= cap) continue;
    if (tierCount[place.tier] >= cap) continue;
    selected.push(place);
    regionCount[place.region] = (regionCount[place.region] ?? 0) + 1;
    tierCount[place.tier] = (tierCount[place.tier] ?? 0) + 1;
  }
  return selected;
}

export function selectRounds(
  progress: Progress,
  opts: SelectRoundsOptions,
): Place[] {
  const rounds = resolveRounds(opts);
  const candidates = candidatesFor(progress, opts, rounds);
  if (candidates.length === 0) return [];
  const weights = MODE_WEIGHTS[opts.mode];
  const now = Date.now();
  const rng = pickRng(opts);

  const scored: ScoredPlace[] = candidates.map((place) => {
    const stat = progress.places[place.id];
    const neverSeen = !stat || stat.plays === 0 ? 1 : 0;
    const priority =
      weights.w_new * neverSeen +
      weights.w_weak * normalisedError(place, stat) +
      weights.w_due * (dueness(stat, now) / MAX_DUE_DAYS) +
      weights.w_jitter * rng();
    return { place, priority };
  });
  scored.sort((a, b) => b.priority - a.priority);

  let cap = computeInterleaveCap(rounds);
  let selected = pickWithCap(scored, rounds, cap);
  let attempts = 0;
  while (selected.length < rounds && attempts < 3) {
    cap = Math.ceil(cap * 1.5);
    selected = pickWithCap(scored, rounds, cap);
    attempts++;
  }
  if (selected.length < rounds) {
    for (const { place } of scored) {
      if (selected.length >= rounds) break;
      if (!selected.includes(place)) selected.push(place);
    }
  }
  return selected.slice(0, rounds);
}

export function createSession(
  progress: Progress = emptyProgress(),
  opts: SelectRoundsOptions = { mode: 'quick' },
): SessionState {
  const selected = selectRounds(progress, opts);
  return {
    status: 'playing',
    mode: opts.mode,
    rounds: selected.map(makeRound),
    currentIndex: 0,
    totalScore: 0,
    failed: false,
  };
}

export function initialSession(): SessionState {
  return {
    status: 'idle',
    mode: 'quick',
    rounds: [],
    currentIndex: 0,
    totalScore: 0,
    failed: false,
  };
}

export interface GuessOutcome {
  distanceKm: number;
  score: number;
  place: Place;
}

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

  let nextStatus: SessionStatus = state.status;
  let failed = state.failed;
  if (
    state.mode === 'endless' &&
    ratingForDistance(distanceKm).tone === 'poor' &&
    distanceKm > ENDLESS_FAIL_KM
  ) {
    nextStatus = 'finished';
    failed = true;
  }

  return {
    state: {
      ...state,
      rounds,
      totalScore: state.totalScore + score,
      status: nextStatus,
      failed,
    },
    outcome: { distanceKm, score, place: round.place },
  };
}

export function advanceToNextRound(state: SessionState): SessionState {
  if (state.failed) return { ...state, status: 'finished' as SessionStatus };
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
    failed: state.failed,
  };
}
