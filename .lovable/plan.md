

# Fix: Overlay Positioning for Power-Up Timers and Bonus Letter Text

## Problem

After the canvas resize migration, the power-up timer overlays (STUN, REFLECT, MAGNET, FIREBALL) and the bonus letter tutorial text are misaligned -- shifted left and too high relative to the paddle/letters.

**Root cause**: The overlays use absolute pixel positions in the logical coordinate system (`SCALED_CANVAS_WIDTH/HEIGHT` space, e.g. 800x600), but the game-glow container is resized by `useCanvasResize` to display dimensions (e.g. 700x500). The canvas visually scales down via CSS `max-width`/`max-height` + `width: auto !important`, but the overlay divs still use raw pixel values from the logical space, creating a mismatch.

## Solution

Convert the overlay positioning from pixel-based logical coordinates to percentage-based coordinates. Since the overlay container uses `inset: 0` (filling game-glow), percentages will automatically scale correctly regardless of the display size.

## Changes

### File: `src/components/Game.tsx`

**1. Power-Up Timer Overlay (lines ~9207-9280)**

Change the wrapper div from fixed pixel dimensions to `inset: 0`, and convert each timer's `left`/`top` from pixel values to percentages:

```text
Before:  left: `${paddle.x + paddle.width / 2}px`
         top: `${paddle.y - 45}px`

After:   left: `${((paddle.x + paddle.width / 2) / SCALED_CANVAS_WIDTH) * 100}%`
         top: `${((paddle.y - 45) / SCALED_CANVAS_HEIGHT) * 100}%`
```

Apply the same conversion for all four timers (STUN at -45, REFLECT at -60, MAGNET at -75, FIREBALL at -90).

**2. Bonus Letter Tutorial Text (lines ~9284-9320)**

Convert the bonus letter text overlay positioning from pixels to percentages:

```text
Before:  left: `${letter.x + letter.width / 2}px`
         top: `${letter.y - 35}px`

After:   left: `${((letter.x + letter.width / 2) / SCALED_CANVAS_WIDTH) * 100}%`
         top: `${((letter.y - 35) / SCALED_CANVAS_HEIGHT) * 100}%`
```

### Summary of coordinate conversions

| Element | Property | Before (px) | After (%) |
|---------|----------|-------------|-----------|
| Timer wrapper | dimensions | explicit w/h | `inset: 0` |
| STUN | top | `paddle.y - 45` | `((paddle.y - 45) / SCALED_CANVAS_HEIGHT) * 100` |
| REFLECT | top | `paddle.y - 60` | `((paddle.y - 60) / SCALED_CANVAS_HEIGHT) * 100` |
| MAGNET | top | `paddle.y - 75` | `((paddle.y - 75) / SCALED_CANVAS_HEIGHT) * 100` |
| FIREBALL | top | `paddle.y - 90` | `((paddle.y - 90) / SCALED_CANVAS_HEIGHT) * 100` |
| All timers | left | `paddle.x + paddle.width/2` | `((paddle.x + paddle.width/2) / SCALED_CANVAS_WIDTH) * 100` |
| Bonus text | left | `letter.x + letter.width/2` | `((letter.x + letter.width/2) / SCALED_CANVAS_WIDTH) * 100` |
| Bonus text | top | `letter.y - 35` | `((letter.y - 35) / SCALED_CANVAS_HEIGHT) * 100` |

This approach ensures the overlays align with the canvas content regardless of how the container is scaled or resized.

