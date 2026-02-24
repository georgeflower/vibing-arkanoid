
# Increase Dual Power-Up Spacing

## Change
Increase the gap between paired power-ups from **1.5x** paddle width (~165px) to **2.5x** paddle width (~275px), giving the player more room to decide which power-up to catch.

## Technical Detail
In `src/hooks/usePowerUps.ts` line 113, change:
```
const gap = PADDLE_WIDTH * 1.5;
```
to:
```
const gap = PADDLE_WIDTH * 2.5;
```

The existing wall-clamping logic (lines 118-125) already handles edge cases, so no other changes are needed.

## Files Modified
- `src/hooks/usePowerUps.ts` -- one line change (gap multiplier)
