

# Fix: Ball Tunneling Through Cube Boss at High Speed

## Root Cause Analysis

There are **two separate issues** that make the cube boss uniquely vulnerable to ball pass-through compared to sphere and pyramid.

### Issue 1: Degenerate Normal When Ball Is Inside the Cube

The cube collision (lines 220-254 of `physics.ts`) uses a closest-point-on-rotated-rectangle approach. When the ball center is **inside** the rectangle:

- `closestX == ux` and `closestY == uy` (the closest point on the rect IS the ball position)
- `distX = 0`, `distY = 0`, `distSq = 0`
- This still triggers collision (`0 <= radius^2`), BUT the normal becomes `(0/epsilon, 0/epsilon)` = effectively `(0, 0)`
- The push-out direction is zero, so the ball stays inside and the velocity reflection does nothing

**Sphere doesn't have this problem** because it uses distance-from-center, which always produces a valid non-zero normal even when the ball is inside.

**Pyramid doesn't have this problem** because it uses closest-point-on-edge, which also always yields a valid direction.

### Issue 2: Insufficient Sampling for the Cube's Small Size

The cube boss is the smallest boss (80px vs sphere 90px vs pyramid 100px). The sampling formula:

```
samples = clamp(3, 12, ceil(SPEED / (minBrickDimension * 0.1)))
```

At high ball speed, the step between samples can exceed the cube's width, allowing the ball to jump from one side to the other without any sample landing inside or near the hitbox.

## Proposed Fix (two changes, same file)

### Fix A: Fallback Normal for Deep Penetration

When the ball center is inside the cube rectangle (distSq is near zero), fall back to using the **boss-center-to-ball** direction as the push-out normal. This guarantees a valid reflection direction.

In `src/engine/physics.ts`, around lines 230-254, after computing `distSq`:

```typescript
// When ball center is inside the rectangle, distX/distY are ~0
// Fall back to boss-center-to-ball direction
if (distSq < 0.01) {
  const fallbackDist = Math.sqrt(dx * dx + dy * dy) || 1;
  const normalX = dx / fallbackDist;
  const normalY = dy / fallbackDist;
  const correctionDist = Math.max(halfW, halfH) + sampleBall.radius + 5;
  const dot = sampleBall.dx * normalX + sampleBall.dy * normalY;
  collision = {
    newX: centerX + normalX * correctionDist,
    newY: centerY + normalY * correctionDist,
    newVelocityX: sampleBall.dx - 2 * dot * normalX,
    newVelocityY: sampleBall.dy - 2 * dot * normalY,
  };
} else {
  // ... existing closest-point logic ...
}
```

### Fix B: Increase Sample Count for Small Bosses

Raise the minimum samples from 3 to 5 and scale more aggressively relative to boss size. Change lines 157-158:

```typescript
const bossMinDim = Math.min(bossTarget.width, bossTarget.height);
const samplesRaw = Math.ceil(SPEED / (bossMinDim * 0.08));
const samples = Math.max(5, Math.min(16, samplesRaw));
```

This uses the actual boss size (not `minBrickDimension`) for sampling density, ensuring smaller bosses get proportionally more samples.

## Files Changed

| File | Change |
|---|---|
| `src/engine/physics.ts` | Fix A: Add fallback normal when ball is inside cube rectangle |
| `src/engine/physics.ts` | Fix B: Increase sampling density based on boss size |

## Why This Only Affects the Cube

| Boss | Collision Shape | Deep Penetration Normal | Size |
|---|---|---|---|
| Cube | Rotated rectangle | Degenerates to (0,0) -- **broken** | 80px (smallest) |
| Sphere | Circle | Always valid (center-to-ball) | 90px |
| Pyramid | Triangle edges | Always valid (edge normal) | 100px (largest) |

The cube has both the worst collision math for edge cases AND the smallest hitbox, creating a double vulnerability at high speeds.

