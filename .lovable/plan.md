

# Move Mobile Power-Up Timers and Bonus Letter Overlay to Top

## Problem
On mobile, the power-up timer text (STUN, REFLECT, MAGNET, FIREBALL) and the bonus letter tutorial text ("Catch all letters for megabonus!") appear **below** the game canvas area. The user wants them in the **top section** -- the gap between the top HUD bar and the game canvas, as highlighted in the screenshot.

## Solution
Move the two mobile-only overlay blocks from their current position (after the game canvas container at lines 8166-8253) to just **before** the `metal-main-content` div (before line 7493). This places them in the space between the title bar / HUD and the game area.

## Changes

**File: `src/components/Game.tsx`**

1. **Remove** the mobile power-up timers block (lines 8166-8220) and mobile bonus letter tutorial block (lines 8222-8253) from their current position below the game canvas container.

2. **Insert** both blocks right before the `{/* Main Content with Side Panels */}` comment (before line 7492), inside the `metal-frame` div but above the game area:
   - Mobile Power-Up Timers: the existing flexbox div with STUN/REFLECT/MAGNET/FIREBALL timers
   - Mobile Bonus Letter Tutorial: the existing "Catch all letters for megabonus!" text

This is a pure move of existing JSX -- no logic changes, no style changes. The flexbox `justify-center` layout already centers these elements horizontally, and placing them before the game canvas in the DOM flow will naturally position them in the top area.

