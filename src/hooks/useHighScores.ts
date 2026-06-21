import { useCallback, useEffect, useState } from 'react';
import { HIGH_SCORE_KEY } from '../game/scoring';

function read(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function write(best: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(best));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** Tracks the best session total across plays. */
export function useHighScore() {
  const [best, setBest] = useState<number>(() => read());

  useEffect(() => {
    write(best);
  }, [best]);

  /** Record a finished session; returns true if it set a new record. */
  const submit = useCallback(
    (total: number): boolean => {
      if (total > best) {
        setBest(total);
        return true;
      }
      return false;
    },
    [best],
  );

  const reset = useCallback(() => setBest(0), []);

  return { best, submit, reset };
}
