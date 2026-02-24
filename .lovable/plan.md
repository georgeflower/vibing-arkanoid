
# Dual Power-Up Choice System

## Overview
When a brick drops a power-up, there's a chance (roughly 25%) that instead of one power-up, two different power-ups drop side by side. The player must choose which one to catch -- catching one automatically destroys the other. This creates a strategic "risk vs. reward" moment every few bricks.

## How It Works
- When a power-up brick is destroyed, there's a 25% chance it spawns a "choice pair" instead of a single drop
- Two different power-up types appear side by side, falling together at the same speed
- They spawn offset left and right from the brick center (about 35px apart)
- A subtle visual connector (glowing line or "VS" text) links them so the player knows they're paired
- When the paddle catches one, the other instantly deactivates (fades out or pops)
- If both fall off-screen, neither is collected (normal behavior)

## Technical Details

### 1. Extend the PowerUp interface (`src/types/game.ts`)
Add two optional fields:
- `pairedWithId?: number` -- the ID of the other power-up in the pair
- `isDualChoice?: boolean` -- flag for rendering the visual connector

### 2. Update `createPowerUp` in `src/hooks/usePowerUps.ts`
- Add a new function `createDualChoicePowerUps(brick)` that:
  - Picks two different power-up types using weighted random (re-rolling if same type)
  - Creates two power-ups offset left (-35px) and right (+35px) from brick center
  - Sets `pairedWithId` on each to point to the other
  - Sets `isDualChoice: true` on both
- Modify `createPowerUp` to return `PowerUp | PowerUp[] | null`:
  - For regular brick drops: 25% chance to call `createDualChoicePowerUps` instead
  - Boss minion and enemy drops remain single power-ups (no dual choice during boss fights)

### 3. Update collision handling in `checkPowerUpCollision` (`src/hooks/usePowerUps.ts`)
- When a power-up with `pairedWithId` is caught, find and deactivate the paired power-up in the same pass
- The paired power-up gets `active: false` so it's cleaned up next frame

### 4. Update the renderer (`src/engine/canvasRenderer.ts`)
- In the power-up drawing section, detect pairs (`isDualChoice` flag)
- Draw a subtle glowing "VS" text or a connecting line between paired power-ups
- Add a slight highlight/glow differentiating the two choices

### 5. Update `assignPowerUpsToBricks` (`src/utils/powerUpAssignment.ts`)
- Mark some assigned bricks as "dual choice" bricks (roughly 25% of power-up bricks)
- Store a second power-up type for those bricks in a separate map (`dualChoiceAssignments`)
- Pass this map through to `usePowerUps` so `createPowerUp` knows which bricks get dual drops

### 6. Wire it up in `Game.tsx`
- Pass the dual choice assignments map alongside the existing `powerUpAssignments`
- Handle the case where `createPowerUp` returns an array (two power-ups) by adding both to the power-ups list

### Files to modify:
- `src/types/game.ts` -- add `pairedWithId` and `isDualChoice` to PowerUp
- `src/utils/powerUpAssignment.ts` -- add dual choice selection logic
- `src/hooks/usePowerUps.ts` -- create pairs, handle paired collection
- `src/engine/canvasRenderer.ts` -- render the visual connector between pairs
- `src/components/Game.tsx` -- pass dual assignments, handle array returns
