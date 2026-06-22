import { useState } from 'react';
import { summarise } from '../game/GameEngine';
import {
  SCORING,
  formatKm,
  ratingForDistance,
  type RatingTone,
} from '../game/scoring';
import { RECENT_WINDOW, type ProgressSummary, type Milestone } from '../game/progress';
import type { SessionState } from '../game/types';

interface Props {
  session: SessionState;
  summary: ProgressSummary;
  isNewBest: boolean;
  milestones: Milestone[];
  onDismissMilestones: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

const TONE_TEXT: Record<RatingTone, string> = {
  great: 'text-emerald-600',
  good: 'text-lime-600',
  ok: 'text-amber-600',
  poor: 'text-rose-500',
};

function mean(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0) / ns.length;
}

const TONE_EMOJI: Record<RatingTone, string> = {
  great: '🟢',
  good: '🟡',
  ok: '🟠',
  poor: '🔴',
};

function buildShareText(session: SessionState): string {
  const date = session.dailySeed ?? '';
  const squares = session.rounds
    .filter((r) => r.distanceKm !== null)
    .map((r) => TONE_EMOJI[ratingForDistance(r.distanceKm!).tone])
    .join('');
  return `Victoria Guess Daily · ${date}\n${squares}\n${session.totalScore} pts`;
}

export function SummaryScreen({
  session,
  summary,
  isNewBest,
  milestones,
  onDismissMilestones,
  onPlayAgain,
  onHome,
}: Props) {
  const [copied, setCopied] = useState(false);
  const stats = summarise(session);
  const maxPossible = SCORING.ROUNDS_PER_SESSION * SCORING.MAX_ROUND_POINTS;
  const endlessFailed = session.mode === 'endless' && session.failed;
  const isEndless = session.mode === 'endless';
  const isDaily = session.mode === 'daily';
  const survived = session.rounds.filter((r) => r.status === 'revealed').length;
  const scorePerRound = stats.rounds > 0 ? Math.round(session.totalScore / stats.rounds) : 0;

  // Compare this game to your form *before* it (the just-finished game is the
  // last entry in recentScores, so drop it to get a fair baseline).
  const prior = summary.recentScores.slice(0, -1).slice(-RECENT_WINDOW);
  const baseAvg = prior.length ? mean(prior) : null;
  const delta = baseAvg !== null ? Math.round(session.totalScore - baseAvg) : null;

  const handlePlayAgain = () => {
    onDismissMilestones();
    onPlayAgain();
  };
  const handleHome = () => {
    onDismissMilestones();
    onHome();
  };

  const handleShare = async () => {
    const text = buildShareText(session);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        {milestones.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {milestones.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300"
              >
                {m.type === 'place-mastered' ? '🏆' : '🗺️'} {m.name}
              </span>
            ))}
          </div>
        )}
        {endlessFailed ? (
          <>
            <h2 className="text-2xl font-bold text-slate-800">Run ended</h2>
            <p className="mt-1 text-sm font-semibold text-rose-500">
              Streak broken
            </p>
            <p className="mt-1 text-sm text-slate-500">
              You survived{' '}
              <span className="font-semibold text-slate-800">
                {survived}
              </span>{' '}
              {survived === 1 ? 'round' : 'rounds'}.
            </p>
          </>
        ) : (
          <h2 className="text-2xl font-bold text-slate-800">Game complete</h2>
        )}

        {isNewBest && !endlessFailed && (
          <div className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            🏆 New best!
          </div>
        )}

        <div className="mt-3 text-5xl font-extrabold text-emerald-600">
          {session.totalScore}
          {endlessFailed ? null : (
            <span className="ml-2 align-middle text-base font-medium text-slate-400">
              / {maxPossible}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500">
          {delta !== null ? (
            <>
              {delta >= 0 ? (
                <span className="font-semibold text-emerald-600">
                  +{delta}
                </span>
              ) : (
                <span className="font-semibold text-rose-500">{delta}</span>
              )}{' '}
              vs your recent average · best {summary.bestGame}
            </>
          ) : (
            <>Your first game — this sets your baseline.</>
          )}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Bullseyes" value={`${stats.bullseyes} / ${stats.rounds}`} />
          <Stat
            label="Closest guess"
            value={
              stats.bestDistanceKm === null
                ? '—'
                : `${formatKm(stats.bestDistanceKm)} km`
            }
          />
          <Stat
            label="Average miss"
            value={
              stats.avgDistanceKm === null
                ? '—'
                : `${formatKm(stats.avgDistanceKm)} km`
            }
          />
          {isEndless ? (
            <Stat label="Score / round" value={scorePerRound} />
          ) : (
            <Stat
              label={`Avg · last ${RECENT_WINDOW}`}
              value={summary.recentAvg !== null ? Math.round(summary.recentAvg) : '—'}
            />
          )}
        </div>

        {/* Round-by-round recap — the places to revisit and study. */}
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            This round's places
          </div>
          <ul className={`mt-2 divide-y divide-slate-100 ${isEndless ? 'max-h-48 overflow-y-auto' : ''}`}>
            {session.rounds.map((r) => {
              const km = r.distanceKm ?? 0;
              const rating = ratingForDistance(km);
              return (
                <li
                  key={r.place.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span className="truncate text-slate-700">{r.place.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={`font-medium ${TONE_TEXT[rating.tone]}`}>
                      {formatKm(km)} km
                    </span>
                    <span className="w-10 text-right font-semibold text-slate-500">
                      +{r.score}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {isDaily && (
          <button
            onClick={handleShare}
            className="mt-4 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {copied ? '✓ Copied to clipboard' : 'Share daily result'}
          </button>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handlePlayAgain}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Play again
          </button>
          <button
            onClick={handleHome}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 hover:bg-slate-50"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
