import { useCallback, useMemo, useState } from 'react';
import {
  advanceToNextRound,
  createSession,
  initialSession,
  submitGuess as submitGuessEngine,
} from '../game/GameEngine';
import type { GuessOutcome } from '../game/GameEngine';
import { SCORING } from '../game/scoring';
import type { LatLng, SessionState } from '../game/types';

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
    (guess: LatLng): GuessOutcome | null => {
      const { state: next, outcome } = submitGuessEngine(state, guess);
      setState(next);
      return outcome;
    },
    [state],
  );

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
    nextRound,
  };
}
