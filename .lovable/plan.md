
# Fix: Boss Rush Stats Overlay Not Appearing on Turret Boss Defeat

## Problem

When defeating a boss with a turret shot in Boss Rush mode, the Boss Rush statistics overlay does not appear. Instead, the game shows the standard "BOSS DEFEATED!" victory overlay and advances to the next level after 3 seconds.

## Root Cause

The turret boss defeat callbacks for **Cube** and **Sphere** bosses (lines ~1400-1449 in Game.tsx) always execute the non-Boss-Rush path:
- `setBossVictoryOverlayActive(true)` -- shows standard victory overlay
- `setTimeout(() => nextLevel(), 3000)` -- advances after 3 seconds

They never check `isBossRush` to conditionally show the Boss Rush stats overlay instead. The **Pyramid** (resurrected bosses) callback at line ~1504 already has the correct Boss Rush check, but Cube and Sphere do not.

For comparison, the ball-based boss defeat paths (at lines ~3510, ~3585, ~3702) all correctly check `isBossRush` and show the stats overlay.

## Solution

Add the same `isBossRush` conditional to the Cube and Sphere turret defeat callbacks, matching the pattern already used by the Pyramid callback and the ball-based defeat paths.

## Technical Details

### File: `src/components/Game.tsx`

**1. Cube boss turret defeat (lines ~1400-1412)**

Replace the unconditional victory overlay + `setTimeout` with a Boss Rush check:

```typescript
setBossActive(false);
setBossDefeatedTransitioning(true);
// Clean up game entities
setBalls([]);
clearAllEnemies();
setBossAttacks([]);
clearAllBombs();
setBullets([]);

if (isBossRush) {
  gameLoopRef.current?.pause();
  setBossRushTimeSnapshot(bossRushStartTime ? Date.now() - bossRushStartTime : 0);
  setBossRushStatsOverlayActive(true);
} else {
  setBossVictoryOverlayActive(true);
  soundManager.stopBossMusic();
  soundManager.resumeBackgroundMusic();
  setTimeout(() => nextLevel(), 3000);
}
```

**2. Sphere boss turret defeat (lines ~1436-1448)**

Apply the same pattern as above.

### Summary

| Boss Type | Ball defeat path | Turret defeat path (current) | Turret defeat path (fixed) |
|-----------|-----------------|------------------------------|---------------------------|
| Cube | Checks isBossRush | Always standard overlay | Checks isBossRush |
| Sphere | Checks isBossRush | Always standard overlay | Checks isBossRush |
| Pyramid | Checks isBossRush | Checks isBossRush | No change needed |

### Files changed
- **`src/components/Game.tsx`** -- Add `isBossRush` conditionals to Cube and Sphere turret defeat callbacks
