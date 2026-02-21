

# Fix Boss Victory Overlay Not Auto-Closing

## Root Cause

The `onComplete` prop passed to `BossVictoryOverlay` is an inline arrow function:
```
onComplete={() => setBossVictoryOverlayActive(false)}
```
This creates a **new function reference on every render**. Since `onComplete` is in the `useEffect` dependency array (line 30), the effect re-runs and **resets the 2-second timer** on every frame — so it never fires.

## Fix

**File: `src/components/BossVictoryOverlay.tsx`**

Remove `onComplete` from the `useEffect` dependency array. The callback identity doesn't need to trigger a re-run — only `active` changing matters.

Change line 30 from:
```typescript
}, [active, onComplete]);
```
to:
```typescript
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [active]);
```

This is the minimal, correct fix. The timer starts once when `active` becomes `true`, fires `onComplete()` after 2 seconds, and won't be reset by re-renders.

No other files need to change.

