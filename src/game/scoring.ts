import type { LatLng } from './types';

export const SCORING = {
  ROUNDS_PER_SESSION: 5,
  MAX_ROUND_POINTS: 1000,
  /** Distance (km) at which a round is worth ~37% of max — controls the curve. */
  DISTANCE_SCALE_KM: 150,
  /** Within this many km counts as a bullseye. */
  BULLSEYE_KM: 15,
} as const;

export const VICTORIA_CENTER: [number, number] = [-36.8, 144.3];

/** Roughly the bounding box of Victoria — keeps the map (and clicks) in-state. */
export const VICTORIA_BOUNDS: [[number, number], [number, number]] = [
  [-39.4, 140.6],
  [-33.7, 150.3],
];

export const INITIAL_ZOOM = 6;
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 12;

export const HIGH_SCORE_KEY = 'vic-guess-best-v2';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Smooth reward curve: 1000 at the spot, decaying with distance, never below 0. */
export function scoreForDistance(km: number): number {
  return Math.round(
    SCORING.MAX_ROUND_POINTS * Math.exp(-km / SCORING.DISTANCE_SCALE_KM),
  );
}

export type RatingTone = 'great' | 'good' | 'ok' | 'poor';

export interface Rating {
  label: string;
  tone: RatingTone;
}

export function ratingForDistance(km: number): Rating {
  if (km <= SCORING.BULLSEYE_KM) return { label: 'Bullseye!', tone: 'great' };
  if (km <= 50) return { label: 'Great', tone: 'great' };
  if (km <= 120) return { label: 'Good', tone: 'good' };
  if (km <= 300) return { label: 'Close-ish', tone: 'ok' };
  return { label: 'Way off', tone: 'poor' };
}

/** Format a distance for display: one decimal when very close, else whole km. */
export function formatKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}
