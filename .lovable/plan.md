

# Performance Optimizations for Integrated Graphics (HP EliteBook 860)

## Summary

This plan addresses remaining GPU bottlenecks by: (A) expanding the quality preset system with granular effect toggles, (B) caching remaining per-frame gradient allocations, (C) gating expensive effects behind quality checks, and (D) adding GPU hardware detection to auto-set quality on integrated GPUs.

---

## Phase 1: Expand Quality Presets with Granular Effect Toggles

**File: `src/hooks/useAdaptiveQuality.ts`**

Add new fields to `QualitySettings` interface and `QUALITY_PRESETS`:

- `chaosGlowEnabled` -- gates the chaos-aware ball glow (radial gradient + arc)
- `animatedDashesEnabled` -- gates animated `lineDashOffset` on laser/super warnings
- `shieldArcsEnabled` -- gates electrical arc rendering on shields
- `superWarningEffects` -- gates ring count and spoke animations on super warnings
- `ambientFlickerEnabled` -- gates the full-canvas "screen" composite ambient flicker

Preset values:
- **Low**: all new flags `false`, `particleMultiplier: 0.15`, `explosionParticles: 3`, `screenShakeMultiplier: 0.25`
- **Medium**: `animatedDashesEnabled: true`, rest `false`, `particleMultiplier: 0.4`, `explosionParticles: 8`
- **High**: all new flags `true`, existing values unchanged

**File: `src/engine/renderState.ts`**

Update the default `qualitySettings` in the singleton to include the new fields.

---

## Phase 2: Gate Expensive Rendering Behind Quality Checks

**File: `src/engine/canvasRenderer.ts`**

### 2a. Chaos glow (lines ~550-572)
Change `qualitySettings.glowEnabled` guard to `qualitySettings.chaosGlowEnabled`. This eliminates the chaos radial gradient + large arc fill on low/medium.

### 2b. Shield electrical arcs (lines ~1048-1074)
Wrap the 6-arc loop in `if (qualitySettings.shieldArcsEnabled)`. On low/medium, the shield renders as layered strokes only (already has low-quality path for single stroke).

### 2c. Shield layers on medium
Reduce from 3 layers to 2 on medium quality: `const layerCount = qualitySettings.level === 'high' ? 3 : 2;`

### 2d. Laser warning animated dashes (lines ~1430-1438)
Wrap the dashed line + `lineDashOffset` animation in `if (qualitySettings.animatedDashesEnabled)`. On low quality, only the wide semi-transparent background stroke renders.

### 2e. Super warning rings and spokes (lines ~1458-1480)
- Ring count: `const ringCount = qualitySettings.superWarningEffects ? 3 : 1;`
- Spoke animation: wrap `setLineDash` + 8-spoke loop in `if (qualitySettings.superWarningEffects)`

### 2f. Ambient flicker (line ~294)
Change guard from `qualitySettings.level === "high"` to `qualitySettings.ambientFlickerEnabled`.

### 2g. Shield impact sparks (lines ~1103-1131)
- Reduce ripple count on low: `const rippleCount = qualitySettings.level === 'low' ? 1 : (qualitySettings.level === 'medium' ? 2 : 3);`
- Skip flash gradient on low quality entirely

### 2h. Particle glow pass (lines ~1685-1691)
Already gated by `qualitySettings.glowEnabled` -- no change needed.

---

## Phase 3: Cache Remaining Per-Frame Gradient Allocations

**File: `src/engine/canvasRenderer.ts`**

Convert the following `ctx.createRadialGradient` calls to use `getCachedRadialGradient` with `ctx.translate()`:

1. **Chaos glow** (line 556) -- cache key based on discretized opacity: `chaosGlow_${Math.floor(chaosGlowOpacity * 10)}`
2. **Get-ready glow** (line 482) -- cache key `getReadyGlow`, use translate to ball position
3. **Ball release glow** (line 510) -- cache key `releaseGlow`, translate
4. **Shield energy fill** (line 1077) -- cache key `shieldEnergy_${qualitySettings.level}`, translate to shield center
5. **Shield impact flash** (line 1124) -- cache key `shieldImpactFlash`, translate to impact position
6. **Super warning center glow** (line 1482) -- cache key `superWarningGlow`, translate to warning position
7. **Reflect shield gradient** (line 1271) -- convert to `getCachedLinearGradient` with translate

For gradients with dynamic alpha in color stops (which makes caching less effective), discretize to ~10 levels so the cache has bounded size.

---

## Phase 4: Integrated GPU Auto-Detection

**File: `src/hooks/useAdaptiveQuality.ts`**

Add a `detectIntegratedGPU()` function that:
1. Creates a temporary canvas and gets a WebGL context
2. Reads `WEBGL_debug_renderer_info` extension for `UNMASKED_RENDERER_WEBGL`
3. Checks for known integrated GPU strings: `intel`, `uhd`, `iris`, `arc`, `integrated`, `mali`, `adreno`
4. Returns `boolean`

On hook initialization, if integrated GPU is detected and `initialQuality` is not already `low`, force quality to `medium` (not `low` -- let auto-adjust drop further if needed) and show a toast notification.

Export `isIntegratedGPU` from the hook return so `Game.tsx` can use it if needed.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks/useAdaptiveQuality.ts` | Add 6 new quality fields, tighten low/medium presets, add GPU detection |
| `src/engine/canvasRenderer.ts` | Gate 6 effect sections behind quality flags, cache 7 gradients |
| `src/engine/renderState.ts` | Update default quality settings to include new fields |

## What This Does NOT Change

- Ball movement or physics (deterministic 60Hz simulation unchanged)
- Debug system (all flags preserved)
- Render loop pacing (100/60 FPS adaptive target unchanged)
- High quality visual experience on dedicated GPUs
- Any game logic or collision detection

