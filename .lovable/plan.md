

# Performance Optimization for Integrated Graphics

## Problem Analysis

The performance logs show critical FPS (24-50, avg 30-39) with a **minimal scene** — just 1 ball, 24 bricks, 0 enemies, 0 particles, 0ms CCD. The bottleneck is clearly in **rendering**, not physics or game logic. The profiler says "No specific bottlenecks detected" because it only monitors object counts and CCD, not GPU/rendering cost.

After a deep dive into the rendering pipeline, here are the root causes:

---

## Root Causes Identified

### 1. Render Loop Has No Frame Cap (HIGH IMPACT)
`renderLoop.ts` calls `renderFrame()` on **every** `requestAnimationFrame` tick with zero throttling. On a 144Hz monitor, that's 144 full canvas redraws per second. The game loop in `Game.tsx` separately throttles its updates to 60fps, but the render loop has no such cap. On integrated graphics, 144 canvas draws/sec is devastating.

### 2. Per-Frame Gradient Creation (MEDIUM IMPACT)
The renderer creates ~15-20 **new** `CanvasGradient` objects every frame via `ctx.createRadialGradient()` / `ctx.createLinearGradient()` that bypass the gradient cache. These are at lines 482, 510, 556, 949, 1077, 1124, 1225, 1271, 1482, 1725, 1808, 1916, 1950, 2628. Each one is a GPU-side object allocation.

### 3. CRT Overlay DOM Compositing (MEDIUM IMPACT)
Three absolutely-positioned DOM layers (`crt-scanlines`, `crt-screen`, `crt-phosphor`) with CSS animations and `mix-blend-mode: screen` are composited over the canvas every frame. On integrated GPUs, these extra compositor layers are expensive. When quality drops to LOW, the CRT overlay still renders — it only removes the `crt-high`/`crt-medium` class but still paints the scanlines pattern.

### 4. Remaining `shadowBlur` Calls (LOW-MEDIUM IMPACT)
There are still 3 active `ctx.shadowBlur` assignments in the renderer (lines 2057, 2405, 2671). On integrated GPUs, `shadowBlur` triggers expensive Gaussian blur operations on the GPU. These are on enemy/boss art, but the GPU cost leaks into every frame.

### 5. Full-Canvas Composite Operations (LOW IMPACT)
Lines 256-262: `globalCompositeOperation = "overlay"` with full-canvas fill runs every frame when `backgroundHue > 0`. Lines 294-301: `globalCompositeOperation = "screen"` with full-canvas fill runs on high quality. These are skipped on LOW but still run during the initial quality drop.

---

## Proposed Fixes

### Fix 1: Add 60fps Cap to Render Loop
Add `MIN_FRAME_INTERVAL` throttling to `renderLoop.ts`, matching the game loop's 60fps cap. This alone could nearly **double** frame rate on 120Hz+ displays with integrated graphics.

```text
renderLoop.ts:
- Track lastFrameTime
- Skip renderFrame() if elapsed < 16.67ms
- Still call rAF to maintain smooth scheduling
```

### Fix 2: Disable CRT Overlay on LOW Quality
Modify `CRTOverlay.tsx` to return `null` when quality is `"low"`. Currently it renders 3 DOM layers regardless of quality level — only the CSS classes change. Removing the DOM elements entirely eliminates compositor overhead.

### Fix 3: Remove Remaining `shadowBlur` Calls
Replace the 3 remaining `ctx.shadowBlur` assignments (angry pyramid enemy eyebrows at line 2057, boss attack arrow at line 2405) with the double-fill technique already used elsewhere. The `shadowBlur = 0` at line 2671 is harmless but can be cleaned up.

### Fix 4: Cache Per-Frame Gradients Where Possible
For gradients that depend on dynamic positions (ball, impact effects), these can't easily be cached. However, for gradients with fixed parameters relative to an entity (e.g., shield grad, reflect shield, boss sphere), use `ctx.translate()` + the existing `getCachedRadialGradient()` pattern. Focus on the most frequently called ones:
- Ball glow gradients (lines 482, 510, 556) — use translate + cached gradient
- Shield energy fill (line 1077) — cache with size key

### Fix 5: Skip Ambient Effects on LOW Quality
Ensure the ambient flicker (lines 294-301) and background hue overlay (lines 256-262) are completely gated behind quality checks — add explicit `qualitySettings.level !== "low"` guards.

---

## What This Will NOT Change
- Ball movement smoothness — physics runs at a fixed 60Hz tick rate independent of rendering
- Visual quality on high-end hardware — all changes are conditional on LOW quality or are pure optimizations
- Debug flag behavior — no changes to `ENABLE_DEBUG_FEATURES`

## Priority Order
1. Fix 1 (render loop cap) — biggest impact, simplest change
2. Fix 2 (CRT on low quality) — significant GPU savings
3. Fix 3 (shadowBlur removal) — small but free perf
4. Fix 4 (gradient caching) — moderate effort, moderate gain
5. Fix 5 (ambient effects gate) — minor cleanup

