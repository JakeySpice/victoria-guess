import type { Tier } from '../game/types';

export type HighScores = Record<Tier, number>;

export interface RoundResult {
  correct: boolean;
  placeName: string;
  scoreEarned: number;
  endRound: boolean;
  remainingStrikes: number;
}
