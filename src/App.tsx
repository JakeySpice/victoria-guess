import { useCallback, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { MapView } from './components/MapView';
import { ScoreBar } from './components/ScoreBar';
import { GuessInput } from './components/GuessInput';
import { HintPanel } from './components/HintPanel';
import { ResultModal } from './components/ResultModal';
import { SummaryScreen } from './components/SummaryScreen';
import { useGame } from './hooks/useGame';
import { useHighScores } from './hooks/useHighScores';
import { SCORING } from './game/scoring';

export default function App() {
  const game = useGame();
  const { scores, update, reset: resetScores } = useHighScores();
  const [shakeNonce, setShakeNonce] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<boolean | null>(null);

  const handleStart = useCallback(() => {
    setWrongFlash(null);
    game.start();
  }, [game]);

  const handleHome = useCallback(() => {
    setWrongFlash(null);
    game.reset();
  }, [game]);

  const handleGuess = useCallback(
    (guess: string) => {
      const outcome = game.submitGuess(guess);
      if (outcome.kind === 'wrong') {
        setWrongFlash(true);
        setShakeNonce((n) => n + 1);
      } else {
        setWrongFlash(false);
        if (outcome.kind === 'correct' || outcome.kind === 'struck_out') {
          update(outcome.place.tier, outcome.score);
        }
      }
    },
    [game, update],
  );

  const handleNext = useCallback(() => {
    setWrongFlash(null);
    game.nextRound();
  }, [game]);

  const handleRevealHint = useCallback(() => {
    game.revealHint();
  }, [game]);

  const handleZoomOut = useCallback(
    (deltaLevels: number) => {
      game.reportZoomOut(deltaLevels);
    },
    [game],
  );

  if (game.state.status === 'idle') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <StartScreen
          highScores={scores}
          onStart={handleStart}
          onResetScores={resetScores}
        />
      </div>
    );
  }

  if (game.state.status === 'finished') {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <SummaryScreen
          session={game.state}
          highScores={scores}
          onPlayAgain={handleStart}
          onHome={handleHome}
        />
      </div>
    );
  }

  // playing
  const round = game.currentRound;
  if (!round) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const roundFinished = round.status !== 'playing';
  const isLast = game.roundNumber >= game.totalRounds;

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <ScoreBar
        totalScore={game.state.totalScore}
        roundNumber={game.roundNumber}
        totalRounds={game.totalRounds}
        hintsUsed={round.hintsUsed}
        zoomOuts={round.zoomOuts}
        strikes={round.strikes}
        maxStrikes={SCORING.MAX_STRIKES}
      />
      <div className="relative flex-1">
        <MapView
          round={round}
          onZoomOut={handleZoomOut}
          showLabel={roundFinished}
        />
        {roundFinished && (
          <ResultModal round={round} onNext={handleNext} isLast={isLast} />
        )}
      </div>
      <div className="border-t border-slate-200 bg-white">
        <GuessInput
          disabled={roundFinished}
          shakeNonce={shakeNonce}
          onSubmit={handleGuess}
          lastGuessWrong={wrongFlash}
          remainingStrikes={SCORING.MAX_STRIKES - round.strikes}
        />
        <HintPanel
          place={round.place}
          revealedHints={round.revealedHints}
          disabled={roundFinished}
          onReveal={handleRevealHint}
        />
        <div className="flex items-center justify-end px-3 py-2 text-xs text-slate-400">
          <button
            onClick={handleHome}
            className="text-slate-400 underline hover:text-slate-600"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
