

# Center Mobile Power-Up Timers and Bonus Letter Overlay Above Game Canvas

## Problem
The mobile power-up timers (STUN, REFLECT, MAGNET, FIREBALL) and the bonus letter tutorial text are currently in the normal document flow before the game canvas. This causes them to appear at the absolute top of the screen and push the canvas down.

## Solution
Move both blocks back inside the `game-glow` container (which has `position: relative`) and position them as absolute overlays at the top of the game canvas, centered both horizontally and vertically within a top strip. This follows the existing overlay positioning architecture where overlays live inside the game-glow div.

## Changes

**File: `src/components/Game.tsx`**

1. **Remove** the mobile power-up timers block (lines 7492-7546) and mobile bonus letter tutorial block (lines 7548-7579) from their current position before `metal-main-content`.

2. **Insert** both blocks inside the `game-glow` div (after the canvas ref, around line 7610+), as absolute-positioned overlays:

   - **Power-Up Timers**: Wrap in a `div` with `position: absolute`, `top: 8px`, `left: 0`, `right: 0`, `z-index: 50`. Use `flex flex-col items-center gap-1` so multiple active timers stack vertically (each on its own line, centered).

   - **Bonus Letter Tutorial**: Same absolute positioning pattern, placed just below the timers area (`top: ~40px` or use a shared wrapper).

   - Alternatively, wrap both in a single container div:
     ```jsx
     <div style={{
       position: 'absolute',
       top: '8px',
       left: 0,
       right: 0,
       zIndex: 50,
       display: 'flex',
       flexDirection: 'column',
       alignItems: 'center',
       gap: '2px',
       pointerEvents: 'none',
     }}>
       {/* Each timer as its own row */}
       {/* Bonus letter text as last row */}
     </div>
     ```

3. **Change timer layout** from horizontal (`flex gap-3`) to vertical (`flex-col gap-1`) so when multiple timers are active, they stack below each other instead of side-by-side.

This approach:
- Keeps overlays inside the scaled game-glow container (matching the project's overlay architecture)
- Centers them horizontally over the game canvas
- Stacks multiple timers vertically
- Does not affect document flow or push the canvas down
- Only applies to mobile (`isMobileDevice` guard remains)

