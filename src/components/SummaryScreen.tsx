import { summarise } from '../game/GameEngine';
import { SCORING, formatKm } from '../game/scoring';
import type { SessionState } from '../game/types';

interface Props {
  session: SessionState;
  best: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function SummaryScreen({
  session,
  best,
  isNewBest,
  onPlayAgain,
  onHome,
}: Props) {
  const stats = summarise(session);
  const maxPossible = SCORING.ROUNDS_PER_SESSION * SCORING.MAX_ROUND_POINTS;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-800">Game complete</h2>

        {isNewBest && (
          <div className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            🏆 New best!
          </div>
        )}

        <div className="mt-3 text-5xl font-extrabold text-emerald-600">
          {session.totalScore}
          <span className="ml-2 align-middle text-base font-medium text-slate-400">
            / {maxPossible}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Final score · best game {best}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Bullseyes" value={`${stats.bullseyes} / ${stats.rounds}`} />
          <Stat
            label="Closest guess"
            value={stats.bestDistanceKm === null ? '—' : `${formatKm(stats.bestDistanceKm)} km`}
          />
          <Stat
            label="Average miss"
            value={stats.avgDistanceKm === null ? '—' : `${formatKm(stats.avgDistanceKm)} km`}
          />
          <Stat label="Rounds" value={stats.rounds} />
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
