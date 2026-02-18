

# Add Pool/Cache Performance Overlay

## Overview

Create a new `PoolStatsOverlay` component that displays real-time statistics for entity pools, spatial hash usage, brick cache rebuilds, and particle pool -- all behind the existing debug flag system.

## Changes

### 1. Add `showPoolStats` to Debug Settings

**File: `src/hooks/useDebugSettings.ts`**
- Add `showPoolStats: boolean` to the `DebugSettings` interface
- Default to `false`

### 2. Create `PoolStatsOverlay` Component

**File: `src/components/PoolStatsOverlay.tsx`** (new)

A polling overlay (updates every 200ms) that reads from existing stats APIs:

| Section | Data Source | Metrics Shown |
|---------|-----------|---------------|
| Entity Pools | `getAllPoolStats()` | Active / pooled count per pool (powerUps, bullets, bombs, enemies, bonusLetters, explosions) |
| Particle Pool | `particlePool.getStats()` | Active / pooled / total |
| Spatial Hash | `brickSpatialHash.getStats()` | Occupied cells, total objects, avg objects/cell |
| Brick Cache | `brickRenderer.getStats()` | Cache version (= rebuild count), dimensions, ready status |

Styled to match existing overlays (black/80 bg, cyan accent, mono font, fixed position). Positioned at bottom-left to avoid overlap with other debug overlays that use top-left/top-right.

Color coding:
- Pool utilization > 80%: red
- Pool utilization > 50%: yellow  
- Otherwise: green

### 3. Add Toggle to Debug Dashboard

**File: `src/components/DebugDashboard.tsx`**
- Add a `DebugToggle` for "Pool Stats" in the Visual Overlays section

### 4. Render Overlay in Game

**File: `src/components/Game.tsx`**
- Import `PoolStatsOverlay`
- Render it inside the debug overlays block, gated by `debugSettings.showPoolStats`

## Technical Details

- All data sources already expose `.getStats()` methods -- no new instrumentation needed
- The overlay uses `setInterval(200ms)` like existing overlays to avoid per-frame React re-renders
- No per-frame allocations: stats objects are small and only created on the 200ms polling interval
- The brick cache `version` field increments on every rebuild, so displaying it over time shows rebuild frequency

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useDebugSettings.ts` | Edit | Add `showPoolStats` field |
| `src/components/PoolStatsOverlay.tsx` | Create | New overlay component |
| `src/components/DebugDashboard.tsx` | Edit | Add toggle for pool stats |
| `src/components/Game.tsx` | Edit | Import and render overlay |

