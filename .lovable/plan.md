# Homepage for Vibing Arkanoid

## Overview

Create a dedicated homepage at `/home` that presents the game with retro Amiga aesthetics, multiple content sections, a clear Arkanoid tribute, open-source callout with GitHub link, and a prominent "Play Now" button that navigates to the game at `/`.

## Routing Change

- Move the current game (Index.tsx) to remain at `/` (no change needed -- players go straight to the game)
- Add a new route `/home` for the homepage
- The homepage links to `/` to launch the game

## New File: `src/pages/Home.tsx`

A full scrollable page with retro Amiga styling using the existing design system (amiga-box, retro-pixel-text, metal-frame aesthetics, CRT effects). Sections:

### Hero Section

- Large title "VIBING ARKANOID" with retro gradient text
- Subtitle: "A loving tribute to the legendary Arkanoid"
- Start screen image as background/hero visual
- Prominent "PLAY NOW" button linking to `/`
- Amiga-style beveled border frame around the hero

### Section 1: "A Tribute to Arkanoid"

- Text explaining that this is a tribute to Taito's 1986 classic Arkanoid, one of the greatest breakout-style games ever made
- Acknowledge the original game's legacy and influence
- Styled with the amiga-box class and retro colors

### Section 2: "Gameplay"

- Overview of the 20 levels, boss battles on levels 5/10/15/20
- Power-ups showcase using the existing power-up images (powerup-fireball.png, powerup-multiball.png, etc.)
- Mention of special brick types, enemies, and the Q-U-M-R-A-N bonus letters
- Grid layout showing power-up icons with labels

### Section 3: "Rules"

- Controls (mouse, keyboard, mobile touch)
- Objective: break all bricks to advance
- Lives system, ball physics, paddle mechanics
- Difficulty modes (Normal vs Godlike)
- Game modes (Normal 20 levels vs Boss Rush)

### Section 4: "Best Tips"

- Strategic advice for new players
- Tips like: use paddle edges for sharp angles, prioritize multiball/fireball power-ups, learn boss attack patterns, collect Q-U-M-R-A-N letters for 5 extra lives, use turrets wisely on bosses, etc.
- Styled as retro "tip cards" with amiga-box styling

### Section 5: "Open Source"

- Clear statement that Vibing Arkanoid is open source
- Direct link to GitHub: [https://github.com/georgeflower/vibing-arkanoid](https://github.com/georgeflower/vibing-arkanoid)
- Invite contributions
- "Vibe coded" mention
- GitHub icon/link button

### Footer

- Created by Qumran
- Version number
- Link back to play

## Styling Approach

- Reuse existing CSS classes: `amiga-box`, `retro-pixel-text`, `metal-frame` aesthetics
- Dark background gradient matching the game: `from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)]`
- Section borders using the Amiga beveled ridge style
- Color palette from the game: `hsl(200,70%,50%)` cyan, `hsl(330,100%,65%)` pink, `hsl(30,100%,60%)` orange, `hsl(0,85%,55%)` red
- Press Start 2P font (already loaded globally)
- Scrollable page with smooth scrolling
- CRT overlay on the page for atmosphere
- Responsive: works on mobile and desktop

## Files Changed

- `src/pages/Home.tsx` -- New homepage component (new file)
- `src/App.tsx` -- Add `/home` route