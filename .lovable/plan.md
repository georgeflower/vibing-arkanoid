
## Goal
Make the playable area expand to the maximum possible size (towards the metal frames) while keeping the entire logical game area visible and preserving correct input mapping.

## What the screenshot indicates
- The **frame and game-area container are large**, but the **canvas itself is staying near its intrinsic size** (looks like ~850×650), leaving a lot of unused space.
- This happens because the current CSS sets the canvas to:
  - `width: auto !important; height: auto !important;`
  - For a `<canvas>`, `auto` typically means “use the element’s intrinsic size” (the `width`/`height` attributes), so it **won’t upscale** to fill its container.

## Root causes (2 interacting issues)
1. **Canvas is prevented from scaling up**
   - In `src/index.css` (desktop-fullscreen block), this rule forces the canvas to keep intrinsic size:
     ```css
     .metal-frame.desktop-fullscreen .game-glow canvas {
       width: auto !important;
       height: auto !important;
       ...
     }
     ```
   - Result: even if the parent gets bigger, the canvas does not expand.

2. **The hook’s computed sizing is being overridden**
   - In `src/index.css` (same block), `.game-glow` is forced to `width/height: 100% !important`, which can override the hook’s inline pixel sizing in some browsers/cascade situations:
     ```css
     .metal-frame.desktop-fullscreen .game-glow {
       width: 100% !important;
       height: 100% !important;
     }
     ```
   - This undermines the “gameGlow is aspect-ratio-sized by the hook” model.

## Intended sizing model (single source of truth)
- **Desktop wide (>= 769px):**
  - `useCanvasResize` sets the *container* (`.game-glow`) to the largest aspect-ratio-fitting pixel box inside `.metal-game-area`.
  - The canvas should then **fill that box** (`width: 100%; height: 100%`) so it scales up properly.
- **Desktop narrow (< 769px, sidebars hidden via CSS):**
  - Hook clears inline sizing (already implemented), and CSS should scale the canvas to fit available space using `object-fit: contain`.

## Changes to implement

### 1) Fix canvas scaling rules (most important)
**File:** `src/index.css`

**Change A (desktop-fullscreen):**
- Replace the current desktop-fullscreen canvas rule (`width/height: auto !important`) with “fill container” sizing:
  - `width: 100% !important; height: 100% !important; object-fit: contain;`
- This ensures the canvas can actually expand to match the available space.

**Why safe:**  
Because we still preserve aspect ratio via either:
- the hook-sized `.game-glow` (aspect-correct box), or
- `object-fit: contain` when `.game-glow` is not aspect-sized (narrow mode).

### 2) Stop overriding the hook’s inline width/height on desktop-fullscreen
**File:** `src/index.css`

**Change B (desktop-fullscreen .game-glow):**
- Remove `width: 100% !important; height: 100% !important;`
- Keep `display:flex`, centering, and optionally use non-`!important` constraints:
  - `max-width: 100%; max-height: 100%;`
- This lets inline `style.width/height = "${px}px"` from `useCanvasResize` win cleanly, restoring the “fill to frames” behavior you had before the sidebar-hide fix.

### 3) Make narrow desktop (viewport < 769px) still scale nicely (hook-disabled mode)
**File:** `src/index.css`

**Change C (<=768 rules):**
- Ensure `.game-glow` and the canvas have a clear “fill available” behavior when the hook clears inline sizing:
  - `.game-glow { width: 100%; height: 100%; }` (no `!important`)
  - Canvas: `width: 100%; height: 100%; object-fit: contain;`
- This prevents “intrinsic-size-only” behavior on narrow desktop widths too.

### 4) Remove desktop width/height transitions that can visually fight resizing (optional but recommended)
**File:** `src/components/Game.tsx`

Right now desktop `.game-glow` inline style includes:
```ts
transition: "width 150ms ease-in-out, height 150ms ease-in-out",
```
- Remove this transition for desktop to avoid any “laggy catch-up” feel during resizing. (You already confirmed shrinking stopped; this just reduces visual artifacts and makes ResizeObserver-driven updates feel steadier.)

### 5) Validation / debugging checkpoints (no permanent UI changes)
After the CSS changes, verify in DevTools:
- `.metal-game-area` is large (it is).
- `.game-glow` has inline width/height in px on desktop wide (>=769).
- `<canvas>` computed CSS shows `width: 100%` and `height: 100%` (not `auto`).

## Expected outcome
- On wide desktop, the playable area grows as much as physically possible between the side panels and inside the frames.
- On narrow desktop (<769px) with hidden side panels, the canvas still scales up/down to fit without clipping, because it will no longer be stuck at intrinsic size.
- Mobile behavior remains unchanged because the hook already exits early and mobile has its own scaling branch.

## Test checklist (quick)
1. Desktop wide (e.g. 1920×1080): canvas should expand close to the frames (minimal empty gray margin).
2. Resize down to just above 769px: still fills.
3. Resize below 769px (sidebars hidden): no shrinking bug, canvas still uses available area and shows full playable region.
4. Resize back above 769px: hook re-applies inline sizing; canvas expands again.
5. Verify paddle mouse alignment still correct (it should be, since mapping uses `getBoundingClientRect()`).

## Files involved
- `src/index.css` (primary fix)
- `src/components/Game.tsx` (optional: remove desktop width/height transition)
