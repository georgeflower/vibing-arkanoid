

# Dual Power-Up: Tighter Gap, "PICK ONE!" Text, and Alternating Dim Effect

## Overview
Three changes to make the dual power-up choice feel more engaging and obvious:
1. Reduce the gap from 2.0x to 1.75x paddle width
2. Replace "VS" text with "PICK ONE!" in a larger, more attention-grabbing style
3. Add a low-cost alternating dim effect where one power-up dims while the other is bright, toggling every second

## Changes

### 1. Gap reduction (`src/hooks/usePowerUps.ts`)
- Line 113: change `PADDLE_WIDTH * 2.0` to `PADDLE_WIDTH * 1.75`

### 2. Replace "VS" with "PICK ONE!" (`src/engine/canvasRenderer.ts`)
- In the dual-choice connector block (lines 801-806), replace `"VS"` with `"PICK ONE!"`
- Increase font size from `12px` to `bold 14px monospace`
- Keep the existing golden color scheme

### 3. Alternating dim effect (`src/engine/canvasRenderer.ts`)
- In the power-up drawing loop (around line 672), add a dim check for dual-choice power-ups
- Use `Math.floor(now / 1000) % 2` to determine which half of each pair is dimmed (toggles every 1 second, zero allocations)
- The dimmed power-up gets `globalAlpha = 0.35`, the bright one stays at full opacity
- To determine which one dims: compare `pu.id < pu.pairedWithId` -- one half gets dimmed on even seconds, the other on odd seconds
- This uses only the existing `now` timestamp and a single modulo + comparison -- no new objects, no new state

## Technical Details

### Dim logic (zero-allocation)
```typescript
// Inside the power-up forEach, after the `ctx.save()` line:
if (powerUp.isDualChoice && powerUp.pairedWithId !== undefined) {
  const isFirst = powerUp.id! < powerUp.pairedWithId;
  const phase = Math.floor(now / 1000) % 2; // 0 or 1, toggles each second
  const dimmed = isFirst ? phase === 0 : phase === 1;
  if (dimmed) ctx.globalAlpha = 0.35;
}
```

This adds one branch per dual-choice power-up per frame (typically 0-2 items) -- negligible cost.

## Files Modified
- `src/hooks/usePowerUps.ts` -- gap multiplier 2.0 to 1.75
- `src/engine/canvasRenderer.ts` -- "PICK ONE!" text + alternating dim effect

