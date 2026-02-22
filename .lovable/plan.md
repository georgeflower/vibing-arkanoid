
# Mega Boss Overhaul: Sound, HP Bars, Spikes, Dynamic Movement, and Tech-Style Visuals

## 1. Subtle Higher-Pitch Danger Ball Spawn Sound

**File: `src/utils/sounds.ts`** -- `playDangerBallSpawn()` method (lines 211-239)

Replace the current deep 60Hz square-wave burst + 150Hz sawtooth screech with a more subtle, higher-pitched sound:
- Short sine ping at ~800Hz with fast decay (0.08s), low volume (0.08)
- Tiny triangle chirp at ~1200Hz, 0.05s duration -- quick "blip" feel
- Much quieter overall (volume 0.08-0.1 vs current 0.2-0.3)

## 2. Separate HP Meter Per Phase

**File: `src/engine/canvasRenderer.ts`** -- Health bar section (lines 2635-2656)

Currently only Phase 1 shows a health bar. Expand to show a distinct HP bar for all 3 phases:
- Phase 1: Purple bar showing `outerShieldHP / outerShieldMaxHP` (current behavior, kept)
- Phase 2: Orange bar showing `innerShieldHP / innerShieldMaxHP` with "PHASE 2" label
- Phase 3: Red bar showing `innerShieldHP / innerShieldMaxHP` with "PHASE 3" label
- Add phase indicator pips below the bar: 3 small squares, filled based on current phase (e.g., all 3 empty in Phase 1, first filled in Phase 2, first two filled in Phase 3)
- During danger ball phase (trappedBall exists): show a secondary thin bar below for `coreHitsFromDangerBalls / dangerBallsToComplete` in yellow with "CORE HITS" label

The condition `if (megaBoss.corePhase === 1 && !megaBoss.outerShieldRemoved)` will be expanded to always render (remove the phase-1-only guard).

## 3. Rotating Spikes on Phase 2 and Phase 3

**File: `src/engine/canvasRenderer.ts`** -- inside `drawMegaBoss` function (lines 2458-2656)

Add animated spike protrusions around the hexagon for Phases 2 and 3:

- **Phase 2**: 6 triangular spikes extending outward from each hexagon vertex, rotating with the boss. Each spike is a flat-shaded triangle (darker hue than the face it extends from). Spike length = `radius * 0.35`. Spikes rotate with `hexRotation`.
- **Phase 3**: 12 spikes (6 from vertices + 6 from edge midpoints), slightly longer (`radius * 0.45`). The 6 midpoint spikes pulse in/out using a sine wave (`Math.sin(now / 300) * 0.15 + 0.85` scale factor) for menacing movement.
- Spikes drawn as simple triangles: base = 12px wide at the hexagon edge, tip pointing outward. Flat HSL fill with a lighter stroke border.

Since `outerShieldRemoved` is true in phases 2/3, spikes are drawn in place of the outer shield hexagon faces. The inner octagon shield still renders as before.

## 4. Dynamic Boss Movement Speed

**File: `src/components/Game.tsx`** -- Boss movement section (lines 4562-4591)
**File: `src/constants/megaBossConfig.ts`** -- Add speed variation config

Add speed variation to the Mega Boss movement between positions:

In `megaBossConfig.ts`, add:
```
speedVariationMin: 0.6,  // Multiplier for slow bursts
speedVariationMax: 1.6,  // Multiplier for fast bursts
speedChangeInterval: 800, // ms between speed changes
```

In `Game.tsx` boss movement (line 4565-4578), for mega boss type, apply a time-based speed multiplier:
- Use `Math.sin(now / speedChangeInterval) * 0.5 + 1.0` to oscillate between 0.5x and 1.5x base speed
- Layer a second sine wave at a different frequency for less predictable feel: `Math.sin(now / 1300) * 0.3`
- Combined: `moveSpeed * (1.0 + Math.sin(now / 800) * 0.35 + Math.sin(now / 1300) * 0.2)`
- This makes the boss sometimes lunge quickly and sometimes drift slowly, without any state tracking needed

## 5. Tech-Style Speedball 2 / Turrican 2 Inspired Visuals

**File: `src/engine/canvasRenderer.ts`** -- `drawMegaBoss` function

Transform the Mega Boss from a simple flat hexagon into a more detailed, tech-heavy design inspired by Speedball 2 and Turrican 2's metallic, segmented, riveted aesthetic:

### Hexagon Faces (Phase 1, lines 2483-2541)
- Keep the 6 triangular face segments but add "panel lines": draw a thin inner stroke (1px, slightly darker) at 80% of each triangle's size, creating a beveled panel look
- Add 2 small "rivet" dots per face (tiny 2px filled circles at fixed positions along each triangle edge) -- uses flat HSL fills, no gradients
- Change vertex detail circles to hexagonal bolts: small flat hexagons instead of circles, with a darker center fill
- Use a metallic blue-grey palette: `hsl(210, 25%, lightness%)` instead of the current `hsl(baseHue, 60%, lightness%)` for Phase 1 -- more steel/chrome feel

### Inner Octagon (Phase 2/3, lines 2544-2562)
- Add segmented panel lines: 8 inner lines radiating from center to each octagon vertex (thin 1px strokes)
- Add a small tech glyph at center: a simple crosshair made of 4 short lines

### Core
- Add concentric ring detail: a second smaller circle inside the core at 60% radius with alternating fill
- Add 4 small tick marks around the core perimeter (like a targeting reticle) -- flat short lines at 0, 90, 180, 270 degrees

### Cannon (lines 2604-2632)
- Add panel segmentation: 2 horizontal lines across the barrel dividing it into 3 sections
- Add a small rectangular "exhaust port" detail on each side of the barrel (2px wide darker rectangles)

### Overall Color Shifts
- Phase 1: Steel blue-grey `hsl(210, 25%, ...)` -- cold, technical
- Phase 2: Warm amber-bronze `hsl(35, 40%, ...)` -- heated, angry tech
- Phase 3: Deep red-chrome `hsl(355, 35%, ...)` -- critical, dangerous tech

## Files Changed

| File | Changes |
|---|---|
| `src/utils/sounds.ts` | Rewrite `playDangerBallSpawn` to be subtle + higher pitch |
| `src/engine/canvasRenderer.ts` | HP bars for all phases; spikes for Phase 2/3; tech-style panel/rivet details on hexagon, core, cannon; concentric core rings |
| `src/components/Game.tsx` | Dynamic speed multiplier for mega boss movement |
| `src/constants/megaBossConfig.ts` | Add speed variation config values |
