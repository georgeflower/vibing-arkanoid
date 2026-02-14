

# Fix: Gravity accumulates indefinitely -- should only activate after 5s without paddle contact

## Problem

Currently `ball.dy += BALL_GRAVITY` runs every frame unconditionally, so the downward pull compounds over time making the ball feel heavier and heavier. The intended behavior is:

- Gravity should only kick in after the ball hasn't touched the paddle for 5 seconds
- Each paddle hit should reset the timer, removing gravity until 5 seconds pass again

## Solution

### 1. Track last paddle hit time per ball

The `Ball` type already has a `lastPaddleHitTime` field. We'll ensure it's set on every paddle collision (it likely already is from the paddle collision logic). On ball launch, initialize it to `Date.now()`.

### 2. Conditionally apply gravity

Replace the unconditional gravity line with a check: only apply gravity if the ball hasn't hit the paddle in the last 5 seconds.

```typescript
const GRAVITY_DELAY_MS = 5000;

ballResults.forEach((result) => {
  if (result.ball && !result.ball.waitingToLaunch) {
    const timeSincePaddle = Date.now() - (result.ball.lastPaddleHitTime ?? 0);
    if (timeSincePaddle > GRAVITY_DELAY_MS) {
      result.ball.dy += BALL_GRAVITY;
    }
  }
});
```

### 3. Ensure `lastPaddleHitTime` is set

- On paddle collision (already handled via the paddle collision code path) -- verify it sets `ball.lastPaddleHitTime = Date.now()`
- On ball launch/reset -- set `lastPaddleHitTime = Date.now()` so the 5-second timer starts fresh

## Files changed

- `src/components/Game.tsx` -- modify gravity application block (~3 lines changed), verify paddle hit timestamp is set on collision and ball launch

