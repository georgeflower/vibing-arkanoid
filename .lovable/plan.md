
# Remove Boss Victory Overlay for Boss Rush & Clean Up Delays

## Summary
This plan removes the redundant "Great Job! Boss Defeated!" overlay from Boss Rush mode (since the stats overlay serves that purpose), eliminates the 2000ms delays before showing the stats overlay, and ensures the time snapshot is captured correctly in all code paths.

## Changes Overview

| Location | Current | Change |
|----------|---------|--------|
| `BossVictoryOverlay` render | Always shows when `bossVictoryOverlayActive` | Only show when `bossVictoryOverlayActive && !isBossRush` |
| Game.tsx line ~1289 | 2000ms delay, missing time snapshot | Remove delay, add time snapshot |
| Game.tsx line ~3265 | 2000ms delay | Remove delay |
| Game.tsx line ~3345 | 2000ms delay | Remove delay |
| Game.tsx line ~3465 | 2000ms delay | Remove delay |
| BossRushStatsOverlay.tsx line 106 | 2000ms before `canContinue` | Reduce to 1200ms (after animations complete) |

## Detailed Changes

### 1. Gate BossVictoryOverlay for Normal Mode Only
**File:** `src/components/Game.tsx` (line ~9200)

Change:
```typescript
<BossVictoryOverlay
  active={bossVictoryOverlayActive}
  onComplete={() => setBossVictoryOverlayActive(false)}
/>
```

To:
```typescript
<BossVictoryOverlay
  active={bossVictoryOverlayActive && !isBossRush}
  onComplete={() => setBossVictoryOverlayActive(false)}
/>
```

### 2. Fix Pyramid Phase 2 Turret Defeat Path (Missing Time Snapshot)
**File:** `src/components/Game.tsx` (lines ~1286-1291)

Current code:
```typescript
if (isBossRush) {
  setTimeout(() => {
    gameLoopRef.current?.pause();
    setBossRushStatsOverlayActive(true);
  }, 2000);
}
```

Change to:
```typescript
if (isBossRush) {
  gameLoopRef.current?.pause();
  setBossRushTimeSnapshot(bossRushStartTime ? Date.now() - bossRushStartTime : 0);
  setBossRushStatsOverlayActive(true);
}
```

### 3. Remove 2000ms Delay for Cube Boss Defeat
**File:** `src/components/Game.tsx` (lines ~3261-3268)

Current code:
```typescript
if (isBossRush) {
  setTimeout(() => {
    gameLoopRef.current?.pause();
    setBossRushTimeSnapshot(bossRushStartTime ? Date.now() - bossRushStartTime : 0);
    setBossRushStatsOverlayActive(true);
  }, 2000);
}
```

Change to:
```typescript
if (isBossRush) {
  gameLoopRef.current?.pause();
  setBossRushTimeSnapshot(bossRushStartTime ? Date.now() - bossRushStartTime : 0);
  setBossRushStatsOverlayActive(true);
}
```

### 4. Remove 2000ms Delay for Sphere Boss Defeat
**File:** `src/components/Game.tsx` (lines ~3340-3347)

Same pattern - remove `setTimeout` wrapper, execute immediately.

### 5. Remove 2000ms Delay for Pyramid/Resurrected Boss Defeat
**File:** `src/components/Game.tsx` (lines ~3461-3468)

Same pattern - remove `setTimeout` wrapper, execute immediately.

### 6. Reduce Stats Overlay Continue Delay
**File:** `src/components/BossRushStatsOverlay.tsx` (line 106)

Current:
```typescript
const continueTimer = setTimeout(() => setCanContinue(true), 2000);
```

Change to:
```typescript
const continueTimer = setTimeout(() => setCanContinue(true), 1200);
```

This allows the stat animations (which take up to 1000ms with 900ms delay) to complete before enabling continue.

## Technical Notes

- The `BossVictoryOverlay` component itself remains in the codebase - it's still used in normal campaign mode when defeating bosses on levels 5, 10, 15, and 20.
- The stats overlay now appears immediately after boss defeat in Boss Rush mode, rather than waiting 2 seconds.
- The continue delay is reduced from 2000ms to 1200ms, allowing players to proceed faster while still seeing the animated stats.
- All four boss defeat paths (Cube, Sphere, Pyramid phase 2, and Resurrected Pyramids) will now behave consistently.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/Game.tsx` | Gate BossVictoryOverlay, remove 4x setTimeout delays, add missing time snapshot |
| `src/components/BossRushStatsOverlay.tsx` | Reduce continue delay from 2000ms to 1200ms |
