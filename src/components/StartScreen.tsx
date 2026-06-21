import { SCORING, VICTORIA_CENTER } from '../game/scoring';
import { TIER_LABELS } from '../game/types';
import type { HighScores } from './types';

interface Props {
  highScores: HighScores;
  onStart: () => void;
  onResetScores: () => void;
}

export function StartScreen({ highScores, onStart, onResetScores }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold text-slate-800">
          Victoria Guess
        </h1>
        <p className="mt-3 text-slate-600">
          You'll be shown a label-free map of Victoria with one mystery
          location marked. Guess its name. You start at {SCORING.STARTING_SCORE}{' '}
          points. Each correct guess adds {SCORING.CORRECT_AWARD}. Penalties:
        </p>
        <ul className="mt-3 inline-block text-left text-slate-700">
          <li>−{SCORING.ZOOM_OUT_PENALTY} per zoom-out level</li>
          <li>−{SCORING.HINT_PENALTY} per hint revealed (3 per place)</li>
          <li>−{SCORING.WRONG_ANSWER_PENALTY} per wrong guess</li>
          <li>
            −{SCORING.STRIKE_OUT_PENALTY} after {SCORING.MAX_STRIKES} strikes
            (answer revealed, round ends)
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          {SCORING.ROUNDS_PER_SESSION} rounds per session, all tiers mixed.
          Map center: {VICTORIA_CENTER.join(', ')}. Tiles © CARTO ©
          OpenStreetMap contributors.
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 text-left">
        {(Object.keys(highScores) as Array<keyof HighScores>).map((tier) => (
          <div
            key={tier}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {TIER_LABELS[tier]}
            </div>
            <div className="text-2xl font-semibold text-slate-800">
              {highScores[tier]}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onStart}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-700"
        >
          Start Game
        </button>
        <button
          onClick={onResetScores}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 hover:bg-slate-50"
        >
          Reset Scores
        </button>
      </div>
    </div>
  );
}
