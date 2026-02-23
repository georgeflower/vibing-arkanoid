

# Simplify Mobile Timers: Position 80px Above Game Canvas Top

## Problem
Multiple attempts to position the timers in the grey gap using fixed overlays with dynamic measurement have failed -- the timers are invisible, likely because `mobileGapHeight` stays at 0 or the fixed container doesn't render correctly.

## Solution
Revert the complex fixed-overlay approach entirely. Instead, place the timer block back into the `game-glow` container using simple `absolute` positioning with a negative `top` offset (`top: -80px`). Since `game-glow` already has `position: relative`, an absolute child with negative top will appear 80px above the canvas -- exactly in the grey gap.

## Technical Changes

**File: `src/components/Game.tsx`**

1. **Remove `mobileGapHeight` state** (line 490):
   Delete `const [mobileGapHeight, setMobileGapHeight] = useState(0);`

2. **Remove the `useEffect` measuring gap** (lines 1092-1107):
   Delete the entire `ResizeObserver` + resize listener block.

3. **Replace the overlay container** (lines 8014-8127):
   Change from `position: fixed` with `mobileGapHeight` to `position: absolute` with `top: -80px`:

   ```tsx
   {isMobileDevice && (
     <div
       style={{
         position: 'absolute',
         top: '-80px',
         left: 0,
         right: 0,
         zIndex: 50,
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         justifyContent: 'center',
         gap: '2px',
         pointerEvents: 'none',
       }}
     >
       {/* ...all existing timer spans and bonus letter text unchanged... */}
     </div>
   )}
   ```

   The key change:
   - `position: 'fixed'` becomes `position: 'absolute'`
   - `height: mobileGapHeight` is removed
   - `top: 0` becomes `top: '-80px'`
   - The `mobileGapHeight > 0` guard is removed (no longer needed)

This keeps the block inside `game-glow` (which is `position: relative`), so `top: -80px` places it 80 pixels above the canvas top edge, right in the grey gap. No measurement, no ResizeObserver, no stale refs.

