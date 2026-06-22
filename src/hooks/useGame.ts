import { useCallback, useMemo, useState } from 'react';
import {
  advanceToNextRound,
  createSession,
  initialSession,
  selectRounds,
  submitGuess as submitGuessEngine,
} from '../game/GameEngine';
import type { GuessOutcome, SelectRoundsOptions } from '../game/GameEngine';
import { SCORING } from '../game/scoring';
import { emptyProgress } from '../game/progress';
import type { Progress } from '../game/progress';
import type { LatLng, SessionState } from '../game/types';

export function useGame(progress: Progress = emptyProgress()) {
  const [state, setState] = useState<SessionState>(() => initialSession());

  const start = useCallback(
    (opts: SelectRoundsOptions = { mode: 'quick' }) => {
      setState(createSession(progress, opts));
    },
    [progress],
  );

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
    totalRounds: state.rounds.length || SCORING.ROUNDS_PER_SESSION,
    mode: state.mode,
    isEndless: state.mode === 'endless',
    failed: state.failed,
    start,
    reset,
    submitGuess,
    nextRound,
    selectRounds: (opts: SelectRoundsOptions) => selectRounds(progress, opts),
  };
}
