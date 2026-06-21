import { useCallback, useMemo, useState } from 'react';
import {
  applyGuess,
  applyHint,
  applyZoomOut,
  advanceToNextRound,
  createSession,
  initialSession,
} from '../game/GameEngine';
import type { RoundOutcome, } from '../game/GameEngine';
import { SCORING } from '../game/scoring';
import type { SessionState } from '../game/types';

export function useGame() {
  const [state, setState] = useState<SessionState>(() => initialSession());

  const start = useCallback(() => {
    setState(createSession());
  }, []);

  const reset = useCallback(() => {
    setState(initialSession());
  }, []);

  const currentRound = useMemo(
    () => state.rounds[state.currentIndex] ?? null,
    [state.rounds, state.currentIndex],
  );

  const submitGuess = useCallback(
    (guess: string): RoundOutcome => {
      let outcome: RoundOutcome = {
        kind: 'wrong',
        strikes: 0,
        remaining: 0,
      };
      setState((s) => {
        const { state: next, outcome: o } = applyGuess(s, guess);
        outcome = o;
        return next;
      });
      return outcome;
    },
    [],
  );

  const revealHint = useCallback(() => {
    let revealed: string | null = null;
    setState((s) => {
      const { state: next, revealed: r } = applyHint(s);
      revealed = r;
      return next;
    });
    return revealed;
  }, []);

  const reportZoomOut = useCallback((deltaLevels: number) => {
    setState((s) => applyZoomOut(s, deltaLevels));
  }, []);

  const nextRound = useCallback(() => {
    setState((s) => advanceToNextRound(s));
  }, []);

  return {
    state,
    currentRound,
    roundNumber: state.currentIndex + 1,
    totalRounds: SCORING.ROUNDS_PER_SESSION,
    start,
    reset,
    submitGuess,
    revealHint,
    reportZoomOut,
    nextRound,
  };
}
