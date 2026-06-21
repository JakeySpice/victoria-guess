import type { Place } from '../game/types';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

export function fuzzyMatch(guess: string, place: Place): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const answer = normalize(place.name);
  if (g === answer) return true;
  if (place.aliases) {
    for (const alias of place.aliases) {
      if (g === normalize(alias)) return true;
    }
  }
  // allow fuzzy spelling for short names (≤8 chars)
  if (answer.length <= 8 && levenshtein(g, answer) <= 2) return true;
  return false;
}
