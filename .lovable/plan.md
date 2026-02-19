
# Remove Deprecated and Dead Code

## Summary

Clean up dead code identified across the codebase: unused imports, legacy compatibility wrappers with zero callers, orphaned flag cleanup, and an unused export.

## Changes

### 1. `src/engine/physics.ts` -- Remove dead `_hitBossThisFrame` and `_hitPaddleThisFrame` cleanup

The previous refactor removed the lines that **set** `_hitBossThisFrame`, but left behind two `delete` calls (lines 455 and 1138-1139) that clean up a flag that is never written. `_hitPaddleThisFrame` is also only deleted, never set.

- **Line 455**: Remove `delete (ball as any)._hitBossThisFrame;`
- **Lines 1138-1139**: Remove both `delete (ball as any)._hitBossThisFrame;` and `delete (ball as any)._hitPaddleThisFrame;`
- If the surrounding `for` loop and `if (r.ball)` block become empty, remove those too.

### 2. `src/components/Game.tsx` -- Remove unused imports

- **`startBallTracking`** (line 48): Imported from `@/utils/ballTracker` but never called in Game.tsx (only used in `physics.ts`).
- **`brickColors`** (line 86): Imported from `@/constants/game` but never referenced -- only `getBrickColors` is actually used.

### 3. `src/utils/megaBossUtils.ts` -- Remove legacy compatibility wrappers (lines 337-372)

Five exported functions are never imported anywhere:

| Function | What it wraps | Callers |
|----------|---------------|---------|
| `handleMegaBossDamage` | `handleMegaBossOuterDamage` | None |
| `triggerMegaBossResurrection` | Returns `boss` unchanged | None |
| `openMegaBossHatch` | `exposeMegaBossCore` | None |
| `closeMegaBossHatch` | Inline object spread | None |
| `trapBallInMegaBoss` | `handleMegaBossCoreHit` | None |

Also remove `releaseBallFromMegaBoss` (line 374-377) and `shouldOpenHatch` (line 383-387) -- both are only defined and exported here but never imported.

### 4. `src/constants/game.ts` -- Remove legacy `brickColors` export (lines 85-86)

The comment says "Legacy export for backward compatibility" -- the only importer was Game.tsx (which we're cleaning up above). `getBrickColors(level)` is the canonical API.

## Files changed

| File | Change | Lines removed |
|------|--------|---------------|
| `src/engine/physics.ts` | Remove 3 dead `delete` statements for unused flags | ~5 |
| `src/components/Game.tsx` | Remove 2 unused imports (`startBallTracking`, `brickColors`) | ~2 |
| `src/utils/megaBossUtils.ts` | Remove 7 legacy compatibility functions never imported | ~45 |
| `src/constants/game.ts` | Remove unused `brickColors` export | ~3 |

Total: ~55 lines of dead code removed, zero behavioral change.
