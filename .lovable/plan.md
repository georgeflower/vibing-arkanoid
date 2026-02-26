

# Fix Dual Power-Up Dim Leaking to Single Power-Ups + Snappier Blink

## Root Cause
The entity pool's reset function for power-ups (`src/utils/entityPool.ts`, lines 184-187) only resets `active` and `isMercyLife`. When a dual-choice power-up is released back to the pool and later re-acquired for a **single** drop, the `isDualChoice` and `pairedWithId` properties persist from the previous use. This causes the renderer's dim logic to incorrectly apply to what should be a normal single power-up.

## Changes

### 1. Reset dual-choice flags in pool (`src/utils/entityPool.ts`)
Add `isDualChoice` and `pairedWithId` to the reset function so recycled power-ups don't carry stale flags:
```typescript
(p) => {
  p.active = false;
  p.isMercyLife = false;
  p.isDualChoice = false;       // NEW
  p.pairedWithId = undefined;   // NEW
}
```

### 2. Snappier dim alternation (`src/engine/canvasRenderer.ts`)
Change the dim toggle from 1-second intervals to 0.75-second intervals:
```typescript
// Line 683: change 1000 to 750
const phase = Math.floor(now / 750) % 2;
```

## Files Modified
- `src/utils/entityPool.ts` -- reset `isDualChoice` and `pairedWithId` on pool release
- `src/engine/canvasRenderer.ts` -- dim interval from 1000ms to 750ms

