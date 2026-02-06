
# Center Power-Up Timers and Bonus Letter Text (Remove Coordinate Dependencies)

## Summary
Make the desktop power-up timer displays and bonus letter tutorial text independent of paddle/letter coordinates by centering them in the playable area, matching how mobile versions already work.

---

## Current State

### Elements Already Centered (No Changes Needed)
| Element | Location | Current Positioning |
|---------|----------|-------------------|
| Mobile Power-Up Timers | Lines 9585-9639 | Centered with `flex justify-center items-center gap-3` |
| Mobile Bonus Letter Text | Lines 9641-9672 | Centered with `flex justify-center` |

### Elements Requiring Changes
| Element | Location | Current Issue |
|---------|----------|--------------|
| Desktop Power-Up Timers | Lines 8946-9024 | Uses `paddle.x`, `paddle.y` for absolute positioning |
| Desktop Bonus Letter Text | Lines 9026-9063 | Uses `letter.x`, `letter.y` for absolute positioning |

---

## Implementation Approach

### A) Desktop Power-Up Timers - Center in Playable Area

**File:** `src/components/Game.tsx` (lines 8946-9024)

**Current (Paddle-relative positioning):**
```typescript
<div className="absolute pointer-events-none" style={{ ... }}>
  {bossStunnerEndTime && ... && (
    <div className="absolute retro-pixel-text" style={{
      left: `${paddle.x + paddle.width / 2}px`,
      top: `${paddle.y - 45}px`,
      ...
    }}>
      STUN: {seconds}s
    </div>
  )}
  {/* Similar for REFLECT, MAGNET, FIREBALL */}
</div>
```

**After (Centered with flexbox):**
```typescript
<div className="absolute inset-0 pointer-events-none z-[100] flex flex-col items-center justify-center gap-2">
  {bossStunnerEndTime && ... && (
    <div className="retro-pixel-text" style={{
      transform: `scale(${1 + Math.sin(Date.now() * 0.04) * 0.1})`,
      color: `hsl(...)`,
      textShadow: `0 0 10px currentColor`,
      fontSize: "14px",
      fontWeight: "bold",
    }}>
      STUN: {seconds}s
    </div>
  )}
  {/* Similar for REFLECT, MAGNET, FIREBALL */}
</div>
```

**Changes:**
- Remove the fixed-dimension wrapper div
- Replace with `absolute inset-0 flex flex-col items-center justify-center gap-2`
- Remove `left` and `top` style properties from each timer
- Remove `translateX(-50%)` from transform (no longer needed when centered)
- Slightly increase font size for better visibility in center

---

### B) Desktop Bonus Letter Floating Text - Center in Playable Area

**File:** `src/components/Game.tsx` (lines 9026-9063)

**Current (Letter-relative positioning):**
```typescript
<div className="absolute inset-0 pointer-events-none z-[150]">
  {(() => {
    const letter = bonusLetters[0];
    ...
    return (
      <div className="absolute retro-pixel-text text-center whitespace-nowrap" style={{
        left: `${letter.x + letter.width / 2}px`,
        top: `${letter.y - 35}px`,
        transform: `translateX(-50%) scale(${zoomScale})`,
        ...
      }}>
        Catch all letters for megabonus!
      </div>
    );
  })()}
</div>
```

**After (Centered with flexbox):**
```typescript
<div className="absolute inset-0 pointer-events-none z-[150] flex items-center justify-center">
  {(() => {
    const elapsed = Date.now() - bonusLetterFloatingText.startTime;
    const duration = 4000;
    if (elapsed >= duration) { ... }
    ...
    return (
      <div className="retro-pixel-text text-center whitespace-nowrap" style={{
        transform: `scale(${zoomScale})`,
        color: "hsl(48, 100%, 60%)",
        textShadow: "0 0 10px hsl(48, 100%, 60%), 0 0 20px hsl(48, 100%, 50%)",
        fontSize: "16px",
        fontWeight: "bold",
        opacity,
      }}>
        Catch all letters for megabonus!
      </div>
    );
  })()}
</div>
```

**Changes:**
- Add `flex items-center justify-center` to wrapper div
- Remove `left` and `top` style properties
- Remove `translateX(-50%)` from transform
- Remove the `letter` variable reference (no longer needed)
- Remove the `bonusLetters.length > 0` condition since we only need the text, not the letter position

---

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| `src/components/Game.tsx` | 8946-9024 | Center desktop power-up timers using flexbox |
| `src/components/Game.tsx` | 9026-9063 | Center desktop bonus letter text using flexbox |

---

## Expected Behavior After Changes

1. **Desktop Power-Up Timers:**
   - STUN, REFLECT, MAGNET, FIREBALL timers appear centered in the playable area
   - Stacked vertically with small gap between them
   - Pulse animation and color transition preserved
   - Do not move when paddle moves

2. **Desktop Bonus Letter Text:**
   - "Catch all letters for megabonus!" appears centered in the playable area
   - Zoom animation and fade in/out preserved
   - Does not follow the falling letter

3. **Mobile (unchanged):**
   - Already works correctly with centered positioning

---

## Visual Reference

```text
Before (paddle-following):
┌────────────────────────────┐
│        BOSS                │
│                            │
│                            │
│                            │
│                            │
│          STUN: 3.2s        │ ← Follows paddle
│        [paddle]            │
└────────────────────────────┘

After (centered):
┌────────────────────────────┐
│        BOSS                │
│                            │
│        STUN: 3.2s          │ ← Fixed center
│       REFLECT: 12.5s       │
│        MAGNET: 5.1s        │
│                            │
│        [paddle]            │
└────────────────────────────┘
```
