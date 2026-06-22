# Project Spec — Turning Victoria Guess into a Geographic Learning Tool

**Status:** Draft / proposal
**Author:** Jake (with Claude)
**Date:** 2026-06-22
**Scope:** `victoria-guess` (React + TypeScript + Vite + Leaflet)

---

## 1. Summary

Victoria Guess is already a competent click-to-locate map game with the bones of a
learning tool: it persists per-place stats and a game history, derives a five-level
"mastery" per place, and surfaces your weakest spots and a rolling-average trend.

What it is **not yet** is a system that actively *teaches*. Today it measures
knowledge with a blunt instrument (a flat all-time average miss) and it presents
new questions at random — so it never preferentially drills what you're weak at,
never schedules review of what you're about to forget, and never shows you a map of
what you actually know.

This spec proposes a focused set of improvements organised around two pillars the
brief calls out — **tracking** geographic knowledge and **improving** it — plus a
thin **motivation** layer. The aim is to turn a fun game into a deliberate-practice
loop that makes measurable spatial learning the point.

---

## 2. Current state (as built)

| Area | What exists today | File |
|---|---|---|
| Place dataset | 177 places, 4 tiers (23 city / 51 suburb / 21 region / 82 small town), each `{id, name, lat, lng, tier, region}` | `src/game/places.ts` |
| Session | 5 rounds, chosen by `shuffle(PLACES).slice(0, 5)` — **uniform random** | `src/game/GameEngine.ts` |
| Scoring | `1000 · e^(−km/150)`, bullseye ≤ 15 km, by absolute great-circle distance | `src/game/scoring.ts` |
| Reveal/teaching | Answer pin + label on map, dashed guess→truth line, "≈ 95 km west of Ballarat" orientation, personal "you usually land X km off" | `ResultModal.tsx`, `MapView.tsx`, `scoring.ts` |
| Per-place record | `plays, totalKm, bestKm, lastKm, totalScore` in localStorage | `src/game/progress.ts` |
| Mastery | 5 levels derived purely from **all-time** `avgKm` (`mastered ≤15 … weak >300`) | `progress.ts` |
| Game history | Rolling avg (last 5), trend (up/down/flat), all-time avg, best, sparkline | `progress.ts`, `StartScreen.tsx` |
| Surfacing | "Your weakest places" list (avg-miss desc), progress card | `StartScreen.tsx` |

### What's already good
- Clean separation of concerns (`game/` logic, `hooks/`, `components/`).
- It already *records* per-place performance and already *ranks* weakest places — the
  data needed to drive adaptive practice is largely captured.
- The reveal is genuinely instructional (orientation anchor + on-map label).

### The core gaps
1. **Selection is pure random.** The single biggest lever. The app knows your weak
   spots but won't serve them to you; you can play 50 games and never revisit your
   worst place while seeing Melbourne five times. No spacing, no adaptivity.
2. **Mastery is a flat lifetime average.** `avgKm = totalKm / plays` pools your
   first wild guess with your latest precise one forever. Once `plays` is high, recent
   improvement barely moves the number — the metric is *insensitive to learning*, which
   is the opposite of what a learning tracker needs. It also never decays, so it can't
   model forgetting.
3. **No coverage / "map of what I know."** 177 places but no sense of *"seen 40 / 177"*,
   no regional breakdown, no spatial mastery view — the most natural representation for
   *geographic* knowledge is a map, and there isn't one.
4. **One mode only.** "5 random rounds." No review mode, no region drill, no daily
   challenge, no endless/streak.
5. **Scoring isn't fair across tiers.** Absolute km penalises dense inner suburbs (5 km
   off Carlton ≈ landing on Fitzroy, still scores ~970 — or punishes you when it's the
   wrong suburb) and trivialises remote towns. Mastery thresholds inherit the same flaw.
6. **No systematic-error feedback.** If you reliably place Bright too far west, nothing
   notices or corrects the *bias* — only the per-round magnitude.
7. **Record is trapped & fragile.** localStorage only: lost on cache clear, not portable
   across devices, no export of a longitudinal learning record.
8. **`region` is free-text and inconsistent** — 65 distinct values mixing LGAs, tourism
   regions and metro sub-areas — so it can't yet drive clean regional analytics.

---

## 3. Goals & non-goals

**Goals**
- Make practice **adaptive**: spend question time where it moves knowledge most (new,
  weak, and due-for-review places), interleaved across the state.
- Make tracking **honest about learning**: a knowledge model that rewards recent
  improvement and models forgetting, comparable fairly across place types.
- Make knowledge **visible spatially**: a mastery map of Victoria and regional coverage.
- Add **deliberate-practice modes** beyond "5 random."
- Keep it **single-page, offline-first, no backend** — the current architecture is a
  feature, not a limitation. All new state stays in localStorage (+ export/import).

**Non-goals (for now)**
- Accounts, server sync, leaderboards-as-a-service.
- Leaving Victoria / multi-region packs (possible later; out of scope here).
- Heavy ML. The adaptive scheduler should be a few dozen lines of transparent arithmetic.

---

## 4. Design principles (why these changes)

The proposal leans on well-established learning-science findings, chosen because they
map cleanly onto a geo-guess loop:

- **Retrieval practice** — being asked to *produce* a location (vs. being shown it)
  is what builds durable memory. The game already does this; selection should maximise
  *useful* retrievals.
- **Spaced repetition** — review just before you'd forget. Implies a per-place schedule
  and a memory strength that decays with time, not a flat average.
- **Interleaving** — mixing regions/tiers within a session beats blocking by area; a
  session should sample across the state, not cluster.
- **Mastery learning** — advance breadth (new places) only as existing places reach a
  threshold; keep recycling the not-yet-mastered.
- **Immediate, specific, corrective feedback** — the reveal should not just score the
  miss but correct the *pattern* (direction/neighbour confusions).

These are also a natural fit for a behaviour-analytic framing (clear targets, dense
immediate reinforcement, visible cumulative progress) — see §6.

---

## 5. Pillar 1 — Better **tracking** (the knowledge model)

### 5.1 Recency-weighted mastery (replace flat average)
Add a decaying estimate of recent skill so improvement is visible and forgetting is
modelled. Keep the lifetime fields for the record book.

- Add to `PlaceStat`: `emaKm` (exponential moving average of miss), `lastPlayedAt`
  (timestamp), and a running `streak` of bullseye/great rounds.
- On `recordRound`, update `emaKm = α·distanceKm + (1−α)·emaKm` (start α ≈ 0.4; tune).
  `masteryFor()` reads `emaKm` instead of `totalKm/plays`.
- This is a small, contained change to `progress.ts` + its callers; existing records
  migrate by seeding `emaKm` from the old `totalKm/plays`.

### 5.2 Tier/density-normalised skill
Make "30 km off" mean different things for Mallacoota vs. Carlton.

- Precompute a per-place `scaleKm` = distance to its k-th nearest neighbour in `PLACES`
  (a one-off build step, or computed once at load). Dense inner suburbs get a small
  scale; remote towns a large one.
- Define a normalised error `e = km / scaleKm`. Mastery thresholds use `e`, so mastery
  is comparable across the state. (Scoring can optionally adopt this too — see §8.)

### 5.3 Coverage & regional analytics
- Track `seenPlaceIds` count vs. total → a **"places discovered: 40 / 177"** stat.
- Roll per-place mastery up to **region** for a "you're strong in Gippsland, weak in the
  Mallee" breakdown. **Prerequisite:** a clean controlled `region` vocabulary (§9).

### 5.4 Systematic-bias detection (later phase)
- Store per place the mean **signed** offset of guesses (mean Δlat/Δlng, or mean bearing
  + distance). When a consistent bias emerges (e.g., "you place Bright ~40 km too far
  west"), surface it as corrective feedback in the reveal and on a "study" card.

### 5.5 Durable, portable record
- **Export / import** the whole `Progress` blob as JSON (download + file picker). Cheap,
  high-value insurance for a longitudinal learning record; also enables cross-device
  carry-over without a backend.
- Bump the persisted schema to `v2` with a migration from `v1` (the loader already
  tolerates partial shapes).

---

## 6. Pillar 2 — Better **improving** (adaptive practice + instruction)

### 6.1 Adaptive selection (the headline change)
Replace `shuffle(PLACES).slice(0, 5)` with a **priority-weighted draw**. For each place
compute a selection priority:

```
priority(place) =
    w_new   · neverSeen(place)                    // unseen places surface first
  + w_weak  · normalisedError(place)              // worse recent skill → higher
  + w_due   · dueness(place)                      // longer since last seen → higher
  + w_jitter· random()                            // keeps sessions fresh / interleaves
```

- Draw the session's rounds as a weighted sample (not strict top-N, so it stays varied),
  with an **interleaving guard**: cap how many rounds share a region/tier so a session
  samples across the state.
- `dueness` is a simple time-since-last-seen term initially; it upgrades cleanly to a
  real spaced-repetition interval later (§6.2) without changing the call sites.
- Lives behind a single `selectRounds(progress, opts)` function in `GameEngine.ts`;
  modes (§6.3) are just different weight presets / filters.

### 6.2 Spaced-repetition scheduler (evolution of 6.1)
Once recency-weighted mastery exists, give each place an interval:

- Map round outcome → grade: `bullseye/great → good`, `good → ok`, `way off → again`.
- Maintain a per-place `intervalDays` that grows on good grades and resets on "again"
  (a lightweight SM-2/Leitner-style rule; FSRS is a possible later upgrade). `dueness`
  in §6.1 becomes `now − lastPlayedAt − intervalDays`.
- Net effect: places you nail drift to the back; places you fluff come back soon —
  classic spaced repetition, but driven by guess distance instead of a flashcard tap.

### 6.3 Practice modes
Small set, all reusing the same engine with different selection presets:

| Mode | Selection | Purpose |
|---|---|---|
| **Quick game** (default) | adaptive draw, 5 rounds | the existing loop, now adaptive |
| **Review** | only *due* + weakest places | targeted deliberate practice |
| **Region focus** | filter to one region (e.g. Gippsland) | drill a part of the state |
| **Discovery** | only never-seen places | grow coverage |
| **Daily challenge** | seeded RNG keyed to the date | same 5 places for everyone that day; comparable, shareable |
| **Endless / streak** | adaptive, no fixed length, ends on a poor guess | engagement + pressure |

### 6.4 Stronger instructional reveal
- **Anchor to what you know:** alongside the existing "95 km west of Ballarat," show the
  1–2 nearest *places you've already mastered* as personal reference points ("just south
  of Beechworth, which you know well").
- **Show the neighbourhood:** on reveal, optionally drop faint markers for nearby places
  so the answer is learned *in context*, not in isolation.
- **Correct the bias:** when §5.4 detects a systematic offset, say so ("you keep guessing
  this too far west").
- **"Study this place" affordance** on a missed place → a quick card with the map, the
  orientation, neighbours, and a "queue for review" button.

---

## 7. Pillar 3 — Motivation & reinforcement (thin layer)

Framed in behaviour-analytic terms (dense immediate reinforcement, visible cumulative
gain, clear proximal goals):

- **Daily goal & streak** — e.g. "play one Review session a day"; a day-streak counter.
- **Mastery milestones** — celebrate when a place crosses into *Mastered*, or a region
  hits 100% coverage; small, specific, contingent reinforcers rather than generic points.
- **"Levelling up the map"** — the mastery map (§5.3 / §8) visibly fills in / warms up as
  you learn, making cumulative progress the reward.
- Keep it lightweight and non-manipulative — the reinforcer is *seeing yourself learn*.

---

## 8. Spatial UI — the "map of what I know"

A dedicated view (reusing the Leaflet map already in `MapView.tsx`):

- Render every place coloured by mastery level (the existing 5-band palette), or
  aggregate into a **region choropleth/heat layer**.
- Toggle: *coverage* (seen vs. unseen) vs. *mastery* (how well).
- Tap a place → its mini history (best/last/avg, plays, due date) and a "study"/"queue"
  action.
- This doubles as the home for §5.3 coverage stats and §7 "levelling up the map."

This view is the spec's most distinctive payoff: it makes *geographic* knowledge legible
*geographically*, which a list of numbers can't.

---

## 9. Supporting work — data model & hygiene

### 9.1 Persisted schema (`progress.ts`) → `v2`
```ts
interface PlaceStat {
  plays: number;
  totalKm: number;          // keep (lifetime record)
  bestKm: number;           // keep
  lastKm: number;           // keep
  totalScore: number;       // keep
  emaKm: number;            // NEW — recency-weighted miss (§5.1)
  lastPlayedAt: number;     // NEW — for dueness/spacing (§5.1/§6)
  streak: number;           // NEW — consecutive great rounds (§5.1)
  intervalDays?: number;    // NEW (phase 2) — SRS interval (§6.2)
  meanOffset?: { dLat: number; dLng: number }; // NEW (later) — bias (§5.4)
}
```
- Migrate `v1 → v2`: seed `emaKm` from `totalKm/plays`, `lastPlayedAt` from game log or
  `0`, `streak = 0`. The existing tolerant loader makes this low-risk.

### 9.2 Place dataset
- Add a precomputed `scaleKm` (nearest-neighbour spacing, §5.2) — build-time or load-time.
- **Normalise `region`** into a clean controlled vocabulary (the 65 free-text values
  today block regional analytics). Suggest a stable enum of ~12–15 official Victorian
  regions; keep the current label as a separate display string if useful.
- Spot-check a handful of coordinates while touching the file.

### 9.3 Engine
- Extract `selectRounds(progress, mode)` as the single selection entry point; `createSession`
  delegates to it. This keeps modes (§6.3) and the scheduler (§6.2) additive.

---

## 10. Phased roadmap

**Phase 1 — Adaptive core + honest tracking (highest value, low risk)**
- 5.1 Recency-weighted mastery (`emaKm`) + schema `v2` + migration.
- 6.1 Adaptive selection (`selectRounds`) with new/weak/due/jitter weights + interleave guard.
- 5.5 Export/import progress.
- *Outcome:* the game starts teaching — drilling weak/new places — and the tracker
  reflects recent learning.

**Phase 2 — Make knowledge visible + modes**
- 8 Mastery/coverage **map view**; 5.3 coverage + regional rollup (needs 9.2 region cleanup).
- 6.3 Practice modes (Review, Region focus, Discovery, Daily challenge).
- 5.2 Tier/density-normalised skill (`scaleKm`) for fair mastery.

**Phase 3 — Depth: real spacing, bias, reinforcement**
- 6.2 SM-2/Leitner-style scheduler (`intervalDays`).
- 5.4 Systematic-bias detection + 6.4 corrective/contextual reveal.
- 7 Streaks, milestones, "levelling up the map."

**Phase 4 — Polish / optional**
- 8 Scoring normalisation by `scaleKm`; endless/streak mode; share cards for Daily challenge.

---

## 11. Success metrics (does it actually teach?)

The app can measure its own efficacy from data it already logs:

- **Learning curve per place:** `emaKm` should fall across successive exposures; track the
  median number of exposures to reach *Strong*/*Mastered*.
- **Retention:** for places not seen for N days, is the next guess still accurate? (Are
  intervals well-calibrated?)
- **Coverage growth:** seen / 177 over time; regions reaching full coverage.
- **Engagement (secondary):** sessions/day, streak length, Review-mode uptake.

A self-tracking note: because progress is local, these can be shown to the user as their
*own* "are you learning?" dashboard rather than aggregate telemetry.

---

## 12. Open questions / decisions for Jake

1. **How adaptive should the default mode feel?** Pure adaptive can feel repetitive
   (keeps serving your worst places). Recommended: keep "Quick game" lightly adaptive +
   add an explicit "Review" mode for hard drilling. *(Default assumed: yes.)*
2. **Region taxonomy** — adopt the official Victorian government regions, the tourism
   regions, or a custom ~12-region scheme? Drives §5.3 and §9.2.
3. **Scoring vs. mastery normalisation** — normalise the *visible game score* by density
   too (fairer but changes the feel), or only the *internal mastery* metric? Recommended:
   internal-only first; revisit scoring in Phase 4.
4. **Scheduler depth** — is the Phase 1 dueness term enough, or go straight to SM-2-style
   intervals? Recommended: ship the simple term, evolve in place.
5. **Dataset growth** — 177 places now; expand toward fuller coverage as Discovery mode
   makes breadth meaningful?

---

## 13. Why this is the right shape

Almost everything proposed is **additive to an already-clean codebase**: a richer
`PlaceStat`, one new selection function, a few new screens. There is no rewrite. The
highest-leverage change — adaptive selection — is also one of the smallest, and it's the
difference between a game that's fun and a tool that demonstrably grows your map of
Victoria.
