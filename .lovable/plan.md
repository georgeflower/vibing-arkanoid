
# Performance Improvements: Phase B Implementation Plan

This plan implements 6 concrete optimizations identified from a deep audit of `Game.tsx`, `canvasRenderer.ts`, and `index.css`. All effects are preserved. The game will look identical but run measurably smoother, especially on high-refresh-rate displays.

---

## What Will Be Fixed

### 1. Power-Ups Race Condition (Same Root Cause as Bullets)

**Current state:** `canvasRenderer.ts` line 194 reads `const powerUps = rs.powerUps`. The `renderState.powerUps` bridge is updated asynchronously via `useEffect` in `Game.tsx` line 1583. The decoupled render loop at monitor refresh rate reads `rs.powerUps` which contains shared, in-place-mutated objects. This is the exact same race condition that caused bullets to appear at double speed on high-refresh displays.

**Fix:** Remove `powerUps` from `renderState`, read them from `world.powerUps` in the renderer, and sync `world.powerUps` in `updatePowerUps` inside `usePowerUps.ts`.

Files: `src/engine/renderState.ts`, `src/engine/canvasRenderer.ts`, `src/hooks/usePowerUps.ts`, `src/components/Game.tsx`

---

### 2. Remove Dead `setBackgroundPhase` Call From Game Loop

**Current state:** `Game.tsx` line 4060 calls `setBackgroundPhase((prev) => (prev + 1) % 360)` every single game tick. The `backgroundPhase` value in `world` is **never read by `canvasRenderer.ts`** (confirmed: zero matches for `backgroundPhase` in `canvasRenderer.ts`). This increment writes to `world.backgroundPhase` on every frame, doing completely pointless work — a misleading comment says it's "Time Rendering" but the renderer ignores it.

**Fix:** Delete the `setBackgroundPhase((prev) => (prev + 1) % 360)` call from the game loop entirely. The background animations in `canvasRenderer.ts` are already driven by `now` (the `Date.now()` captured per frame).

Files: `src/components/Game.tsx`

---

### 3. Eliminate the 5 Remaining `ctx.shadowBlur` Calls

**Confirmed locations:**

- Line 1268–1279: **Laser warning** — red dashed vertical line with `shadowBlur = 15`
- Line 1359: **Resurrected boss glow** — triangle with `shadowBlur = 20`
- Line 1393–1394: **Bonus letters** — falling letter images with `shadowBlur = 15`
- Line 1430–1431: **Game state overlay text** ("GAME OVER", "YOU WON") — `shadowBlur = 12`
- Line 1536–1540: **Boss intro "WARNING"** text — `shadowBlur = 20` and `10`

`ctx.shadowBlur` triggers a GPU blur compositor pass even at value 1. These 5 sites fire during frequent gameplay moments (boss fights, level transitions, bonus letters). All will be replaced with the established no-blur alternatives already used throughout the rest of the renderer:

- **Laser warning:** Draw a semi-transparent wide stroke behind the dashed line (same as the red border pulse already on the boss intro)
- **Resurrected boss:** Use `getCachedRadialGradient` for a purple/red outer glow circle drawn before the triangle fill
- **Bonus letters:** Draw a small radial gradient circle behind the image using `getCachedRadialGradient`
- **Game state text:** Draw text twice (offset dark shadow + bright fill) — identical to the instruction text technique already at lines 1464–1475
- **Boss intro text:** Same double-text technique for both "WARNING" and "BOSS APPROACHING"

Files: `src/engine/canvasRenderer.ts`

---

### 4. Fix `Math.random()` in the Render Loop (Screen Shake + Electrical Arcs)

**Confirmed locations:**

- Line 209–210: Screen shake (`Math.random() - 0.5` twice per frame while `screenShake > 0`)
- Line 938: Shield electrical arc jitter — `(Math.random() - 0.5) * 8` × 6 arcs (48 calls/frame while shield active)
- Line 1059: Second-chance safety net arc jitter — `(Math.random() - 0.5) * 6` × 12 arcs (144 calls/frame while second chance active)

`Math.random()` in a render-hot path is non-deterministic and adds GC pressure. Replace with `Math.sin(now * k + phase)` to produce time-based pseudo-noise that is visually identical and allocates nothing.

Files: `src/engine/canvasRenderer.ts`

---

### 5. Fix the Duplicate Particle Render Pass

**Confirmed:** `particlePool.getActive()` is called **twice per frame** — once at line 1237 (`const pooledParticles = particlePool.getActive()`) for the "debris" pass and again at line 1479 (`const activeParticles = particlePool.getActive()`) for the "celebration/game-over" pass. Both loops iterate the entire active particle array.

The second loop at line 1479–1500 also has an **active `ctx.shadowBlur = 10` call** (line 1486) that fires on every particle when `glowEnabled` is true. This affects all celebration/high-score particles.

**Fix:**
- Merge both loops into a single pass. The distinction between "debris" and "celebration" particles is that celebration particles use `arc` (circle) and debris uses `fillRect` (square). Check particle `size` or add a `useCircle` boolean flag to `Particle` type to route them in one pass.
- Remove the `ctx.shadowBlur = 10` from the celebration particle loop — replace with a slightly larger outer circle drawn at lower opacity (same technique used everywhere else).

Files: `src/engine/canvasRenderer.ts`, `src/utils/particlePool.ts`, `src/types/game.ts`

---

### 6. Slow the CRT Scanline Flicker From 10Hz to 0.25Hz

**Current state:** `src/index.css` line 698 — `animation: scanline-flicker 0.1s infinite alternate`. This triggers the browser compositor to repaint the full-viewport scanline overlay **600 times per minute**. The opacity range is only 0.95→1.0 (a 5% flicker barely visible at rest). The `crt-screen` class uses a 5-second animation — the scanline should match this slower cadence.

**Fix:** Change `animation: scanline-flicker 0.1s infinite alternate` to `animation: scanline-flicker 4s infinite alternate`. This reduces compositor work from 600 repaints/min to 30 repaints/min with no perceptible visual difference at gameplay speeds.

Files: `src/index.css`

---

## Technical Summary of Files Changed

| File | Changes |
|------|---------|
| `src/engine/renderState.ts` | Remove `powerUps` field from `RenderState` interface and singleton |
| `src/engine/canvasRenderer.ts` | Read `powerUps` from `world`; replace 5 `shadowBlur` calls; replace `Math.random()` jitter with deterministic noise; merge duplicate particle passes; remove particle `shadowBlur` |
| `src/hooks/usePowerUps.ts` | Write `world.powerUps` inside `updatePowerUps` and `setPowerUps` setters |
| `src/components/Game.tsx` | Remove `powerUps` from `renderState` sync `useEffect`; remove `setBackgroundPhase` game-loop call |
| `src/types/game.ts` | Add optional `useCircle?: boolean` flag to `Particle` interface |
| `src/utils/particlePool.ts` | Set `useCircle: true` on celebration/high-score particles in `acquireForGameOver` and `acquireForHighScore` |
| `src/index.css` | Change scanline animation duration from `0.1s` to `4s` |

## Gains Summary

| Optimization | Impact |
|---|---|
| Power-up race condition fix | Eliminates potential visual glitch on 120Hz+ displays; same fix as bullets |
| Remove `setBackgroundPhase` | Eliminates one pointless `world` write per frame (dead code) |
| 5 × `shadowBlur` eliminated | Removes GPU blur passes during boss fights, laser attacks, and transitions |
| Deterministic arc noise | Removes `~190 Math.random()` calls per frame during combat (shield + second chance active) |
| Single particle pass | Eliminates duplicate pool traversal + one `save/restore` pair per frame |
| Particle `shadowBlur` removed | Removes per-particle blur during game-over/high-score celebration |
| CRT flicker 10Hz → 0.25Hz | -570 compositor repaints per minute |

All effects are preserved and visually indistinguishable from the current implementation.
