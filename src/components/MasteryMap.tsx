import { useMemo, useState, type JSX } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
} from 'react-leaflet';
import { PLACES, REGION_LABELS } from '../game/places';
import {
  MASTERY_LABELS,
  type MasteryLevel,
  type PlaceDetail,
  type Progress,
  regionalRollup,
} from '../game/progress';
import {
  INITIAL_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  VICTORIA_BOUNDS,
  VICTORIA_CENTER,
  formatKm,
} from '../game/scoring';
import { TIER_LABELS } from '../game/types';
import { DAY_MS } from '../game/progress';

interface MasteryMapProps {
  progress: Progress;
  onQueue: (id: string) => void;
  onUnqueue: (id: string) => void;
  placeDetail: (id: string) => PlaceDetail | null;
  onBack: () => void;
}

type ColourMode = 'mastery' | 'coverage';

const MASTERY_FILL: Record<MasteryLevel, string> = {
  mastered: '#10b981',
  strong: '#84cc16',
  learning: '#f59e0b',
  shaky: '#f97316',
  weak: '#f43f5e',
};

const MASTERY_BADGE: Record<MasteryLevel, string> = {
  mastered: 'bg-emerald-100 text-emerald-700',
  strong: 'bg-lime-100 text-lime-700',
  learning: 'bg-amber-100 text-amber-700',
  shaky: 'bg-orange-100 text-orange-700',
  weak: 'bg-rose-100 text-rose-700',
};

const UNSEEN_FILL = '#cbd5e1';
const SEEN_COVERAGE_FILL = '#10b981';

function daysAgo(ts: number): number {
  if (!ts) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / DAY_MS));
}

interface MarkerStyle {
  radius: number;
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
}

function styleFor(
  mode: ColourMode,
  detail: PlaceDetail | null,
): MarkerStyle {
  const seen = !!detail && detail.plays > 0;
  if (!seen) {
    return {
      radius: 4,
      color: UNSEEN_FILL,
      fillColor: UNSEEN_FILL,
      fillOpacity: mode === 'mastery' ? 0.3 : 0.4,
      weight: 1,
    };
  }
  if (mode === 'coverage') {
    return {
      radius: 6,
      color: '#ffffff',
      fillColor: SEEN_COVERAGE_FILL,
      fillOpacity: 0.7,
      weight: 1,
    };
  }
  const fill = MASTERY_FILL[detail!.level];
  return {
    radius: 6,
    color: '#ffffff',
    fillColor: fill,
    fillOpacity: 0.85,
    weight: 1,
  };
}

function rollupDotColour(avgE: number): string {
  if (avgE <= 0) return UNSEEN_FILL;
  if (avgE <= 0.5) return MASTERY_FILL.mastered;
  if (avgE <= 1.5) return MASTERY_FILL.strong;
  if (avgE <= 4) return MASTERY_FILL.learning;
  if (avgE <= 10) return MASTERY_FILL.shaky;
  return MASTERY_FILL.weak;
}

export function MasteryMap({
  progress,
  onQueue,
  onUnqueue,
  placeDetail,
  onBack,
}: MasteryMapProps): JSX.Element {
  const [mode, setMode] = useState<ColourMode>('mastery');

  const rollup = useMemo(() => regionalRollup(progress), [progress]);
  const sortedRollup = useMemo(
    () => [...rollup].sort((a, b) => b.seen - a.seen),
    [rollup],
  );

  return (
    <div className="relative h-full w-full bg-slate-100">
      <MapContainer
        center={VICTORIA_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={VICTORIA_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="h-full w-full"
        worldCopyJump={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution="© CARTO © OpenStreetMap contributors"
          subdomains="abcd"
          maxZoom={MAX_ZOOM}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          attribution="© CARTO © OpenStreetMap contributors"
          subdomains="abcd"
          maxZoom={MAX_ZOOM}
          opacity={0.9}
        />

        {PLACES.map((place) => {
          const detail = placeDetail(place.id);
          const style = styleFor(mode, detail);
          const seen = !!detail && detail.plays > 0;
          return (
            <CircleMarker
              key={place.id}
              center={[place.lat, place.lng]}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                weight: style.weight,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
                {place.name}
              </Tooltip>
              <Popup>
                <div className="min-w-[180px] space-y-1.5 text-slate-800">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{place.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {TIER_LABELS[place.tier]}
                    </span>
                  </div>

                  {seen && detail ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MASTERY_BADGE[detail.level]}`}
                        >
                          {MASTERY_LABELS[detail.level]}
                        </span>
                        <span className="text-xs text-slate-500">
                          ×{detail.plays} plays
                        </span>
                      </div>
                      <dl className="grid grid-cols-3 gap-1 text-center text-xs">
                        <div>
                          <dt className="text-[9px] uppercase text-slate-400">
                            Best
                          </dt>
                          <dd className="font-semibold">
                            {formatKm(detail.bestKm)} km
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] uppercase text-slate-400">
                            Last
                          </dt>
                          <dd className="font-semibold">
                            {formatKm(detail.lastKm)} km
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] uppercase text-slate-400">
                            Avg
                          </dt>
                          <dd className="font-semibold">
                            {formatKm(detail.emaKm)} km
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Streak {detail.streak}</span>
                        <span>
                          {detail.lastPlayedAt
                            ? `${daysAgo(detail.lastPlayedAt)}d ago`
                            : 'never'}
                        </span>
                        <span>
                          {detail.dueInDays === null
                            ? 'no schedule'
                            : detail.dueInDays <= 0
                              ? 'due now'
                              : `due in ${detail.dueInDays}d`}
                        </span>
                      </div>
                      {detail.queued ? (
                        <button
                          onClick={() => onUnqueue(place.id)}
                          className="mt-1 w-full rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        >
                          Queued ✓ (unqueue)
                        </button>
                      ) : (
                        <button
                          onClick={() => onQueue(place.id)}
                          className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          Queue for review
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Not yet discovered — play a round that lands on this
                        place to start tracking it.
                      </p>
                      <button
                        onClick={() => onQueue(place.id)}
                        className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Queue for review
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Top overlay: Back + toggle. Container is pointer-events-none so map
          stays draggable; actual controls re-enable pointer events. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-3">
        <button
          onClick={onBack}
          className="pointer-events-auto rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-white"
        >
          ← Back
        </button>

        <div className="pointer-events-auto flex rounded-full bg-white/95 p-1 shadow-md ring-1 ring-slate-200">
          {(['mastery', 'coverage'] as ColourMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                mode === m
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="w-24" />
      </div>

      {/* Regional rollup sidebar (right). */}
      <div className="pointer-events-none absolute right-0 top-0 z-[1000] hidden h-full w-72 flex-col p-3 sm:flex">
        <div className="pointer-events-auto mt-16 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-3 text-left shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Regional coverage
          </h2>
          <ul className="mt-2 space-y-1.5">
            {sortedRollup.map((r) => {
              const label = REGION_LABELS[r.regionId] ?? r.regionId;
              const dot = rollupDotColour(r.avgNormalisedError);
              const pct =
                r.total > 0 ? Math.round((r.seen / r.total) * 100) : 0;
              return (
                <li
                  key={r.regionId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dot }}
                    />
                    <span className="truncate text-slate-700">{label}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {r.seen}/{r.total}
                    <span className="ml-1 text-[10px] text-slate-400">
                      {pct}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] leading-snug text-slate-400">
            Dot colour = average mastery. Fills in as you discover places.
          </div>
        </div>
      </div>
    </div>
  );
}
