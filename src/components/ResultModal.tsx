import { useState } from 'react';
import { describeLocation, formatKm, haversineKm, ratingForDistance } from '../game/scoring';
import type { RatingTone } from '../game/scoring';
import { TIER_LABELS } from '../game/types';
import type { LatLng, RoundState } from '../game/types';
import {
  masteryFor,
  MASTERY_LABELS,
  masteredAnchors,
  nearbyPlaces,
  biasFor,
} from '../game/progress';
import type { PlaceStat, Progress } from '../game/progress';
import { scaleKmFor } from '../game/places';

interface Props {
  round: RoundState;
  /** This player's prior record for the place (before this round was folded in). */
  priorStat: PlaceStat | undefined;
  onNext: () => void;
  isLast: boolean;
  progress: Progress;
  onQueue: (id: string) => void;
  onUnqueue: (id: string) => void;
  queued: boolean;
}

const TONE_CLASSES: Record<RatingTone, string> = {
  great: 'bg-emerald-100 text-emerald-700',
  good: 'bg-lime-100 text-lime-700',
  ok: 'bg-amber-100 text-amber-700',
  poor: 'bg-rose-100 text-rose-700',
};

export function ResultModal({
  round,
  priorStat,
  onNext,
  isLast,
  progress,
  onQueue,
  onUnqueue,
  queued,
}: Props) {
  const { place, distanceKm, score } = round;
  const km = distanceKm ?? 0;
  const rating = ratingForDistance(km);
  const orientation = describeLocation({ lat: place.lat, lng: place.lng });
  const [studyOpen, setStudyOpen] = useState(false);

  // Personal history including this round, so the player sees their running form.
  const plays = (priorStat?.plays ?? 0) + 1;
  const avgKm =
    ((priorStat?.totalKm ?? 0) + km) / plays;
  const mastery =
    priorStat && priorStat.plays > 0
      ? MASTERY_LABELS[masteryFor(priorStat.emaKm / scaleKmFor(place))]
      : null;

  const target: LatLng = { lat: place.lat, lng: place.lng };
  const anchors = masteredAnchors(progress, target, 2).filter(
    (a) => a.id !== place.id && !(orientation.text ?? '').includes(a.name),
  );

  const bias = biasFor(progress, place.id);
  const showBias = bias?.consistent === true;

  const missed = rating.tone === 'ok' || rating.tone === 'poor';
  const nearby = missed ? nearbyPlaces(place, 4) : [];

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

        {/* Anchor to what you know (§6.4): personal reference points. */}
        {anchors.length > 0 && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <span aria-hidden>🧭</span>
            <span>
              You know{' '}
              <span className="font-semibold">
                {anchors
                  .map(
                    (a) =>
                      `${a.name} (${formatKm(haversineKm(target, a))} km)`,
                  )
                  .join(', ')}
              </span>{' '}
              nearby.
            </span>
          </p>
        )}

        {/* Bias correction (§5.4): only when the offset is consistent. */}
        {showBias && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-300">
            <span aria-hidden>⚠️</span>
            <span>
              You tend to guess this place too far{' '}
              <span className="font-semibold">{bias!.bearing}</span>.
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

        {/* Study this place (§6.4): only when the round was missed. */}
        {missed && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
            <button
              onClick={() => setStudyOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span>Study this place</span>
              <span className="text-xs text-slate-400">
                {studyOpen ? '▲' : '▼'}
              </span>
            </button>
            {studyOpen && (
              <div className="space-y-2 px-3 pb-3 text-sm text-slate-600">
                {nearby.length > 0 && (
                  <p>
                    <span className="font-medium text-slate-700">Nearby: </span>
                    {nearby.map((n) => n.name).join(', ')}
                  </p>
                )}
                <button
                  onClick={() =>
                    queued ? onUnqueue(place.id) : onQueue(place.id)
                  }
                  className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                    queued
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {queued ? 'Queued ✓ for review' : 'Queue for review'}
                </button>
              </div>
            )}
          </div>
        )}

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
