

# Extend Drop Shadow Optimization to Balls, Bullets, and Effects

## Overview

After the enemy/boss/bomb pass, there are still ~30+ `shadowBlur` assignments on balls, bullets, power-ups, shields, and visual effects. This pass removes them from the hot paths while preserving visual fidelity through the existing `drawDropShadow` helper and simpler alternatives.

## Changes -- all in `src/engine/canvasRenderer.ts`

### 1. Ball rendering (lines 397-620)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Main ball shadow** (line 524-537) | `ctx.shadowBlur = 14 + chaosLevel * 20` on every ball every frame | Call `drawDropShadow(ctx, ball.x, ball.y, visualRadius*2, visualRadius*2)` once before drawing the ball circle. Remove `shadowBlur`/`shadowColor` assignments. |
| **Fireball outer glow** (line 572-578) | `ctx.shadowBlur = 10` for the fireball aura circle | Remove `shadowBlur`. The radial gradient fill at 25% opacity already conveys the aura. |
| **Homing trail glow** (line 592-593) | `ctx.shadowBlur = 15` on the homing indicator circle | Remove `shadowBlur`. The red semi-transparent circle is sufficient. |
| **Launch indicator** (line 608-609) | `ctx.shadowBlur = 10` on the dashed aim line | Remove `shadowBlur`. The bright colored dashed line is already clearly visible. |
| **Get Ready glow** (line 420-421) | `ctx.shadowBlur = 15 * opacity` | Remove -- the radial gradient fill already provides the glow effect. |
| **Ball release highlight** (line 453-454) | `ctx.shadowBlur = 25 * glowOpacity` | Remove -- again the gradient fill handles the visual. |
| **Danger ball glow** (line 301-308) | `ctx.shadowBlur = 35` gated by `glowEnabled` | Replace with `drawDropShadow` before the ball draw. |
| **"CATCH!" text glow** (line 370-374) | `ctx.shadowBlur = 10` on text | Remove -- yellow/orange text on dark background is already readable. |
| **Paddle highlight glow** (line 386-388) | `ctx.shadowBlur = 20` on the paddle-highlight rect | Remove `shadowBlur`. The pulsing stroke is sufficient. |
| **Chaos-aware glow** (line 484-500) | Radial gradient fill (no `shadowBlur`) | No change needed -- already efficient. |

### 2. Bullet rendering (lines 730-790)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Super bounced bullet** (line 735) | `ctx.shadowBlur = 20` | Remove. Bright colored rect is clear enough. |
| **Super bullet** (line 754) | `ctx.shadowBlur = 15` | Remove. |
| **Bounced bullet** (line 762) | `ctx.shadowBlur = 10` | Remove. |
| **Normal bullet** (line 766) | `ctx.shadowBlur = 8` | Remove. |
| **Clear at end** (line 770) | `ctx.shadowBlur = 0` | Remove (no longer needed). |
| **DANGER text** (line 786-787) | `ctx.shadowBlur = 15 * finalScale` | Remove. Red text is readable without blur. |

### 3. Bullet impacts (lines 793-841)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Impact rings** (line 806-807) | `ctx.shadowBlur = 15/8` per ring | Remove. The colored stroke rings + radial gradient flash already look good without blur. |
| **Clear at end** (line 841) | `ctx.shadowBlur = 0` | Remove. |

### 4. Power-up rendering (lines 623-728)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Tutorial highlight glow** (line 640-641) | `ctx.shadowBlur = glowIntensity` (pulsing 10-30) | Remove. Use a simple bright stroke instead of blur to indicate highlighting. |
| **Outline shadow** (line 701-717) | `ctx.shadowBlur = 4` for a subtle depth effect | Remove. The dark stroke color already provides depth. |

### 5. Paddle rendering (lines 258-274)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Paddle glow** (line 260-264, 267-272) | `ctx.shadowBlur = 12` gated by `shadowsEnabled` | Replace with `drawDropShadow(ctx, paddle.x + paddle.width/2, paddle.y + paddle.height/2, paddle.width, paddle.height)` called once before drawing. |

### 6. Shield effects (lines 844-945)

| Location | Current | Replacement |
|----------|---------|-------------|
| **Low quality shield** (line 853-870) | `ctx.shadowBlur = 8` | Remove. Yellow stroke is visible without blur. |
| **Medium/high shield layers** (line 878-879) | `ctx.shadowBlur = 20-15-10` per layer (3 blur passes) | Remove. The layered strokes with varying alpha already convey depth. |
| **Electrical arcs** (line 909-910) | `ctx.shadowBlur = 8` per arc (6 arcs = 6 blur passes) | Remove. Bright yellow strokes are visible without blur. |
| **End clear** (line 945) | `ctx.shadowBlur = 0` | Remove. |

### 7. Brick rendering (line 247)

Already just `ctx.shadowBlur = 0` (a reset). Will remove as unnecessary once all upstream shadowBlur calls are gone.

## What stays unchanged

- The `drawDropShadow` helper added in the previous pass (reused here)
- Chaos-aware radial gradient glow on balls (already blur-free)
- CRT overlay (separate concern)

## Estimated impact

- Removes ~30 additional `shadowBlur` assignments from the per-frame hot path
- Bullets alone could fire 6+ per frame with turrets active -- each was triggering a Gaussian blur
- Shield with electrical arcs was doing 9+ blur passes per frame
- Combined with the enemy/boss pass, this eliminates virtually all `shadowBlur` from gameplay rendering

## Files changed

| File | Change |
|------|--------|
| `src/engine/canvasRenderer.ts` | Remove ~30 `shadowBlur` calls from ball, bullet, power-up, paddle, shield, and impact rendering; replace with `drawDropShadow` where a shadow is visually needed |

