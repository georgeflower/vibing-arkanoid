


# Boss Hit Points + Hit Streak System

## Overview

Three new features for boss levels:
1. **Boss hit points**: Every boss/enemy hit awards 100 points (with streak bonus)
2. **Hit streak system**: Track consecutive boss/enemy hits between paddle bounces; reset if the ball returns to paddle without hitting anything
3. **Streak hue effect**: x10+ activates music-reactive background hue (reusing the Phase 3 code)

## How the Streak Works

- Each ball tracks whether it has hit a boss/enemy since last paddle contact
- On paddle bounce: if the ball had no hits since last paddle contact, streak resets to 0
- On paddle bounce: if the ball had hits, the flag is cleared (waiting for next cycle)
- On death (all balls lost / life lost): streak resets to 0
- On level completion: streak is KEPT to the next level
- Streak multiplier: x2 = +2% score bonus, x3 = +3%, etc. Applied to the 100-point boss/enemy hit award
- Only active on boss levels (5, 10, 15, 20)

## What Counts as a Hit

- Boss hit (canDamage)
- Enemy destroyed (cube, sphere, crossBall)
- Enemy first hit (sphere angry, crossBall angry) — counts as hit too
- CrossBall merge into Large Sphere — counts as a hit per merge

## Celebrations

- **x10+**: Activate music-reactive background hue blinking (same code as mega boss Phase 3) on ALL boss levels. Reset when streak resets.
- No x5 celebration (removed)

## HUD Display

- **STREAK**: Shows "x3" (or "---" when 0)
- **BONUS**: Shows "+3%" (or "---" when 0)
- Color: gold/yellow hue, with pulsing animation when streak >= 5
- Only visible on boss levels
