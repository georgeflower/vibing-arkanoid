

# Retro-ify Danger Ball Sounds, Add Core-Hit Screen Shake, and Pixelate Rendering

## Changes

### 1. Darker, More Menacing Danger Ball Sounds (`src/utils/sounds.ts`)

**Spawn sound** (currently `playBounce` at line 4740 of Game.tsx):
- Replace with a new `playDangerBallSpawn()` method: deep square-wave burst at ~60Hz with a short sawtooth screech at ~150Hz -- dark, ominous Amiga-style warning tone

**Catch/reflect sound** (`playDangerBallCatch`, lines 180-216):
- Replace the bright metallic ping (1200Hz triangle) with a darker, heavier sound: low square-wave thud at ~100Hz with a short distorted sawtooth sweep from 300Hz down to 80Hz -- feels like catching something heavy and dangerous

**Core hit sound** (`playDangerBallCoreHitSound`, lines 1300-1345):
- Replace the "electric crackle + high sparkle" with a deeper, more impactful sound: heavy bass square-wave at 50Hz dropping to 25Hz (longer 0.4s decay), layered with a distorted sawtooth crunch at 180Hz, and a delayed low rumble instead of the sparkly sine at 2000Hz
- Remove the `setTimeout` sparkle layer -- replace with a second bass hit at 40Hz for a double-punch feel

### 2. Screen Shake on Core Hit (`src/components/Game.tsx`)

At line 4987 (where `playDangerBallCoreHitSound` is called after a danger ball hits the core):
- Add `triggerScreenShake(6, 300)` -- a moderate 300ms shake to emphasize the core impact
- This uses the existing `triggerScreenShake` helper already available in Game.tsx

### 3. Pixelated Amiga-Style Danger Ball Rendering (`src/engine/canvasRenderer.ts`)

Replace the smooth arc-based circle rendering (lines 340-435) with a chunky pixel-art style:

- **Octagonal shape instead of circle**: Draw an 8-sided polygon (octagon) approximating a circle, giving the classic Amiga "low-polygon circle" look. Hard edges, no anti-aliasing feel
- **Stepped color bands**: Instead of a single flat fill, draw 2 concentric octagons with different lightness values (outer darker, inner lighter) to simulate Amiga-era dithered shading
- **Chunky cross symbol**: Replace the Unicode star/arrow with a simple pixel-cross drawn using 5 small filled rectangles (like a plus sign made of 3x3 pixel blocks) -- more Amiga-authentic than font-rendered symbols
- **Blocky border**: Use `ctx.lineWidth = 3` with `ctx.lineJoin = "miter"` for sharp polygon corners instead of the smooth arc stroke
- Keep the flashing color alternation (red/green, alt-phase) and the "CATCH!" text
- Keep the arrow indicator and paddle highlight as-is

### 4. Update Spawn Sound Call (`src/components/Game.tsx`)

At line 4740, replace `soundManager.playBounce()` with `soundManager.playDangerBallSpawn()`.

## Files Changed

| File | What Changes |
|---|---|
| `src/utils/sounds.ts` | Rewrite `playDangerBallCatch`, `playDangerBallCoreHitSound`; add new `playDangerBallSpawn` -- all darker/heavier |
| `src/components/Game.tsx` | Add `triggerScreenShake(6, 300)` on core hit; change spawn sound call |
| `src/engine/canvasRenderer.ts` | Replace arc-based danger ball with octagonal pixel-art rendering |

