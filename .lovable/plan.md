
## Goal
Make the “GET READY!” overlay independent of ball / canvas coordinates by removing the ball highlight entirely and centering the “GET READY!” text within the playable area (the scaled `.game-glow` container) on all devices.

This eliminates any coordinate mismatch problems because the overlay will no longer attempt to line up with the ball.

---

## What I found in the codebase
- `src/components/GetReadyOverlay.tsx` currently:
  - Requires `ballPosition`, `canvasWidth`, `canvasHeight`
  - Returns `null` when `ballPosition` is missing
  - Positions a glow and text using `left/top` (desktop) and renders centered text only on mobile
- `src/components/Game.tsx` renders the overlay like this:
  - `getReadyActive && balls.length > 0` then passes `ballPosition={{ x: balls[0].x, y: balls[0].y }}` plus `canvasWidth/canvasHeight`
- The overlay is already rendered inside the `.game-glow` container, which is the correct “playable area” coordinate space.

---

## Implementation approach
### A) Simplify `GetReadyOverlay` to “centered text only”
**File:** `src/components/GetReadyOverlay.tsx`

Changes:
1. **Remove ball/canvas coordinate props**
   - Update `GetReadyOverlayProps` to only keep what’s needed:
     - `onComplete: () => void`
     - (Optionally keep `isMobile?: boolean`, but it becomes unnecessary if we use the same centered layout everywhere.)
2. **Remove all highlight + coordinate math**
   - Delete:
     - `if (!ballPosition) return null;`
     - `ringX/ringY/textY/ringRadius/glowSize` calculations
     - The desktop “Ball glow effect” `<div>`
     - The desktop absolute-positioned floating text
3. **Render a single centered overlay for all devices**
   - Use a single layout:
     - Wrapper: `absolute inset-0 z-[150] pointer-events-none flex items-center justify-center`
     - Centered “GET READY!” text with existing retro styling
   - Keep the existing mount / fade / scale animation behavior and the 3-second progress timer that calls `onComplete()`.

Result: The overlay always centers in the playable area; no dependency on ball position.

---

### B) Update the call site in `Game.tsx`
**File:** `src/components/Game.tsx`

Changes:
1. Update the render condition:
   - From: `getReadyActive && balls.length > 0`
   - To: `getReadyActive`
   - Reason: centered overlay no longer depends on the ball existing.
2. Update the component props:
   - Remove `ballPosition`, `canvasWidth`, `canvasHeight` props (and `isMobile` if removed from the component).
   - Keep `onComplete` exactly as-is (it already correctly ends the sequence and restores speed multiplier).

---

## Edge cases / considerations
- This change will intentionally remove any “highlight the ball” visuals. The overlay becomes purely informational.
- Because it no longer depends on `balls[0]`, it will still show even if the balls array is temporarily empty during transitions (which is desirable for a simple centered message).
- TypeScript: removing props requires updating both the props interface and every `GetReadyOverlay` usage to avoid compile errors.

---

## Files to change
1. `src/components/GetReadyOverlay.tsx`
   - Remove coordinate-based logic and glow highlight
   - Center “GET READY!” text for all devices
   - Simplify props
2. `src/components/Game.tsx`
   - Update the `GetReadyOverlay` render condition and props passed

---

## Verification checklist (what you should see after implementation)
1. Finish any level (normal mode) → “GET READY!” appears centered in the playable area.
2. Boss Rush: defeat boss → stats overlay → Continue → next stage loads → “GET READY!” centered.
3. Confirm there is **no ball glow / highlight** anymore.
4. Confirm the text is centered consistently on:
   - Desktop windowed
   - Desktop fullscreen
   - Mobile fullscreen mode

---

## Optional follow-up (not required for this request)
If you later want a highlight again without coordinate bugs, we can reintroduce it using a single source of truth for render-space coordinates (e.g., passing a “render-space transform” down from the same logic that sizes the canvas). But for now, the simplest reliable fix is removing coordinate coupling entirely as requested.
