
# Fix: Intermittent Bullet Double-Speed — Real Root Cause

## What the Previous Fix Missed

The `world.bullets = next` fix inside `fireBullets` was correct but incomplete. It solved one desync point. There are **multiple other `setBullets` calls** scattered throughout `Game.tsx` that create new arrays WITHOUT updating `world.bullets`:

- **Line 4479**: `setBullets(prev => prev.map(...))` — reflect shield case (creates new array, skips `world.bullets`)
- **Line 4511**: `setBullets(prev => prev.filter(...))` — shield absorbs bullet (creates new array, skips `world.bullets`)
- **Line 4534**: `setBullets(prev => prev.filter(...))` — bounced bullet hits paddle (creates new array, skips `world.bullets`)
- **Lines 1490, 1746, 1806, 2331, 2422, etc.**: `setBullets([])` — level resets (creates new empty array, skips `world.bullets`)

Each of these breaks the `world.bullets`/React-state identity guarantee that the previous fix established. After any one of them fires, React holds array `B` while `world.bullets` still points at the stale array `A`. On the very next `updateBullets` call, `prev = B` (correct), bullets get moved and `world.bullets = result` (correct). But for the rAF frames between those two calls, the render loop reads the stale `A` and then suddenly jumps to `result` — a position that skipped one full physics step. That looks like double speed.

## The Real Fix: Remove `useState` for Bullets Entirely

Bullets are already a pure engine entity. Like `balls`, `bricks`, `enemies`, and `powerUps`, they should live exclusively in `world.bullets` — a plain mutable array — with no React `useState` involvement at all.

The pattern already exists in this codebase (balls, enemies, bombs are managed this way). Applying it to bullets:

- `fireBullets`: push directly to `world.bullets` — no `setBullets`
- `updateBullets`: mutate `world.bullets` in-place — no `setBullets`
- All `setBullets([])` reset calls: replace with `world.bullets = []` + `bulletPool.releaseAll()`
- All `setBullets(prev => prev.filter(...))` calls: replace with direct array mutation on `world.bullets`
- All `setBullets(prev => prev.map(...))` calls: replace with direct property mutation on the bullet object in `world.bullets`

The `bullets` state value returned from `useBullets` is only used in `Game.tsx` for the debug profiler counter (`bullets.length` at line 4003) and the bounce-check loop (line 4454). Both of these can read from `world.bullets` directly.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useBullets.ts` | Remove `useState<Bullet[]>`. `fireBullets` pushes directly to `world.bullets`. `updateBullets` mutates `world.bullets` in-place and returns `void`. No `setBullets` anywhere. |
| `src/components/Game.tsx` | Remove the `setBullets` destructure from `useBullets`. Replace all `setBullets([])` calls with `world.bullets = []; bulletPool.releaseAll()`. Replace `setBullets(prev => prev.filter(...))` with direct `world.bullets` splice. Replace `setBullets(prev => prev.map(...))` with in-place property mutation. Replace `bullets.length` debug read with `world.bullets.length`. Replace `bullets.forEach(...)` loop with `world.bullets.forEach(...)`. |

## Technical Detail: How `updateBullets` Changes

Before (React state):
```typescript
const updateBullets = useCallback((currentBricks: Brick[]) => {
  setBullets(prev => {           // <-- React state updater
    for (const b of prev) {
      b.y -= b.speed;            // in-place mutation on prev
    }
    world.bullets = result;      // sync world at end
    return result;               // return to React state
  });
}, [...]);
```

After (direct world mutation):
```typescript
const updateBullets = useCallback((currentBricks: Brick[]) => {
  const prev = world.bullets;   // <-- read directly from world
  for (const b of prev) {
    b.y -= b.speed;              // in-place mutation (same as before)
  }
  // ... collision logic ...
  world.bullets = result;       // single authoritative write
  // No setBullets, no React state involved
}, [...]);
```

This is the same mutation pattern already used for `balls` (line 4065-4075 in Game.tsx: `setBalls(prev => { mutate; return prev; })` will also need to be reviewed, but bullets are the immediate fix).

## Why This Permanently Fixes the Bug

Once `world.bullets` is the only source of truth with no React state involved:
- There is no React queue of pending `setBullets` updaters that can run in an unexpected order
- The render loop always reads the live, current state of `world.bullets`
- `fireBullets`, `updateBullets`, and all reset calls all operate on the same object
- No two-tick windows where `world.bullets !== React state` are possible

## Scope

Surgical change to `useBullets.ts` and the bullet-related sections of `Game.tsx`. The `useBullets` hook continues to export `fireBullets` and `updateBullets` with the same signatures — only the internal implementation changes from React state to world direct access. No other hooks or components are affected.
