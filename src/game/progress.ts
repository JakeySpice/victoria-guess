import { PLACE_BY_ID, PLACES, REGIONS, placesInRegion, scaleKmFor } from './places';
import { bearingDescription, haversineKm, ratingForDistance, SCORING } from './scoring';
import type { LatLng, Place, RegionId, Tier } from './types';

/**
 * Persistent learning record. Two things are tracked:
 *  - a chronological list of finished games (for the rolling-average / trend), and
 *  - per-place stats (how close you usually land — your "mastery" of each spot).
 *
 * Everything lives in localStorage so progress survives across visits without a
 * backend. Numbers are kept as running totals so averages stay cheap to derive.
 */

export const PROGRESS_KEY = 'vic-guess-progress-v2';
const PROGRESS_KEY_V1 = 'vic-guess-progress-v1';

/** How many recent games define your "current form" average. */
export const RECENT_WINDOW = 5;
/** Keep the game log bounded so storage never grows without limit. */
const MAX_GAMES = 200;

/** Recency weight for `emaKm`: α·distanceKm + (1−α)·emaKm. */
export const EMA_ALPHA = 0.4;
/** Fallback seed for emaKm when a migrated place has no plays yet. */
const DEFAULT_EMA_KM = 50;
/** Fallback scale (km) when a place has no `scaleKm` (density normaliser). */
const DEFAULT_SCALE_KM = 50;

/** Milliseconds in one day. Exported for the engine / UI due-date math. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Upper bound on the SM-2 / Leitner review interval (days). */
export const MAX_INTERVAL_DAYS = 60;

export interface PlaceStat {
  plays: number;
  /** Sum of guess distances (km) — divide by plays for the average miss. */
  totalKm: number;
  /** Closest you've ever landed to this place (km). */
  bestKm: number;
  /** Your most recent miss for this place (km). */
  lastKm: number;
  /** Sum of round points earned here. */
  totalScore: number;
  /** Recency-weighted miss (km). Drives mastery instead of the flat average. */
  emaKm: number;
  /** ms timestamp of the most recent round played here (0 if never). */
  lastPlayedAt: number;
  /** Consecutive great/bullseye rounds (resets on anything worse). */
  streak: number;
  /** Future SRS interval in days (phase 2). */
  intervalDays?: number;
  /** Mean signed guess offset, for future bias detection. */
  meanOffset?: { dLat: number; dLng: number };
  /** Player-flagged for the "study this place" review queue (§6.4). */
  queued?: boolean;
}

export interface GameRecord {
  score: number;
  avgKm: number;
  bullseyes: number;
  rounds: number;
  at: number;
}

export interface Progress {
  version: 2;
  games: GameRecord[];
  places: Record<string, PlaceStat>;
}

export function emptyProgress(): Progress {
  return { version: 2, games: [], places: {} };
}

/**
 * Defensive scale lookup: uses the precomputed `scaleKm` on the place when
 * available, falling back to a constant so mastery still works if the place
 * dataset hasn't been enriched yet.
 */
function scaleForPlaceId(id: string): number {
  return PLACE_BY_ID[id]?.scaleKm ?? DEFAULT_SCALE_KM;
}

/** Tolerant normaliser for a v2 blob that may have been hand-edited / partial. */
function normaliseV2(parsed: Partial<Progress>): Progress {
  const games = Array.isArray(parsed.games) ? parsed.games : [];
  const rawPlaces =
    parsed.places && typeof parsed.places === 'object'
      ? (parsed.places as Record<string, Partial<PlaceStat>>)
      : {};
  const places: Record<string, PlaceStat> = {};
  for (const [id, s] of Object.entries(rawPlaces)) {
    if (!s || typeof s !== 'object') continue;
    const plays = s.plays ?? 0;
    const totalKm = s.totalKm ?? 0;
    const stat: PlaceStat = {
      plays,
      totalKm,
      bestKm: s.bestKm ?? 0,
      lastKm: s.lastKm ?? 0,
      totalScore: s.totalScore ?? 0,
      emaKm:
        s.emaKm ?? (plays > 0 ? totalKm / plays : DEFAULT_EMA_KM),
      lastPlayedAt: s.lastPlayedAt ?? 0,
      streak: s.streak ?? 0,
    };
    if (s.intervalDays !== undefined) stat.intervalDays = s.intervalDays;
    if (s.meanOffset !== undefined) stat.meanOffset = s.meanOffset;
    if (s.queued !== undefined) stat.queued = s.queued;
    places[id] = stat;
  }
  return { version: 2, games, places };
}

/** Migrate a v1 record into the v2 schema, seeding the new fields sensibly. */
export function migrateV1toV2(old: Partial<Progress>): Progress {
  const games = Array.isArray(old.games) ? old.games : [];
  const latestAt = games.length
    ? Math.max(...games.map((g) => g.at ?? 0))
    : 0;
  const rawPlaces =
    old.places && typeof old.places === 'object'
      ? (old.places as Record<string, Partial<PlaceStat>>)
      : {};
  const places: Record<string, PlaceStat> = {};
  for (const [id, s] of Object.entries(rawPlaces)) {
    if (!s || typeof s !== 'object') continue;
    const plays = s.plays ?? 0;
    const totalKm = s.totalKm ?? 0;
    const stat: PlaceStat = {
      plays,
      totalKm,
      bestKm: s.bestKm ?? 0,
      lastKm: s.lastKm ?? 0,
      totalScore: s.totalScore ?? 0,
      emaKm: plays > 0 ? totalKm / plays : DEFAULT_EMA_KM,
      lastPlayedAt: latestAt,
      streak: 0,
    };
    if (s.queued !== undefined) stat.queued = s.queued;
    places[id] = stat;
  }
  return { version: 2, games, places };
}

export function loadProgress(): Progress {
  try {
    const rawV2 = localStorage.getItem(PROGRESS_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<Progress>;
      if (parsed && parsed.version === 2) return normaliseV2(parsed);
    }
    const rawV1 = localStorage.getItem(PROGRESS_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Partial<Progress>;
      const migrated = migrateV1toV2(parsed);
      saveProgress(migrated);
      return migrated;
    }
    return emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** Fold one revealed round into the per-place record. Returns a new Progress. */
export function recordRound(
  prev: Progress,
  placeId: string,
  distanceKm: number,
  score: number,
  guess?: LatLng,
  truth?: LatLng,
): Progress {
  const cur = prev.places[placeId];
  const prevEma = cur?.emaKm ?? distanceKm;
  const emaKm = EMA_ALPHA * distanceKm + (1 - EMA_ALPHA) * prevEma;
  const newStreak = distanceKm <= 50 ? (cur?.streak ?? 0) + 1 : 0;

  const tone = ratingForDistance(distanceKm).tone;
  const prevInterval = cur?.intervalDays;
  let intervalDays: number;
  if (tone === 'great') {
    intervalDays = prevInterval !== undefined
      ? Math.min(prevInterval * 2, MAX_INTERVAL_DAYS)
      : 3;
  } else if (tone === 'good') {
    intervalDays = prevInterval !== undefined
      ? Math.min(prevInterval * 1.3, MAX_INTERVAL_DAYS)
      : 2;
  } else if (tone === 'ok') {
    intervalDays = Math.min(Math.max(1, (prevInterval ?? 1) * 1.1), MAX_INTERVAL_DAYS);
  } else {
    intervalDays = 1;
  }

  let meanOffset: { dLat: number; dLng: number } | undefined;
  if (guess && truth) {
    const dLat = guess.lat - truth.lat;
    const dLng = guess.lng - truth.lng;
    const prev = cur?.meanOffset;
    meanOffset = prev
      ? {
          dLat: EMA_ALPHA * dLat + (1 - EMA_ALPHA) * prev.dLat,
          dLng: EMA_ALPHA * dLng + (1 - EMA_ALPHA) * prev.dLng,
        }
      : { dLat, dLng };
  } else if (cur?.meanOffset !== undefined) {
    meanOffset = cur.meanOffset;
  }

  const next: PlaceStat = {
    plays: (cur?.plays ?? 0) + 1,
    totalKm: (cur?.totalKm ?? 0) + distanceKm,
    bestKm: cur ? Math.min(cur.bestKm, distanceKm) : distanceKm,
    lastKm: distanceKm,
    totalScore: (cur?.totalScore ?? 0) + score,
    emaKm,
    lastPlayedAt: Date.now(),
    streak: newStreak,
    intervalDays,
  };
  if (meanOffset !== undefined) next.meanOffset = meanOffset;
  if (cur?.queued !== undefined) next.queued = cur.queued;
  return { ...prev, places: { ...prev.places, [placeId]: next } };
}

/** Append a finished game to the log. Returns a new Progress. */
export function recordGame(prev: Progress, game: GameRecord): Progress {
  const games = [...prev.games, game].slice(-MAX_GAMES);
  return { ...prev, games };
}

/**
 * Flag a place for the "study this place" review queue (§6.4). Creates a
 * zero-play stub if the place has never been seen, so it can be queued before
 * being played. No-op-safe: always returns a new Progress.
 */
export function queueForReview(prev: Progress, id: string): Progress {
  const cur = prev.places[id];
  const stat: PlaceStat = cur
    ? { ...cur, queued: true }
    : {
        plays: 0,
        totalKm: 0,
        bestKm: 0,
        lastKm: 0,
        totalScore: 0,
        emaKm: DEFAULT_EMA_KM,
        lastPlayedAt: 0,
        streak: 0,
        queued: true,
      };
  return { ...prev, places: { ...prev.places, [id]: stat } };
}

/** Remove a place from the review queue, preserving all other stat fields. */
export function unqueueFromReview(prev: Progress, id: string): Progress {
  const cur = prev.places[id];
  if (!cur) return prev;
  const next: PlaceStat = { ...cur };
  delete next.queued;
  return { ...prev, places: { ...prev.places, [id]: next } };
}

export interface PlaceDetail {
  id: string;
  name: string;
  tier: Tier;
  region: RegionId;
  lat: number;
  lng: number;
  scaleKm: number;
  plays: number;
  bestKm: number;
  lastKm: number;
  emaKm: number;
  streak: number;
  lastPlayedAt: number;
  queued: boolean;
  level: MasteryLevel;
  e: number;
  dueInDays: number | null;
}

/**
 * Aggregate per-place view for the mastery map UI: static place metadata plus
 * the learner's stat block, normalised error, mastery level, and a heuristic
 * "due in days" value (positive = overdue). Returns null for unknown ids.
 */
export function placeDetail(p: Progress, id: string): PlaceDetail | null {
  const place = PLACE_BY_ID[id];
  if (!place) return null;
  const s = p.places[id];
  const plays = s?.plays ?? 0;
  const scaleKm = scaleKmFor(place);
  const emaKm = s?.emaKm ?? DEFAULT_EMA_KM;
  const e = emaKm / scaleKm;
  const lastPlayedAt = s?.lastPlayedAt ?? 0;
  const dueInDays =
    plays > 0 ? Math.floor((Date.now() - lastPlayedAt) / DAY_MS) : null;
  return {
    id,
    name: place.name,
    tier: place.tier,
    region: place.region,
    lat: place.lat,
    lng: place.lng,
    scaleKm,
    plays,
    bestKm: s?.bestKm ?? 0,
    lastKm: s?.lastKm ?? 0,
    emaKm,
    streak: s?.streak ?? 0,
    lastPlayedAt,
    queued: s?.queued === true,
    level: masteryFor(e),
    e,
    dueInDays,
  };
}

export type Trend = 'up' | 'down' | 'flat';

export interface ProgressSummary {
  gamesPlayed: number;
  bestGame: number;
  /** Average score over your most recent games (current form). */
  recentAvg: number | null;
  /** Average score across every game played. */
  allTimeAvg: number | null;
  /** Recent form vs. the window before it. */
  trend: Trend | null;
  /** Most recent game scores, oldest→newest, for a sparkline. */
  recentScores: number[];
}

function mean(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0) / ns.length;
}

export function summariseProgress(p: Progress): ProgressSummary {
  const scores = p.games.map((g) => g.score);
  const n = scores.length;
  if (n === 0) {
    return {
      gamesPlayed: 0,
      bestGame: 0,
      recentAvg: null,
      allTimeAvg: null,
      trend: null,
      recentScores: [],
    };
  }

  const recent = scores.slice(-RECENT_WINDOW);
  const recentAvg = mean(recent);
  const allTimeAvg = mean(scores);

  // Trend compares the latest window to the window immediately before it.
  let trend: Trend | null = null;
  if (n >= RECENT_WINDOW * 2) {
    const prevWindow = scores.slice(-RECENT_WINDOW * 2, -RECENT_WINDOW);
    const delta = recentAvg - mean(prevWindow);
    const threshold = SCORING.MAX_ROUND_POINTS * 0.05; // ~50 pts of noise
    trend = delta > threshold ? 'up' : delta < -threshold ? 'down' : 'flat';
  }

  return {
    gamesPlayed: n,
    bestGame: Math.max(...scores),
    recentAvg,
    allTimeAvg,
    trend,
    recentScores: scores.slice(-12),
  };
}

export type MasteryLevel = 'mastered' | 'strong' | 'learning' | 'shaky' | 'weak';

export interface PlaceMastery {
  id: string;
  plays: number;
  avgKm: number;
  bestKm: number;
  lastKm: number;
  /** Recency-weighted miss (km). */
  emaKm: number;
  /** ms timestamp of the most recent round here. */
  lastPlayedAt: number;
  /** Consecutive great/bullseye rounds. */
  streak: number;
  /** Density-normalised error: emaKm / scaleKm. Drives `level`. */
  e: number;
  level: MasteryLevel;
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  mastered: 'Mastered',
  strong: 'Strong',
  learning: 'Learning',
  shaky: 'Shaky',
  weak: 'Needs work',
};

/**
 * Mastery from a NORMALISED error `e = emaKm / scaleKm`, so a 30 km miss means
 * different things for a dense suburb vs. a remote town. Thresholds are picked
 * to map sensibly onto the old raw-km bands at a typical suburb scaleKm (~30):
 * mastered ≤ 0.5 (≈15 km), strong ≤ 1.5 (≈50 km), learning ≤ 4 (≈120 km),
 * shaky ≤ 10 (≈300 km), weak above.
 */
export function masteryFor(e: number): MasteryLevel {
  if (e <= 0.5) return 'mastered';
  if (e <= 1.5) return 'strong';
  if (e <= 4) return 'learning';
  if (e <= 10) return 'shaky';
  return 'weak';
}

/** Per-place mastery, hardest-first by normalised error (your weakest spots at the top). */
export function placeMasteries(p: Progress): PlaceMastery[] {
  return Object.entries(p.places)
    .map(([id, s]) => {
      const scale = scaleForPlaceId(id);
      const e = s.emaKm / scale;
      return {
        id,
        plays: s.plays,
        avgKm: s.plays > 0 ? s.totalKm / s.plays : 0,
        bestKm: s.bestKm,
        lastKm: s.lastKm,
        emaKm: s.emaKm,
        lastPlayedAt: s.lastPlayedAt,
        streak: s.streak,
        e,
        level: masteryFor(e),
      };
    })
    .sort((a, b) => b.e - a.e);
}

export interface CoverageStats {
  seen: number;
  total: number;
  unseen: number;
}

/** Distinct places ever played vs. the full dataset size. */
export function coverageStats(
  p: Progress,
  totalPlaces: number,
): CoverageStats {
  let seen = 0;
  for (const s of Object.values(p.places)) {
    if (s && s.plays > 0) seen++;
  }
  return { seen, total: totalPlaces, unseen: Math.max(0, totalPlaces - seen) };
}

export interface RegionalRollupEntry {
  regionId: RegionId;
  seen: number;
  total: number;
  avgNormalisedError: number;
  masteredCount: number;
}

/** Per-region summary: coverage, mean normalised error, and strong+ places. */
export function regionalRollup(p: Progress): RegionalRollupEntry[] {
  return REGIONS.map(({ id: regionId }) => {
    const regionPlaces = placesInRegion(regionId);
    let seen = 0;
    let sumE = 0;
    let masteredCount = 0;
    for (const place of regionPlaces) {
      const stat = p.places[place.id];
      if (!stat || stat.plays <= 0) continue;
      seen++;
      const e = stat.emaKm / scaleForPlaceId(place.id);
      sumE += e;
      const level = masteryFor(e);
      if (level === 'mastered' || level === 'strong') masteredCount++;
    }
    return {
      regionId,
      seen,
      total: regionPlaces.length,
      avgNormalisedError: seen > 0 ? sumE / seen : 0,
      masteredCount,
    };
  });
}

/** Serialise the whole progress blob for download / cross-device carry-over. */
export function exportProgress(p: Progress): string {
  return JSON.stringify(p);
}

/**
 * Parse a previously exported (or legacy v1) progress blob. Validates shape,
 * runs v1→v2 migration if needed, and returns null on invalid input.
 */
export function importProgress(json: string): Progress | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version === 2) return normaliseV2(parsed as Partial<Progress>);
    if (parsed.version === 1) return migrateV1toV2(parsed as Partial<Progress>);
    return null;
  } catch {
    return null;
  }
}

/**
 * Count consecutive calendar days (ending today or yesterday) on which at
 * least one game was played. A gap > 1 day breaks the streak.
 */
export function dayStreak(p: Progress): number {
  if (p.games.length === 0) return 0;
  const days = new Set<number>();
  for (const g of p.games) days.add(Math.floor(g.at / DAY_MS));
  const today = Math.floor(Date.now() / DAY_MS);
  let last = -1;
  for (const d of days) if (d > last) last = d;
  if (last < today - 1) return 0;
  let streak = 0;
  let cursor = last;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

export interface Milestone {
  type: 'place-mastered' | 'region-complete';
  placeId?: string;
  regionId?: string;
  name: string;
}

function isMastered(p: Progress, id: string): boolean {
  const s = p.places[id];
  if (!s || s.plays === 0) return false;
  return masteryFor(s.emaKm / scaleForPlaceId(id)) === 'mastered';
}

function seenCountInRegion(p: Progress, regionId: RegionId): number {
  let seen = 0;
  for (const place of placesInRegion(regionId)) {
    const s = p.places[place.id];
    if (s && s.plays > 0) seen++;
  }
  return seen;
}

/**
 * Compare before/after progress and emit milestones crossed by the latest
 * action: a place crossing into `'mastered'`, or a region's last unseen place
 * being played for the first time.
 */
export function detectMilestones(prev: Progress, next: Progress): Milestone[] {
  const out: Milestone[] = [];
  for (const [id, s] of Object.entries(next.places)) {
    if (!s || s.plays === 0) continue;
    if (!isMastered(prev, id) && isMastered(next, id)) {
      const place = PLACE_BY_ID[id];
      out.push({ type: 'place-mastered', placeId: id, name: place?.name ?? id });
    }
  }
  for (const { id: regionId, name } of REGIONS) {
    const total = placesInRegion(regionId).length;
    if (total === 0) continue;
    const prevSeen = seenCountInRegion(prev, regionId);
    const nextSeen = seenCountInRegion(next, regionId);
    if (prevSeen < total && nextSeen >= total) {
      out.push({ type: 'region-complete', regionId, name });
    }
  }
  return out;
}

export interface BiasInfo {
  dLat: number;
  dLng: number;
  bearing: string;
  magnitudeKm: number;
  consistent: boolean;
}

/**
 * Systematic-guess-bias report for a place: the average signed offset of the
 * player's guess from the truth, expressed as a compass bearing + magnitude.
 * Returns null until the place has been played ≥3 times and has a mean offset.
 */
export function biasFor(p: Progress, id: string): BiasInfo | null {
  const s = p.places[id];
  if (!s || s.plays < 3 || !s.meanOffset) return null;
  const { dLat, dLng } = s.meanOffset;
  const place = PLACE_BY_ID[id];
  const refLat = place?.lat ?? -36.8;
  const { bearing, magnitudeKm } = bearingDescription(dLat, dLng, refLat);
  return { dLat, dLng, bearing, magnitudeKm, consistent: magnitudeKm > 20 };
}

/**
 * The `n` mastered-or-strong places nearest to `target` — useful as reference
 * anchors the player already knows when nudging them toward an unfamiliar spot.
 */
export function masteredAnchors(p: Progress, target: LatLng, n: number): Place[] {
  const masteries = placeMasteries(p);
  const ids = new Set(
    masteries
      .filter((m) => m.level === 'mastered' || m.level === 'strong')
      .map((m) => m.id),
  );
  return PLACES
    .filter((pl) => ids.has(pl.id))
    .map((pl) => ({ pl, d: haversineKm(target, { lat: pl.lat, lng: pl.lng }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.pl);
}

/** The `n` places nearest to `target` (excluding itself), by haversine. */
export function nearbyPlaces(target: Place, n: number): Place[] {
  return PLACES
    .filter((pl) => pl.id !== target.id)
    .map((pl) => ({ pl, d: haversineKm({ lat: target.lat, lng: target.lng }, { lat: pl.lat, lng: pl.lng }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.pl);
}



