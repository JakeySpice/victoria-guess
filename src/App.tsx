import { useCallback, useEffect, useRef, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { MapView } from './components/MapView';
import { ScoreBar } from './components/ScoreBar';
import { ResultModal } from './components/ResultModal';
import { SummaryScreen } from './components/SummaryScreen';
import { useGame } from './hooks/useGame';
import { useHighScore } from './hooks/useHighScores';
import { TIER_LABELS } from './game/types';
import type { LatLng } from './game/types';

export default function App() {
  const game = useGame();
  const { best, submit, reset: resetBest } = useHighScore();
  const [pendingGuess, setPendingGuess] = useState<LatLng | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const recordedRef = useRef(false);

  // Record the session total exactly once when the game finishes.
  useEffect(() => {
    if (game.state.status === 'finished') {
      if (!recordedRef.current) {
        recordedRef.current = true;
        setIsNewBest(submit(game.state.totalScore));
      }
    } else {
      recordedRef.current = false;
    }
  }, [game.state.status, game.state.totalScore, submit]);

  const handleStart = useCallback(() => {
    setPendingGuess(null);
    setIsNewBest(false);
    game.start();
  }, [game]);

  const handleHome = useCallback(() => {
    setPendingGuess(null);
    game.reset();
  }, [game]);

  const handlePlace = useCallback((g: LatLng) => {
    setPendingGuess(g);
  }, []);

  const handleSubmit = useCallback(() => {
    if (pendingGuess) game.submitGuess(pendingGuess);
  }, [game, pendingGuess]);

  const handleNext = useCallback(() => {
    setPendingGuess(null);
    game.nextRound();
  }, [game]);

  if (game.state.status === 'idle') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <StartScreen best={best} onStart={handleStart} onResetBest={resetBest} />
      </div>
    );
  }

  if (game.state.status === 'finished') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <SummaryScreen
          session={game.state}
          best={best}
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
        best={best}
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
          <ResultModal round={round} onNext={handleNext} isLast={isLast} />
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
