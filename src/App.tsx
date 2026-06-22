import { useCallback, useEffect, useRef, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { MapView } from './components/MapView';
import { ScoreBar } from './components/ScoreBar';
import { ResultModal } from './components/ResultModal';
import { SummaryScreen } from './components/SummaryScreen';
import { useGame } from './hooks/useGame';
import { useProgress } from './hooks/useProgress';
import { summarise } from './game/GameEngine';
import { TIER_LABELS } from './game/types';
import type { LatLng } from './game/types';
import type { PlaceStat } from './game/progress';
import type { SelectRoundsOptions } from './game/GameEngine';

export default function App() {
  const {
    progress,
    summary,
    masteries,
    coverage,
    getPlaceStat,
    recordRound,
    recordGame,
    reset,
    exportProgress,
    importProgress,
  } = useProgress();
  const game = useGame(progress);
  const [pendingGuess, setPendingGuess] = useState<LatLng | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  // Snapshot of the current place's record *before* this round, so the reveal
  // can show "you usually land X km off" without counting the round twice.
  const [priorStat, setPriorStat] = useState<PlaceStat | undefined>(undefined);
  const recordedRef = useRef(false);

  // Record the finished session exactly once (game log + new-best flag).
  useEffect(() => {
    if (game.state.status === 'finished') {
      if (!recordedRef.current) {
        recordedRef.current = true;
        const stats = summarise(game.state);
        setIsNewBest(game.state.totalScore > summary.bestGame);
        recordGame({
          score: game.state.totalScore,
          avgKm: stats.avgDistanceKm ?? 0,
          bullseyes: stats.bullseyes,
          rounds: stats.rounds,
          at: Date.now(),
        });
      }
    } else {
      recordedRef.current = false;
    }
  }, [game.state, summary.bestGame, recordGame]);

  const handleStart = useCallback(
    (opts: SelectRoundsOptions = { mode: 'quick' }) => {
      setPendingGuess(null);
      setPriorStat(undefined);
      setIsNewBest(false);
      game.start(opts);
    },
    [game],
  );

  const handleHome = useCallback(() => {
    setPendingGuess(null);
    setPriorStat(undefined);
    game.reset();
  }, [game]);

  const handlePlace = useCallback((g: LatLng) => {
    setPendingGuess(g);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!pendingGuess) return;
    const round = game.currentRound;
    if (!round) return;
    setPriorStat(getPlaceStat(round.place.id));
    const outcome = game.submitGuess(pendingGuess);
    if (outcome) {
      recordRound(outcome.place.id, outcome.distanceKm, outcome.score);
    }
  }, [game, pendingGuess, getPlaceStat, recordRound]);

  const handleNext = useCallback(() => {
    setPendingGuess(null);
    setPriorStat(undefined);
    game.nextRound();
  }, [game]);

  if (game.state.status === 'idle') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <StartScreen
          summary={summary}
          masteries={masteries}
          coverage={coverage}
          onStart={handleStart}
          onResetProgress={reset}
          onExport={exportProgress}
          onImport={importProgress}
        />
      </div>
    );
  }

  if (game.state.status === 'finished') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <SummaryScreen
          session={game.state}
          summary={summary}
          isNewBest={isNewBest}
          onPlayAgain={handleStart}
          onHome={handleHome}
        />
      </div>
    );
  }

  const round = game.currentRound;
  if (!round) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const revealed = round.status === 'revealed';
  const isLast = game.roundNumber >= game.totalRounds;

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <ScoreBar
        roundNumber={game.roundNumber}
        totalRounds={game.totalRounds}
        totalScore={game.state.totalScore}
        best={summary.bestGame}
      />

      <div className={`relative flex-1 ${revealed ? '' : 'guessing'}`}>
        <MapView round={round} pendingGuess={pendingGuess} onPlace={handlePlace} />

        {!revealed && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center p-3">
            <div className="rounded-full bg-white/95 px-5 py-2 text-center shadow-md ring-1 ring-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Find this place
              </span>
              <div className="text-lg font-bold text-slate-800">
                {round.place.name}
                <span className="ml-2 text-sm font-medium text-slate-400">
                  {TIER_LABELS[round.place.tier]}
                </span>
              </div>
            </div>
          </div>
        )}

        {revealed && (
          <ResultModal
            round={round}
            priorStat={priorStat}
            onNext={handleNext}
            isLast={isLast}
          />
        )}
      </div>

      {!revealed && (
        <div className="border-t border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-slate-500">
              {pendingGuess
                ? 'Pin dropped — submit, or tap the map again to move it.'
                : 'Tap the map where you think it is.'}
            </p>
            <button
              onClick={handleSubmit}
              disabled={!pendingGuess}
              className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Submit guess
            </button>
          </div>
          <div className="mt-1 text-right">
            <button
              onClick={handleHome}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              End game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
