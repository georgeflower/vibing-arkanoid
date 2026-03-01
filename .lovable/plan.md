

# Fix Frame-Rate Dependent Game Speed

## Root Cause

The game has **two separate loops**:
1. **Game loop** (`Game.tsx` gameLoop) -- runs simulation: physics, enemies, bombs, power-ups, boss movement, etc.
2. **Render loop** (`renderLoop.ts`) -- draws the canvas from `world` state.

Previously both ran at 60 FPS. The recent performance optimization changed the game loop target to ~100 FPS (`targetFrameTime = 1000 / 102`). However, nearly all movement code in the game loop is **frame-based** (e.g., `enemy.x += enemy.dx` per tick), meaning 100 ticks/sec = 67% faster movement.

The ball physics are partially protected (CCD uses `dtSeconds: 1/60` and converts velocities), but even that assumes exactly 60 ticks/sec.

## Solution: Fixed 60Hz Simulation + 100Hz Rendering (Already the Architecture)

The render loop is **already separate** and already runs at 100 FPS. The game loop should stay at a fixed 60 FPS simulation rate. This is the correct architecture described in the project's own performance philosophy.

The fix is simple: **revert the game loop pacing back to 60 FPS** while keeping the render loop at its adaptive 100 FPS target.

---

## Changes

### File: `src/components/Game.tsx`

**Change 1** -- Revert simulation pacing to 60 FPS (line ~3966):
```
// Before:
const targetFrameTime = 1000 / 102; // ~100 FPS simulation pacing

// After:
const targetFrameTime = 1000 / 62; // ~60 FPS simulation pacing (slight margin)
```

This single change fixes all frame-rate dependent movement (enemies, bombs, boss, power-ups, bullets, bonus letters, boss attacks) because they all run inside this game loop and were designed for 60 FPS ticks.

The render loop in `renderLoop.ts` remains at its adaptive 100 FPS target, providing smooth visuals on high-refresh displays.

---

## Why This Works

- **Ball physics**: Already frame-rate independent via CCD with `dtSeconds: 1/60`. Stays correct.
- **All other movement**: Designed for 60 FPS frame-based updates. Restoring 60 FPS ticks makes them correct again.
- **Visual smoothness**: The render loop draws at up to 100 FPS independently, reading from `world` state. Entities appear smooth because the canvas redraws at 100Hz even though positions update at 60Hz.
- **Integrated graphics**: The render loop already adapts to 60 FPS on low quality. The simulation at 60 FPS is far less expensive than at 100 FPS (40% fewer physics/collision/state updates per second).

## What This Does NOT Change

- Render loop stays at adaptive 100/60 FPS target (no change to `renderLoop.ts`)
- Debug features remain as-is
- No speed constant conversions needed
- No delta-time refactor needed across dozens of movement callsites
- Ball smoothness preserved (CCD handles interpolation internally)

