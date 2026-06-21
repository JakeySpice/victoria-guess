interface Props {
  roundNumber: number;
  totalRounds: number;
  totalScore: number;
  best: number;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

export function ScoreBar({ roundNumber, totalRounds, totalScore, best }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
      <Stat label="Round" value={`${roundNumber}/${totalRounds}`} />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          Score
        </div>
        <div className="text-2xl font-extrabold text-emerald-600">
          {totalScore}
        </div>
      </div>
      <Stat label="Best" value={best} />
    </div>
  );
}
