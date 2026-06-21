import { formatKm, ratingForDistance } from '../game/scoring';
import type { RatingTone } from '../game/scoring';
import { TIER_LABELS } from '../game/types';
import type { RoundState } from '../game/types';

interface Props {
  round: RoundState;
  onNext: () => void;
  isLast: boolean;
}

const TONE_CLASSES: Record<RatingTone, string> = {
  great: 'bg-emerald-100 text-emerald-700',
  good: 'bg-lime-100 text-lime-700',
  ok: 'bg-amber-100 text-amber-700',
  poor: 'bg-rose-100 text-rose-700',
};

export function ResultModal({ round, onNext, isLast }: Props) {
  const { place, distanceKm, score } = round;
  const km = distanceKm ?? 0;
  const rating = ratingForDistance(km);

  return (
    <div className="absolute inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[rating.tone]}`}
          >
            {rating.label}
          </span>
          <span className="text-2xl font-extrabold text-emerald-600">
            +{score}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold text-slate-800">{place.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {TIER_LABELS[place.tier]} · {place.region}
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Your pin was{' '}
          <span className="font-semibold text-slate-800">{formatKm(km)} km</span>{' '}
          away.
        </p>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Did you know? </span>
          {place.hints[0]}
        </div>

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
