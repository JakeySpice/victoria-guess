import { SCORING } from './scoring';

/**
 * Persistent learning record. Two things are tracked:
 *  - a chronological list of finished games (for the rolling-average / trend), and
 *  - per-place stats (how close you usually land — your "mastery" of each spot).
 *
 * Everything lives in localStorage so progress survives across visits without a
 * backend. Numbers are kept as running totals so averages stay cheap to derive.
 */

export const PROGRESS_KEY = 'vic-guess-progress-v1';

/** How many recent games define your "current form" average. */
export const RECENT_WINDOW = 5;
/** Keep the game log bounded so storage never grows without limit. */
const MAX_GAMES = 200;

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
}

export interface GameRecord {
  score: number;
  avgKm: number;
  bullseyes: number;
  rounds: number;
  at: number;
}

export interface Progress {
  version: 1;
  games: GameRecord[];
  places: Record<string, PlaceStat>;
}

export function emptyProgress(): Progress {
  return { version: 1, games: [], places: {} };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      version: 1,
      games: Array.isArray(parsed.games) ? parsed.games : [],
      places:
        parsed.places && typeof parsed.places === 'object'
          ? (parsed.places as Record<string, PlaceStat>)
          : {},
    };
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
): Progress {
  const cur = prev.places[placeId];
  const next: PlaceStat = cur
    ? {
        plays: cur.plays + 1,
        totalKm: cur.totalKm + distanceKm,
        bestKm: Math.min(cur.bestKm, distanceKm),
        lastKm: distanceKm,
        totalScore: cur.totalScore + score,
      }
    : {
        plays: 1,
        totalKm: distanceKm,
        bestKm: distanceKm,
        lastKm: distanceKm,
        totalScore: score,
      };
  return { ...prev, places: { ...prev.places, [placeId]: next } };
}

/** Append a finished game to the log. Returns a new Progress. */
export function recordGame(prev: Progress, game: GameRecord): Progress {
  const games = [...prev.games, game].slice(-MAX_GAMES);
  return { ...prev, games };
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
  level: MasteryLevel;
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  mastered: 'Mastered',
  strong: 'Strong',
  learning: 'Learning',
  shaky: 'Shaky',
  weak: 'Needs work',
};

export function masteryFor(avgKm: number): MasteryLevel {
  if (avgKm <= SCORING.BULLSEYE_KM) return 'mastered';
  if (avgKm <= 50) return 'strong';
  if (avgKm <= 120) return 'learning';
  if (avgKm <= 300) return 'shaky';
  return 'weak';
}

/** Per-place mastery, hardest-first (your weakest spots at the top). */
export function placeMasteries(p: Progress): PlaceMastery[] {
  return Object.entries(p.places)
    .map(([id, s]) => {
      const avgKm = s.totalKm / s.plays;
      return {
        id,
        plays: s.plays,
        avgKm,
        bestKm: s.bestKm,
        lastKm: s.lastKm,
        level: masteryFor(avgKm),
      };
    })
    .sort((a, b) => b.avgKm - a.avgKm);
}
