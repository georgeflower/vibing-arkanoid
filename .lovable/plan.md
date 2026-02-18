

# Pool Explosion Objects and Clean Up Dead Particle Code

## Problem

While particles are already fully pooled via `particlePool`, two allocation sources remain:

1. **Explosion objects**: Every enemy/boss defeat creates a new `Explosion` object literal (`{ x, y, frame: 0, maxFrames: 30, enemyType, particles: [] }`) and pushes it into `world.explosions` with array spread. During intense fights with many enemies, this creates garbage for every kill.

2. **Dead code**: `createHighScoreParticles` (lines 1669-1696) manually allocates `Particle[]` arrays but is never called -- the pool's `acquireForHighScore` replaced it. The refs `gameOverParticlesRef` and `highScoreParticlesRef` are also unused since particles moved to the pool.

## Solution

### 1. Explosion Object Pool

Create a small pool for `Explosion` objects using the existing `EntityPool` pattern:

- Factory creates empty Explosion objects
- Reset function zeros out frame/position
- Max 30 active explosions (generous -- typically < 10 concurrent)
- Replace all `setExplosions(e => [...e, { x, y, ... }])` calls with `explosionPool.acquire({ x, y, ... })`
- Replace the per-frame `setExplosions` update loop with in-place mutation of pooled explosions
- On `setExplosions([])` calls (level reset, game over), call `explosionPool.releaseAll()`

### 2. Remove Dead Code

- Delete `createHighScoreParticles` callback (unused)
- Delete `gameOverParticlesRef` and `highScoreParticlesRef` refs (unused since pool migration)
- Delete `particleRenderTick` state (no longer needed)

## Technical Details

### Explosion Pool (in `src/utils/entityPool.ts`)

```text
export const explosionPool = new EntityPool<Explosion & { id: number }>(
  () => ({ id: 0, x: 0, y: 0, frame: 0, maxFrames: 30,
           enemyType: undefined, particles: [] }),
  (e) => { e.frame = 0; e.maxFrames = 30; e.enemyType = undefined; },
  10, 30
);
```

### Usage Pattern Change

Before (allocates new object + array spread):
```text
setExplosions(e => [...e, {
  x: pos.x, y: pos.y, frame: 0,
  maxFrames: 30, enemyType: "cube", particles: []
}]);
```

After (reuses pooled object):
```text
explosionPool.acquire({
  id: getNextExplosionId(),
  x: pos.x, y: pos.y, frame: 0,
  maxFrames: 30, enemyType: "cube", particles: []
});
world.explosions = explosionPool.getActive();
```

### Per-Frame Update Change

Before (splice + spread):
```text
setExplosions(prev => {
  for (let i = prev.length - 1; i >= 0; i--) {
    prev[i].frame += 1;
    if (prev[i].frame >= prev[i].maxFrames) prev.splice(i, 1);
  }
  return prev.length > 0 ? [...prev] : [];
});
```

After (in-place, release expired):
```text
const active = explosionPool.getActive();
for (let i = active.length - 1; i >= 0; i--) {
  active[i].frame += 1;
  if (active[i].frame >= active[i].maxFrames) {
    explosionPool.release(active[i]);
  }
}
world.explosions = explosionPool.getActive();
```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/utils/entityPool.ts` | Edit | Add `explosionPool`, `getNextExplosionId()`, update `resetAllPools` and `getAllPoolStats` |
| `src/components/Game.tsx` | Edit | Replace explosion object creation with pool acquire; replace per-frame update with in-place mutation; delete dead `createHighScoreParticles`, unused refs, unused `particleRenderTick` |
| `src/engine/state.ts` | Edit | Update `resetWorld` to call `explosionPool.releaseAll()` |

## Impact

- Eliminates all `Explosion` object allocations after first use (reuses pooled objects)
- Removes array spread (`[...e, newExplosion]`) on every explosion -- replaces with O(1) pool acquire
- Removes per-frame `splice` + spread in explosion update loop
- Cleans up ~30 lines of dead particle code
- No visual changes

