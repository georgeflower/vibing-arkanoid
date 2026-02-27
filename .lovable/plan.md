
Objective
- Eliminate the recurring low-FPS behavior on your laptop by removing always-on debug overhead and restoring missing low-quality throttles, while keeping gameplay behavior unchanged.

What I found in the code
1. Debug mode is globally enabled in runtime (`src/constants/game.ts` sets `ENABLE_DEBUG_FEATURES = true`), so expensive debug paths run for normal play.
2. CCD debug collection is always on:
   - `src/utils/gameCCD.ts` passes `debug: ENABLE_DEBUG_FEATURES` into `processBallCCD`.
   - `processBallCCD` then builds per-iteration debug payloads (`candidates.map(...)`, `debugArr.push(...)`) inside the hot path.
3. Per-frame profiling timers are always measured when debug is enabled:
   - `src/utils/gameCCD.ts` uses `shouldMeasurePerf = ENABLE_DEBUG_FEATURES`, which adds many `performance.now()` calls every frame.
4. Game loop debug checks are enabled by default:
   - `src/hooks/useDebugSettings.ts` has default `enablePerformanceLogging`, `enableFPSLogging`, `enableGCLogging`, `enableLagLogging` turned on.
   - This keeps debug detection logic running in `Game.tsx` each frame.
5. A throttling mechanism is currently ineffective:
   - `Game.tsx` uses `gameLoopRef.current?.getFrameTick() || 0`, but `FixedStepGameLoop.start()` is never called, so frame tick stays `0`.
   - Result: low-quality “alternate-frame” particle skipping never actually alternates.
6. Pointer lock and desktop-layout logs in your console are mostly symptoms/events, not the primary FPS bottleneck.

Implementation plan

Phase 1 — Remove hidden performance tax (highest impact, lowest risk)
1. Debug runtime gating
   - File: `src/constants/game.ts`
   - Change default debug mode so heavy debug code is not active during normal gameplay sessions.
   - Keep a controlled opt-in path for debugging (so debugging remains possible when needed).

2. Stop always-on CCD debug payload generation
   - File: `src/utils/gameCCD.ts`
   - Replace unconditional CCD debug flag with an explicit runtime signal (only when user intentionally enables deep profiling).
   - Make `shouldMeasurePerf` conditional on the same explicit profiling signal (not global debug constant).

3. Fix debug object creation in CCD hot path
   - File: `src/utils/processBallCCD.ts`
   - Ensure debug structures are created only when profiling is truly enabled.
   - Avoid heavy per-iteration debug allocations in normal gameplay.
   - Keep collision behavior exactly the same; this is instrumentation-only change.

Phase 2 — Reduce baseline frame-loop overhead
4. Safer default debug settings
   - File: `src/hooks/useDebugSettings.ts`
   - Turn off high-frequency logging toggles by default (`enableGCLogging`, `enableLagLogging`, `enableFPSLogging`, `enablePerformanceLogging`).
   - Preserve manual toggles from dashboard for troubleshooting.

5. Lazy-enable console interception
   - File: `src/components/Game.tsx` (+ existing `debugLogger` integration)
   - Don’t intercept console globally on mount by default.
   - Only enable interception when relevant logging toggles are actually enabled.

6. Restore frame-based throttling behavior
   - File: `src/components/Game.tsx`
   - Replace `gameLoopRef.current?.getFrameTick()` usage with an actually incrementing frame source (`frameCountRef.current`) in low-quality throttling checks.
   - This restores intended “update particles every other frame on low quality” behavior.

Phase 3 — Optional fallback for weaker laptops (only if needed after Phase 1+2)
7. Render loop budget cap
   - File: `src/engine/renderLoop.ts`
   - Add optional frame pacing cap (e.g., 60fps hard cap) to avoid unnecessary over-rendering on high-refresh panels and reduce CPU/GPU pressure.
   - Keep visuals unchanged; this only constrains render cadence.

8. Conservative adaptive-quality startup
   - File: `src/components/Game.tsx` / `src/hooks/useAdaptiveQuality.ts`
   - Start from a less aggressive quality on constrained hardware and promote upward if FPS stabilizes.
   - Keeps first 10–20 seconds from stuttering before quality can react.

Validation plan
1. Baseline capture (before changes)
   - Reproduce on `/play` with same settings.
   - Record FPS/quality/object counts over 2–3 minutes.

2. Post-change checks
   - Confirm no repeated `[Performance Issue Detected - CRITICAL]` spam unless deep profiling is explicitly enabled.
   - Confirm pointer lock pause/resume still works as expected.
   - Confirm ball collisions/paddle response feel unchanged.
   - Confirm low-quality mode actually skips particle updates on alternating frames.

3. Acceptance criteria
   - Noticeably improved frame stability on HP Elitebook scenario.
   - Fewer long-frame spikes and reduced console-driven stutter.
   - No gameplay regressions (collision correctness, boss fights, power-up behavior).

Risk management
- Main risk: accidentally hiding useful debug features.
- Mitigation: keep debug as opt-in, not removed.
- Rollback strategy: each phase is isolated by file and can be reverted independently if any regression appears.

Technical file map
- `src/constants/game.ts` — debug runtime default and gating strategy
- `src/utils/gameCCD.ts` — remove always-on CCD debug/perf timing
- `src/utils/processBallCCD.ts` — eliminate normal-path debug allocations
- `src/hooks/useDebugSettings.ts` — safer default logging flags
- `src/components/Game.tsx` — lazy debug logger activation + real frame tick source
- `src/engine/renderLoop.ts` — optional render pacing cap (phase 3)
