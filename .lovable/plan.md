

# Fix: Persistent Mobile Freezes (119ms-497ms Frame Gaps)

## Problem Summary
Despite previous optimizations, the game still experiences intermittent freezes on mobile (Pixel 8a with Firefox) with debug features enabled. The LAG DETECTED logs show:
- 119ms freeze at game start
- 194ms freeze shortly after
- 497ms freeze during gameplay with 2 balls and 1 enemy

The data shows: `enemyCount: 0-1, particleCount: 0, powerUpCount: 0` - these are minimal object counts, meaning the freeze isn't from object overload.

## Root Causes Identified

### 1. Frame Profiler Running Every Frame (Even When Disabled)
The game loop calls `frameProfiler.startFrame()` unconditionally every frame:

```typescript
// Line 5120 - ALWAYS runs, regardless of whether profiler is enabled
frameProfiler.startFrame();
```

Even though `frameProfiler.startFrame()` has an early return when disabled, the function call overhead and the surrounding code structure remain. More importantly, it also calls `startTiming("rendering")`, `endTiming()`, etc. throughout the game loop - all of which add overhead.

### 2. Debug Logger Still Creates Date Objects Per Log
Despite the `addLogLite` optimization, the method still creates a `new Date().toISOString()` for every log entry:

```typescript
// debugLogger.ts lines 139-143
const entry: DebugLogEntry = {
  timestamp: new Date().toISOString(), // Expensive on mobile
  level,
  message,
  data: undefined,
};
```

`new Date().toISOString()` involves:
- Creating a Date object
- Converting to ISO string (string allocation)
- On mobile Firefox, this is especially slow

### 3. Lag Detection Creates Objects Every Check
Even in the "fast path" for lag detection, the logger is still called:

```typescript
// Game.tsx lines 5100-5113
const context = {
  level,
  ballCount: balls.length,
  enemyCount: enemies.length,
  // ... creates object every time
};
debugLogger.error(`[DEBUG] [LAG DETECTED]...`, context);
```

This creates a new object that then needs to be serialized, even with `addLogLite`.

### 4. Multiple performance.now() Calls Per Frame
The game loop calls `performance.now()` multiple times:
- Line 5054: `frameStart`
- Line 5123: `now` (for FPS throttling)
- Frame profiler calls it many more times via `startTiming`/`endTiming`

On mobile, `performance.now()` can be slower than expected and calling it 10+ times per frame adds up.

### 5. frameProfiler.startTiming/endTiming Calls Throughout Loop
Even when the profiler is "disabled", the calls are still made throughout:
- `frameProfiler.startTiming("rendering")` - line 5197
- `frameProfiler.startTiming("bullets")` - line 5239
- `frameProfiler.startTiming("enemies")` - line 5244
- `frameProfiler.startTiming("particles")` - line 5297
- And many more...

Each call checks `if (!this.enabled) return;` - but the function call overhead on mobile is significant.

### 6. Garbage Collection from Closures in gameLoop
The `gameLoop` callback creates new closures and references each time it's called, which can trigger GC pauses. The dependency array includes many state variables that cause the callback to be recreated.

## Solution

### Phase 1: Gate All Debug Operations Behind Single Check
Move all debug-related operations behind a single flag check at the start of the loop:

```typescript
// Game.tsx - in gameLoop
const shouldRunDebugCode = ENABLE_DEBUG_FEATURES && (
  debugSettings.showFrameProfiler ||
  debugSettings.enableLagLogging ||
  debugSettings.enableGCLogging
);

// Only run lag detection if debug is actually active
if (shouldRunDebugCode) {
  // ... existing lag detection code
}

// Only run frame profiler if specifically enabled
if (ENABLE_DEBUG_FEATURES && debugSettings.showFrameProfiler) {
  frameProfiler.startFrame();
}
```

### Phase 2: Use Cached Timestamp in Debug Logger
Cache `Date.now()` at the start of each frame and reuse it:

```typescript
// Game.tsx - add at component level
const frameTimestampRef = useRef<number>(0);

// In gameLoop, at very start:
frameTimestampRef.current = Date.now();

// debugLogger.ts - new method for frame-cached timestamps
addLogWithTimestamp(level: DebugLogEntry['level'], message: string, cachedTimestamp: number) {
  if (!this.enabled) return;
  
  const entry: DebugLogEntry = {
    timestamp: cachedTimestamp, // Use pre-cached number
    level,
    message,
    data: undefined,
  };
  // ...
}
```

### Phase 3: Remove frameProfiler Calls When Debug Disabled
Wrap all `frameProfiler.startTiming`/`endTiming` calls in conditional checks:

```typescript
// Instead of:
frameProfiler.startTiming("rendering");
// ... code ...
frameProfiler.endTiming("rendering");

// Use:
const profilerEnabled = ENABLE_DEBUG_FEATURES && debugSettings.showFrameProfiler;
if (profilerEnabled) frameProfiler.startTiming("rendering");
// ... code ...
if (profilerEnabled) frameProfiler.endTiming("rendering");

// Or better - create a helper:
const startProfile = profilerEnabled ? frameProfiler.startTiming.bind(frameProfiler) : () => {};
const endProfile = profilerEnabled ? frameProfiler.endTiming.bind(frameProfiler) : () => {};
```

### Phase 4: Reduce performance.now() Calls
Cache the timestamp at the start of the frame and reuse:

```typescript
// Game.tsx - in gameLoop
const frameNow = performance.now(); // Call ONCE

// Replace all subsequent performance.now() calls with frameNow
const frameGap = lagDetectionRef.current.lastFrameEnd > 0 
  ? frameNow - lagDetectionRef.current.lastFrameEnd 
  : 0;

// ... later in the loop
const elapsed = frameNow - lastFrameTimeRef.current;
```

### Phase 5: Skip Lag Logging When Already Lagging
Prevent cascade by skipping lag detection if we're already in a lag frame:

```typescript
// Game.tsx - in lag detection section
if (frameGap > 50 && !lagDetectionRef.current.isCurrentlyLagging) {
  lagDetectionRef.current.isCurrentlyLagging = true;
  // ... log lag event without creating objects
  debugLogger.logLiteLag(`Frame gap: ${frameGap.toFixed(0)}ms`);
}

// At end of frame:
lagDetectionRef.current.isCurrentlyLagging = false;
```

### Phase 6: Disable Debug Features for Production Testing
The simplest immediate fix: set `ENABLE_DEBUG_FEATURES = false` in `src/constants/game.ts` when testing mobile performance:

```typescript
// src/constants/game.ts
export const ENABLE_DEBUG_FEATURES = false; // Disable for mobile testing
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Game.tsx` | Gate all debug code, cache performance.now(), remove profiler calls when disabled |
| `src/utils/debugLogger.ts` | Use numeric timestamp instead of Date object, add ultra-light lag logging |
| `src/utils/frameProfiler.ts` | No-op implementation when disabled (optional) |
| `src/constants/game.ts` | Set `ENABLE_DEBUG_FEATURES = false` for production |

## Technical Details

### Performance Impact Analysis

| Operation | Mobile Cost (approx) | Frequency | Total Impact |
|-----------|---------------------|-----------|--------------|
| `new Date().toISOString()` | 0.1-0.5ms | Every lag log | High |
| `performance.now()` | 0.01-0.05ms | 10+ per frame | Medium |
| Function call overhead | 0.001-0.01ms | 50+ per frame | Medium |
| Object creation (`context`) | 0.05-0.2ms | Per lag event | High |
| `frameProfiler.startTiming()` | 0.01-0.05ms | 8+ per frame | Medium |

### Why Mobile-Only?
- Firefox on Android has slower JS execution than Chrome
- Mobile CPUs throttle aggressively for battery savings
- GC pressure is higher due to memory constraints
- Debug operations that take 0.5ms on desktop can take 2-5ms on mobile

### Quick Fix (Immediate)
Set `ENABLE_DEBUG_FEATURES = false` in `src/constants/game.ts`. This will eliminate all debug overhead and likely resolve the freezes immediately.

### Long-term Fix (This Plan)
Properly gate all debug code so it has zero overhead when disabled, allowing debug mode to be left on without performance impact.

## Implementation Order
1. ✅ Cache `performance.now()` at frame start - use `frameNow` throughout loop
2. ✅ Gate all debug code behind `shouldRunDebugCode` and `profilerEnabled` flags
3. ✅ Gate all frameProfiler calls behind `profilerEnabled` check
4. ✅ Optimize debugLogger `addLogLite` to use numeric timestamps
5. ✅ Use lightweight logging for lag/GC detection - no object serialization
6. Test on mobile to verify fix

## Testing Checklist
- [ ] Play levels 1-4 on Pixel 8a with Firefox
- [ ] Monitor console for LAG DETECTED warnings (should be much rarer)
- [ ] Verify no performance regression on desktop
- [ ] Test with frame profiler overlay enabled vs disabled

