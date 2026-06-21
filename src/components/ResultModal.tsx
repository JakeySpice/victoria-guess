import { TIER_LABELS } from '../game/types';
import type { RoundState } from '../game/types';

interface Props {
  round: RoundState;
  onNext: () => void;
  isLast: boolean;
}

export function ResultModal({ round, onNext, isLast }: Props) {
  const { place, status, scoreEarned } = round;
  const correct = status === 'correct';
  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div
          className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            correct
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {correct ? 'Correct!' : 'Struck out'}
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{place.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {TIER_LABELS[place.tier]} · {place.region}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-sm text-slate-500">Round score</span>
          <span
            className={`text-3xl font-bold ${
              correct ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {correct ? `+${scoreEarned}` : `${scoreEarned}`}
          </span>
        </div>

        {!correct && (
          <p className="mt-2 text-sm text-slate-600">
            The location was marked on the map. Use the labelled overlay to
            orient yourself before the next round.
          </p>
        )}

        <button
          onClick={onNext}
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
        >
          {isLast ? 'See results' : 'Next round'}
        </button>
      </div>
    </div>
  );
}
