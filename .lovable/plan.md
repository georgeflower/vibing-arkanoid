
# Integrate Enemy and Bomb Pools into Game.tsx

## Overview
This plan integrates the pre-defined `enemyPool` and `bombPool` from `entityPool.ts` into `Game.tsx` to eliminate object allocations during gameplay. The pools are already defined - we just need to use them.

## Current State
- `entityPool.ts` already defines `enemyPool` and `bombPool` with correct types
- `resetAllPools()` is already called in Game.tsx on resets
- Enemies and bombs are currently created using object literals: `{ id: ..., type: ..., ... }`
- Enemies/bombs are filtered out using `setEnemies(prev => prev.filter(...))`

## Integration Strategy

### Key Principle: Hybrid Pool/React State Approach
The game uses React state for rendering, so we'll:
1. Use pools for object reuse (acquire/release)
2. Sync pool contents to React state when changes occur
3. Continue using `setEnemies([])` and `setBombs([])` for bulk clears (pool.releaseAll handles cleanup)

## Implementation Details

### Phase 1: Import Pool Functions
Add imports to Game.tsx:
```typescript
import { resetAllPools, enemyPool, bombPool } from "@/utils/entityPool";
```

### Phase 2: Enemy Spawning - 4 Locations

#### Location 1: Regular Enemy Spawning (~line 7814-7830)
**Current code:**
```typescript
newEnemy = {
  id: enemyId,
  type: "cube",
  x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
  // ... many properties
};
setEnemies((prev) => [...prev, newEnemy]);
```

**New code:**
```typescript
const newEnemy = enemyPool.acquire({
  id: enemyId,
  type: "cube",
  x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
  y: 50 + Math.random() * 50,
  width: 30,
  height: 30,
  rotation: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  speed: speed,
  dx: Math.cos(angle) * speed,
  dy: Math.abs(Math.sin(angle)) * speed,
});
if (newEnemy) {
  setEnemies((prev) => [...prev, newEnemy]);
}
```

#### Location 2: Boss Enemy Spawning (~line 7940-8003)
Similar pattern - use `enemyPool.acquire()` for each enemy in the batch

#### Location 3: Mega Boss Swarm Spawning (~line 6143-6170)
Use `enemyPool.acquire()` for each swarm enemy

#### Location 4: CrossBall/LargeSphere Spawning (~line 6960-6990, 7090-7105)
Use `enemyPool.acquire()` for merged enemies

### Phase 3: Bomb/Projectile Creation - 3 Locations

#### Location 1: Pyramid Bullet (~line 7876-7888)
**Current code:**
```typescript
const newBullet: Bomb = {
  id: Date.now() + Math.random(),
  x: currentEnemy.x + currentEnemy.width / 2 - 4,
  // ...
};
setBombs((prev) => [...prev, newBullet]);
```

**New code:**
```typescript
const newBullet = bombPool.acquire({
  id: Date.now() + Math.random(),
  x: currentEnemy.x + currentEnemy.width / 2 - 4,
  y: currentEnemy.y + currentEnemy.height,
  width: 8,
  height: 12,
  speed: bulletSpeed,
  enemyId: enemyId,
  type: "pyramidBullet",
  dx: Math.sin(randomAngle) * bulletSpeed,
});
if (newBullet) {
  setBombs((prev) => [...prev, newBullet]);
}
```

#### Location 2: Regular Bomb Drop (~line 7890-7902)
Use `bombPool.acquire()` for cube/sphere enemy bombs

#### Location 3: Boss Minion Bomb Drop (~line 8021-8033)
Use `bombPool.acquire()` for boss-spawned enemy projectiles

### Phase 4: Enemy Removal - Release to Pool

#### Pattern: Replace filter with release
Every `setEnemies((prev) => prev.filter((e) => e.id !== enemy.id))` becomes:

```typescript
enemyPool.release(enemy);
setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));
```

**Locations to update (~9 places):**
- Ball collision with enemy destruction (line ~4050-4066)
- Reflected attack destroys enemy (line ~6736-6768)
- Reflected bomb destroys enemy (line ~7435-7462)
- Fireball destroys enemy (in CCD processing)

### Phase 5: Bomb Removal - Release to Pool

#### Pattern: Replace filter with release
Every `setBombs((prev) => prev.filter((b) => b.id !== bomb.id))` becomes:

```typescript
bombPool.release(bomb);
setBombs((prev) => prev.filter((b) => b.id !== bomb.id));
```

**Locations to update (~8 places):**
- Bomb goes off screen (line ~5376-5378 - already using splice, adapt to release)
- Bomb hits shield (line ~5518)
- Bomb hits paddle (line ~5538)
- Reflected bomb hits boss (line ~7158, 7354)
- Reflected bomb hits resurrected boss (line ~7422)
- Reflected bomb hits enemy (line ~7460)

### Phase 6: Bulk Clear Handling
For `setEnemies([])` and `setBombs([])` calls, the pools are already cleared by `resetAllPools()` which is called on game reset. 

For level transitions where we clear entities but don't call `resetAllPools()`, we need to explicitly release:
```typescript
// Before clearing, release all to pool
enemies.forEach(e => enemyPool.release(e));
bombs.forEach(b => bombPool.release(b));
setEnemies([]);
setBombs([]);
```

Or simpler - ensure `resetAllPools()` is called at all appropriate clear points.

## Files Changed

| File | Change |
|------|--------|
| `src/components/Game.tsx` | Import pools, use acquire() for spawning, use release() for removal |

## Estimated Line Changes
- ~20 spawn locations modified
- ~15 removal locations modified
- Total: ~50-70 lines changed

## Testing Checklist
- [ ] Regular enemies spawn and move correctly (levels 1-4)
- [ ] Boss minion enemies spawn correctly
- [ ] Mega Boss swarm enemies spawn correctly
- [ ] CrossBall and LargeSphere merging works
- [ ] Pyramid bullets fire correctly
- [ ] Cube/Sphere bombs drop correctly
- [ ] Enemy destruction releases to pool
- [ ] Bomb destruction releases to pool
- [ ] Level transitions clear pools properly
- [ ] Game reset clears pools properly
- [ ] No visual artifacts from object reuse
- [ ] Pool exhaustion handled gracefully (falls back to new allocation or drops spawn)
