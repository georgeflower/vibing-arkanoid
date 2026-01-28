
# Desktop Layout Optimization Plan: Dynamic Canvas Sizing with ResizeObserver

## Summary

This plan implements Option B: a comprehensive JavaScript-based solution using ResizeObserver to dynamically size the canvas based on available container space, ensuring the game fills the entire viewport on desktop while preserving mobile behavior.

---

## Current Architecture Analysis

### Key Constraints Identified

| Location | Constraint | Impact |
|----------|-----------|--------|
| `src/index.css` line 306 | `.metal-frame { max-width: 1400px }` | Frame doesn't fill wide screens |
| `src/index.css` line 307 | `.metal-frame { width: fit-content }` | Frame sizes to content, not viewport |
| `src/index.css` line 308 | `.metal-frame { max-height: 98vh }` | Leaves 2% vertical margin |
| `src/index.css` line 442 | `.metal-game-area { max-width: calc(100% - 220px) }` | Artificial width constraint |
| `src/components/Game.tsx` lines 8647-8649 | Inline `width/height` on `.game-glow` | Fixed 850×650px (or 765×585 on Mac) |
| `src/hooks/useScaledConstants.ts` | Platform-based scale (90% for Mac) | Canvas logical size is fixed |

### Current Coordinate Mapping
The mouse handling in `handleMouseMove` (lines 2123-2158) already correctly maps mouse coordinates using `getBoundingClientRect()`:
```typescript
const rect = canvasRef.current.getBoundingClientRect();
const scaleX = SCALED_CANVAS_WIDTH / rect.width;
const mouseX = (e.clientX - rect.left) * scaleX;
```
This means CSS-based scaling will work correctly with existing input handling.

---

## Technical Implementation

### New Hook: `useViewportFrame`

Creates a hook that ensures the outer frame fills the viewport on desktop.

**File: `src/hooks/useViewportFrame.ts`** (new file)

```typescript
import { useEffect, useRef } from "react";

interface ViewportFrameOptions {
  enabled: boolean; // Gate for desktop-only behavior
  frameRef: React.RefObject<HTMLDivElement>;
}

export function useViewportFrame({ enabled, frameRef }: ViewportFrameOptions) {
  useEffect(() => {
    if (!enabled || !frameRef.current) return;
    
    // Add desktop-fullscreen class to enable CSS-based viewport fill
    frameRef.current.classList.add("desktop-fullscreen");
    
    return () => {
      frameRef.current?.classList.remove("desktop-fullscreen");
    };
  }, [enabled, frameRef]);
}
```

### New Hook: `useCanvasResize`

Creates a hook that dynamically sizes the canvas container based on available space using ResizeObserver.

**File: `src/hooks/useCanvasResize.ts`** (new file)

```typescript
import { useEffect, useRef, useCallback, useState } from "react";

interface CanvasResizeOptions {
  enabled: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  gameGlowRef: React.RefObject<HTMLDivElement>;
  logicalWidth: number;  // SCALED_CANVAS_WIDTH
  logicalHeight: number; // SCALED_CANVAS_HEIGHT
}

interface CanvasSize {
  displayWidth: number;
  displayHeight: number;
  scale: number;
}

export function useCanvasResize({
  enabled,
  containerRef,
  gameGlowRef,
  logicalWidth,
  logicalHeight,
}: CanvasResizeOptions): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({
    displayWidth: logicalWidth,
    displayHeight: logicalHeight,
    scale: 1,
  });
  
  const rafRef = useRef<number | null>(null);
  
  const calculateSize = useCallback(() => {
    if (!containerRef.current || !gameGlowRef.current) return;
    
    const container = containerRef.current;
    const availableWidth = container.clientWidth - 16; // Account for padding
    const availableHeight = container.clientHeight - 16;
    
    // Calculate scale to fit while maintaining aspect ratio
    const aspectRatio = logicalWidth / logicalHeight;
    let displayWidth: number;
    let displayHeight: number;
    
    if (availableWidth / availableHeight > aspectRatio) {
      // Container is wider than canvas ratio - height-constrained
      displayHeight = availableHeight;
      displayWidth = displayHeight * aspectRatio;
    } else {
      // Container is taller than canvas ratio - width-constrained
      displayWidth = availableWidth;
      displayHeight = displayWidth / aspectRatio;
    }
    
    const scale = displayWidth / logicalWidth;
    
    setSize({
      displayWidth: Math.floor(displayWidth),
      displayHeight: Math.floor(displayHeight),
      scale,
    });
    
    // Apply size to game-glow container
    gameGlowRef.current.style.width = `${Math.floor(displayWidth)}px`;
    gameGlowRef.current.style.height = `${Math.floor(displayHeight)}px`;
  }, [containerRef, gameGlowRef, logicalWidth, logicalHeight]);
  
  const debouncedCalculate = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(calculateSize);
  }, [calculateSize]);
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const observer = new ResizeObserver(debouncedCalculate);
    observer.observe(containerRef.current);
    
    // Initial calculation
    calculateSize();
    
    return () => {
      observer.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, containerRef, debouncedCalculate, calculateSize]);
  
  return size;
}
```

### CSS Changes for Desktop Fullscreen

**File: `src/index.css`** (add after line 454, before responsive adjustments)

```css
/* Desktop Fullscreen Mode - Frame fills entire viewport */
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen {
    position: fixed;
    inset: 0;
    max-width: none;
    max-height: none;
    width: 100vw;
    height: 100vh;
    margin: 0;
    border-radius: 0;
    border-width: 8px;
  }
  
  .metal-frame.desktop-fullscreen .metal-main-content {
    flex: 1;
    min-height: 0;
  }
  
  .metal-frame.desktop-fullscreen .metal-game-area {
    flex: 1;
    max-width: none;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
  
  .metal-frame.desktop-fullscreen .game-glow {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .metal-frame.desktop-fullscreen .game-glow canvas {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
```

### Game.tsx Changes

#### 1. Add new imports and refs
**File: `src/components/Game.tsx`** (near top imports)

```typescript
import { useViewportFrame } from "@/hooks/useViewportFrame";
import { useCanvasResize } from "@/hooks/useCanvasResize";
```

#### 2. Add new ref for game-glow container
**File: `src/components/Game.tsx`** (with other refs)

```typescript
const gameGlowRef = useRef<HTMLDivElement>(null);
```

#### 3. Add new hooks usage
**File: `src/components/Game.tsx`** (with other hook calls)

```typescript
// Desktop viewport frame - fills entire screen
useViewportFrame({
  enabled: !isMobileDevice,
  frameRef: gameContainerRef,
});

// Dynamic canvas resize for desktop
const { displayWidth, displayHeight, scale: dynamicScale } = useCanvasResize({
  enabled: !isMobileDevice,
  containerRef: gameAreaRef, // Need to add this ref
  gameGlowRef,
  logicalWidth: SCALED_CANVAS_WIDTH,
  logicalHeight: SCALED_CANVAS_HEIGHT,
});
```

#### 4. Add game area ref
**File: `src/components/Game.tsx`** (with other refs)

```typescript
const gameAreaRef = useRef<HTMLDivElement>(null);
```

#### 5. Update game area JSX
**File: `src/components/Game.tsx`** (lines 8644-8653)

```tsx
{/* Game Canvas - Apply scale transform when title is hidden (desktop only) */}
<div className="metal-game-area" ref={gameAreaRef}>
  <div
    ref={gameGlowRef}
    className={`game-glow ${isFullscreen ? "game-canvas-wrapper" : ""}`}
    style={isMobileDevice ? {
      width: `${SCALED_CANVAS_WIDTH}px`,
      height: `${SCALED_CANVAS_HEIGHT}px`,
      transform: `scale(${gameScale})`,
      transformOrigin: "top center",
      transition: "transform 150ms ease-in-out",
    } : {
      // Desktop: Size controlled by useCanvasResize hook
      // Width/height set imperatively via ref
      transformOrigin: "top center",
      transition: "width 150ms ease-in-out, height 150ms ease-in-out",
    }}
  >
```

#### 6. Simplify desktop layout logic in checkFrameVisibility
**File: `src/components/Game.tsx`** (lines 8436-8472)

The existing `checkFrameVisibility` effect can be simplified for desktop since the new hooks handle sizing:

```typescript
// Desktop-specific adaptive layout
if (!isMobile) {
  // With desktop-fullscreen mode, frame always fills viewport
  // Only manage title visibility based on vertical space
  const titleBarHeight = 60;
  const statsBarHeight = 80;
  const bottomBarHeight = 60;
  const sideFrameHeight = 40;
  
  const playableAreaHeight = SCALED_CANVAS_HEIGHT;
  const statsAndBottomHeight = statsBarHeight + bottomBarHeight + sideFrameHeight;
  const fullHeightNeeded = playableAreaHeight + titleBarHeight + statsAndBottomHeight;
  
  // Check if we need to hide title
  const shouldShowTitle = containerHeight >= fullHeightNeeded;
  if (shouldShowTitle !== titleVisible) {
    setTitleVisible(shouldShowTitle);
    setGameScale(1); // Scale now handled by useCanvasResize
    console.log(`[Desktop Layout] titleVisible: ${shouldShowTitle}`);
  }
  
  // Stats and controls always visible on desktop
  if (!framesVisible) {
    setFramesVisible(true);
    setHeaderVisible(true);
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useViewportFrame.ts` | Hook to apply desktop-fullscreen class |
| `src/hooks/useCanvasResize.ts` | Hook with ResizeObserver for dynamic canvas sizing |

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add `@media (min-width: 769px)` rules for `.desktop-fullscreen` class |
| `src/components/Game.tsx` | Add imports, refs, hook usage, update game area JSX and simplify layout logic |

---

## What Remains Unchanged (Mobile Preservation)

- All `@media (max-width: 768px)` CSS rules
- `.mobile-fullscreen-mode` class and children
- `.ios-fullscreen-container` styles
- Mobile touch handling
- Mobile fullscreen prompt behavior
- iOS Safari gesture prevention
- `isMobileDevice` conditional branches in Game.tsx

---

## Pointer Coordinate Mapping

The existing `handleMouseMove` function already correctly maps coordinates:

```typescript
const rect = canvasRef.current.getBoundingClientRect();
const scaleX = SCALED_CANVAS_WIDTH / rect.width;
const mouseX = (e.clientX - rect.left) * scaleX;
```

This works correctly because:
1. `getBoundingClientRect()` returns the actual displayed size
2. `scaleX` converts from display pixels to logical game coordinates
3. The canvas's actual pixel buffer remains at `SCALED_CANVAS_WIDTH × SCALED_CANVAS_HEIGHT`
4. CSS `object-fit: contain` handles the visual scaling

---

## Expected Results

1. **Frame fills viewport**: The metal frame expands to 100vw × 100vh on desktop
2. **Canvas uses all available space**: ResizeObserver dynamically sizes the canvas container to fill the game area while maintaining aspect ratio
3. **Side panels preserved**: Left (60px) and right (140px) panels remain at fixed widths
4. **Smooth resizing**: ResizeObserver + requestAnimationFrame ensures smooth updates
5. **Pointer accuracy maintained**: Existing coordinate mapping via getBoundingClientRect continues to work
6. **Mobile unchanged**: All changes gated behind `!isMobileDevice` checks

---

## Test Plan

### Desktop Browsers
- Chrome (Windows/Mac)
- Edge
- Firefox  
- Safari (Mac)

### Resolutions to Test
- 1920×1080 (Full HD)
- 1440×900 (MacBook Air)
- 2560×1440 (QHD)
- 1366×768 (Common laptop)
- 1024×768 (Edge case)

### Test Cases
1. **Initial load**: Frame fills viewport, canvas fills game area
2. **Window resize**: Canvas smoothly resizes maintaining aspect ratio
3. **Fullscreen toggle (F key)**: Works correctly with new layout
4. **Title visibility**: Hides/shows based on vertical space
5. **Side panel visibility**: Always visible on desktop
6. **Paddle control**: Mouse accurately controls paddle position
7. **Ball launch**: Click to launch works correctly
8. **Pointer lock**: Still functions for mouse capture
9. **Mobile verification**: No visual or behavioral changes

### DPR Verification
On high-DPI displays (DPR ≥ 2):
- Canvas remains crisp (using logical dimensions for buffer)
- Mouse coordinates map correctly
- No blurring or artifacts

