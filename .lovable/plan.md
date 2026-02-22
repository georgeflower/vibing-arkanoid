

# Fix Remaining Rocket Gradient + Verify Retro Changes

## Status of Previous Changes

The previous edit successfully retro-ified:
- Danger balls -- now use flat HSL fills with hard borders and alternating blink colors
- Mega boss hexagon -- now drawn as 6 flat-shaded triangular face segments
- Mega boss core, inner octagon, cannon -- all flat fills, no gradients

These only appear at level 20, so they may not have been visible during testing.

## What Still Needs Fixing

The **rocket/missile** projectile (lines 1958-2011) still uses two `createLinearGradient` calls:
1. **Flame gradient** (line 1965): smooth orange-to-transparent gradient behind the rocket
2. **Body gradient** (line 1976): metallic grey gradient across the rocket body

## Changes

### File: `src/engine/canvasRenderer.ts` (lines 1958-2011)

Replace the rocket rendering block:

**Flame** -- Replace the linear gradient flame with a flat orange/yellow triangle using hard alternation:
- Flat `hsl(30, 100%, 55%)` fill triangle behind the rocket
- Alternating frame color between orange and yellow (same `Math.floor(now / interval) % 2` pattern)

**Body** -- Replace the metallic gradient with a flat two-tone polygon:
- Flat `hsl(0, 0%, 80%)` fill for the body
- `hsl(0, 0%, 60%)` stroke border (2px)

**Nose cone and fins** -- Keep the existing flat red fills (these are already retro-correct)

**Smoke trail** -- The current code has no explicit smoke trail in this section (it was already minimal), so no changes needed there.

This removes the last two gradient calls from the mega boss attack system, completing the retro-ification.

