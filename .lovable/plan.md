

# Extract `checkCollision` into `src/engine/physics.ts`

## Overview

Move the ~2,200-line `checkCollision` useCallback from `Game.tsx` into a pure module-level function in `src/engine/physics.ts` that reads from and writes to the `world` singleton directly. Game.tsx will call this function each frame with a thin "side-effect bridge" for the things physics can't own (React state setters, sound, toasts, tutorials).

## Architecture

The function has two distinct halves:

1. **Pure physics** (boss sweep, CCD, ball updates, gravity, homing, lost-ball detection) -- these read/write `world` and return collision results. This is the hot path.
2. **Side effects** (score updates, sound, toasts, power-up drops, explosions, boss defeat transitions, life-loss reset, tutorial triggers, Boss Rush stats) -- these call React setters, sound manager, and timers.

We will split along this boundary:

```text
engine/physics.ts
  - performBossFirstSweep()     (pure, mutates ball in-place)
  - runPhysicsFrame()           (orchestrator: boss sweep + CCD + event processing + gravity + ball filtering)
  Returns: PhysicsFrameResult   (events, score delta, bricks to update, enemies to update/destroy, balls lost, etc.)

Game.tsx
  - checkCollision() becomes a thin wrapper:
      const result = runPhysicsFrame(config)
      // Apply side effects from result
```

## New file: `src/engine/physics.ts`

### Inputs (`PhysicsConfig`)

Passed once per frame from Game.tsx:

| Field | Source |
|-------|--------|
| `dtSeconds` | Fixed 1/60 |
| `frameTick` | gameLoopRef |
| `level` | React state |
| `canvasSize` | scaled constants |
| `minBrickDimension` | scaled constants |
| `qualityLevel` | quality settings |
| `isBossRush` | React state |
| `difficulty` | settings |
| `debugSettings` | debug hook |
| `scaledPaddleWidth` | scaled constants |
| `scaledBallRadius` | scaled constants |
| `scaledPaddleStartY` | scaled constants |

### Outputs (`PhysicsFrameResult`)

Returned to Game.tsx for side-effect application:

| Field | Type | Purpose |
|-------|------|---------|
| `updatedBalls` | `Ball[]` | Surviving balls after filtering |
| `allBallsLost` | `boolean` | Trigger life-loss logic |
| `scoreIncrease` | `number` | Total score delta |
| `bricksDestroyedCount` | `number` | For stats |
| `brickUpdates` | `Map<id, {visible, hitsRemaining}>` | Batch brick mutations |
| `allBricksCleared` | `boolean` | Win condition |
| `soundsToPlay` | `Array<{type, param?}>` | Deferred sound triggers |
| `enemiesToUpdate` | `Map<id, Partial<Enemy>>` | Enemy damage/anger |
| `enemiesToDestroy` | `Set<number>` | Enemy kill indices |
| `explosionsToCreate` | `Array<{x,y,type}>` | Visual explosions |
| `bonusLetterDrops` | `Array<{x,y}>` | Letter drops |
| `largeSphereDrops` | `Array<{x,y}>` | Power-up drops |
| `bombIntervalsToClean` | `number[]` | Interval cleanup |
| `enemiesKilledIncrease` | `number` | Kill counter delta |
| `powerUpBricks` | `Brick[]` | Bricks eligible for power-up rolls |
| `explosiveBricksToDetonate` | `Brick[]` | Chain explosion queue |
| `bossHits` | `Array<{boss, isMega, damage, isResurrected, resIdx}>` | Boss damage events |
| `bossDefeats` | `Array<{type, boss}>` | Boss defeat events |
| `bossPhaseChanges` | `Array<{type, newStage, ...}>` | Phase transitions |
| `megaBossShieldDamage` | shield HP changes | Mega boss specifics |
| `megaBossCoreExposed` | `boolean` | Core exposure event |
| `paddleHits` | `number` | For Boss Rush shot tracking |
| `ballsPendingHit` | `Set<number>` | Boss Rush accuracy |
| `ccdPerformance` | perf data | For debug overlay |
| `secondChanceSaves` | `Array<{x,y}>` | Second chance visual |
| `speedAccumulationDelta` | `number` | Brick-hit speed increase |

### What moves into physics.ts

1. **`performBossFirstSweep`** -- the entire 600-line inner function with all shape-specific collision math (cube, sphere, pyramid, mega boss inner/outer shield)
2. **CCD invocation** -- calling `processBallWithCCD` and collecting results
3. **Event deduplication** -- the `processedObjects` Map and EPS_TOI logic
4. **Brick damage processing** -- hit counting, fireball pass-through, explosive brick detection
5. **Enemy damage processing** -- multi-hit logic for pyramid/sphere/crossBall/cube enemies
6. **Paddle collision validation** -- anti-rescue checks, cooldown, angle remapping
7. **Wall collision processing** -- bounce sound throttling
8. **Homing ball physics** -- angle steering toward boss
9. **Gravity application** -- `BALL_GRAVITY` after delay
10. **Ball filtering** -- lost ball detection, top boundary safety, mega boss gravity well
11. **Speed accumulation** -- brick-hit speed increase calculation

### What stays in Game.tsx

1. **Sound playback** -- `soundManager.play*()` calls driven by `result.soundsToPlay`
2. **Toast notifications** -- `throttledToast()` / `toast.*()` driven by result events
3. **React state mutations** -- `setScore`, `setBricks`, `setEnemies`, `setExplosions`, `setPowerUps`, `setLives`, etc.
4. **Boss defeat transitions** -- `setBossDefeatedTransitioning`, `setBossVictoryOverlayActive`, victory flow
5. **Tutorial triggers** -- `triggerTutorial` calls
6. **Boss Rush stats** -- `setBossRushHitsThisBoss`, etc.
7. **Life-loss reset** -- mercy power-ups, paddle reset, state cleanup
8. **Timer/interval cleanup** -- `bombIntervalsRef` clearing

### What stays shared via `world`

Physics reads/writes `world.balls`, `world.paddle`, `world.bricks`, `world.enemies`, `world.boss`, `world.resurrectedBosses`, `world.speedMultiplier`, `world.brickHitSpeedAccumulated` directly. No copies, no props.

## Implementation steps

### Step 1: Create `src/engine/physics.ts`

- Define `PhysicsConfig` and `PhysicsFrameResult` interfaces
- Move `performBossFirstSweep` as a module-level function
- Create `runPhysicsFrame(config: PhysicsConfig): PhysicsFrameResult` that:
  - Reads entities from `world`
  - Runs boss-first sweep (Phase 0)
  - Runs CCD (Phase 1)
  - Processes collision events (Phase 2) -- builds result arrays instead of calling setters
  - Applies homing + gravity (Phase 3)
  - Filters lost balls (Phase 4)
  - Returns `PhysicsFrameResult`

### Step 2: Refactor `Game.tsx`

- Import `runPhysicsFrame` from `@/engine/physics`
- Replace the `checkCollision` useCallback body with:

```typescript
const checkCollision = useCallback(() => {
  const result = runPhysicsFrame({
    dtSeconds: 1/60,
    frameTick: gameLoopRef.current?.getFrameTick() || 0,
    level,
    canvasSize: { w: SCALED_CANVAS_WIDTH, h: SCALED_CANVAS_HEIGHT },
    minBrickDimension: Math.min(SCALED_BRICK_WIDTH, SCALED_BRICK_HEIGHT),
    qualityLevel: qualitySettings.level,
    difficulty: settings.difficulty,
    debugSettings,
    // ... other config
  });

  // Apply side effects from result
  if (result.soundsToPlay.length > 0) { /* play sounds */ }
  if (result.scoreIncrease > 0) setScore(s => s + result.scoreIncrease);
  if (result.brickUpdates.size > 0) setBricks(prev => /* apply updates */);
  // ... etc for all result fields
}, [level, qualitySettings, settings.difficulty, debugSettings]);
```

### Step 3: Move debug logging behind ENABLE_DEBUG_FEATURES

All `collisionHistory.addEntry` and verbose console.log calls in the physics module will be gated behind the existing `ENABLE_DEBUG_FEATURES` constant, ensuring zero overhead in production.

## Performance impact

- **Eliminates useCallback overhead**: No more ~2,200-line closure recreation when deps change
- **Reduces React reconciliation**: Physics returns plain data; React only processes the diffs
- **Better JIT optimization**: V8 can better optimize a stable module-level function vs. a closure that changes identity
- **Cleaner GC**: Fewer closures captured in memory

## Files changed

| File | Change |
|------|--------|
| `src/engine/physics.ts` | **New file** -- ~1,500 lines of pure physics logic |
| `src/components/Game.tsx` | Replace ~2,200-line `checkCollision` with ~200-line side-effect applier |

## Risk mitigation

- The `world` singleton pattern is already established and battle-tested
- All shape-specific collision math is copied verbatim -- no physics changes
- Side effects remain in Game.tsx exactly as before, just driven by result data
- Debug overlays continue to work via `ccdPerformance` in the result

