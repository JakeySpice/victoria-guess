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

/** Fast seeded PRNG (mulberry32) — deterministic draw for the Daily challenge. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string into a 32-bit seed for `mulberry32`. */
export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Well-known reference points used to describe where the answer sits
 * (e.g. "≈ 95 km west of Ballarat"). Kept short and spread across the state
 * so almost any place has a familiar anchor nearby.
 */
const ANCHORS: { name: string; lat: number; lng: number }[] = [
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { name: 'Geelong', lat: -38.1475, lng: 144.3617 },
  { name: 'Ballarat', lat: -37.5622, lng: 143.8498 },
  { name: 'Bendigo', lat: -36.7578, lng: 144.2805 },
  { name: 'Shepparton', lat: -36.3801, lng: 145.3972 },
  { name: 'Wodonga', lat: -36.1214, lng: 146.8881 },
  { name: 'Wangaratta', lat: -36.3895, lng: 146.3086 },
  { name: 'Traralgon', lat: -38.1975, lng: 146.8206 },
  { name: 'Bairnsdale', lat: -37.8255, lng: 147.61 },
  { name: 'Warrnambool', lat: -38.3845, lng: 142.4805 },
  { name: 'Hamilton', lat: -37.7447, lng: 142.0233 },
  { name: 'Horsham', lat: -36.7139, lng: 142.2004 },
  { name: 'Mildura', lat: -34.1848, lng: 142.1623 },
  { name: 'Swan Hill', lat: -35.338, lng: 143.5544 },
];

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const COMPASS_WORDS: Record<string, string> = {
  N: 'north',
  NE: 'north-east',
  E: 'east',
  SE: 'south-east',
  S: 'south',
  SW: 'south-west',
  W: 'west',
  NW: 'north-west',
};

/** Initial bearing from a → b, in degrees (0 = north, clockwise). */
function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function compass8(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) / 45) % 8;
  return COMPASS[idx];
}

export interface BearingDescription {
  bearing: string;
  magnitudeKm: number;
}

export function bearingDescription(
  dLat: number,
  dLng: number,
  refLat: number = VICTORIA_CENTER[0],
): BearingDescription {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((refLat * Math.PI) / 180);
  const northKm = dLat * kmPerDegLat;
  const eastKm = dLng * kmPerDegLng;
  const magnitudeKm = Math.sqrt(northKm * northKm + eastKm * eastKm);
  const deg = (Math.atan2(eastKm, northKm) * 180) / Math.PI;
  return { bearing: COMPASS_WORDS[compass8(deg)], magnitudeKm };
}

export interface LocationDescription {
  /** Plain-language orientation, e.g. "95 km west of Ballarat". Null if the
   *  place basically *is* an anchor (too close to describe by bearing). */
  text: string | null;
}

/**
 * Describe a target relative to the nearest well-known town, so the reveal
 * teaches *where* the place is rather than just naming it.
 */
export function describeLocation(target: LatLng): LocationDescription {
  let best: { name: string; km: number } | null = null;
  for (const a of ANCHORS) {
    const km = haversineKm(target, a);
    if (!best || km < best.km) best = { name: a.name, km };
  }
  if (!best || best.km < 8) return { text: null };

  const anchor = ANCHORS.find((a) => a.name === best!.name)!;
  const dir = COMPASS_WORDS[compass8(bearingDeg(anchor, target))];
  return { text: `${formatKm(best.km)} km ${dir} of ${best.name}` };
}
