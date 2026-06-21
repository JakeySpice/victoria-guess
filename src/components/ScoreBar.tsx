import { SCORING } from '../game/scoring';

interface Props {
  totalScore: number;
  roundNumber: number;
  totalRounds: number;
  hintsUsed: number;
  zoomOuts: number;
  strikes: number;
  maxStrikes: number;
}

export function ScoreBar({
  totalScore,
  roundNumber,
  totalRounds,
  hintsUsed,
  zoomOuts,
  strikes,
  maxStrikes,
}: Props) {
  const strikeDots = Array.from({ length: maxStrikes }, (_, i) => i < strikes);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Score
          </span>
          <div className="text-xl font-bold text-emerald-700">
            {totalScore}
          </div>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Round
          </span>
          <div className="text-lg font-semibold text-slate-700">
            {roundNumber}/{totalRounds}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-slate-600">
        <span title="Hints revealed so far this round">
          Hints: <b className="text-amber-600">{hintsUsed}</b>
          <span className="text-slate-400">
            {' '}(−{SCORING.HINT_PENALTY} each)
          </span>
        </span>
        <span title="Zoom-outs this round">
          Zoom-outs: <b className="text-rose-600">{zoomOuts}</b>
          <span className="text-slate-400">
            {' '}(−{SCORING.ZOOM_OUT_PENALTY} each)
          </span>
        </span>
        <span title="Strikes used this round" className="flex items-center gap-1">
          Strikes:
          {strikeDots.map((used, i) => (
            <span
              key={i}
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                used ? 'bg-rose-600' : 'bg-slate-300'
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
