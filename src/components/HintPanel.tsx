import { SCORING } from '../game/scoring';
import type { Place } from '../game/types';

interface Props {
  place: Place;
  revealedHints: number;
  disabled: boolean;
  onReveal: () => void;
}

export function HintPanel({
  place,
  revealedHints,
  disabled,
  onReveal,
}: Props) {
  const total = place.hints.length;
  const canReveal = !disabled && revealedHints < total;

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          Hints ({revealedHints}/{total} revealed)
        </span>
        <button
          onClick={onReveal}
          disabled={!canReveal}
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Reveal next −{SCORING.HINT_PENALTY}
        </button>
      </div>
      {revealedHints > 0 ? (
        <ol className="ml-4 list-decimal space-y-1 text-sm text-slate-700">
          {place.hints.slice(0, revealedHints).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-slate-500">
          Hints reveal progressively more specific clues. Each costs{' '}
          {SCORING.HINT_PENALTY} points.
        </p>
      )}
    </div>
  );
}
