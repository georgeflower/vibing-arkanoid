
# Fix: Mobile Performance Regression from Object Pooling Changes

## Problem Summary
The lag occurs across multiple mobile devices and browsers (Pixel/Firefox, iPhone/Edge, iPhone/Safari) and **started after the pooling optimizations**. Despite the pooling being intended to reduce allocations, several critical issues were introduced that create **more garbage than before** on hot paths.

## Root Cause Analysis

The "optimizations" introduced several allocation patterns that are called thousands of times per frame:

### 1. SpatialHash.query() Creates Garbage Every Call (CRITICAL)
```typescript
// spatialHash.ts line 131 - called per ball, per substep
const seen = new Set<T>();   // NEW SET every call
const results: T[] = [];     // NEW ARRAY every call
```
With 2 balls and 10 substeps, this creates 40+ Set and Array objects per frame.

### 2. gameCCD.ts Calls performance.now() Unconditionally (HIGH)
```typescript
// Lines 54, 70, 156, 174, 177, etc. - 7+ calls per ball
const perfStart = performance.now();
const bossFirstSweepStart = performance.now();
const ccdCoreStart = performance.now();
// ... even when NOT measuring performance
```
On mobile, `performance.now()` syscalls are expensive.

### 3. processBallCCD.ts Creates Objects Per Collision (HIGH)
```typescript
// Line 274 - per ball per frame
const ball: Ball = { ...ballIn };

// Lines 84-92 - per collision check (many times per substep)
const vAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const vSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
```

### 4. EntityPool.getActive() Uses Array.from() (MEDIUM)
```typescript
// entityPool.ts line 111 - called during rendering
return Array.from(this.activeMap.values());
```
Creates new array every render call.

### 5. Game.tsx Array Spreads in State Updates (MEDIUM)
```typescript
// Multiple locations - per frame
return [...prev];  // Creates new array even when content unchanged
```

## Quantifying the Problem

| Operation | Frequency Per Frame | Objects Created |
|-----------|---------------------|-----------------|
| spatialHash.query() | 2 balls × 10 substeps = 20 | 40 (Set + Array) |
| performance.now() | 7 per ball × 2 = 14 | 14 syscalls |
| ball spread {...ballIn} | 2 balls | 2 |
| vAdd/vSub/normalize | ~50 per ball × 2 = 100 | 100+ Vec2 objects |
| Array.from() for pools | 2-3 per frame | 2-3 arrays |

**Total: 150+ objects per frame**, triggering garbage collection every few seconds on mobile.

## Solution

### Phase 1: Fix SpatialHash.query() - Reuse Set and Array

Add instance-level reusable containers:

```typescript
// spatialHash.ts - add instance fields
private _querySeen: Set<T> = new Set();
private _queryResults: T[] = [];

query(aabb): T[] {
  // Reuse containers instead of creating new ones
  this._querySeen.clear();
  this._queryResults.length = 0;
  
  // ... existing logic using this._querySeen and this._queryResults
  
  return this._queryResults;
}
```

### Phase 2: Remove performance.now() from gameCCD.ts Hot Path

Only call performance.now() when debug is enabled:

```typescript
// gameCCD.ts - make timing conditional
import { ENABLE_DEBUG_FEATURES } from '@/constants/game';

export function processBallWithCCD(...) {
  // Only measure if debug is on
  const perfStart = ENABLE_DEBUG_FEATURES ? performance.now() : 0;
  
  // ... CCD logic ...
  
  // Only include performance data if measured
  return {
    ball: updatedBall,
    events: result.events,
    // ... other fields
    performance: ENABLE_DEBUG_FEATURES ? { /* timing data */ } : undefined
  };
}
```

### Phase 3: Use Pre-allocated Vec2 Objects in processBallCCD.ts

Extend the existing pre-allocation pattern to cover all vector operations:

```typescript
// processBallCCD.ts - add more pre-allocated vectors
const _tempRayDir: Vec2 = { x: 0, y: 0 };
const _tempHitPoint: Vec2 = { x: 0, y: 0 };
const _tempReflect: Vec2 = { x: 0, y: 0 };

// Replace immutable vAdd/vSub calls in hot path with mutable versions
// Example: Instead of const dir = vSub(pos1, pos0);
// Use: vSubTo(_tempRayDir, pos1, pos0);
```

### Phase 4: Cache EntityPool.getActive() Result

Return a stable reference instead of creating new array:

```typescript
// entityPool.ts - cache the active array
private _cachedActive: T[] = [];
private _cacheValid: boolean = false;

getActive(): T[] {
  if (!this._cacheValid) {
    this._cachedActive.length = 0;
    this.activeMap.forEach(v => this._cachedActive.push(v));
    this._cacheValid = true;
  }
  return this._cachedActive;
}

// Invalidate cache on acquire/release
acquire(init): T | null {
  // ... existing logic
  this._cacheValid = false;
  return obj;
}
```

### Phase 5: Optimize Game.tsx State Updates

Only create new array when content actually changed:

```typescript
// Instead of:
return [...prev];

// Use:
return prev; // If no mutations needed
// OR
if (modified) {
  return [...prev];
} else {
  return prev;
}
```

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/utils/spatialHash.ts` | Reuse Set/Array in query() | CRITICAL |
| `src/utils/gameCCD.ts` | Gate performance.now() behind debug flag | HIGH |
| `src/utils/processBallCCD.ts` | Use more pre-allocated vectors, avoid ball spread | HIGH |
| `src/utils/entityPool.ts` | Cache getActive() result | MEDIUM |
| `src/components/Game.tsx` | Optimize array spread patterns | MEDIUM |

## Technical Details

### Why This Fixes Mobile But Not Desktop
- Desktop V8's GC is generational and handles short-lived objects efficiently
- Mobile Safari/Firefox have less sophisticated GC, causing longer pauses
- Mobile CPUs run at lower clock speeds, amplifying GC impact
- Memory pressure on mobile devices is tighter, triggering GC more often

### Expected Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Objects per frame | 150+ | ~10 |
| GC pause frequency | Every 2-5 seconds | Every 30+ seconds |
| performance.now() calls | 14 per ball | 0 (debug off) |
| Array allocations | 40+ per frame | ~5 per frame |

## Implementation Order
1. Fix spatialHash.query() (biggest impact - called most frequently)
2. Remove performance.now() from gameCCD.ts (easy win)
3. Extend pre-allocated vectors in processBallCCD.ts
4. Cache EntityPool.getActive()
5. Optimize Game.tsx array spreads

## Testing Checklist
- [ ] Play level 1-4 on Pixel 8a Firefox - verify no 500ms+ freezes
- [ ] Play on iPhone Safari - verify smooth gameplay
- [ ] Play on iPhone Edge - verify smooth gameplay
- [ ] Monitor for LAG DETECTED warnings (should be rare/none)
- [ ] Verify game still functions correctly after optimizations
- [ ] Test with 3+ balls active (multiball) to stress test allocations
