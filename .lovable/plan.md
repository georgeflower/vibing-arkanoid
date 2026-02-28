
## Deep-dive findings (double-checked from current code)

Your logs are consistent with a render/main-thread bottleneck, not physics:
- CCD stays near `0.0–0.2ms` with very low object counts.
- FPS still collapses to ~13–48 even in LOW quality and simple scenes.

I validated several hidden contributors in the code:

1) **Hard 60 caps exist in two places**
- `src/engine/renderLoop.ts`: `MIN_FRAME_INTERVAL = 1000 / 62` (~60 FPS cap).
- `src/components/Game.tsx`: `targetFrameTime = 1000 / 60`, plus FPS is clamped with `Math.min(60, ...)`.
- This explains reduced smoothness on high-end displays.

2) **Debug overhead is active by default even when overlays are closed**
- `src/hooks/useDebugSettings.ts`: defaults set `enableLagLogging: true`, `enableGCLogging: true`, `enablePerformanceLogging: true`, `enableFPSLogging: true`.
- `src/components/Game.tsx` loop computes debug path every frame when those toggles are true.
- `src/components/Game.tsx` also enables `debugLogger.intercept()` globally on mount when debug is enabled.

3) **Per-frame allocation churn still exists in hot paths**
- `src/engine/physics.ts`: creates fresh result object + many arrays every frame (`createEmptyResult`, `map/filter/find/sort`).
- `src/components/Game.tsx`: per-frame cleanup filters for warnings (`setLaserWarnings(...filter...)`, `setSuperWarnings(...filter...)`) even when mostly empty.
- `src/engine/canvasRenderer.ts`: several array/filter paths still allocate in render path (small individually, but sustained).

4) **Loop architecture currently has no interpolation path**
- Physics/update and rendering are independent loops.
- With hard-capped update and no interpolation, high-refresh smoothness suffers.

---

## Implementation approach (respecting your constraints)

### Constraints honored
- Keep debug system (do not remove debug flag).
- Remove fixed 60 render cap behavior and support 100 FPS target for high-end.
- Do not reduce ball motion smoothness.

---

## Plan (sequenced)

### Phase 1 — Replace hard caps with adaptive frame pacing (no gameplay speed change)
**Files:**  
- `src/engine/renderLoop.ts`  
- `src/components/Game.tsx`

**Changes:**
1. Introduce configurable targets:
   - Desktop high-performance target: **100 FPS** render pacing.
   - Lower targets only when quality falls or device is constrained.
2. Remove `Math.min(60, ...)` FPS clamp in `Game.tsx` metrics.
3. Keep physics deterministic at fixed timestep (60Hz simulation), but decouple render pacing from simulation pacing.
4. Add interpolation factor plumbing so render can run at ~100 FPS without speeding physics.

**Why:** preserves gameplay correctness while restoring smoothness on high-end.

---

### Phase 2 — Keep debug features, but make hot-path debug checks truly opt-in
**Files:**  
- `src/hooks/useDebugSettings.ts`  
- `src/components/Game.tsx`  
- `src/utils/debugLogger.ts`

**Changes:**
1. Keep all debug features available, but change expensive default runtime toggles:
   - `enableLagLogging` and `enableGCLogging` default off.
   - `enableDetailedFrameLogging` remains off.
2. Only run lag/GC polling branches when the specific toggle is enabled.
3. Keep console interception feature, but avoid globally intercepting unless at least one logging mode is active (or dashboard open).

**Why:** you keep debug capability, but baseline gameplay path is no longer paying continuous debug tax.

---

### Phase 3 — Remove recurring allocation churn in per-frame code
**Files:**  
- `src/engine/physics.ts`  
- `src/components/Game.tsx`  
- `src/engine/canvasRenderer.ts`

**Changes:**
1. `physics.ts`: move from per-frame fresh result object/arrays to reusable frame buffers (clear-length pattern).
2. Replace hot-path `map/filter` chains where practical with indexed loops and in-place compaction.
3. In `Game.tsx`, avoid per-frame warning array `filter` when arrays are empty; use cheap guards and in-place cleanup patterns.
4. In `canvasRenderer.ts`, remove unnecessary temporary array creation in always-executed paths.

**Why:** cuts GC spikes that match “minimal scene but bad FPS” behavior.

---

### Phase 4 — Improve observability so profiler points to real bottlenecks
**Files:**  
- `src/utils/performanceProfiler.ts`  
- `src/components/Game.tsx`  
- `src/utils/frameProfiler.ts`

**Changes:**
1. Add explicit measurements for:
   - simulation/update cost
   - render submit cost
   - debug/logging cost
   - GC/long-frame counts
2. Keep detailed logging available, but reduce console flood by batching or cooldown-based summaries.

**Why:** current profiler says “No bottlenecks detected” because it mostly tracks object counts/CCD, not full frame budget consumers.

---

## Validation plan (before/after)

1. **High-end machine test**
- Confirm target render pacing near 100 FPS when quality high.
- Confirm ball path smoothness improves vs current capped behavior.

2. **Integrated graphics test**
- Same scene as your logs (1 ball, ~25 bricks, no particles/enemies).
- Verify stable uplift and fewer critical dips.
- Verify low-quality fallback still helps without changing ball behavior.

3. **Regression checks**
- Pointer lock pause/resume.
- Boss levels (background effects + music-reactive hue).
- Debug dashboard toggles still work and can re-enable all diagnostics.

---

## Risk controls

- Physics remains fixed-step to avoid speed changes.
- Render interpolation is additive (visual smoothness), not gameplay-altering.
- Debug features are preserved, only baseline activation defaults/pacing change.
- Changes are incremental by phase so each can be benchmarked and rolled back independently.

---

## Technical note on your 100 FPS requirement
To satisfy “100 FPS on high-end” **and** avoid worse integrated performance, the right model is:
- fixed 60Hz simulation + interpolated render at up to 100Hz (adaptive),
- not uncapped simulation ticks.
This preserves collision determinism and ball behavior while improving perceived smoothness.
