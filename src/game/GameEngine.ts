import { PLACES } from './places';
import {
  SCORING,
  roundScoreForCorrect,
  roundScoreForStrikeOut,
} from './scoring';
import type {
  Place,
  RoundState,
  RoundStatus,
  SessionState,
  SessionStatus,
  SessionStats,
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
    status: 'playing',
    strikes: 0,
    revealedHints: 0,
    zoomOuts: 0,
    wrongGuesses: 0,
    scoreEarned: 0,
    hintsUsed: 0,
  };
}

export function createSession(): SessionState {
  const deck = shuffle(PLACES).slice(0, SCORING.ROUNDS_PER_SESSION);
  return {
    status: 'playing',
    rounds: deck.map(makeRound),
    currentIndex: 0,
    totalScore: 0,
    deck,
  };
}

export function initialSession(): SessionState {
  return {
    status: 'idle',
    rounds: [],
    currentIndex: 0,
    totalScore: 0,
    deck: [],
  };
}

export type RoundOutcome =
  | { kind: 'correct'; score: number; place: Place }
  | { kind: 'wrong'; strikes: number; remaining: number }
  | { kind: 'struck_out'; score: number; place: Place };

export function applyGuess(
  state: SessionState,
  guess: string,
): { state: SessionState; outcome: RoundOutcome } {
  const idx = state.currentIndex;
  const round = state.rounds[idx];
  if (!round || round.status !== 'playing') {
    return { state, outcome: { kind: 'wrong', strikes: 0, remaining: 0 } };
  }

  // fuzzy match handled here for cleanliness
  const g = guess.trim().toLowerCase().replace(/[^a-z]/g, '');
  const ans = round.place.name.toLowerCase().replace(/[^a-z]/g, '');
  const matches =
    g === ans ||
    (round.place.aliases ?? []).some(
      (a) => a.toLowerCase().replace(/[^a-z]/g, '') === g,
    ) ||
    (ans.length <= 8 && levenshtein(g, ans) <= 2);

  if (matches) {
    const score = roundScoreForCorrect(
      round.hintsUsed,
      round.zoomOuts,
      round.wrongGuesses,
    );
    const updatedRound: RoundState = {
      ...round,
      status: 'correct' as RoundStatus,
      scoreEarned: score,
    };
    const rounds = state.rounds.slice();
    rounds[idx] = updatedRound;
    const totalScore = state.totalScore + score;
    return {
      state: { ...state, rounds, totalScore },
      outcome: { kind: 'correct', score, place: round.place },
    };
  }

  const newStrikes = round.strikes + 1;
  const newWrong = round.wrongGuesses + 1;
  if (newStrikes >= SCORING.MAX_STRIKES) {
    const score = roundScoreForStrikeOut(
      round.hintsUsed,
      round.zoomOuts,
      newWrong,
    );
    const updatedRound: RoundState = {
      ...round,
      status: 'struck_out' as RoundStatus,
      strikes: newStrikes,
      wrongGuesses: newWrong,
      scoreEarned: score,
    };
    const rounds = state.rounds.slice();
    rounds[idx] = updatedRound;
    const totalScore = state.totalScore + score;
    return {
      state: { ...state, rounds, totalScore },
      outcome: { kind: 'struck_out', score, place: round.place },
    };
  }

  const updatedRound: RoundState = {
    ...round,
    strikes: newStrikes,
    wrongGuesses: newWrong,
  };
  const rounds = state.rounds.slice();
  rounds[idx] = updatedRound;
  return {
    state: { ...state, rounds },
    outcome: {
      kind: 'wrong',
      strikes: newStrikes,
      remaining: SCORING.MAX_STRIKES - newStrikes,
    },
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function applyHint(
  state: SessionState,
): { state: SessionState; revealed: string | null } {
  const idx = state.currentIndex;
  const round = state.rounds[idx];
  if (!round || round.status !== 'playing') return { state, revealed: null };
  if (round.revealedHints >= round.place.hints.length) {
    return { state, revealed: null };
  }
  const newRevealed = round.revealedHints + 1;
  const updatedRound: RoundState = {
    ...round,
    revealedHints: newRevealed,
    hintsUsed: newRevealed,
  };
  const rounds = state.rounds.slice();
  rounds[idx] = updatedRound;
  return {
    state: { ...state, rounds },
    revealed: round.place.hints[newRevealed - 1],
  };
}

export function applyZoomOut(
  state: SessionState,
  deltaLevels: number,
): SessionState {
  if (deltaLevels <= 0) return state;
  const idx = state.currentIndex;
  const round = state.rounds[idx];
  if (!round || round.status !== 'playing') return state;
  const updatedRound: RoundState = {
    ...round,
    zoomOuts: round.zoomOuts + deltaLevels,
  };
  const rounds = state.rounds.slice();
  rounds[idx] = updatedRound;
  return { ...state, rounds };
}

export function advanceToNextRound(state: SessionState): SessionState {
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.rounds.length) {
    return { ...state, status: 'finished' as SessionStatus };
  }
  return { ...state, currentIndex: nextIndex };
}

export function summarise(state: SessionState): SessionStats {
  let correct = 0;
  let struckOut = 0;
  let totalHints = 0;
  let totalZoomOuts = 0;
  let totalWrong = 0;
  for (const r of state.rounds) {
    if (r.status === 'correct') correct++;
    else if (r.status === 'struck_out') struckOut++;
    totalHints += r.hintsUsed;
    totalZoomOuts += r.zoomOuts;
    totalWrong += r.wrongGuesses;
  }
  return { correct, struckOut, totalHints, totalZoomOuts, totalWrong };
}
