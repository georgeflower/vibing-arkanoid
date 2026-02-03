
# Fix: Intermittent Freezes After Performance Optimization

## Problem Summary
The game experiences intermittent freezes (frame gaps of 544ms and 601ms) after integrating entity pools. Analysis shows this stems from architectural issues in how pools interact with React state.

## Root Causes

### 1. Pool/State Synchronization Issue
The entity pools (`enemyPool`, `bombPool`) maintain their own `activeList`, while React maintains separate state arrays. These get out of sync:

```text
┌─────────────────────────────────────────────────────────┐
│  Current Architecture (Problematic)                     │
├─────────────────────────────────────────────────────────┤
│  Pool.activeList: [enemy1, enemy2, enemy3]              │
│  React State:     [enemy1, enemy2, enemy3]              │
│                                                         │
│  After setEnemies([]):                                  │
│  Pool.activeList: [enemy1, enemy2, enemy3]  ← STALE!    │
│  React State:     []                                    │
│                                                         │
│  indexOf() now searches through ghost entries           │
│  Future release() calls may double-release              │
└─────────────────────────────────────────────────────────┘
```

### 2. O(n) indexOf in Release
Each `release()` call performs `indexOf()` on the activeList. With multiple destructions per frame, this compounds.

### 3. Double Filter Pattern
Every destruction does:
```typescript
enemyPool.release(enemy);                               // O(n) indexOf
setEnemies((prev) => prev.filter((e) => e.id !== enemy.id)); // O(n) filter
```

### 4. Missing Bulk Release
When `setEnemies([])` is called (~25 locations), pool cleanup is not performed, causing activeList bloat.

## Solution

### Phase 1: Add ID-Based Fast Release to EntityPool
Add an `idMap` for O(1) lookups instead of O(n) `indexOf`:

```typescript
class EntityPool<T extends Poolable> {
  private pool: T[] = [];
  private activeMap: Map<number | string, T> = new Map(); // O(1) lookup by ID
  private maxPoolSize: number;
  
  acquire(init: Partial<T>): T | null {
    // ... existing logic ...
    const id = (obj as any).id;
    if (id !== undefined) {
      this.activeMap.set(id, obj);
    }
    return obj;
  }
  
  release(obj: T): void {
    const id = (obj as any).id;
    if (id !== undefined && this.activeMap.has(id)) {
      this.activeMap.delete(id);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
  
  releaseById(id: number | string): void {
    const obj = this.activeMap.get(id);
    if (obj) {
      this.release(obj);
    }
  }
  
  releaseAll(): void {
    this.activeMap.forEach((obj) => {
      this.resetFn(obj);
      this.pool.push(obj);
    });
    this.activeMap.clear();
  }
  
  getStats(): { active: number; pooled: number } {
    return {
      active: this.activeMap.size,
      pooled: this.pool.length
    };
  }
}
```

### Phase 2: Simplify Game.tsx Pattern
Replace the double operation pattern with single pool operation:

**Before:**
```typescript
enemyPool.release(enemy);
setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));
```

**After:**
```typescript
enemyPool.releaseById(enemy.id);
// Sync state from pool at end of frame
```

### Phase 3: Add Bulk Clear Helper
Add a helper that properly syncs bulk clears:

```typescript
// In Game.tsx
const clearAllEnemies = useCallback(() => {
  enemyPool.releaseAll();
  setEnemies([]);
}, []);

const clearAllBombs = useCallback(() => {
  bombPool.releaseAll();
  setBombs([]);
}, []);
```

Replace all `setEnemies([])` and `setBombs([])` calls with these helpers.

### Phase 4: Batch State Updates
Use React's state batching for destruction cascades:

```typescript
// Collect all destructions, then apply once per frame
const destructionQueue = useRef<{ enemies: number[]; bombs: number[] }>({ enemies: [], bombs: [] });

// In game loop, at end of physics:
if (destructionQueue.current.enemies.length > 0) {
  destructionQueue.current.enemies.forEach(id => enemyPool.releaseById(id));
  setEnemies(prev => prev.filter(e => !destructionQueue.current.enemies.includes(e.id)));
  destructionQueue.current.enemies = [];
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/entityPool.ts` | Add `Map`-based tracking, `releaseById()`, improve `releaseAll()` |
| `src/components/Game.tsx` | Add `clearAllEnemies`/`clearAllBombs` helpers, update ~25 bulk clear locations |
| `src/hooks/usePowerUps.ts` | Use ID-based release instead of object reference |
| `src/hooks/useBullets.ts` | Use ID-based release instead of object reference |

## Technical Details

### Performance Impact

| Operation | Before | After |
|-----------|--------|-------|
| `release()` lookup | O(n) indexOf | O(1) Map.get |
| Bulk clear | No pool cleanup | O(n) Map iteration once |
| Memory leaks | Possible stale refs | Impossible with Map |

### Why This Fixes Freezes
1. **No stale activeList**: Map is always in sync with actual active entities
2. **No indexOf search**: O(1) lookups eliminate linear scans
3. **Proper bulk cleanup**: `setEnemies([])` now properly resets pool
4. **Reduced GC pressure**: No orphaned objects in pool's internal structures

## Implementation Order
1. Update `EntityPool` class with Map-based tracking
2. Add helper functions in `Game.tsx` for bulk clears
3. Update all `setEnemies([])` and `setBombs([])` calls
4. Update `usePowerUps.ts` and `useBullets.ts` release patterns
5. Test on multiple levels including boss fights

## Testing Checklist
- [ ] Play through levels 1-4 with enemies - verify no freezes
- [ ] Boss level 5 - verify minion spawns work
- [ ] Level transitions - verify no memory leaks
- [ ] Game reset - verify clean state
- [ ] Watch console for lag detection logs
- [ ] Monitor pool stats in debug overlay
