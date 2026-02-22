

# Mega Boss Phase 2 Cross Attacks, Phase 3 Speed + Music-Reactive Background

## Overview

Two major additions to the Mega Boss fight:
1. **Phase 2**: Add the pyramid's "cross" attack balls that stop, change direction, and merge into crossBall enemies (and further into large spheres) -- reusing the existing cross attack system
2. **Phase 3**: Increase movement speed and make the background pulse/blink in different hue colors synced to the boss music via a Web Audio API AnalyserNode

---

## 1. Cross Attack in Phase 2

### Config Changes
**File: `src/constants/megaBossConfig.ts`**
- Add `cross` to Phase 2 and Phase 3 attack weights
- Phase 2: `{ shot: 0.20, sweepTurret: 0.20, hatchSalvo: 0.15, laser: 0.15, cross: 0.15, super: 0.15 }`
- Phase 3: `{ sweepTurret: 0.20, shot: 0.15, phaseBurst: 0.15, laser: 0.15, cross: 0.15, super: 0.10, hatchSalvo: 0.10 }`

### Attack Implementation
**File: `src/utils/megaBossAttacks.ts`**
- Add `'cross'` to the `MegaBossAttackType` union
- Add a new `performCrossAttack` function that fires 3 cross projectiles in a cone toward the paddle (same pattern as pyramid boss in `bossAttacks.ts`)
- Import `ATTACK_PATTERNS` from `bossConfig.ts` to use the same cross config (speed, size, cone angle, course change intervals)
- Add the `cross` case to the switch in `performMegaBossAttack`

### Existing Cross Logic Already Works
The cross projectile course-change logic (stopping, direction changes, danger zone checks) and the cross-to-crossBall merge system in `Game.tsx` (lines 5628-5830) already work for any boss -- they filter by `attack.type === "cross"` regardless of boss type. No changes needed there.

---

## 2. Phase 3: Faster Movement

### Config Changes
**File: `src/constants/megaBossConfig.ts`**
- Increase `veryAngryMoveSpeed` from `4.0` to `5.5`

This value is already used in `Game.tsx` for Phase 3 movement, so no other code changes needed for speed.

---

## 3. Phase 3: Music-Reactive Background Hue Blinking

### Sound Manager -- Add AnalyserNode
**File: `src/utils/sounds.ts`**
- Add a private `analyser: AnalyserNode | null` field and a `frequencyData: Uint8Array` buffer
- In `playBossMusic()`, route the boss music HTMLAudioElement through a `MediaElementAudioSource` -> `AnalyserNode` -> `destination` using the existing AudioContext
- Add a public `getFrequencyData(): Uint8Array | null` method that calls `analyser.getByteFrequencyData()` and returns the data array
- Add a public `getBassEnergy(): number` method that returns a 0-1 value based on the average of the first ~8 frequency bins (bass/beat detection)
- Clean up analyser in `stopBossMusic()`

### World State -- Add backgroundHue
**File: `src/engine/state.ts`**
- Add `backgroundHue: number` field to `GameWorld` (default `0`)
- Add to `WORLD_DEFAULTS` and `resetWorld`

### Game Loop -- Update Background Hue
**File: `src/components/Game.tsx`**
- In the mega boss Phase 3 section (near swarm spawning logic around line 4893), read `soundManager.getBassEnergy()`
- When bass energy exceeds a threshold (e.g., 0.4), cycle `world.backgroundHue` by jumping to a new random hue (0-360)
- Use a simple cooldown (e.g., 100ms) to avoid changing every frame

### Renderer -- Draw Hue-Tinted Background
**File: `src/engine/canvasRenderer.ts`**
- After drawing the level 20 boss background image (line 231), check if the boss is in Phase 3 (via `world.boss` mega boss state)
- Add a new field `backgroundHue` to `GameWorld` reads
- If `backgroundHue > 0` and level is 20, overlay a translucent `hsl(backgroundHue, 80%, 50%)` fill with `globalCompositeOperation: "overlay"` at ~0.25 opacity
- This creates a pulsing colored tint that shifts hue with the music beats

---

## Technical Details

### Files Changed

| File | Changes |
|---|---|
| `src/constants/megaBossConfig.ts` | Add `cross` to phase 2/3 weights; increase `veryAngryMoveSpeed` to 5.5 |
| `src/utils/megaBossAttacks.ts` | Add `cross` to attack type; add `performCrossAttack` function; add case to switch |
| `src/utils/sounds.ts` | Add AnalyserNode, `getFrequencyData()`, `getBassEnergy()` methods |
| `src/engine/state.ts` | Add `backgroundHue` field |
| `src/engine/canvasRenderer.ts` | Render hue-tinted overlay on level 20 Phase 3 |
| `src/components/Game.tsx` | Update `backgroundHue` from bass energy in Phase 3 game loop |

