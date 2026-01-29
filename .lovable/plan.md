

# Fix: Desktop Layout Shrinking When Sidebars Are Hidden

## Root Cause Analysis

The shrinking occurs due to a **mismatch between two different detection systems**:

### The Conflict

| System | Detection Method | Behavior |
|--------|------------------|----------|
| `useCanvasResize` hook | `isMobileDevice` (user agent) | Enabled on desktop browsers regardless of viewport width |
| Sidebar visibility | CSS `@media (max-width: 768px)` | Hides sidebars based on viewport width |

When you resize to <768px on a desktop browser:
1. **CSS hides the sidebars** (via `@media (max-width: 768px) { .metal-side-panel { display: none } }`)
2. **The hook is still enabled** because `isMobileDevice` is false (desktop user agent)
3. The hook measures `gameAreaRef.clientWidth/clientHeight` which now changes drastically
4. The hook imperatively sets smaller dimensions on `.game-glow`
5. The canvas shrinks, and due to the transition CSS, it keeps animating smaller
6. The CSS rule `width: 100% !important` on the canvas conflicts with the container size

### The Cascade Effect

```text
Window resize → sidebars hidden → gameAreaRef size changes → 
hook calculates smaller size → applies to game-glow → 
canvas scales down → bottom gets clipped
```

---

## Solution

Gate the `useCanvasResize` hook not just by user agent, but also by **viewport width**. When the viewport is narrow (<769px), the hook should be disabled and let standard CSS handle the layout.

---

## Technical Changes

### Change 1: Gate Hook by Viewport Width

**File: `src/hooks/useCanvasResize.ts`** (lines 36-69)

Add viewport width check inside the calculation function so it only applies sizing on wide viewports:

```typescript
const calculateSize = useCallback(() => {
  if (!containerRef.current || !gameGlowRef.current) return;

  const container = containerRef.current;
  
  // Don't imperatively size on narrow viewports - let CSS handle it
  // This prevents conflicts when sidebars are hidden via CSS media queries
  const viewportWidth = window.innerWidth;
  if (viewportWidth < 769) {
    // Clear any previously set inline styles
    gameGlowRef.current.style.width = '';
    gameGlowRef.current.style.height = '';
    return;
  }

  const availableWidth = container.clientWidth - 16;
  const availableHeight = container.clientHeight - 16;

  // ... rest of calculation
```

### Change 2: Update CSS for Narrow Desktop Viewports

**File: `src/index.css`** (after line 496, before the responsive adjustments)

Add explicit rules for desktop at narrow widths to ensure canvas fills properly when sidebars are hidden:

```css
/* Desktop at narrow widths (sidebars hidden but not mobile device) */
@media (min-width: 769px) {
  .metal-frame.desktop-fullscreen .game-glow canvas {
    /* Ensure canvas scales properly within container */
    width: auto !important;
    height: auto !important;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
```

### Change 3: Handle Sidebar Transition in Hook

**File: `src/hooks/useCanvasResize.ts`** (lines 78-93)

Also listen for viewport resize to detect sidebar visibility changes:

```typescript
useEffect(() => {
  if (!enabled || !containerRef.current) return;

  const observer = new ResizeObserver(debouncedCalculate);
  observer.observe(containerRef.current);

  // Also listen to window resize to detect viewport width changes
  // This handles the case where sidebars hide/show via CSS media queries
  const handleWindowResize = () => {
    debouncedCalculate();
  };
  window.addEventListener('resize', handleWindowResize);

  // Initial calculation
  calculateSize();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', handleWindowResize);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, [enabled, containerRef, debouncedCalculate, calculateSize]);
```

### Change 4: Update Game.tsx Desktop Styles

**File: `src/components/Game.tsx`** (lines 8667-8678)

Remove the transition on width/height that causes the shrinking animation:

```typescript
style={isMobileDevice ? {
  width: `${SCALED_CANVAS_WIDTH}px`,
  height: `${SCALED_CANVAS_HEIGHT}px`,
  transform: `scale(${gameScale})`,
  transformOrigin: "top center",
  transition: "transform 150ms ease-in-out",
} : {
  // Desktop: Size controlled by useCanvasResize hook on wide viewports
  // On narrow viewports (<769px), CSS handles it
  transformOrigin: "top center",
  // Remove transition to prevent shrinking animation during resize
}}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useCanvasResize.ts` | Add viewport width check (skip sizing < 769px), clear inline styles when narrow, add window resize listener |
| `src/index.css` | Update canvas rules to use `width: auto` instead of `100%` to prevent forced stretching |
| `src/components/Game.tsx` | Remove transition on desktop game-glow styles |

---

## Why This Fixes the Issue

1. **Viewport-aware hook**: The hook now checks `window.innerWidth` and skips imperatively setting dimensions when <769px
2. **Clears inline styles**: When transitioning to narrow viewport, the hook removes any previously set inline width/height, letting CSS take over
3. **No shrinking animation**: Removing the transition prevents the visible shrinking effect
4. **CSS handles narrow viewports**: Standard CSS rules manage layout when sidebars are hidden

---

## Test Checklist

1. Wide desktop (>1200px): Frame fills viewport, canvas maximizes space
2. Medium desktop (769px-1200px): Frame fills viewport, sidebars slightly smaller
3. Narrow desktop (<769px): Sidebars hidden, canvas still visible and not clipping
4. Resize from wide to narrow: Smooth transition, no shrinking animation
5. Resize from narrow to wide: Canvas expands properly
6. Full playable area visible at all widths
7. Mouse/paddle controls accurate at all sizes
8. Mobile device: Unchanged behavior

