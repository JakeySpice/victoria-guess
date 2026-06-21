import { useCallback, useEffect, useState } from 'react';
import { HIGH_SCORE_DEFAULT, HIGH_SCORE_KEY } from '../game/scoring';
import type { Tier } from '../game/types';

type HighScores = Record<Tier, number>;

function read(): HighScores {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return { ...HIGH_SCORE_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<HighScores>;
    return { ...HIGH_SCORE_DEFAULT, ...parsed };
  } catch {
    return { ...HIGH_SCORE_DEFAULT };
  }
}

function write(scores: HighScores): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<HighScores>(() => read());

  useEffect(() => {
    write(scores);
  }, [scores]);

  const update = useCallback((tier: Tier, score: number) => {
    setScores((prev) => (score > prev[tier] ? { ...prev, [tier]: score } : prev));
  }, []);

  const reset = useCallback(() => {
    setScores({ ...HIGH_SCORE_DEFAULT });
  }, []);

  return { scores, update, reset };
}
