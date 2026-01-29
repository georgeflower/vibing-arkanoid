
# Fix: Game Area Not Expanding to Fill Available Frame Space

## Issue Analysis

Looking at the screenshot, the game canvas is smaller than it could be - there's significant unused gray space around it within the frame. The frame correctly fills the viewport, but the game area isn't maximizing its use of the available space.

### Root Cause

The `useCanvasResize` hook correctly calculates the optimal canvas size based on its container (`gameAreaRef`). However, the container itself isn't filling all available space due to CSS conflicts:

1. **Base `.metal-game-area`** has `max-width: calc(100% - 220px)` (line 442) - this constraint persists even in desktop-fullscreen mode
2. **The desktop-fullscreen override** sets `max-width: none` but this may be getting overridden by specificity or cascading issues
3. **The `.metal-main-content`** uses `justify-content: center` which centers the game area but doesn't force it to expand

### The CSS Cascade Problem

```css
/* Base rule (line 442) */
.metal-game-area {
  max-width: calc(100% - 220px); /* Always applied */
}

/* Override rule (line 475-481) */
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .metal-game-area {
    max-width: none; /* Should override, but may not win */
  }
}

/* Responsive override (line 518-520) */
@media (max-width: 1200px) {
  .metal-game-area {
    max-width: calc(100% - 210px); /* Re-applies constraint! */
  }
}
```

At viewport widths between 769px-1200px, BOTH the `(min-width: 769px)` and `(max-width: 1200px)` queries match. The more specific selector in the desktop-fullscreen rule should win, but we need to verify the specificity.

---

## Solution

### Change 1: Ensure Desktop Fullscreen Rules Have Proper Specificity

**File: `src/index.css`** (lines 475-481)

Update the desktop fullscreen `.metal-game-area` rule to use `!important` to guarantee it wins over other rules:

```css
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .metal-game-area {
    flex: 1;
    max-width: none !important; /* Force override of all other rules */
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
}
```

### Change 2: Ensure Main Content Fills Space

**File: `src/index.css`** (lines 470-473)

The `.metal-main-content` needs to use all available height and let its children (side panels + game area) fill it:

```css
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .metal-main-content {
    flex: 1;
    min-height: 0;
    /* Remove justify-content: center to allow game area to expand */
    justify-content: stretch;
  }
}
```

Actually, `justify-content: stretch` is the default for flexbox, so we just need to NOT have `justify-content: center` applied. Let me check if that's set elsewhere.

### Change 3: Make Game Glow Container Fill Game Area

**File: `src/index.css`** (lines 483-487)

The `.game-glow` container needs to fill 100% of the game area so the canvas can maximize within it:

```css
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .game-glow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
```

### Change 4: Update Hook to Account for Container Fill

**File: `src/hooks/useCanvasResize.ts`** (lines 51-52)

The hook subtracts 16px for padding but the container has 8px padding on each side. Let me verify this is correct or if we need to adjust.

Looking at line 433: `.metal-game-area { padding: 8px; }` - so total padding is 16px (8+8), which is correctly accounted for.

However, the issue might be that the container isn't getting the full available space in the first place. Let me add some debug logging to understand what dimensions the hook is receiving.

Actually, the simpler fix is to ensure the CSS properly allows the container to expand, then the hook will correctly size the canvas within that expanded container.

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/index.css` | Add `!important` to `.metal-frame.desktop-fullscreen .metal-game-area { max-width: none !important }` |
| `src/index.css` | Add explicit `width: 100%` and `height: 100%` to `.metal-frame.desktop-fullscreen .game-glow` |
| `src/index.css` | Ensure `.metal-frame.desktop-fullscreen .metal-main-content` doesn't have centering that prevents expansion |

---

## Detailed CSS Changes

### Update 1: Force max-width override (lines 475-481)

```css
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .metal-game-area {
    flex: 1;
    max-width: none !important;
    min-width: 0;
    min-height: 0;
    height: 100%;
    /* Ensure it fills available width from flexbox */
    width: 100%;
  }
}
```

### Update 2: Ensure game-glow fills the game area (lines 483-487)

```css
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .game-glow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100% !important;
    height: 100% !important;
  }
}
```

### Update 3: Fix main content to not over-center (lines 470-473)

The base `.metal-main-content` has `justify-content: center` which is fine, but we should not override it to `stretch` as that would break the layout. The flexbox children (side panels + game area) should naturally fill the row.

The actual issue is that the game area's `flex: 1` isn't expanding because the side panels have fixed widths and the game area has a max-width constraint. By removing the max-width constraint with `!important`, the game area should expand to fill the remaining space.

---

## Files to Modify

| File | Line Range | Change |
|------|------------|--------|
| `src/index.css` | 475-481 | Add `max-width: none !important`, `width: 100%` to `.metal-frame.desktop-fullscreen .metal-game-area` |
| `src/index.css` | 483-487 | Add `width: 100% !important`, `height: 100% !important` to `.metal-frame.desktop-fullscreen .game-glow` |

---

## Expected Result

After these changes:
1. The `.metal-game-area` will expand to fill all space between the side panels
2. The `.game-glow` will fill the entire game area
3. The `useCanvasResize` hook will receive the larger container dimensions
4. The canvas will scale up to fill more of the available space while maintaining aspect ratio
5. Less dead/gray space around the game canvas

---

## Test Plan

1. Wide desktop (1920×1080): Game area should be significantly larger
2. Medium desktop (1440×900): Game area should fill available space
3. Narrow desktop (1024×768): Game area adapts, sidebars may compress
4. Very narrow (<769px): Falls back to CSS-only handling
5. Resize smoothly between sizes: No jarring transitions
6. Aspect ratio maintained: No distortion of game content
