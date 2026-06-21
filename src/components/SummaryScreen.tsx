import { SCORING } from '../game/scoring';
import { summarise } from '../game/GameEngine';
import { TIER_LABELS } from '../game/types';
import type { SessionState, Tier } from '../game/types';
import type { HighScores } from './types';

interface Props {
  session: SessionState;
  highScores: HighScores;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function SummaryScreen({
  session,
  highScores,
  onPlayAgain,
  onHome,
}: Props) {
  const stats = summarise(session);

  // figure out which tiers the player used in this session
  const tiersUsed = Array.from(
    new Set(session.rounds.map((r) => r.place.tier)),
  ) as Tier[];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-800">Session complete</h2>
        <div className="mt-4 text-5xl font-bold text-emerald-700">
          {session.totalScore}
        </div>
        <p className="text-sm text-slate-500">Final score</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Correct" value={`${stats.correct} / ${session.rounds.length}`} />
          <Stat label="Struck out" value={stats.struckOut} />
          <Stat label="Hints used" value={stats.totalHints} />
          <Stat label="Zoom-outs" value={stats.totalZoomOuts} />
          <Stat label="Wrong guesses" value={stats.totalWrong} />
          <Stat
            label="Best possible"
            value={session.rounds.length * (SCORING.STARTING_SCORE + SCORING.CORRECT_AWARD)}
          />
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-600">
            High scores touched this session
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {tiersUsed.map((tier) => (
              <li key={tier} className="flex justify-between">
                <span>{TIER_LABELS[tier]}</span>
                <span className="font-semibold text-slate-800">
                  {highScores[tier]}
                </span>
              </li>
            ))}
            {tiersUsed.length === 0 && (
              <li className="text-slate-500">No tiers played.</li>
            )}
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Play again
          </button>
          <button
            onClick={onHome}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 hover:bg-slate-50"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
