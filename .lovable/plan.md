
# Fix Boss Rush Stats Overlay Click-Through and GetReadyOverlay Position

## Issues Identified

### Issue 1: Ball Launches Immediately After Stats Overlay Continue
When clicking "Continue" on the BossRushStatsOverlay, the click event propagates to the game canvas which triggers `launchBallAtCurrentAngle()`. The overlay's click handlers (`handlePointerDown`, `handleClick`, `handleKeyDown`) don't call `stopPropagation()` to block event bubbling.

### Issue 2: GetReadyOverlay Ball Highlight Mispositioned
The GetReadyOverlay measures its container size using `getBoundingClientRect()`, but it's returning the wrong dimensions. The session replay shows coordinates like `left: 2001.92px` when the playing area is only `1806px` wide. This happens because:
- The overlay div with `absolute inset-0` is inheriting the wrong container bounds
- The scale calculation `scaleX = containerSize.width / canvasWidth` produces values > 1 when it should be close to 1

## Solution

### Part 1: Prevent Ball Launch on Stats Overlay Continue

**File: `src/components/BossRushStatsOverlay.tsx`**

Add `stopPropagation()` and `preventDefault()` to all event handlers to block the click from reaching the game canvas:

1. **handlePointerDown** (line ~142): Add `e.stopPropagation()`
2. **handleKeyDown** (line ~129): Add `e.stopPropagation()` 
3. **onClick on main div** (line ~162): Add `e.stopPropagation()`

Additionally, add a debounce mechanism in `Game.tsx` to ignore launch attempts immediately after the overlay closes:
- Add `statsOverlayJustClosedRef` boolean ref
- Set to `true` on `onContinue`, clear after 100ms
- Check this ref in `launchBallAtCurrentAngle()` and early-return if true

### Part 2: Fix GetReadyOverlay Positioning

**File: `src/components/GetReadyOverlay.tsx`**

The current approach of measuring `containerSize` and scaling ball coordinates is unnecessarily complex. Since the overlay is inside the `.game-glow` container which already has the correct dimensions, the ball coordinates should be used directly without scaling.

**Change the approach:**
1. Remove the containerSize measurement logic
2. Use the ball coordinates directly as pixel positions
3. The overlay parent container (`.game-glow`) already has the correct pixel dimensions set by `useCanvasResize`, so absolute positioning will work correctly

**Before (current - broken):**
```typescript
const scaleX = containerSize.width > 0 ? containerSize.width / canvasWidth : 1;
const ringX = ballPosition ? ballPosition.x * scaleX : 0;
```

**After (fixed):**
```typescript
// Ball position is already in container coordinates
// No scaling needed - parent container is sized correctly
const ringX = ballPosition.x;
const ringY = ballPosition.y;
```

## Files Modified

| File | Changes |
|------|---------|
| `src/components/BossRushStatsOverlay.tsx` | Add `stopPropagation()` to click/pointer/keyboard handlers |
| `src/components/GetReadyOverlay.tsx` | Remove container scaling, use ball coordinates directly |
| `src/components/Game.tsx` | Add debounce ref to prevent ball launch after overlay close |

## Technical Details

### BossRushStatsOverlay Changes

```typescript
// Line ~128-133: handleKeyDown
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();  // ADD THIS
    onContinue();
  }
};

// Line ~142-144: handlePointerDown  
const handlePointerDown = (e: PointerEvent) => {
  e.stopPropagation();  // ADD THIS
  e.preventDefault();   // ADD THIS
  onContinue();
};

// Line ~162: onClick on main div
onClick={(e) => {
  e.stopPropagation();  // ADD THIS
  handleClick();
}}
```

### GetReadyOverlay Changes

```typescript
// Remove containerSize state and measurement effect

// Desktop version - use coordinates directly
const ringX = ballPosition.x;
const ringY = ballPosition.y;
const textY = ringY - 60;
const ringRadius = 30 + progress * 20;
```

### Game.tsx Debounce Ref

```typescript
// Near other refs
const statsOverlayJustClosedRef = useRef(false);

// In onContinue handler for BossRushStatsOverlay
onContinue={() => {
  statsOverlayJustClosedRef.current = true;
  setTimeout(() => {
    statsOverlayJustClosedRef.current = false;
  }, 150);
  // ... rest of handler
}}

// In launchBallAtCurrentAngle
const launchBallAtCurrentAngle = useCallback(() => {
  if (statsOverlayJustClosedRef.current) return; // Block during debounce
  // ... rest of function
}, [...]);
```

## Expected Behavior After Fix

1. **Boss Rush Stats → Continue**:
   - Click "Continue" on stats overlay
   - Overlay closes, next boss loads
   - Ball remains on paddle (NOT launched)
   - "GET READY!" appears with glow positioned correctly at ball
   - Second click launches ball

2. **GetReadyOverlay Positioning**:
   - Ball glow and "GET READY!" text appear directly over the ball
   - Coordinates match the game's coordinate system
   - Works on all screen sizes and platforms
