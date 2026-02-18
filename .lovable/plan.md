

# Production Telemetry: Performance and Collision Analytics

## Overview

Add a lightweight, non-intrusive telemetry system that collects performance snapshots and collision statistics during real gameplay sessions and stores them in Lovable Cloud. No debug overlays -- data is collected silently in the background and batched for efficient submission.

## Architecture

The system has three parts:

1. **Client-side collector** (`src/utils/telemetry.ts`) -- samples metrics every few seconds, buffers them, and flushes a batch to the backend periodically or on game-over
2. **Backend function** (`supabase/functions/submit-telemetry/index.ts`) -- validates and inserts telemetry batches
3. **Database table** (`game_telemetry`) -- stores session snapshots

## What Gets Tracked

Each telemetry snapshot (sampled every 5 seconds) captures:

| Category | Fields |
|----------|--------|
| Session | session_id (UUID), timestamp, level, difficulty, game_mode |
| Performance | avg_fps, min_fps, quality_level |
| Objects | ball_count, visible_brick_count, enemy_count, particle_count, explosion_count |
| CCD/Physics | ccd_total_ms, ccd_substeps, ccd_collisions, toi_iterations |
| Collisions | total_collisions_since_last, wall/brick/paddle/boss breakdown |
| Boss | boss_active, boss_type |

A summary row is also written at game-over with session totals (duration, final score, final level, total collisions, min FPS seen, quality changes count).

## Database Schema

```sql
CREATE TABLE game_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot_type text NOT NULL DEFAULT 'periodic',  -- 'periodic' | 'summary'
  level integer,
  difficulty text,
  game_mode text,
  -- Performance
  avg_fps real,
  min_fps real,
  quality_level text,
  -- Object counts
  ball_count integer,
  brick_count integer,
  enemy_count integer,
  particle_count integer,
  explosion_count integer,
  -- CCD
  ccd_total_ms real,
  ccd_substeps integer,
  ccd_collisions integer,
  toi_iterations integer,
  -- Collision breakdown
  wall_collisions integer,
  brick_collisions integer,
  paddle_collisions integer,
  boss_collisions integer,
  -- Boss state
  boss_active boolean DEFAULT false,
  boss_type text,
  -- Summary-only fields
  duration_seconds real,
  final_score integer,
  total_quality_changes integer,
  user_agent text
);
```

RLS: SELECT for everyone (lets you query from Cloud View), INSERT only via service_role (edge function).

## Edge Function: `submit-telemetry`

- Accepts a JSON array of snapshots (max 50 per batch)
- Validates field types and ranges
- IP-based rate limiting (1 batch per 5 seconds)
- Inserts via service_role
- Config: `verify_jwt = false` in config.toml

## Client Collector: `src/utils/telemetry.ts`

- `TelemetryCollector` class with:
  - `startSession(difficulty, gameMode)` -- generates session UUID
  - `recordSnapshot(metrics)` -- called every 5s from the game loop, pushes to buffer
  - `recordCollision(type)` -- increments collision counters (called from CCD event processing)
  - `flush()` -- sends buffered snapshots to edge function, clears buffer
  - `endSession(finalScore, finalLevel)` -- writes summary snapshot, flushes
- Auto-flushes when buffer reaches 10 snapshots
- Uses `navigator.sendBeacon` as fallback on page unload
- Completely silent -- no toasts, no console logs in production
- Gated behind a simple `ENABLE_TELEMETRY = true` constant (easy kill switch)

## Integration in Game.tsx

- Import `telemetryCollector` singleton
- Call `startSession()` when game starts
- Sample metrics every 300 frames (~5s at 60fps) from the existing `performanceProfiler` and `collisionHistory`
- Call `endSession()` on game-over / return to menu
- Zero impact on game loop -- sampling reads existing data, no new per-frame work

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `supabase/config.toml` | Edit | Add `[functions.submit-telemetry]` with `verify_jwt = false` |
| `supabase/functions/submit-telemetry/index.ts` | Create | Edge function for batch telemetry insert |
| Database migration | Create | `game_telemetry` table with RLS |
| `src/utils/telemetry.ts` | Create | Client-side telemetry collector |
| `src/components/Game.tsx` | Edit | Wire up telemetry start/sample/end calls |

## Performance Impact

- No per-frame allocations -- collector increments counters in-place
- Sampling every 300 frames reads existing profiler data (already computed)
- Network: ~1 request every 50 seconds (10 snapshots x 5s interval), ~2KB per batch
- `sendBeacon` fallback ensures data isn't lost on tab close

