
# Fix: Mobile-Only Intermittent Freezes (500ms+ Frame Gaps)

## Problem Summary
After extensive codebase analysis, the game experiences intermittent freezes (500-600ms frame gaps) **only on mobile devices**. Desktop performance is stable. This is a mobile-specific issue with multiple contributing factors.

## Root Cause Analysis

### 1. Non-Passive Touch Event Listeners Blocking Main Thread
The game registers touch handlers with `{ passive: false }` for iOS Safari compatibility:
```typescript
// Game.tsx lines 2769-2777
canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
```

**Problem**: Non-passive listeners force the browser to wait for JavaScript execution before scrolling/rendering, introducing jank. On mobile, this can cause the compositor thread to stall waiting for the main thread.

**Additional overhead**: The `handleTouchMove` callback performs multiple operations per event:
- `getBoundingClientRect()` - forces layout recalculation
- `Math` calculations for touch zone mapping
- `setPaddle()` state update on every move event

### 2. Debug Logger Serialization During Lag Events
When a lag event is detected, `console.log` is intercepted and the debugLogger performs:
```typescript
// debugLogger.ts lines 47-53
const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
if (message.includes('[LAG') || ...) {
  self.addLog('log', message, args.length > 1 ? args.slice(1) : undefined);
}
```

Then `sanitizeData()` does **another** `JSON.stringify` + `JSON.parse`. This creates a cascade where detecting lag causes more lag - especially noticeable on mobile's slower JavaScript engines.

### 3. localStorage Writes During Gameplay
The debugLogger saves to localStorage with a 2-second debounce, but on mobile devices localStorage operations are significantly slower than on desktop (can be 50-200ms+ on some devices).

### 4. Service Worker Update Checks on Visibility Change
When returning from background (common on mobile with multitasking), the service worker hook triggers update checks:
```typescript
// useServiceWorkerUpdate.ts lines 85-88
const handleVisibilityChange = () => {
  if (!document.hidden && isMainMenu) {
    checkForUpdate(); // Async operation on visibility change
  }
};
```

While this is gated to `isMainMenu`, the visibility change handler is still registered during gameplay.

### 5. Array Spread on Every Touch Update
Every touch move creates a new paddle object:
```typescript
setPaddle((prev) => prev ? { ...prev, x: newX } : null);
```

On mobile with high touch event frequency (120Hz+ touch sampling on modern phones), this creates significant garbage.

## Solution

### Phase 1: Debounce Touch Move Handler (Major Impact)
Create a throttled touch move handler that limits state updates to 60fps:

```typescript
// Game.tsx - new ref and throttled handler
const lastTouchUpdateRef = useRef(0);
const TOUCH_THROTTLE_MS = 16; // ~60fps

const handleTouchMove = useCallback((e: TouchEvent) => {
  // ... existing early returns ...
  e.preventDefault();
  
  const now = performance.now();
  // Throttle state updates to 60fps
  if (now - lastTouchUpdateRef.current < TOUCH_THROTTLE_MS) {
    // Still update paddleXRef for collision detection, but skip React state
    if (activeTouch) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = SCALED_CANVAS_WIDTH / rect.width;
      const touchX = (activeTouch.clientX - rect.left) * scaleX;
      // ... calculate newX ...
      paddleXRef.current = newX; // Update ref immediately
    }
    return;
  }
  lastTouchUpdateRef.current = now;
  
  // ... rest of existing logic ...
}, [...]);
```

### Phase 2: Skip Debug Serialization During Lag Events
Prevent the lag-detecting-lag cascade:

```typescript
// debugLogger.ts - modify console.log override
console.log = function (...args: any[]) {
  self.originalConsole.log(...args);
  
  // Quick string check without JSON.stringify for common messages
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    if (firstArg.includes('[LAG') || firstArg.includes('[CCD') || firstArg.includes('[DEBUG')) {
      // Skip heavy serialization for lag events - just store message
      if (firstArg.includes('[LAG')) {
        self.addLogLite('log', firstArg); // New lightweight method
      } else {
        self.addLog('log', firstArg, args.length > 1 ? args.slice(1) : undefined);
      }
    }
  }
};

// New lightweight log method
addLogLite(level: DebugLogEntry['level'], message: string) {
  if (!this.enabled) return;
  
  const entry: DebugLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: undefined, // Skip serialization entirely
  };
  
  if (this.logs.length >= MAX_LOGS) {
    this.logs.shift();
  }
  this.logs.push(entry);
  this.saveToStorage();
}
```

### Phase 3: Increase localStorage Debounce for Mobile
Increase the save debounce to reduce I/O pressure:

```typescript
// debugLogger.ts
const SAVE_DEBOUNCE_MS = 5000; // Increase from 2000 to 5000ms
```

### Phase 4: Cache getBoundingClientRect
Cache the canvas rect to avoid forced layout recalculation:

```typescript
// Game.tsx - add cached rect
const canvasRectRef = useRef<DOMRect | null>(null);
const canvasRectTimeRef = useRef(0);
const RECT_CACHE_MS = 500; // Refresh every 500ms

// In touch handlers, use cached rect:
const getCanvasRect = useCallback(() => {
  const now = performance.now();
  if (!canvasRectRef.current || now - canvasRectTimeRef.current > RECT_CACHE_MS) {
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect() || null;
    canvasRectTimeRef.current = now;
  }
  return canvasRectRef.current;
}, []);
```

### Phase 5: Use Mutation Instead of Spread for Paddle
Avoid object creation on every touch:

```typescript
// Game.tsx - mutate paddle in place
setPaddle((prev) => {
  if (!prev) return null;
  if (prev.x === newX) return prev; // Skip if no change
  prev.x = newX; // Mutate in place
  return prev; // Return same reference - React won't re-render
  // Actually need: return { ...prev }; // But only when changed
});

// Better: Update ref immediately, let game loop sync to state
paddleXRef.current = newX;
// Game loop periodically syncs ref to state
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Game.tsx` | Throttle touch handler, cache canvas rect, optimize paddle updates |
| `src/utils/debugLogger.ts` | Add lightweight log method, skip serialization for lag events, increase debounce |

## Technical Details

### Why Mobile-Only?
1. **JavaScript Engine Speed**: Mobile JS engines are 3-10x slower than desktop V8
2. **Touch Event Frequency**: Modern phones sample touch at 120-240Hz, creating 2-4x more events than 60fps can process
3. **Memory Pressure**: Mobile devices have tighter memory constraints, triggering more frequent GC
4. **localStorage Performance**: Mobile localStorage is significantly slower due to flash storage limitations
5. **Compositor Thread Blocking**: Non-passive listeners block the compositor, which is more noticeable on mobile's lower refresh budgets

### Expected Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Touch events processed/sec | 120-240 | 60 (throttled) |
| `getBoundingClientRect` calls/sec | 120-240 | 2 (cached) |
| Lag event overhead | ~50-100ms | ~1ms |
| localStorage writes/min | 30 | 12 |

## Implementation Order
1. Throttle touch move handler (biggest impact)
2. Cache `getBoundingClientRect` result
3. Add lightweight log method to debugLogger
4. Increase localStorage debounce
5. Test on mobile devices

## Testing Checklist
- [ ] Play levels 1-4 on mobile device
- [ ] Watch console for LAG DETECTED warnings
- [ ] Verify paddle responsiveness remains smooth
- [ ] Check that touch controls feel as responsive
- [ ] Test rapid touch movements
- [ ] Verify no freeze during level transitions
- [ ] Test with debug dashboard open vs closed
