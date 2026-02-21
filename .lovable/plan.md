

# Add Session-Level Aggregation to Telemetry Summary Snapshots

## Problem

Summary snapshots (sent at `endSession`) only include `min_fps`, `duration_seconds`, `final_score`, `total_quality_changes`, and `user_agent`. All other performance fields (`avg_fps`, `quality_level`, `ball_count`, `particle_count`, CCD metrics, etc.) are left as `undefined`/null. This means:

- Mobile sessions that end abruptly (tab suspend, browser kill) may only have the summary row, which has no performance data
- You cannot correlate `user_agent` with performance metrics without joining across snapshot types

## Solution

Track running accumulators across the session inside `TelemetryCollector`, updated on every `recordSnapshot` call. Then include these aggregates in the summary snapshot so every summary row has complete performance data.

Additionally, include `user_agent` in periodic snapshots so every row can be identified by device.

## Changes

### File: `src/utils/telemetry.ts`

**1. Add session-level accumulator fields to the class:**

```typescript
// Session-level running aggregates
private snapshotCount = 0;
private sumAvgFps = 0;
private sumBallCount = 0;
private sumBrickCount = 0;
private sumEnemyCount = 0;
private sumParticleCount = 0;
private sumExplosionCount = 0;
private sumCcdTotalMs = 0;
private sumCcdSubsteps = 0;
private sumCcdCollisions = 0;
private sumToiIterations = 0;
private totalWallCollisions = 0;
private totalBrickCollisions = 0;
private totalPaddleCollisions = 0;
private totalBossCollisions = 0;
private maxBallCount = 0;
private maxParticleCount = 0;
private dominantQuality: Record<string, number> = {};
```

**2. Reset accumulators in `startSession`.**

**3. Update accumulators in `recordSnapshot`:**

- Increment `snapshotCount`
- Add metrics to running sums
- Track max values for ball/particle counts
- Tally quality level occurrences for dominant quality
- Accumulate collision totals (before resetting per-snapshot counters)
- Add `user_agent` to periodic snapshots

**4. Enrich `endSession` summary with aggregated data:**

```typescript
this.buffer.push({
  session_id: this.sessionId,
  snapshot_type: "summary",
  level: finalLevel,
  difficulty: this.difficulty,
  game_mode: this.gameMode,
  // Session averages
  avg_fps: this.snapshotCount > 0 ? this.sumAvgFps / this.snapshotCount : undefined,
  min_fps: this.sessionMinFps < 999 ? this.sessionMinFps : undefined,
  quality_level: this.getDominantQuality(),
  // Average object counts
  ball_count: this.snapshotCount > 0 ? Math.round(this.sumBallCount / this.snapshotCount) : undefined,
  brick_count: this.snapshotCount > 0 ? Math.round(this.sumBrickCount / this.snapshotCount) : undefined,
  enemy_count: this.snapshotCount > 0 ? Math.round(this.sumEnemyCount / this.snapshotCount) : undefined,
  particle_count: this.maxParticleCount > 0 ? this.maxParticleCount : undefined,
  explosion_count: this.snapshotCount > 0 ? Math.round(this.sumExplosionCount / this.snapshotCount) : undefined,
  // CCD averages
  ccd_total_ms: this.snapshotCount > 0 ? this.sumCcdTotalMs / this.snapshotCount : undefined,
  ccd_substeps: this.snapshotCount > 0 ? Math.round(this.sumCcdSubsteps / this.snapshotCount) : undefined,
  ccd_collisions: this.snapshotCount > 0 ? Math.round(this.sumCcdCollisions / this.snapshotCount) : undefined,
  toi_iterations: this.snapshotCount > 0 ? Math.round(this.sumToiIterations / this.snapshotCount) : undefined,
  // Total collisions across session
  wall_collisions: this.totalWallCollisions,
  brick_collisions: this.totalBrickCollisions,
  paddle_collisions: this.totalPaddleCollisions,
  boss_collisions: this.totalBossCollisions,
  // Existing fields
  duration_seconds: duration,
  final_score: finalScore,
  total_quality_changes: this.qualityChanges,
  user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
});
```

**5. Add helper method `getDominantQuality`** that returns the quality level string with the highest tally count.

**6. Add `user_agent` to periodic snapshots** in `recordSnapshot` so every row is device-identifiable.

## Summary of Data in Each Snapshot Type After Fix

| Field | Periodic | Summary |
|---|---|---|
| avg_fps | Per-interval | Session average |
| min_fps | Per-interval | Session minimum |
| quality_level | Current | Most frequent |
| ball/brick/enemy_count | Current | Session average |
| particle_count | Current | Session max |
| CCD metrics | Per-interval | Session average |
| Collision counts | Per-interval | Session totals |
| user_agent | Yes (new) | Yes (existing) |
| duration_seconds | -- | Yes |
| final_score | -- | Yes |

No database or edge function changes needed -- all fields already exist in the schema.

