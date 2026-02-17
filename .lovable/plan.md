

# Update Changelog and What's New with Engine Migration Info

## Overview

Add player-friendly descriptions of the engine migration (game state moved out of React into a dedicated game engine) to the changelog entries and the What's New screen. The language should explain the *benefits* players experience, not the technical internals.

## Changes

### 1. `src/constants/version.ts`

Add three new changelog entries before the existing v0.9.7 entry and update the version to `0.9.91`:

**v0.9.91 -- Smoother Gameplay**
- "Performance boost: reduced heavy visual effects (glow and shadows) for smoother gameplay on all devices"
- "Game engine overhaul: game physics and entities now run in a dedicated high-speed engine, separate from the user interface"
- "This means fewer stutters, more consistent frame rates, and snappier controls -- especially during intense boss fights and explosions"
- "The paddle, ball, and all on-screen objects now update at full speed without being slowed down by screen updates"

**v0.9.9 -- Boss Rush Flow**
- "Fixed: clicking 'Continue' on the Boss Rush results screen no longer accidentally launches the ball"
- "You now get a proper moment to aim before sending the ball at the next boss"

**v0.9.8 -- Boss Rush Stats Fix**
- "Fixed: Boss Rush results screen now correctly appears when you defeat a boss with turret shots"
- "Previously, turret kills would skip the stats screen and jump straight to the next boss"

### 2. `src/components/MainMenu.tsx` -- What's New screen

Replace the current What's New content (Mega Boss and Boss Rush from older versions) with updated content covering v0.9.8--v0.9.91:

**Section 1: "Faster, Smoother Engine" (highlight color)**
- The entire game engine has been rebuilt under the hood
- All game objects (ball, paddle, bricks, enemies, bosses) now run in a dedicated high-speed engine
- Result: less lag, fewer frame drops, and more responsive controls
- Heavy glow and shadow effects trimmed for consistently smooth gameplay

**Section 2: "Boss Rush Improvements" (secondary color)**
- Stats screen now always appears after defeating a boss (including turret kills)
- Ball no longer auto-launches when dismissing the results screen

Keep the existing "View Full Changelog" and "Back to Menu" buttons unchanged.

### Files changed
- `src/constants/version.ts` -- Update version to 0.9.91, add 3 new changelog entries
- `src/components/MainMenu.tsx` -- Refresh What's New screen content

