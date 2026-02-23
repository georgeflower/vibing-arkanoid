

# Boss Hit Points + Hit Streak System

## Overview

Three new features for boss levels:
1. **Boss hit points**: Every boss/enemy hit awards 100 points
2. **Hit streak system**: Track consecutive boss/enemy hits between paddle bounces; reset if the ball returns to paddle without hitting anything
3. **Streak celebrations**: Every x5 milestone triggers a celebration (sound + background flash); x10+ activates music-reactive background hue (reusing the Phase 3 code)

## How the Streak Works

```text
Launch ball -> hit boss (x1) -> hit enemy (x2) -> paddle bounce
-> hit enemy (x3) -> paddle bounce -> paddle bounce (NO HITS = RESET to x0)
-> hit boss (x1) -> ...
```

- Each ball tracks whether it has hit a boss/enemy since last paddle contact (`hitSinceLastPaddle` flag)
- On paddle bounce: if the ball had no hits since last paddle contact, streak resets to 0
- On paddle bounce: if the ball had hits, the flag is cleared (waiting for next cycle)
- On death (all balls lost / life lost): streak resets to 0
- Streak multiplier: x2 = +2% score bonus, x3 = +3%, etc. Applied to the 100-point boss/enemy hit award
- Only active on boss levels (5, 10, 15, 20)

## HUD Display

Add two new boxes to the right panel stat area (desktop) and compact HUD (mobile/fullscreen-off):
- **STREAK**: Shows "x3" (or "---" when 0)  
- **BONUS**: Shows "+3%" (or "---" when 0)

Color: gold/yellow hue, with pulsing animation when streak >= 5

## Celebrations

- **Every x5** (5, 10, 15, 20...): Background flash + phase complete jingle sound
- **x10+**: Activate music-reactive background hue blinking (same code as mega boss Phase 3) on ALL boss levels, not just level 20. Reset when streak resets.

---

## Technical Details

### 1. State in Game.tsx

Add new React state:
- `hitStreak: number` (default 0)
- `hitStreakActive: boolean` (tracks if streak hue effect is on)

Add a ref:
- `ballHitSinceLastPaddleRef: React.MutableRefObject<Set<number>>` -- set of ball IDs that have hit a boss/enemy since last paddle contact

### 2. Physics Changes (src/engine/physics.ts)

- Remove the `if (isBossRush)` guard on `paddleHitBallIds` -- always track paddle hits for all modes
- Always push to `bossHitBallIds` on boss hits (remove `isBossRush` guard)
- Add `enemyHitBallIds: number[]` to `PhysicsFrameResult` -- push ball ID when an enemy is destroyed by ball collision

### 3. Game Loop Logic (src/components/Game.tsx)

In the physics result processing section (~line 3362):

```text
For each paddleHitBallId:
  if ball NOT in ballHitSinceLastPaddleRef -> streak resets to 0, deactivate hue
  remove ball from ballHitSinceLastPaddleRef

For each bossHit (canDamage):
  add ball to ballHitSinceLastPaddleRef
  increment streak by 1
  award 100 * (1 + streak/100) points  (streak% bonus)
  if streak % 5 === 0: celebration (sound + flash)
  if streak >= 10 && !hitStreakActive: activate hue effect

For each enemyHitBallId:
  add ball to ballHitSinceLastPaddleRef
  increment streak by 1
  (same celebration/hue logic)

On life lost (allBallsLost):
  reset streak to 0, deactivate hue, clear ballHitSinceLastPaddleRef
```

### 4. Background Hue for Streak (src/components/Game.tsx + src/engine/canvasRenderer.ts)

- In the game loop, when `hitStreakActive` and on a boss level: read `soundManager.getBassEnergy()` and set `world.backgroundHue` (same code as mega boss Phase 3)
- In canvasRenderer: change the hue overlay condition from `level === 20` to `world.backgroundHue > 0` so it works on any boss level

### 5. HUD Display (src/components/Game.tsx)

Add two new `right-stat-box` entries after the Boss CD box (~line 8161):
- STREAK box showing `x{hitStreak}` or "---"
- BONUS box showing `+{hitStreak}%` or "---"
- Only visible on boss levels

Also add to the compact HUD overlay (~line 8263) and mobile HUD section.

### 6. Reset on Level Start / Retry

In `handleRetryLevel` and level initialization: reset `hitStreak` to 0, clear `ballHitSinceLastPaddleRef`, set `hitStreakActive` to false, reset `world.backgroundHue` to 0.

### Files Changed

| File | Changes |
|---|---|
| `src/engine/physics.ts` | Remove `isBossRush` guards on paddle/boss hit ball ID tracking; add `enemyHitBallIds` to result |
| `src/components/Game.tsx` | Add streak state, streak logic in physics result processing, celebrations, hue activation, HUD boxes, reset on death/retry |
| `src/engine/canvasRenderer.ts` | Change hue overlay condition from `level === 20` to `world.backgroundHue > 0` |

