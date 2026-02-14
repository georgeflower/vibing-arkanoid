

# Fix: Game enters fullscreen on player death

## Problem

The auto-fullscreen `useEffect` (line 8857) triggers whenever `gameState === "ready"`. When the player loses a life, the game sets `gameState` back to `"ready"` to wait for the player to click to re-launch the ball. This re-triggers the fullscreen effect, causing an unwanted fullscreen entry on every death.

## Solution

Add a ref flag (`hasAutoFullscreened`) that tracks whether the initial auto-fullscreen has already happened. Set it to `true` after the first auto-fullscreen, and only reset it when the game truly restarts (e.g., returning to the menu or starting a new game).

### Changes in `src/components/Game.tsx`

1. **Add a ref**: `const hasAutoFullscreenedRef = useRef(false);`

2. **Guard the auto-fullscreen effect** (line 8858): Add `!hasAutoFullscreenedRef.current` to the condition, and set it to `true` inside the block after calling `toggleFullscreen()`.

3. **Reset the ref** when the game is fully restarted (in `handleReturnToMenu` or equivalent reset logic) so that the next game session will auto-fullscreen once.

### Technical detail

```typescript
const hasAutoFullscreenedRef = useRef(false);

// In the auto-fullscreen useEffect:
const shouldAutoFullscreen = 
  !isIOSDevice && 
  gameState === "ready" && 
  !isFullscreen && 
  !hasAutoFullscreenedRef.current &&
  fullscreenContainerRef.current;

if (shouldAutoFullscreen) {
  hasAutoFullscreenedRef.current = true;
  const timer = setTimeout(() => {
    toggleFullscreen();
  }, 100);
  return () => clearTimeout(timer);
}

// Reset when returning to menu:
hasAutoFullscreenedRef.current = false;
```

## Files changed

- `src/components/Game.tsx`

