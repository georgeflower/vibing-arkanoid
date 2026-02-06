

# Show Get Ready Overlay on All Level Transitions

## Summary
Add the "Get Ready!" overlay to appear on ALL level transitions, including:
- Normal mode: when advancing from any level to the next
- Boss Rush mode: when transitioning between boss fights
- Currently it only shows after dismissing tutorial overlays

## Current Behavior
The "Get Ready" overlay (with ball glow and floating text) only triggers in two places:
1. When dismissing a tutorial popup (`onDismiss` handler - line 9090)
2. When skipping all tutorials (`onSkipAll` handler - line 9120)

## Required Changes

### 1. Add Get Ready to Boss Rush Level Transitions
**File:** `src/components/Game.tsx` (lines ~1971-1975)

In the Boss Rush section of `nextLevel()`, before `setGameState("playing")`:

```typescript
// Add Get Ready sequence for Boss Rush
baseSpeedMultiplierRef.current = newSpeedMultiplier;
setSpeedMultiplier(newSpeedMultiplier * 0.1); // Start at 10% speed
getReadyStartTimeRef.current = Date.now();
setGetReadyActive(true);

// Start mobile glow effect
if (isMobileDevice) {
  getReadyGlowStartTimeRef.current = Date.now();
  setGetReadyGlow({ opacity: 1 });
}
```

### 2. Add Get Ready to Normal Mode Level Transitions
**File:** `src/components/Game.tsx` (lines ~2084-2086)

In the normal mode section of `nextLevel()`, before `setGameState("playing")`:

```typescript
// Add Get Ready sequence for Normal mode
baseSpeedMultiplierRef.current = newSpeedMultiplier;
setSpeedMultiplier(newSpeedMultiplier * 0.1); // Start at 10% speed
getReadyStartTimeRef.current = Date.now();
setGetReadyActive(true);

// Start mobile glow effect
if (isMobileDevice) {
  getReadyGlowStartTimeRef.current = Date.now();
  setGetReadyGlow({ opacity: 1 });
}
```

### 3. Update BossRushStatsOverlay onContinue Handler
**File:** `src/components/Game.tsx` (lines ~9219-9236)

The `onContinue` handler calls `nextLevel()` which will now trigger the Get Ready sequence. However, we need to ensure the speed multiplier is set correctly before calling `nextLevel()`:

The current flow will now be:
1. Player clicks Continue on stats overlay
2. `onContinue` resets stats, resumes game loop, calls `nextLevel()`
3. `nextLevel()` sets up the new boss level AND triggers Get Ready overlay
4. Get Ready overlay shows for 3 seconds with speed ramp
5. Player clicks to launch ball

No additional changes needed here since `nextLevel()` will handle the Get Ready activation.

## Technical Details

### Files Modified
| File | Changes |
|------|---------|
| `src/components/Game.tsx` | Add Get Ready activation in both Boss Rush and Normal mode sections of `nextLevel()` |

### Code Locations
1. **Boss Rush path** (~line 1971): Insert Get Ready code before `setGameState("playing")`
2. **Normal mode path** (~line 2084): Insert Get Ready code before `setGameState("playing")`

### Speed Multiplier Flow
1. Store the target speed in `baseSpeedMultiplierRef.current`
2. Set immediate speed to 10% (`newSpeedMultiplier * 0.1`)
3. `getReadyActive` triggers the ramp effect (existing code in `useEffect` at line 716)
4. Over 3 seconds, speed ramps from 10% to 100% with ease-out curve
5. When Get Ready overlay completes, speed is set to `baseSpeedMultiplierRef.current`

### Existing Get Ready Infrastructure
The following already exists and will be reused:
- `getReadyActive` state (line 505)
- `getReadyStartTimeRef` ref (line 506)
- `baseSpeedMultiplierRef` ref (line 507)
- Speed ramp effect (lines 716-742)
- Mobile glow effect (lines 745-777)
- `GetReadyOverlay` component render (lines 9069-9083)

## Expected Behavior After Change

1. **Normal Mode Level Transition:**
   - Complete level by destroying all bricks
   - Next level loads
   - "GET READY!" text appears with ball glow
   - Speed starts at 10%, ramps to 100% over 3 seconds
   - Ball waits on paddle
   - Click to launch

2. **Boss Rush Between Bosses:**
   - Defeat boss
   - Stats overlay appears
   - Click Continue
   - Next boss level loads
   - "GET READY!" text appears with ball glow
   - Speed starts at 10%, ramps to 100% over 3 seconds
   - Ball waits on paddle
   - Click to launch

