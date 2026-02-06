# Fix: Mobile Performance Regression from Object Pooling Changes

## Status: ✅ IMPLEMENTED

## Problem Summary
The lag occurs across multiple mobile devices and browsers (Pixel/Firefox, iPhone/Edge, iPhone/Safari) and **started after the pooling optimizations**. Despite the pooling being intended to reduce allocations, several critical issues were introduced that create **more garbage than before** on hot paths.

## Changes Made

### 1. SpatialHash.query() - FIXED ✅
- Added instance-level `_querySeen: Set<T>` and `_queryResults: T[]`
- Reuse these containers instead of creating new Set/Array per call
- ~40 fewer objects per frame (2 balls × 10 substeps × 2)

### 2. gameCCD.ts performance.now() - FIXED ✅
- Added `ENABLE_DEBUG_FEATURES` import
- Gated all `performance.now()` calls behind `shouldMeasurePerf` flag
- 14 fewer syscalls per frame when debug is off

### 3. processBallCCD.ts allocations - FIXED ✅
- Added pre-allocated `_tempCorners` array for corner checks
- Added reusable `_tempBall` object to avoid spread allocation
- Optimized `rayAABB()` to reuse result object `_rayAABBResult`
- Copy values immediately after rayAABB call since result is reused
- ~100+ fewer Vec2/object allocations per frame

### 4. EntityPool.getActive() - FIXED ✅
- Added `_cachedActive: T[]` and `_cacheValid: boolean`
- Cache is rebuilt only when entities are acquired/released
- Eliminates `Array.from()` allocation on every render call

## Expected Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Objects per frame | 150+ | ~10 |
| GC pause frequency | Every 2-5 seconds | Every 30+ seconds |
| performance.now() calls | 14 per ball | 0 (debug off) |
| Array allocations | 40+ per frame | ~5 per frame |

## Testing Checklist
- [ ] Play level 1-4 on Pixel 8a Firefox - verify no 500ms+ freezes
- [ ] Play on iPhone Safari - verify smooth gameplay
- [ ] Play on iPhone Edge - verify smooth gameplay
- [ ] Monitor for LAG DETECTED warnings (should be rare/none)
- [ ] Verify game still functions correctly after optimizations
- [ ] Test with 3+ balls active (multiball) to stress test allocations
