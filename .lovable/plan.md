

# Fix: Shield Power-Up Not Resetting Hit Streak

## Problem

When the paddle has the shield power-up active, the hit streak does not reset even if the ball returns to the paddle without hitting any boss or enemy. The shield power-up is a purely defensive visual overlay that protects the paddle from boss projectiles -- it does NOT change the ball-paddle collision behavior. The ball should still be detected as hitting the paddle normally.

## Root Cause Analysis

After tracing through the code:

1. **The shield power-up does NOT affect ball-paddle collisions** -- the ball still collides with the paddle normally in `processBallCCD.ts`, and `paddleHitBallIds` is populated correctly in `physics.ts`.

2. **The real bug is a stale closure issue** on line 3396 of `Game.tsx`:
   ```
   if (hitStreak > 0) {
       setHitStreak(0);
   ```
   The `hitStreak` variable is read from React state closure. If boss/enemy hits incremented the streak via `setHitStreak(prev + 1)` earlier in the same frame, `hitStreak` in the closure still holds the OLD value from the previous render. This means:
   - If streak was 0 at render start, and a boss hit bumps it to 1, and then the paddle check runs -- it sees `hitStreak === 0` and skips the reset entirely.
   - The streak silently survives when it should have been cleared.

3. This is more noticeable when the shield is active because the shield prolongs survival, leading to more frames where boss hits and paddle hits occur in the same physics frame.

## Fix

### File: `src/components/Game.tsx`

**Add a `hitStreakRef`** that mirrors `hitStreak` state, so the paddle-bounce check always reads the latest value:

- Add `const hitStreakRef = useRef(0)` alongside the existing state
- Update `hitStreakRef.current` inside every `setHitStreak` call (both increments and resets)
- Change the paddle-bounce check from `if (hitStreak > 0)` to `if (hitStreakRef.current > 0)` so it reads the latest value regardless of React batching

Additionally, the streak reset should use `setHitStreak(0)` unconditionally when a no-hit paddle return is detected (remove the `> 0` guard entirely since calling `setHitStreak(0)` when already 0 is harmless):

```
for (const ballId of result.paddleHitBallIds) {
    if (!ballHitSinceLastPaddleRef.current.has(ballId)) {
        // Ball returned to paddle without hitting boss/enemy -- reset streak
        setHitStreak(0);
        hitStreakRef.current = 0;
        setHitStreakActive(false);
        world.backgroundHue = 0;
    }
    ballHitSinceLastPaddleRef.current.delete(ballId);
}
```

And in the boss/enemy hit tracking, keep the ref in sync:

```
setHitStreak((prev) => {
    const newStreak = prev + 1;
    hitStreakRef.current = newStreak;
    // ... rest of streak logic
    return newStreak;
});
```

Similarly, all other reset locations (death, retry, level start) must also set `hitStreakRef.current = 0`.

### Summary

| File | Change |
|---|---|
| `src/components/Game.tsx` | Add `hitStreakRef` to eliminate stale closure reads; remove `hitStreak > 0` guard on reset; sync ref in all setHitStreak calls |

