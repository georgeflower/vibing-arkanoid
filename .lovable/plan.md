
# Retro-ify the Mega Boss, Danger Balls, and Missiles

## The Problem

The Mega Boss (level 20), its danger balls, and the rocket/missile attacks use smooth radial gradients, photographic images, and realistic visual effects (smoke particles, flame gradients, specular highlights). This clashes with the rest of the game's retro aesthetic, where bosses and enemies use flat HSL-colored polygon faces with hard edges and minimal shading.

## What Changes

### 1. Danger Balls -- Flat-shaded with hard edges

**Current:** Smooth radial gradient spheres with specular highlights, pulsing glow rings, Unicode symbols, and "CATCH!" text labels.

**New style:**
- Replace radial gradients with flat solid fill + a single darker border stroke (matching how boss projectiles like `pyramidBullet` and regular `bomb` are drawn)
- Keep the red/green color distinction (red = incoming, green = reflected/homing)
- Replace the smooth gradient with a two-tone flat fill: a solid base color and a small offset highlight circle (same pattern as regular bombs at line 2028)
- Keep the flashing effect but use alternating flat colors (like the angry enemy blink pattern) instead of gradient transitions
- Remove the dashed "guide line" to paddle -- replace with a simple flashing arrow indicator
- Keep the "CATCH!" text but use the monospace pixel font consistently

### 2. Missile/Rocket Attacks -- Geometric retro rocket

**Current:** Uses a `missile.png` photo image, realistic smoke trail particles with random wobble, and smooth flame gradients.

**New style:**
- Remove the `missile.png` image usage entirely -- draw a simple geometric rocket shape using flat-colored polygons (same approach as the pyramid enemy/boss projectiles)
- Replace the realistic smoke trail with 3-4 simple shrinking circles in alternating grey tones (no random wobble, no per-frame noise)
- Replace the smooth flame gradient with a simple flat orange/yellow triangle or diamond behind the rocket body
- Use hard polygon edges and flat HSL fills matching the existing retro projectile style

### 3. Mega Boss Body -- Flat-shaded hexagon faces

**Current:** Smooth radial gradient fill for the hexagon, smooth gradient for inner octagon shield, smooth gradient for the core.

**New style:**
- Replace the radial gradient hexagon fill with flat HSL solid color, matching how the cube boss uses `hsl(baseHue, 80%, lightness%)` per face
- Draw the hexagon as 6 individual triangular segments (center to each edge) with slightly different lightness values per segment -- this mirrors the cube boss's per-face shading approach
- Replace the inner octagon's radial gradient with a flat fill + pulsing stroke (keep the pulse but remove the gradient)
- Replace the core's radial gradient with a flat solid fill that alternates on a timer (like the angry enemy blink), bordered by a hard stroke
- Keep vertex detail circles but use flat fills instead of gradients

### 4. Mega Boss Cannon -- Flat geometric barrel

**Current:** Linear gradient barrel with a glowing muzzle circle gradient.

**New style:**
- Replace the barrel's linear gradient with a flat dark fill + lighter border stroke (two-tone flat shading like the cube boss faces)
- Replace the muzzle glow gradient with a simple flat colored circle that blinks

## Files Changed

| File | What Changes |
|---|---|
| `src/engine/canvasRenderer.ts` | Danger ball rendering (lines 340-443): replace gradients with flat fills |
| `src/engine/canvasRenderer.ts` | Rocket attack rendering (lines 2058-2111): replace image + smoke with geometric shapes |
| `src/engine/canvasRenderer.ts` | `drawMegaBoss` function (lines 2439-2618): replace all gradients with flat HSL fills |

## Technical Details

All changes are in `src/engine/canvasRenderer.ts` only. No game logic, physics, or asset loading changes needed.

**Rendering patterns to follow** (from the existing cube boss renderer):
- Flat `hsl(hue, saturation%, lightness%)` fills per polygon face
- `ctx.strokeStyle = hsl(hue, 90%, 70%)` for edge highlights
- `ctx.lineWidth = 2-3` for borders
- Shadow helpers (`drawCircleShadow`, `drawHexShadow`, `drawPolygonShadow`) kept as-is
- No `createRadialGradient` or `createLinearGradient` calls
- Blinking/angry effects use `Math.floor(now / interval) % 2` pattern for hard alternation

**Performance benefit:** Removing gradient creation per frame and the missile image draw will slightly reduce GPU load, which helps on mobile.
