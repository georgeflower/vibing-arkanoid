

# Boss Rush Lives, Godlike No Extra Lives, and Faster Victory Overlay

## Changes

### 1. Boss Rush starting lives: 5 -> 3
**File: `src/constants/bossRushConfig.ts`**
- Change `startingLives: 5` to `startingLives: 3`

### 2. Godlike mode: no extra life on boss defeat
**File: `src/components/Game.tsx`**
Three locations grant +1 life on boss defeat. Each needs a godlike guard:

| Location | Boss type | Current code | New code |
|---|---|---|---|
| Line 1480 | All pyramids defeated | `setLives((prev) => prev + 1)` | Wrap in `if (settings.difficulty !== "godlike")` |
| Line 1779 | Generic `handleBossDefeat` (cube, sphere) | `setLives((prev) => prev + 1)` | Wrap in `if (settings.difficulty !== "godlike")` |
| Line 4783 | Mega Boss defeated | `setLives((prev) => prev + 1)` | Wrap in `if (settings.difficulty !== "godlike")` |

The toast messages and BossVictoryOverlay "Extra Life granted!" text will also be conditionally adjusted so godlike players don't see misleading extra-life messaging.

### 3. BossVictoryOverlay: auto-close after 2 seconds instead of 4
**File: `src/components/BossVictoryOverlay.tsx`**
- Change `setTimeout(() => { onComplete(); }, 4000)` to `2000`
- Optionally hide the "Extra Life granted!" line when difficulty is godlike (requires passing a prop)

### 4. BossVictoryOverlay: conditionally hide "Extra Life granted!"
**File: `src/components/BossVictoryOverlay.tsx`**
- Add an optional `showExtraLife?: boolean` prop (default `true`)
- Only render the "Extra Life granted!" div when `showExtraLife` is true

**File: `src/components/Game.tsx`**
- Pass `showExtraLife={settings.difficulty !== "godlike"}` to `<BossVictoryOverlay>`

## Files Changed

| File | What changes |
|---|---|
| `src/constants/bossRushConfig.ts` | `startingLives: 3` |
| `src/components/BossVictoryOverlay.tsx` | Auto-close 4s -> 2s; add `showExtraLife` prop to conditionally hide "Extra Life granted!" |
| `src/components/Game.tsx` | Guard all 3 boss-defeat `setLives(+1)` calls with `settings.difficulty !== "godlike"`; pass `showExtraLife` prop; update toast messages for godlike |

