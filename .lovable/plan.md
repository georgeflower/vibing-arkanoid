
# Performance Optimization Implementation Plan

## Overview
This plan covers three high-impact performance optimizations:
1. **#1 Offscreen Canvas for Brick Rendering** - Cache static bricks to reduce per-frame draw calls
2. **#3 Spatial Hashing for Collision Detection** - Reduce broadphase collision checks from O(n) to O(k)
3. **#4 Extended Object Pooling** - Expand pooling to PowerUps, Bullets, Enemies, Bombs

Combined, these optimizations target the two largest performance bottlenecks: rendering and physics.

---

## Optimization #1: Offscreen Canvas for Brick Rendering

### Problem Analysis
Currently, `GameCanvas.tsx` redraws **all visible bricks every frame** (lines 420-603). Each brick requires:
- Fill rect for base color
- 2-4 highlight/shadow rects
- Metal bricks: rivet pattern (multiple arc calls) + diagonal hatching
- Explosive bricks: dashed warning pattern + emoji text
- Normal bricks: 16-bit pixel pattern loop

With 182 bricks (14 rows × 13 cols), this creates **1,000+ draw calls per frame**.

### Solution: Brick Layer Caching
Pre-render bricks to an offscreen canvas, only invalidating when bricks change (destruction).

### New File: `src/utils/brickLayerCache.ts`

```typescript
interface BrickLayerCache {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  version: number;  // Incremented when bricks change
  lastBrickHash: string;  // Quick dirty check
  width: number;
  height: number;
}

export class BrickRenderer {
  private cache: BrickLayerCache | null = null;
  private crackedImages: HTMLImageElement[] = [];
  
  initialize(width: number, height: number): void;
  setCrackedImages(img1: HTMLImageElement, img2: HTMLImageElement, img3: HTMLImageElement): void;
  
  // Returns true if cache was rebuilt
  updateCache(
    bricks: Brick[],
    qualitySettings: QualitySettings
  ): boolean;
  
  // Draw cached layer to main canvas
  drawToCanvas(ctx: CanvasRenderingContext2D): void;
  
  // Force rebuild on next frame
  invalidate(): void;
  
  // Calculate hash of brick state for dirty checking
  private calculateBrickHash(bricks: Brick[]): string;
  
  // Render single brick to offscreen context
  private renderBrick(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    brick: Brick,
    allBricks: Brick[],
    qualitySettings: QualitySettings
  ): void;
}

export const brickRenderer = new BrickRenderer();
```

### Hash Calculation Strategy
Instead of stringifying all bricks, use a lightweight hash:

```typescript
private calculateBrickHash(bricks: Brick[]): string {
  // Only track visibility and hit state - these are what change during gameplay
  let hash = 0;
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    if (b.visible) {
      hash = (hash * 31 + b.id) | 0;
      hash = (hash * 31 + b.hitsRemaining) | 0;
    }
  }
  return hash.toString(36);
}
```

### Changes to GameCanvas.tsx

**Remove** (lines 420-603): The entire brick rendering loop

**Add** at component mount:
```typescript
// Initialize brick cache
useEffect(() => {
  brickRenderer.initialize(width, height);
  brickRenderer.setCrackedImages(
    crackedBrick1Ref.current!,
    crackedBrick2Ref.current!,
    crackedBrick3Ref.current!
  );
}, [width, height]);
```

**Replace** brick rendering with:
```typescript
// Update brick cache if needed
brickRenderer.updateCache(bricks, qualitySettings);
// Draw cached bricks
brickRenderer.drawToCanvas(ctx);
```

### Invalidation Triggers
The cache auto-invalidates via hash comparison when:
- A brick is destroyed (`visible` changes)
- A brick takes damage (`hitsRemaining` changes)
- Level changes (new brick layout)

### Performance Impact
- **Before**: ~1,000 draw calls per frame for bricks
- **After**: 1 `drawImage` call per frame (plus occasional rebuild)
- **Expected improvement**: 40-60% reduction in render time

---

## Optimization #3: Spatial Hashing for Collision Detection

### Problem Analysis
Current broadphase in `processBallCCD.ts` (lines 188-201) iterates **all bricks** for every ball:

```typescript
function defaultTilemapQuery(bricks, swept, brickCount) {
  const res: Brick[] = [];
  for (let i = 0; i < limit; i++) {  // O(n) where n = all bricks
    const b = bricks[i];
    if (!b.visible) continue;
    // AABB overlap check...
  }
  return res;
}
```

With 182 bricks and potentially multiple balls, this creates significant overhead.

### Solution: Spatial Hash Grid
Divide the canvas into cells. Each brick is pre-assigned to cells it overlaps. Ball queries only check relevant cells.

### New File: `src/utils/spatialHash.ts`

```typescript
export interface SpatialHashConfig {
  cellSize: number;  // Typically 2x brick width (~112px)
  width: number;     // Canvas width
  height: number;    // Canvas height
}

export class SpatialHash<T extends { x: number; y: number; width: number; height: number; visible?: boolean }> {
  private cells: Map<number, T[]> = new Map();
  private cellSize: number;
  private cols: number;
  private rows: number;
  private objectToKeys: Map<T, number[]> = new Map();  // For fast removal
  
  constructor(config: SpatialHashConfig);
  
  // Insert an object into the grid
  insert(obj: T): void;
  
  // Remove an object from the grid
  remove(obj: T): void;
  
  // Clear all objects
  clear(): void;
  
  // Query objects overlapping an AABB (swept ball area)
  query(aabb: { x: number; y: number; w: number; h: number }): T[];
  
  // Rebuild from array (for level load)
  rebuild(objects: T[]): void;
  
  // Mark object as invisible (for brick destruction without full rebuild)
  markInvisible(obj: T): void;
  
  // Private: get cell key from position
  private getCellKey(col: number, row: number): number;
  
  // Private: get all cell keys an object overlaps
  private getObjectCellKeys(obj: T): number[];
}

// Singleton for bricks
export const brickSpatialHash = new SpatialHash<Brick>({
  cellSize: 112,  // 2x brick width
  width: 850,
  height: 650
});
```

### Cell Key Calculation
Use a single integer key for fast Map lookups:
```typescript
private getCellKey(col: number, row: number): number {
  return row * this.cols + col;
}
```

### Query Implementation
```typescript
query(aabb: { x: number; y: number; w: number; h: number }): T[] {
  const minCol = Math.max(0, Math.floor(aabb.x / this.cellSize));
  const maxCol = Math.min(this.cols - 1, Math.floor((aabb.x + aabb.w) / this.cellSize));
  const minRow = Math.max(0, Math.floor(aabb.y / this.cellSize));
  const maxRow = Math.min(this.rows - 1, Math.floor((aabb.y + aabb.h) / this.cellSize));
  
  const seen = new Set<T>();
  const results: T[] = [];
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const key = this.getCellKey(col, row);
      const cell = this.cells.get(key);
      if (cell) {
        for (const obj of cell) {
          if (!seen.has(obj) && obj.visible !== false) {
            seen.add(obj);
            // Fine-grained AABB check
            if (this.overlaps(obj, aabb)) {
              results.push(obj);
            }
          }
        }
      }
    }
  }
  return results;
}
```

### Integration with CCD System

**Modify** `processBallCCD.ts`:

```typescript
import { brickSpatialHash } from './spatialHash';

// In processBallCCD function:
const candidates = tilemapQuery 
  ? tilemapQuery(sweptAabb) 
  : brickSpatialHash.query(sweptAabb);  // Use spatial hash instead of linear scan
```

**Modify** `Game.tsx` or level initialization:

```typescript
// When level loads or bricks change
useEffect(() => {
  brickSpatialHash.rebuild(bricks);
}, [level]);

// When brick is destroyed (in collision handling)
const handleBrickDestruction = (brick: Brick) => {
  brick.visible = false;
  brickSpatialHash.markInvisible(brick);
};
```

### Performance Impact
- **Before**: O(n) per ball per substep (n = ~182 bricks)
- **After**: O(k) per ball per substep (k = ~4-12 bricks in relevant cells)
- **Expected improvement**: 10-15x faster broadphase, ~20-30% overall physics improvement

---

## Optimization #4: Extended Object Pooling

### Problem Analysis
Current pooling only covers `Particle` objects. Other entities are created/destroyed frequently:

| Entity | Creation Pattern | Frequency |
|--------|------------------|-----------|
| PowerUp | `{ ...props }` in usePowerUps | Per brick destruction (~182/level) |
| Bullet | `{ ...props }` in useBullets | Per turret shot (up to 45/level) |
| Enemy | `{ ...props }` in Game.tsx | Continuous spawning |
| Bomb | `{ ...props }` in bossAttacks | Frequent during boss fights |
| BonusLetter | `{ ...props }` in Game.tsx | Per brick (every ~6 bricks) |

Each creation allocates a new object, contributing to GC pressure.

### Solution: Generic Entity Pool

### New File: `src/utils/entityPool.ts`

```typescript
export interface Poolable {
  active?: boolean;
  [key: string]: any;
}

export class EntityPool<T extends Poolable> {
  private pool: T[] = [];
  private active: T[] = [];
  private maxPoolSize: number;
  private factory: () => T;
  private reset: (obj: T) => void;
  
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 50,
    maxSize: number = 200
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxPoolSize = maxSize;
    this.preallocate(initialSize);
  }
  
  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }
  
  acquire(init: Partial<T>): T | null {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.active.length < this.maxPoolSize) {
      obj = this.factory();
    } else {
      return null;  // Pool exhausted
    }
    
    // Apply initialization
    Object.assign(obj, init);
    obj.active = true;
    this.active.push(obj);
    return obj;
  }
  
  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      // Swap-and-pop for O(1) removal
      const last = this.active.length - 1;
      if (idx !== last) {
        this.active[idx] = this.active[last];
      }
      this.active.pop();
      this.reset(obj);
      this.pool.push(obj);
    }
  }
  
  getActive(): T[] {
    return this.active;
  }
  
  releaseAll(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.length = 0;
  }
  
  getStats(): { active: number; pooled: number } {
    return {
      active: this.active.length,
      pooled: this.pool.length
    };
  }
}
```

### Pool Instances

```typescript
// Power-up pool
export const powerUpPool = new EntityPool<PowerUp>(
  () => ({
    x: 0, y: 0, width: 61, height: 61,
    type: 'multiball' as PowerUpType,
    speed: 2, active: false
  }),
  (p) => { p.active = false; },
  20, 50
);

// Bullet pool
export const bulletPool = new EntityPool<Bullet>(
  () => ({
    x: 0, y: 0, width: 4, height: 12,
    speed: 7, isBounced: false, isSuper: false
  }),
  (b) => { b.isBounced = false; b.isSuper = false; },
  30, 100
);

// Bomb pool
export const bombPool = new EntityPool<Bomb>(
  () => ({
    id: 0, x: 0, y: 0, width: 12, height: 12,
    speed: 3, type: 'bomb' as ProjectileType,
    isReflected: false
  }),
  (b) => { b.isReflected = false; b.dx = undefined; b.dy = undefined; },
  20, 60
);

// Enemy pool
export const enemyPool = new EntityPool<Enemy>(
  () => ({
    id: 0, type: 'cube' as EnemyType,
    x: 0, y: 0, width: 30, height: 30,
    rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0,
    speed: 1.5, dx: 0, dy: 1.5
  }),
  (e) => { 
    e.hits = undefined; 
    e.isAngry = false; 
    e.isCrossBall = false;
  },
  15, 40
);

// Bonus letter pool
export const bonusLetterPool = new EntityPool<BonusLetter>(
  () => ({
    x: 0, y: 0, originX: 0, spawnTime: 0,
    width: 50, height: 50,
    type: 'Q' as BonusLetterType,
    speed: 1.5, active: false
  }),
  (l) => { l.active = false; },
  10, 30
);
```

### Integration Changes

**Modify `usePowerUps.ts`**:
```typescript
import { powerUpPool } from '@/utils/entityPool';

const createPowerUp = useCallback((brick: Brick, ...): PowerUp | null => {
  // ... existing logic to determine type ...
  
  return powerUpPool.acquire({
    x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
    y: brick.y,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    type,
    speed: POWERUP_FALL_SPEED,
    active: true,
  });
}, [/* deps */]);

// Instead of filtering out inactive:
const updatePowerUps = useCallback(() => {
  const active = powerUpPool.getActive();
  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];
    p.y += p.speed;
    if (p.y >= CANVAS_HEIGHT || !p.active) {
      powerUpPool.release(p);
    }
  }
}, []);
```

**Modify `useBullets.ts`**:
```typescript
import { bulletPool } from '@/utils/entityPool';

// Replace bullet creation with pool acquisition
// Replace array filtering with pool release
```

### React State Synchronization
Since pools manage their own arrays, sync with React state for rendering:

```typescript
// In Game.tsx game loop
const syncPoolsToState = useCallback(() => {
  // Only update React state when pool contents change
  const activePowerUps = powerUpPool.getActive();
  if (activePowerUps.length !== powerUpsRef.current.length) {
    setPowerUps([...activePowerUps]);
  }
  // Similar for bullets, enemies, bombs, bonusLetters
}, []);
```

### Performance Impact
- **Before**: New object allocation per entity creation
- **After**: Zero allocations during normal gameplay
- **Expected improvement**: 60-80% reduction in minor GC pauses

---

## Quick Win Optimizations (Bonus)

### 1. Replace `bricks.filter().length` with Counter
**Location**: `Game.tsx` line 5110

```typescript
// Before (creates intermediate array)
visibleBrickCount: bricks.filter((b) => b.visible).length

// After (no allocation)
visibleBrickCount: bricks.reduce((c, b) => c + (b.visible ? 1 : 0), 0)
```

### 2. Pre-allocate Reusable Objects for Frequent Operations

In `processBallCCD.ts`, add at module scope:
```typescript
// Reusable Vec2 objects to avoid per-frame allocations
const _tempVec: Vec2 = { x: 0, y: 0 };
const _tempMove: Vec2 = { x: 0, y: 0 };
const _tempNormal: Vec2 = { x: 0, y: 0 };
```

### 3. Batch Canvas State Changes
In `GameCanvas.tsx`, group shadow operations:
```typescript
// Before
ctx.shadowBlur = 12;
ctx.shadowColor = "...";
ctx.fillRect(...);
ctx.shadowBlur = 0;

// After (when drawing multiple similar objects)
ctx.save();
ctx.shadowBlur = 12;
ctx.shadowColor = "...";
for (const obj of objects) {
  ctx.fillRect(...);
}
ctx.restore();
```

---

## Implementation Order

| Phase | Task | Estimated Lines Changed |
|-------|------|------------------------|
| 1 | Create `src/utils/entityPool.ts` | +120 new |
| 2 | Create `src/utils/spatialHash.ts` | +150 new |
| 3 | Create `src/utils/brickLayerCache.ts` | +200 new |
| 4 | Integrate spatial hash into `processBallCCD.ts` | ~30 modified |
| 5 | Integrate brick cache into `GameCanvas.tsx` | ~200 removed, ~30 added |
| 6 | Migrate `usePowerUps.ts` to pool | ~50 modified |
| 7 | Migrate `useBullets.ts` to pool | ~40 modified |
| 8 | Migrate enemy/bomb creation in `Game.tsx` | ~60 modified |
| 9 | Apply quick wins | ~20 modified |

**Total**: ~470 new lines, ~200 removed, ~200 modified

---

## Testing Checklist

### Brick Cache
- [ ] Bricks render correctly on level load
- [ ] Brick destruction updates cache properly
- [ ] Multi-hit bricks update cache on each hit
- [ ] Metal bricks render with connected patterns
- [ ] Cracked brick textures display correctly
- [ ] Level transitions rebuild cache

### Spatial Hash
- [ ] Ball collides with all visible bricks
- [ ] No missed collisions at cell boundaries
- [ ] Brick destruction removes from hash
- [ ] Boss level enemies in spatial hash
- [ ] Performance improves with many bricks

### Object Pools
- [ ] Power-ups spawn and fall correctly
- [ ] Bullets fire and collide properly
- [ ] Enemies spawn and move correctly
- [ ] Bombs drop and explode properly
- [ ] Pool exhaustion handled gracefully
- [ ] Game reset clears all pools
- [ ] No visual artifacts from object reuse

### Performance Verification
- [ ] Frame time reduced (check with profiler)
- [ ] GC pauses reduced (check memory tab)
- [ ] No memory leaks over extended play
- [ ] Mobile performance improved
