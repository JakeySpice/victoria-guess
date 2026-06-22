import { useCallback, useMemo, useState } from 'react';
import {
  emptyProgress,
  loadProgress,
  placeMasteries,
  recordGame as recordGameFn,
  recordRound as recordRoundFn,
  saveProgress,
  summariseProgress,
} from '../game/progress';
import type { GameRecord, PlaceStat, Progress } from '../game/progress';

/**
 * Owns the persistent learning record: rolling-average form, trend, and
 * per-place mastery. Reads/writes localStorage so progress carries across plays.
 */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const persist = useCallback((updater: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const recordRound = useCallback(
    (placeId: string, distanceKm: number, score: number) => {
      persist((p) => recordRoundFn(p, placeId, distanceKm, score));
    },
    [persist],
  );

  const recordGame = useCallback(
    (game: GameRecord) => {
      persist((p) => recordGameFn(p, game));
    },
    [persist],
  );

  const reset = useCallback(() => {
    const fresh = emptyProgress();
    saveProgress(fresh);
    setProgress(fresh);
  }, []);

  const summary = useMemo(() => summariseProgress(progress), [progress]);
  const masteries = useMemo(() => placeMasteries(progress), [progress]);

  const getPlaceStat = useCallback(
    (id: string): PlaceStat | undefined => progress.places[id],
    [progress.places],
  );

  return { summary, masteries, getPlaceStat, recordRound, recordGame, reset };
}
