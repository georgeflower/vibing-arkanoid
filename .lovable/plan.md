

# Auto-Enter Fullscreen on Desktop at Game Start

## Overview

When users click "Press key/mouse to continue" on the start screen and then "Start Game" from the menu, the game will automatically enter fullscreen mode on desktop browsers.

## Current Behavior

- **Mobile (non-iOS):** Auto-enters fullscreen when game loads in "ready" state
- **iOS:** Requires manual fullscreen (API not supported)
- **Desktop:** No auto-fullscreen (stays windowed until user presses "F" key)

## New Behavior

- **Desktop:** Auto-enters fullscreen when game loads in "ready" state
- **Mobile and iOS:** Unchanged

## Technical Change

**File:** `src/components/Game.tsx` (lines 8515-8524)

Current code:
```typescript
// Auto-enter fullscreen on mobile when game starts (disabled for iOS - user gesture required)
useEffect(() => {
  if (isMobileDevice && !isIOSDevice && gameState === "ready" && !isFullscreen && fullscreenContainerRef.current) {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      toggleFullscreen();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [isMobileDevice, isIOSDevice, gameState]);
```

Updated code:
```typescript
// Auto-enter fullscreen when game starts
// - Desktop: Always auto-fullscreen
// - Mobile (non-iOS): Auto-fullscreen
// - iOS: Disabled (API not supported, user gesture required)
useEffect(() => {
  const shouldAutoFullscreen = 
    (!isMobileDevice || (isMobileDevice && !isIOSDevice)) && 
    gameState === "ready" && 
    !isFullscreen && 
    fullscreenContainerRef.current;
    
  if (shouldAutoFullscreen) {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      toggleFullscreen();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [isMobileDevice, isIOSDevice, gameState]);
```

This simplifies to: auto-fullscreen for all devices except iOS when game enters "ready" state.

## Why This Works

1. The `toggleFullscreen()` function already handles all browser differences (standard API, webkit prefix)
2. The Game component only mounts when the user clicks "Start Game" from the main menu
3. The "ready" state is set immediately upon game initialization
4. The 100ms delay ensures the DOM is ready before requesting fullscreen
5. The Fullscreen API requires a user gesture - clicking "Start Game" satisfies this requirement

## User Experience

1. User sees start screen with "Press key/mouse to continue"
2. User clicks/presses → Main menu appears
3. User configures game and clicks "Start Game"
4. Game automatically enters fullscreen mode
5. User can exit fullscreen anytime with ESC or F key

## Testing Checklist

- Desktop Chrome: Should auto-enter fullscreen when clicking "Start Game"
- Desktop Firefox: Should auto-enter fullscreen when clicking "Start Game"
- Desktop Safari: Should auto-enter fullscreen (webkit prefix handles this)
- Mobile Android: Should continue to auto-enter fullscreen (unchanged)
- iOS Safari: Should NOT auto-enter fullscreen (unchanged, API not supported)
- User can still toggle fullscreen with "F" key at any time

