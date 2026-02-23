

# Fix Mobile Power-Up Timers Position -- Use Dynamic State for Gap Height

## Problem
The current fixed-position overlay computes `height` from `gameAreaRef.current.getBoundingClientRect().top` directly during render. This ref read happens only once and produces a stale (likely 0) value because the DOM layout hasn't settled yet when the component first renders. The timers therefore appear at the top of the screen instead of centered in the grey gap.

## Solution
Track the grey gap height in a **state variable** that updates whenever the layout changes (resize, orientation change). Use a `useEffect` + `ResizeObserver` on `gameAreaRef` to continuously measure `getBoundingClientRect().top` and store it in state. This ensures the fixed overlay's height is always correct and responsive.

## Technical Changes

**File: `src/components/Game.tsx`**

1. **Add a new state variable** near the other state declarations:
   ```tsx
   const [mobileGapHeight, setMobileGapHeight] = useState(0);
   ```

2. **Add a useEffect** that measures the gap on mount, resize, and layout changes:
   ```tsx
   useEffect(() => {
     if (!isMobileDevice || !gameAreaRef.current) return;
     const update = () => {
       const rect = gameAreaRef.current?.getBoundingClientRect();
       if (rect) setMobileGapHeight(rect.top);
     };
     update();
     window.addEventListener('resize', update);
     const ro = new ResizeObserver(update);
     ro.observe(gameAreaRef.current);
     return () => {
       window.removeEventListener('resize', update);
       ro.disconnect();
     };
   }, [isMobileDevice]);
   ```

3. **Update the overlay container** (lines 7995-8011) to use `mobileGapHeight` instead of the inline ref read, and only render when the height is positive:
   ```tsx
   {isMobileDevice && mobileGapHeight > 0 && (
     <div style={{
       position: 'fixed',
       top: 0,
       left: 0,
       right: 0,
       height: `${mobileGapHeight}px`,
       zIndex: 40,
       display: 'flex',
       flexDirection: 'column',
       alignItems: 'center',
       justifyContent: 'center',
       gap: '2px',
       pointerEvents: 'none',
     }}>
       {/* ...existing timer spans and bonus letter text unchanged... */}
     </div>
   )}
   ```

This ensures the overlay height is always measured from the actual DOM position of the game area, keeping timers centered in the grey gap above the canvas on all mobile devices and orientations.

