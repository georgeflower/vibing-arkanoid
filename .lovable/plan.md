

# Fix Dual Power-Up Dim Leaking to Single Power-Ups + Snappier Blink

## Status: ✅ COMPLETE

## Root Cause
The entity pool's reset function for power-ups (`src/utils/entityPool.ts`) only reset `active` and `isMercyLife`. When a dual-choice power-up was released back to the pool and later re-acquired for a **single** drop, the `isDualChoice` and `pairedWithId` properties persisted from the previous use, causing the renderer's dim logic to incorrectly apply to single power-ups.

## Changes Made

### 1. ✅ Reset dual-choice flags in pool (`src/utils/entityPool.ts`)
Added `isDualChoice = false` and `pairedWithId = undefined` to the power-up pool reset function.

### 2. ✅ Snappier dim alternation (`src/engine/canvasRenderer.ts`)
Changed dim toggle from 1000ms to 750ms intervals.

### 3. ✅ Reduced dual-choice chance (`src/utils/powerUpAssignment.ts`)
Changed `DUAL_CHOICE_CHANCE` from 0.25 (25%) to 0.15 (15%).

## Files Modified
- `src/utils/entityPool.ts` -- reset `isDualChoice` and `pairedWithId` on pool release
- `src/engine/canvasRenderer.ts` -- dim interval from 1000ms to 750ms, alpha preservation for single drops
- `src/utils/powerUpAssignment.ts` -- dual-choice chance reduced to 15%
