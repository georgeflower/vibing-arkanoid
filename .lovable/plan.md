

# Deduplicate Life-Loss and Boss Defeat Handlers in Game.tsx

## Problem

Game.tsx contains 5+ nearly identical "lose a life" blocks and 3 nearly identical "boss defeat" blocks, copy-pasted with minor variations. This makes maintenance error-prone and bloats the file.

## Life-Loss Blocks Found (5 instances)

| Location | Trigger | Differences from canonical |
|----------|---------|---------------------------|
| Line 3767 | `result.allBallsLost` | Has mercy power-up logic, uses `initialAngle` for ball dx/dy, clears power-up timers (reflect/homing/fireball), tracks `livesLostOnCurrentLevel` |
| Line 4505 | Bomb hits paddle | Base speed 4.5, simple dx/dy = baseSpeed, no mercy, no power-up timer clears |
| Line 4674 | Bounced bullet hits paddle | Base speed 5.175, no mercy, no power-up timer clears |
| Line 5796 | Boss attack (shot/super/spiral/cross) hits paddle | Base speed 5.175, clears enemies/bombs/explosions, no mercy |
| Line 6491 | Laser hits paddle | Base speed 5.175, clears enemies/bombs/explosions, no mercy |

### Common "game over" branch (identical across all 5)
- `setGameState("gameOver")`
- Stop boss/background music
- Clear boss attacks and laser warnings
- Boss Rush: set game over level, completion time, show score entry
- Campaign: check high score qualification, show entry or end screen

### Common "survive" branch (mostly identical)
- Create reset ball at center, waiting to launch
- Reset launch angle to -20
- Show instructions
- Clear power-ups, bonus letters, bullets
- Reset paddle (no turrets, no shield, default width)
- Reset speed if below 1, reset brick hit speed accumulation
- Clear enemies, bombs, boss attacks, laser warnings, explosions
- Clear bomb intervals
- Set game state to "ready"

### Variations in "survive" branch
- **Ball base speed**: Line 3767 uses 4.5 with proper angle calc; others use 4.5 or 5.175 with dx=dy=baseSpeed (a bug -- should use angle)
- **Mercy power-ups**: Only line 3767 (allBallsLost) spawns mercy power-ups
- **Power-up timer clears**: Only line 3767 clears reflect/homing/fireball/stunner timers
- **Boss Rush stats**: Only line 3767 tracks `bossRushLivesLostThisBoss`

## Boss Defeat Blocks Found (3 instances)

| Location | Boss Type | Unique bits |
|----------|-----------|-------------|
| Line 1430 | Cube | Points = cube.points, toast text mentions "CUBE GUARDIAN" |
| Line 1473 | Sphere | Points = sphere.points, toast text mentions "SPHERE DESTROYER" |
| Line 1557 | Pyramid (all resurrected) | Points already awarded per-pyramid; just bonus life + victory |

### Common boss defeat logic (identical across all 3)
- `soundManager.playExplosion()` + `soundManager.playBossDefeatSound()`
- Award bonus life
- Create explosion at boss center
- `setBossesKilled(k => k + 1)`
- `setBossActive(false)`
- `setBossDefeatedTransitioning(true)`
- Clean up: clear balls, enemies, boss attacks, bombs, bullets
- Boss Rush: pause loop, snapshot time, show stats overlay
- Campaign: show victory overlay, stop boss music, resume background, nextLevel after 3s

## Solution

Create two helper functions inside Game.tsx (they need closure access to React setters):

### 1. `handleGameOver()` -- extracted from the "game over" branch

```typescript
const handleGameOver = useCallback(() => {
  setGameState("gameOver");
  soundManager.stopBossMusic();
  soundManager.stopBackgroundMusic();
  setBossAttacks([]);
  setLaserWarnings([]);

  if (isBossRush) {
    const currentBossLevel = BOSS_RUSH_CONFIG.bossOrder[bossRushIndex] || 5;
    setBossRushGameOverLevel(currentBossLevel);
    const completionTime = bossRushStartTime ? Date.now() - bossRushStartTime : 0;
    setBossRushCompletionTime(completionTime);
    setShowBossRushScoreEntry(true);
    soundManager.playHighScoreMusic();
    toast.error("Boss Rush Over!");
  } else {
    getQualifiedLeaderboards(score).then((qualification) => {
      if (!levelSkipped && (qualification.daily || qualification.weekly || qualification.allTime)) {
        setQualifiedLeaderboards(qualification);
        setShowHighScoreEntry(true);
        soundManager.playHighScoreMusic();
        toast.error("Game Over - New High Score!");
      } else {
        setShowEndScreen(true);
        toast.error("Game Over!");
      }
    });
  }
}, [isBossRush, bossRushIndex, bossRushStartTime, score, levelSkipped]);
```

### 2. `handleSurviveDeath(toastMessage, options?)` -- extracted from the "survive" branch

Standardizes the reset ball base speed (4.5 with proper angle calc), always clears all timers and entities, optionally spawns mercy power-ups.

```typescript
interface SurviveOptions {
  spawnMercy?: boolean;  // Only true for allBallsLost path
  toastMessage: string;
}

const handleSurviveDeath = useCallback((newLives: number, opts: SurviveOptions) => {
  const baseSpeed = 4.5;
  const initialAngle = (-20 * Math.PI) / 180;
  const resetBall: Ball = {
    x: SCALED_CANVAS_WIDTH / 2,
    y: SCALED_CANVAS_HEIGHT - SCALED_PADDLE_START_Y,
    dx: baseSpeed * Math.sin(initialAngle),
    dy: -baseSpeed * Math.cos(initialAngle),
    radius: SCALED_BALL_RADIUS,
    speed: baseSpeed,
    id: nextBallId.current++,
    isFireball: false,
    waitingToLaunch: true,
  };
  setBalls([resetBall]);
  setLaunchAngle(-20);
  launchAngleDirectionRef.current = 1;
  setShowInstructions(true);

  // Mercy power-ups (only for allBallsLost path)
  if (opts.spawnMercy) {
    setLivesLostOnCurrentLevel(prev => { /* mercy logic */ return prev + 1; });
  } else {
    setPowerUps([]);
  }

  setBonusLetters([]);
  setPaddle(prev => prev
    ? { ...prev, hasTurrets: false, hasShield: false, hasReflectShield: false, width: SCALED_PADDLE_WIDTH }
    : null);

  // Clear all power-up timers
  setBossStunnerEndTime(null);
  setReflectShieldEndTime(null);
  setHomingBallEndTime(null);
  setFireballEndTime(null);
  setReflectShieldActive(false);
  setHomingBallActive(false);
  if (reflectShieldTimeoutRef.current) { clearTimeout(...); }
  if (homingBallTimeoutRef.current) { clearTimeout(...); }

  setBullets([]);
  if (world.speedMultiplier < 1) setSpeedMultiplier(1);
  setBrickHitSpeedAccumulated(0);
  setTimer(0);
  clearAllEnemies();
  setBossAttacks([]);
  setLaserWarnings([]);
  clearAllBombs();
  setExplosions([]);
  bombIntervalsRef.current.forEach(i => clearInterval(i));
  bombIntervalsRef.current.clear();
  setGameState("ready");
  toast(opts.toastMessage);
}, [/* deps */]);
```

### 3. `handleBossDefeat(bossType, defeatedBoss, points, toastMessage)` -- extracted from boss defeat callbacks

```typescript
const handleBossDefeat = useCallback((
  bossType: EnemyType,
  defeatedBoss: Boss,
  points: number,
  toastMessage: string,
) => {
  soundManager.playExplosion();
  soundManager.playBossDefeatSound();
  setScore(s => s + points);
  setLives(prev => prev + 1);
  toast.success(toastMessage);

  setExplosions(e => [...e, {
    x: defeatedBoss.x + defeatedBoss.width / 2,
    y: defeatedBoss.y + defeatedBoss.height / 2,
    frame: 0, maxFrames: 30,
    enemyType: bossType,
    particles: createExplosionParticles(
      defeatedBoss.x + defeatedBoss.width / 2,
      defeatedBoss.y + defeatedBoss.height / 2,
      bossType,
    ),
  }]);

  setBossesKilled(k => k + 1);
  setBossActive(false);
  setBossDefeatedTransitioning(true);
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
}, [isBossRush, bossRushStartTime, nextLevel]);
```

## Call sites after refactor

### Life-loss (all 5 blocks become ~8 lines each)

```typescript
// allBallsLost path (line 3767)
setLives(prev => {
  const newLives = prev - 1;
  soundManager.playLoseLife();
  if (newLives <= 0) { handleGameOver(); }
  else { handleSurviveDeath(newLives, { spawnMercy: true, toastMessage: `Life lost! ${newLives} lives remaining.` }); }
  return newLives;
});

// Bomb/bullet/bossAttack/laser paths
soundManager.playLoseLife();
setLives(prev => {
  const newLives = prev - 1;
  if (newLives <= 0) { handleGameOver(); }
  else { handleSurviveDeath(newLives, { spawnMercy: false, toastMessage: `Bomb hit! ${newLives} lives remaining.` }); }
  return newLives;
});
```

### Boss defeat (3 blocks become 1-line calls)

```typescript
// Cube
handleBossDefeat("cube", defeatedBoss, BOSS_CONFIG.cube.points,
  `CUBE GUARDIAN DEFEATED! +${BOSS_CONFIG.cube.points} points + BONUS LIFE!`);

// Sphere
handleBossDefeat("sphere", defeatedBoss, BOSS_CONFIG.sphere.points,
  `SPHERE DESTROYER DEFEATED! +${BOSS_CONFIG.sphere.points} points + BONUS LIFE!`);

// Pyramid (all defeated) -- slightly different: no per-boss points (already awarded), just bonus life + victory
// This one calls handleBossDefeat with points=0 and its own toast
```

## Bug fixes included

1. **Ball reset angle**: Blocks 2-5 set `dx = baseSpeed, dy = -baseSpeed` instead of using proper angle math. The shared helper uses the correct `sin/cos` calculation, matching block 1.
2. **Power-up timer cleanup**: Blocks 2-5 don't clear reflect/homing/fireball/stunner timers on death. The shared helper always clears them, preventing ghost timers from firing after respawn.
3. **Missing `hasReflectShield: false`**: Blocks 2-5 don't reset `hasReflectShield` on the paddle. The shared helper includes it.

## Files changed

| File | Change |
|------|--------|
| `src/components/Game.tsx` | Add 3 `useCallback` helpers (~80 lines total); replace 5 life-loss blocks (~300 lines removed) and 3 boss defeat blocks (~120 lines removed) with calls to helpers. Net reduction: ~340 lines. |

## Risk mitigation

- All behavioral differences are documented above; the standardization fixes bugs (angle, timer cleanup, reflect shield reset) rather than introducing regressions
- The helpers remain inside Game.tsx as `useCallback`s, so they have full closure access to all state setters -- no architectural change needed
- Boss Rush stats tracking (`bossRushLivesLostThisBoss`) is preserved in the `allBallsLost` caller, not in the helper

