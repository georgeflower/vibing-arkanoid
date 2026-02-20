
# Fix: Bullets Still Appearing at Double Speed Intermittently

## Root Cause Found

The previous fix correctly removed bullets from `renderState` and pointed the renderer at `world.bullets`. However, a subtler race condition was introduced inside `fireBullets` itself.

The exact problem is in `useBullets.ts` lines 62-67:

```typescript
setBullets(prev => {
  if (leftBullet) prev.push(leftBullet);   // mutates prev in-place
  if (rightBullet) prev.push(rightBullet); // mutates prev in-place
  world.bullets = prev;                    // WRONG: points world at the OLD array
  return [...prev];                        // returns a NEW spread copy to React state
});
```

After this runs:
- `world.bullets` points at the **old React state array** (with new bullets pushed in)
- React state is now a **brand new spread array** (`[...prev]`) — a completely different object

On the very next game tick, `updateBullets` runs `setBullets(prev => {...})` where `prev` is now the **new spread array** (the React state). It mutates positions in-place on that new array. But `world.bullets` still points at the **old array** from `fireBullets`. The render loop reads `world.bullets` (the old array) and sees bullets at their un-advanced spawn position, while simultaneously the new array has bullets already moved.

Then, when `updateBullets` finishes and sets `world.bullets = result`, the renderer gets the newly-advanced positions. But because the render loop (running at 120Hz) fired between the mutation and the assignment, it saw the old un-moved positions. On the next render loop frame, it sees the fully-moved positions. The bullet appears to jump two frames worth of movement in one render frame — effectively double speed for that render cycle.

This only happens on the tick immediately after `fireBullets` is called, which is why it is intermittent (one bad frame per shot, more noticeable at 120Hz than 60Hz).

## The Fix

The solution is a one-line change in `fireBullets`. Assign `world.bullets` to the **spread result** (the new array), not to `prev` before the spread:

```typescript
// BEFORE (broken):
setBullets(prev => {
  if (leftBullet) prev.push(leftBullet);
  if (rightBullet) prev.push(rightBullet);
  world.bullets = prev;      // wrong — old array
  return [...prev];
});

// AFTER (fixed):
setBullets(prev => {
  if (leftBullet) prev.push(leftBullet);
  if (rightBullet) prev.push(rightBullet);
  const next = [...prev];
  world.bullets = next;      // correct — same array React state will hold
  return next;
});
```

Now `world.bullets` and the React state array are always the **same object**. When `updateBullets` mutates positions in-place on `prev` (the React state array), those mutations are immediately visible through `world.bullets` because they are the same reference. The renderer never reads a stale array again.

## Why This Was Missed

The previous fix focused on removing the `renderState` bridge (the async `useEffect` sync) and was correct — that was the primary race condition. But `fireBullets` introduced a secondary desynchronisation: `world.bullets = prev` was written before the spread, and the spread created a new React state array that `world.bullets` no longer pointed at. Every shot fired created a one-tick window where the two were out of sync.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useBullets.ts` | In `fireBullets`: compute the spread first, assign `world.bullets` to the spread result, and return the same reference |

This is a surgical one-function fix with zero risk to any other system.
