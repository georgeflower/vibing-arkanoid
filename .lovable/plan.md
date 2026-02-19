
# Fix: Bullet Speed Inconsistency After Engine Decoupling

## Root Cause

After the rendering was decoupled into a standalone `requestAnimationFrame` loop (`renderLoop.ts`), bullets now exist in a problematic hybrid state:

- Their **physics** (position updates) run inside the React game loop via `useBullets.updateBullets()`
- Their **positions** are stored in React `useState` but bullet objects are **mutated in-place**
- `renderState.bullets` is synced from React state via `useEffect` (asynchronous, runs after paint)
- The standalone `renderLoop` reads `renderState.bullets` at its own RAF cadence (uncapped, runs every monitor refresh)

**The Race Condition:**

```text
Game tick (60fps cap):
  → updateBullets() fires
  → In-place mutation: bullet.y -= bullet.speed  ← bullet object mutated NOW
  → setBullets([...same array])                  ← React schedules re-render

Render loop RAF (runs at monitor refresh rate, e.g. 120Hz):
  → Reads renderState.bullets                    ← same mutated objects!
  → Draws bullets at already-advanced position

React re-render + useEffect:
  → renderState.bullets = bullets                ← same references, no change

Render loop RAF fires AGAIN before next game tick:
  → Draws bullets at the same advanced position (appears correct)

Next game tick:
  → updateBullets() fires again
  → In-place mutation: bullet.y -= bullet.speed  ← moves AGAIN

Render loop RAF fires BEFORE React re-render:
  → ALREADY sees the new position (mutated in-place)
  → Draws at double-advanced position
```

Because bullet objects are mutated in-place and their references are shared directly between React state and `renderState`, the render loop can see mid-tick mutations **immediately**, without waiting for the game tick to formally "commit" them. On 120Hz displays or when the game loop hiccups, some bullets get drawn at their advanced positions **twice per tick** — appearing to move at double speed.

## The Fix

Migrate bullets fully into `world` (the mutable singleton in `engine/state.ts`), exactly like `balls`, `paddle`, `bricks`, `enemies`, etc. were migrated. The renderer already reads bullets from `renderState.bullets` — this just needs to be pointed at `world.bullets` instead.

### Changes Required

**1. `src/engine/renderState.ts`**
Remove the `bullets` field from `RenderState` (it will now come from `world` directly in the renderer).

**2. `src/engine/canvasRenderer.ts`**
Change the renderer to read bullets from `world` instead of `rs`:
```typescript
// Before:
const bullets = rs.bullets;

// After:
const bullets = world.bullets;
```

**3. `src/components/Game.tsx`**
- Remove `renderState.bullets = bullets;` from the sync `useEffect` (line 1584)
- Remove `bullets` from that `useEffect`'s dependency array (line 1596)
- In `useBullets` call site, remove the `bullets` variable usage for `renderState` sync (it still comes back from the hook for UI read-out like `bulletCount` in the debug profiler)

**4. `src/hooks/useBullets.ts`**
Sync bullet mutations into `world.bullets` directly:
- After `setBullets` updates the array, also write `world.bullets = updatedBullets` (or have the updater write to `world.bullets` directly as the source of truth)
- The cleanest approach: treat `world.bullets` as authoritative (like `world.balls`), and have `setBullets` write to `world.bullets` directly, returning the same reference so React doesn't cause re-renders from it

The exact same pattern already used for `balls`:
```typescript
// In useBullets updateBullets:
setBullets(prev => {
  // ... mutate positions in-place ...
  world.bullets = result; // Write authoritative copy to world
  return result;
});
```

And in `fireBullets`:
```typescript
setBullets(prev => {
  if (leftBullet) prev.push(leftBullet);
  if (rightBullet) prev.push(rightBullet);
  world.bullets = prev; // Sync to world
  return [...prev];
});
```

### Why This Fixes It

Once bullets live in `world.bullets` and the renderer reads from `world.bullets`, the race condition disappears. The render loop reads exactly what the game loop last committed — no more shared mutable references leaking ahead of the game tick through React's async `useEffect` sync.

This matches the architecture already established for all other game entities: `balls`, `paddle`, `bricks`, `enemies`, `bombs`, `bossAttacks`, `explosions` all live in `world` and are rendered directly from it without going through `renderState`.

### Files to Change

| File | Change |
|------|--------|
| `src/engine/state.ts` | No change needed — `world.bullets` already exists |
| `src/engine/renderState.ts` | Remove `bullets` field from `RenderState` interface and singleton |
| `src/engine/canvasRenderer.ts` | Read `bullets` from `world` instead of `rs` |
| `src/hooks/useBullets.ts` | Write to `world.bullets` in `setBullets` updaters |
| `src/components/Game.tsx` | Remove `renderState.bullets = bullets` sync from `useEffect` |
