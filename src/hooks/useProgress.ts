import { useCallback, useMemo, useState } from 'react';
import { PLACES } from '../game/places';
import {
  coverageStats,
  emptyProgress,
  exportProgress as exportProgressFn,
  importProgress as importProgressFn,
  loadProgress,
  placeDetail as placeDetailFn,
  placeMasteries,
  queueForReview as queueForReviewFn,
  recordGame as recordGameFn,
  recordRound as recordRoundFn,
  regionalRollup,
  saveProgress,
  summariseProgress,
  unqueueFromReview as unqueueFromReviewFn,
} from '../game/progress';
import type {
  GameRecord,
  PlaceDetail,
  PlaceStat,
  Progress,
} from '../game/progress';

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
  const coverage = useMemo(
    () => coverageStats(progress, PLACES.length),
    [progress],
  );
  const regionalRollupMemo = useMemo(() => regionalRollup(progress), [progress]);

  const getPlaceStat = useCallback(
    (id: string): PlaceStat | undefined => progress.places[id],
    [progress.places],
  );

  const queueForReview = useCallback(
    (id: string) => {
      persist((p) => queueForReviewFn(p, id));
    },
    [persist],
  );

  const unqueueFromReview = useCallback(
    (id: string) => {
      persist((p) => unqueueFromReviewFn(p, id));
    },
    [persist],
  );

  const placeDetail = useCallback(
    (id: string): PlaceDetail | null => placeDetailFn(progress, id),
    [progress],
  );

  const exportProgress = useCallback(
    () => exportProgressFn(progress),
    [progress],
  );

  const importProgress = useCallback(
    (json: string): boolean => {
      const imported = importProgressFn(json);
      if (!imported) return false;
      saveProgress(imported);
      setProgress(imported);
      return true;
    },
    [],
  );

  return {
    progress,
    summary,
    masteries,
    coverage,
    regionalRollup: regionalRollupMemo,
    getPlaceStat,
    recordRound,
    recordGame,
    reset,
    exportProgress,
    importProgress,
    queueForReview,
    unqueueFromReview,
    placeDetail,
  };
}
