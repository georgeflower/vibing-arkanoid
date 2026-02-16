

# Remove Shadow Effects: Cap Quality to Medium

## Overview

Make "medium" the maximum quality level by default, disabling the high-quality shadow/glow effects on enemies and bosses. Add a single constant toggle so high quality can be easily re-enabled later.

## Changes

### 1. Add constant in `src/constants/game.ts`

Add a new flag:

```typescript
// Set to true to re-enable high quality rendering (glow, extra shadows)
export const ENABLE_HIGH_QUALITY = false;
```

### 2. Cap quality in `src/hooks/useAdaptiveQuality.ts`

- Import `ENABLE_HIGH_QUALITY` from the constants file
- Change default `initialQuality` from `'high'` to `ENABLE_HIGH_QUALITY ? 'high' : 'medium'`
- In the `updateFps` auto-adjust logic, cap `targetQuality` so it never exceeds `'medium'` when `ENABLE_HIGH_QUALITY` is false
- In `setManualQuality`, clamp to `'medium'` when the flag is off
- In `resetQualityLockout`, reset to capped initial quality

This approach is clean because all glow/shadow checks in `GameCanvas.tsx` already use `qualitySettings.glowEnabled`, which is `false` for medium quality. No changes needed in `GameCanvas.tsx` or any rendering code.

### 3. Cap quality in call sites

- `src/components/Game.tsx` line 1598: Change `initialQuality: "high"` to `initialQuality: ENABLE_HIGH_QUALITY ? "high" : "medium"`
- `src/components/MainMenu.tsx` line 58: Same change

## Technical Details

### Why this works without touching rendering code

The `QUALITY_PRESETS` already define:
- **medium**: `glowEnabled: false`, `shadowsEnabled: true`
- **high**: `glowEnabled: true`, `shadowsEnabled: true`

All boss/enemy shadow effects in `GameCanvas.tsx` are gated behind `qualitySettings.glowEnabled`. By capping the quality level to `medium`, `glowEnabled` will always be `false`, which disables all the extra shadow/glow rendering on bosses, enemies, particles, and boss attacks.

### Re-enabling high quality

Simply set `ENABLE_HIGH_QUALITY = true` in `src/constants/game.ts`. No other changes needed.

### Files changed
- `src/constants/game.ts` -- Add `ENABLE_HIGH_QUALITY` constant
- `src/hooks/useAdaptiveQuality.ts` -- Import constant, cap quality level
- `src/components/Game.tsx` -- Use capped initial quality
- `src/components/MainMenu.tsx` -- Use capped initial quality
