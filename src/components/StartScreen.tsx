import { useRef, useState } from 'react';
import { SCORING } from '../game/scoring';
import { PLACE_BY_ID, REGIONS, REGION_LABELS } from '../game/places';
import {
  MASTERY_LABELS,
  RECENT_WINDOW,
  type MasteryLevel,
  type PlaceMastery,
  type ProgressSummary,
  type Trend,
} from '../game/progress';
import { formatKm } from '../game/scoring';
import type { CoverageStats } from '../game/progress';
import type { SelectRoundsOptions } from '../game/GameEngine';
import type { GameMode, RegionId } from '../game/types';

interface Props {
  summary: ProgressSummary;
  masteries: PlaceMastery[];
  coverage: CoverageStats;
  dayStreak: number;
  onStart: (opts: SelectRoundsOptions) => void;
  onResetProgress: () => void;
  onExport: () => string;
  onImport: (json: string) => boolean;
  onOpenMasteryMap: () => void;
}

const TREND_META: Record<Trend, { icon: string; cls: string; label: string }> = {
  up: { icon: '▲', cls: 'text-emerald-600', label: 'improving' },
  down: { icon: '▼', cls: 'text-rose-500', label: 'dipping' },
  flat: { icon: '→', cls: 'text-slate-400', label: 'steady' },
};

const MASTERY_BADGE: Record<MasteryLevel, string> = {
  mastered: 'bg-emerald-100 text-emerald-700',
  strong: 'bg-lime-100 text-lime-700',
  learning: 'bg-amber-100 text-amber-700',
  shaky: 'bg-orange-100 text-orange-700',
  weak: 'bg-rose-100 text-rose-700',
};

interface ModeMeta {
  label: string;
  hint: string;
}

const MODES: { id: GameMode; meta: ModeMeta }[] = [
  { id: 'quick', meta: { label: 'Quick', hint: 'Adaptive 5-round game' } },
  { id: 'review', meta: { label: 'Review', hint: 'Drill your weakest, due places' } },
  { id: 'region', meta: { label: 'Region', hint: 'Focus on one region' } },
  { id: 'discovery', meta: { label: 'Discovery', hint: "Only places you haven't seen" } },
  { id: 'daily', meta: { label: 'Daily', hint: 'Same 5 places for everyone today' } },
  { id: 'endless', meta: { label: 'Endless', hint: 'Play until you miss badly' } },
];

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 120;
  const h = 28;
  const max = SCORING.ROUNDS_PER_SESSION * SCORING.MAX_ROUND_POINTS;
  const step = w / (scores.length - 1);
  const pts = scores
    .map((s, i) => `${(i * step).toFixed(1)},${(h - (s / max) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="#059669"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StartScreen({
  summary,
  masteries,
  coverage,
  dayStreak,
  onStart,
  onResetProgress,
  onExport,
  onImport,
  onOpenMasteryMap,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<GameMode>('quick');
  const [regionId, setRegionId] = useState<RegionId>(REGIONS[0].id);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const played = masteries.filter((m) => m.plays > 0);
  const visible = showAll ? played : played.slice(0, 6);
  const hasProgress = summary.gamesPlayed > 0;
  const trend = summary.trend ? TREND_META[summary.trend] : null;

  const allDiscovered = coverage.seen >= coverage.total;
  const hasDueOrWeak = played.some((m) => m.plays > 0);

  const handleStartClick = () => {
    const opts: SelectRoundsOptions = { mode };
    if (mode === 'region') opts.regionId = regionId;
    if (mode === 'daily') opts.seed = new Date().toISOString().slice(0, 10);
    onStart(opts);
  };

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'victoria-guess-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const ok = onImport(text);
      setImportMsg(ok ? 'Progress imported.' : 'Import failed — invalid file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
      <div className="max-w-xl">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-4xl font-bold text-slate-800">Victoria Guess</h1>
          {dayStreak > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-300">
              🔥 {dayStreak}-day streak
            </span>
          )}
        </div>
        <p className="mt-2 text-slate-600">
          We'll name a place in Victoria. Click the map where you think it is —
          the closer your pin, the more points you score.
        </p>
      </div>

      {/* Progress card — the rolling average that should creep up as you learn. */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
        {hasProgress ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Avg · last {Math.min(RECENT_WINDOW, summary.gamesPlayed)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    {summary.recentAvg !== null
                      ? Math.round(summary.recentAvg)
                      : '—'}
                  </span>
                  {trend && (
                    <span className={`text-sm font-semibold ${trend.cls}`}>
                      {trend.icon} {trend.label}
                    </span>
                  )}
                </div>
              </div>
              <Sparkline scores={summary.recentScores} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Mini label="Games" value={summary.gamesPlayed} />
              <Mini
                label="All-time avg"
                value={
                  summary.allTimeAvg !== null
                    ? Math.round(summary.allTimeAvg)
                    : '—'
                }
              />
              <Mini label="Best" value={summary.bestGame} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Your scores will be tracked here. Each game logs a rolling average so
            you can watch yourself improve — and every place you guess builds a
            mastery score.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Places discovered</span>
          <span className="font-semibold text-slate-800">
            {coverage.seen} / {coverage.total}
          </span>
        </div>
      </div>

      {/* Mode picker */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Practice mode</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODES.map(({ id, meta }) => {
            const selected = id === mode;
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    selected ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {meta.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-500">
                  {meta.hint}
                </div>
              </button>
            );
          })}
        </div>

        {mode === 'region' && (
          <div className="mt-3 flex items-center gap-2">
            <label
              htmlFor="region-select"
              className="text-xs font-medium text-slate-500"
            >
              Region
            </label>
            <select
              id="region-select"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value as RegionId)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-600 focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {REGION_LABELS[r.id]}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'review' && !hasDueOrWeak && (
          <p className="mt-3 text-xs text-slate-500">
            Review is best after a few games — it drills the places you're weak
            on or due to revisit. You can still start and we'll use whatever's
            available.
          </p>
        )}

        {mode === 'discovery' && allDiscovered && (
          <p className="mt-3 text-xs text-slate-500">
            All places discovered! Discovery will fall back to a normal draw.
          </p>
        )}
      </div>

      {/* Per-place mastery — weakest spots first, the ones worth studying. */}
      {played.length > 0 && (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Your weakest places
            </h2>
            <span className="text-xs text-slate-400">avg miss</span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {visible.map((m) => {
              const place = PLACE_BY_ID[m.id];
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${MASTERY_BADGE[m.level]}`}
                    >
                      {MASTERY_LABELS[m.level]}
                    </span>
                    <span className="truncate text-slate-700">
                      {place?.name ?? m.id}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      ×{m.plays}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-slate-600">
                    {formatKm(m.avgKm)} km
                  </span>
                </li>
              );
            })}
          </ul>
          {played.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${played.length}`}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleStartClick}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-700"
        >
          {hasProgress ? 'Play again' : 'Start Game'}
        </button>
        <button
          onClick={onOpenMasteryMap}
          className="rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
        >
          Mastery map
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            · {coverage.seen}/{coverage.total} discovered
          </span>
        </button>
        {hasProgress && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Reset all progress? This clears your game history and every place mastery score.',
                )
              ) {
                onResetProgress();
              }
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
          >
            Reset progress
          </button>
        )}
        <button
          onClick={handleExport}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {importMsg && (
        <p className="text-xs font-medium text-slate-500">{importMsg}</p>
      )}

      <p className="text-xs text-slate-400">
        {SCORING.ROUNDS_PER_SESSION} rounds · up to {SCORING.MAX_ROUND_POINTS} a
        round · bullseye within {SCORING.BULLSEYE_KM} km
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}
