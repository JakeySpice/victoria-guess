import type { Tier } from './types';

export const SCORING = {
  STARTING_SCORE: 100,
  CORRECT_AWARD: 50,
  ZOOM_OUT_PENALTY: 10,
  HINT_PENALTY: 15,
  WRONG_ANSWER_PENALTY: 5,
  STRIKE_OUT_PENALTY: 25,
  ROUNDS_PER_SESSION: 10,
  MIN_ZOOM: 6,
  MAX_ZOOM: 13,
  INITIAL_ZOOM: 7,
  MAX_STRIKES: 3,
  HINTS_PER_PLACE: 3,
} as const;

export const VICTORIA_CENTER: [number, number] = [-37.0, 144.0];

export const HIGH_SCORE_KEY = 'vic-guess-hi';

export const HIGH_SCORE_DEFAULT: Record<Tier, number> = {
  city: 0,
  suburb: 0,
  region: 0,
  smalltown: 0,
};

export function roundScoreForCorrect(
  hintsUsed: number,
  zoomOuts: number,
  wrongGuesses: number,
): number {
  const base = SCORING.STARTING_SCORE + SCORING.CORRECT_AWARD;
  const deductions =
    hintsUsed * SCORING.HINT_PENALTY +
    zoomOuts * SCORING.ZOOM_OUT_PENALTY +
    wrongGuesses * SCORING.WRONG_ANSWER_PENALTY;
  return Math.max(0, base - deductions);
}

export function roundScoreForStrikeOut(
  hintsUsed: number,
  zoomOuts: number,
  wrongGuesses: number,
): number {
  const deductions =
    SCORING.STRIKE_OUT_PENALTY +
    hintsUsed * SCORING.HINT_PENALTY +
    zoomOuts * SCORING.ZOOM_OUT_PENALTY +
    wrongGuesses * SCORING.WRONG_ANSWER_PENALTY;
  return Math.max(0, SCORING.STARTING_SCORE - deductions);
}
