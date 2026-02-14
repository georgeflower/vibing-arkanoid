

# Gravity System Improvements

## Changes

### 1. Increase delay to 10 seconds and reduce gravity strength
- Change `GRAVITY_DELAY_MS` from `5000` to `10000`
- Change `BALL_GRAVITY` from `0.04` to `0.015` (much gentler pull)

### 2. Track last collision time instead of just paddle hits
- Rename the tracking concept: instead of only checking `lastPaddleHitTime`, introduce a new per-ball field `lastCollisionTime` (or reuse `lastPaddleHitTime` as a general "last gravity-resetting collision" timestamp). Since `lastPaddleHitTime` is also used for paddle hit cooldown logic, the cleanest approach is to add a separate field to the `Ball` type called `lastGravityResetTime`.
- Reset `lastGravityResetTime` to `performance.now()` on:
  - **Paddle hit** (two locations: normal paddle collision and corner paddle collision)
  - **Brick collision** (inside the brick collision handler, after a valid non-duplicate hit)
  - **Enemy collision** (inside the enemy collision handler, after a valid hit)
  - **Ball launch** (when ball is first launched)

### 3. Remove gravity-added speed on paddle hit
- When a paddle collision occurs, recalculate the ball's speed to remove any gravity contribution. Specifically, after the paddle bounce, normalize the ball's velocity vector to the ball's base `speed` value (which doesn't include gravity). This ensures the ball leaves the paddle at its intended speed, not an inflated one.

### 4. Update debug overlay
- Change the debug overlay timer to use `lastGravityResetTime` instead of `lastPaddleHitTime`, and update the countdown to reflect the new 10-second delay.

## Files changed

- **`src/types/game.ts`** -- Add `lastGravityResetTime?: number` field to the `Ball` interface
- **`src/components/Game.tsx`** -- Update constants, reset `lastGravityResetTime` on paddle/brick/enemy collisions, normalize speed on paddle hit, update gravity check and debug info
- **`src/components/SubstepDebugOverlay.tsx`** -- No changes needed (it already displays whatever the parent passes)

## Technical details

```typescript
// Constants
const BALL_GRAVITY = 0.015;     // was 0.04
const GRAVITY_DELAY_MS = 10000; // was 5000

// Gravity application (unchanged logic, new field)
const timeSinceCollision = performance.now() - (result.ball.lastGravityResetTime ?? 0);
if (timeSinceCollision > GRAVITY_DELAY_MS) {
  result.ball.dy += BALL_GRAVITY;
}

// On paddle hit - reset gravity timer AND normalize speed
result.ball.lastGravityResetTime = performance.now();
const currentSpeed = Math.hypot(result.ball.dx, result.ball.dy);
const targetSpeed = result.ball.speed; // base speed without gravity
if (currentSpeed > 0 && currentSpeed > targetSpeed) {
  const scale = targetSpeed / currentSpeed;
  result.ball.dx *= scale;
  result.ball.dy *= scale;
}

// On brick/enemy collision - just reset the timer
result.ball.lastGravityResetTime = performance.now();
```
