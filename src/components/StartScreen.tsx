import { SCORING } from '../game/scoring';

interface Props {
  best: number;
  onStart: () => void;
  onResetBest: () => void;
}

export function StartScreen({ best, onStart, onResetBest }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold text-slate-800">Victoria Guess</h1>
        <p className="mt-3 text-slate-600">
          We'll name a place in Victoria. Click the map where you think it is —
          the closer your pin, the more points you score.
        </p>
        <ul className="mx-auto mt-4 inline-block max-w-sm space-y-1 text-left text-sm text-slate-600">
          <li>📍 Drop a pin, then hit <b>Submit guess</b>.</li>
          <li>
            🎯 Up to {SCORING.MAX_ROUND_POINTS} points a round — a bullseye is
            within {SCORING.BULLSEYE_KM} km.
          </li>
          <li>🗺️ {SCORING.ROUNDS_PER_SESSION} rounds per game. No labels until you guess.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-center shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Best game
        </div>
        <div className="text-3xl font-extrabold text-emerald-600">{best}</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onStart}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-700"
        >
          Start Game
        </button>
        <button
          onClick={onResetBest}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 hover:bg-slate-50"
        >
          Reset Best
        </button>
      </div>
    </div>
  );
}
