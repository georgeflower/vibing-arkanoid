

# Cap Game Display Size to 1920x1200 Maximum

## Problem

On monitors with resolutions higher than 1920x1200, the game scales up beyond what it would look like on a 1920x1200 display. This causes the game to appear overly zoomed in, making it look worse.

## Solution

Add a maximum display size constant and clamp the calculated dimensions in `useCanvasResize` so the game never renders larger than it would on a 1920x1200 screen.

## Technical Details

### 1. Add constants in `src/constants/game.ts`

```typescript
// Maximum display resolution cap - game won't scale beyond this
export const MAX_DISPLAY_WIDTH = 1920;
export const MAX_DISPLAY_HEIGHT = 1200;
```

### 2. Clamp display dimensions in `src/hooks/useCanvasResize.ts`

After calculating `displayWidth` and `displayHeight` (the aspect-ratio-preserving fit), clamp both to the maximum values. Since the aspect ratio is maintained, we calculate what the display size would be on a 1920x1200 screen (accounting for padding and side panels) and cap at that.

The key change is after line 67, before the scale calculation:

```typescript
// Cap display size so it never exceeds what a 1920x1200 monitor would show
const maxW = MAX_DISPLAY_WIDTH - 16;   // same padding deduction
const maxH = MAX_DISPLAY_HEIGHT - 16;
const maxAspectFit = (maxW / maxH > aspectRatio)
  ? { w: maxH * aspectRatio, h: maxH }
  : { w: maxW, h: maxW / aspectRatio };

displayWidth = Math.min(displayWidth, maxAspectFit.w);
displayHeight = Math.min(displayHeight, maxAspectFit.h);
```

This ensures:
- On screens at or below 1920x1200, behavior is unchanged (the available space is already smaller)
- On larger screens, the game caps at the size it would have been on a 1920x1200 display
- Aspect ratio is always preserved
- Works in both windowed and fullscreen mode since both use the same hook

### Files changed
- `src/constants/game.ts` -- Add `MAX_DISPLAY_WIDTH` and `MAX_DISPLAY_HEIGHT` constants
- `src/hooks/useCanvasResize.ts` -- Import constants and clamp calculated dimensions

