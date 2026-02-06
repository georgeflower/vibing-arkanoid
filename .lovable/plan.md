

# Center All Text Overlays (Remove Coordinate Dependencies)

## Summary
Modify the `BossPowerUpTimer` component to display its timer text centered in the playable area rather than positioned relative to the paddle coordinates.

## Current State

### Components Already Centered (No Changes Needed)
| Component | Current Positioning |
|-----------|-------------------|
| `GetReadyOverlay.tsx` | ✓ Centered with `flex items-center justify-center` |
| `BossVictoryOverlay.tsx` | ✓ Centered with `flex items-center justify-center` |
| `BossRushVictoryOverlay.tsx` | ✓ Centered with `flex items-center justify-center` |
| `BossRushStatsOverlay.tsx` | ✓ Centered with `flex items-center justify-center` |

### Component Requiring Changes
| Component | Current Issue |
|-----------|--------------|
| `BossPowerUpTimer.tsx` | Uses `paddleX` and `paddleY` for absolute positioning relative to paddle |

### Special Case (No Change Recommended)
| Component | Reason to Keep Coordinates |
|-----------|---------------------------|
| `TutorialOverlay.tsx` | Uses coordinates for **spotlight highlight** feature - intentionally points at game elements to teach players. This is not "text positioning" but "element highlighting" for tutorial purposes. |

## Important Note
The `BossPowerUpTimer` component is currently **not imported or used anywhere** in the codebase. It appears to be orphaned code. We have two options:
1. **Delete it** - If not needed
2. **Refactor it** - To be centered, ready for future use

I will refactor it to be centered so it's ready if you want to use it later.

---

## Changes to Make

### File: `src/components/BossPowerUpTimer.tsx`

**Before (Current - Paddle-based positioning):**
```typescript
interface BossPowerUpTimerProps {
  label: string;
  endTime: number;
  duration: number;
  paddleX: number;
  paddleY: number;
  canvasWidth: number;
  isMobile?: boolean;
}

// Uses absolute positioning with paddleX, paddleY
const leftPos = isMobile ? paddleX - 10 : paddleX + 50;
const topPos = isMobile ? paddleY - 22 : paddleY - 35;

return (
  <div style={{ left: `${leftPos}px`, top: `${topPos}px`, ... }}>
    {label}: {seconds}s
  </div>
);
```

**After (Centered - No coordinate dependencies):**
```typescript
interface BossPowerUpTimerProps {
  label: string;
  endTime: number;
  duration: number;
}

// Uses flexbox centering
return (
  <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
    <div style={{ transform: `scale(${scale})`, color, ... }}>
      {label}: {seconds}s
    </div>
  </div>
);
```

### Props Removed
- `paddleX` - No longer needed
- `paddleY` - No longer needed  
- `canvasWidth` - No longer needed
- `isMobile` - No longer needed (same layout for all devices)

### Styling Kept
- Color transition (yellow → orange → red)
- Pulse animation that speeds up as time runs low
- Retro pixel text styling with glow

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/BossPowerUpTimer.tsx` | Remove coordinate props, center using flexbox |

---

## Expected Behavior After Change

The `BossPowerUpTimer` component will:
1. Display centered in the playable area (when used)
2. Show the timer label with countdown in seconds
3. Transition color from yellow → orange → red as time expires
4. Pulse faster as time gets low
5. Work consistently across all screen sizes without coordinate math

---

## What About TutorialOverlay?

The `TutorialOverlay` uses coordinates for its **spotlight/highlight feature** - this is intentional and serves a specific purpose:
- It creates a visual "spotlight" effect that points at game elements
- The coordinates are needed to draw the spotlight circle around power-ups, bosses, etc.
- The tutorial **text** itself is already positioned dynamically (not at fixed coordinates)

This is different from "positioning text near the paddle" - it's "highlighting game elements for teaching purposes". **No changes recommended** for TutorialOverlay.

