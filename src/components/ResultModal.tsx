import { describeLocation, formatKm, ratingForDistance } from '../game/scoring';
import type { RatingTone } from '../game/scoring';
import { TIER_LABELS } from '../game/types';
import type { RoundState } from '../game/types';
import { masteryFor, MASTERY_LABELS } from '../game/progress';
import type { PlaceStat } from '../game/progress';
import { scaleKmFor } from '../game/places';

interface Props {
  round: RoundState;
  /** This player's prior record for the place (before this round was folded in). */
  priorStat: PlaceStat | undefined;
  onNext: () => void;
  isLast: boolean;
}

const TONE_CLASSES: Record<RatingTone, string> = {
  great: 'bg-emerald-100 text-emerald-700',
  good: 'bg-lime-100 text-lime-700',
  ok: 'bg-amber-100 text-amber-700',
  poor: 'bg-rose-100 text-rose-700',
};

export function ResultModal({ round, priorStat, onNext, isLast }: Props) {
  const { place, distanceKm, score } = round;
  const km = distanceKm ?? 0;
  const rating = ratingForDistance(km);
  const orientation = describeLocation({ lat: place.lat, lng: place.lng });

  // Personal history including this round, so the player sees their running form.
  const plays = (priorStat?.plays ?? 0) + 1;
  const avgKm =
    ((priorStat?.totalKm ?? 0) + km) / plays;
  const mastery =
    priorStat && priorStat.plays > 0
      ? MASTERY_LABELS[masteryFor(priorStat.emaKm / scaleKmFor(place))]
      : null;

  return (
    // Bottom sheet — deliberately does NOT cover the map, so the labelled answer
    // pin stays visible while you read where it actually is.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
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

        <h2 className="mt-2 text-2xl font-bold text-slate-800">{place.name}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {TIER_LABELS[place.tier]} · {place.region}
        </p>

        {/* The teaching line: where this place sits relative to a familiar town. */}
        {orientation.text && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
            <span aria-hidden>📍</span>
            <span>
              It's <span className="font-semibold">{orientation.text}</span>.
            </span>
          </p>
        )}

        <p className="mt-3 text-sm text-slate-600">
          Your pin was{' '}
          <span className="font-semibold text-slate-800">{formatKm(km)} km</span>{' '}
          away.
          {plays > 1 && (
            <span className="text-slate-500">
              {' '}You've had this {plays}× — you usually land{' '}
              <span className="font-semibold text-slate-700">
                {formatKm(avgKm)} km
              </span>{' '}
              off{mastery ? ` (${mastery})` : ''}.
            </span>
          )}
        </p>

        <button
          onClick={onNext}
          className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
        >
          {isLast ? 'See results' : 'Next round'}
        </button>
      </div>
    </div>
  );
}
