

# Replace Enemy/Boss Glow with Drop Shadows

## Problem

The game uses `ctx.shadowBlur` (Gaussian blur) extensively for glow effects on enemies, bosses, bombs, and boss attacks. This is the **most expensive Canvas 2D operation** -- it scales with DPR squared, which explains why large-screen HP laptops running Edge at high resolution see sluggish gameplay. Telemetry confirms FPS drops to 36-48 even on early levels.

There are **471 shadowBlur assignments** in `canvasRenderer.ts`.

## Solution

Replace all `glowEnabled`-gated `ctx.shadowBlur` calls on enemies and bosses with a cheap **painted drop shadow** -- a dark semi-transparent ellipse/shape drawn beneath the entity. This has nearly zero GPU cost compared to the Gaussian blur.

## What Changes

### File: `src/engine/canvasRenderer.ts`

**1. Add a reusable shadow helper function** (top of file, near other helpers):

```typescript
function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  offsetY: number = 4
) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + offsetY, width * 0.45, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}
```

**2. Enemy drawing -- replace glow with shadow** in `drawEnemies()`:

For each enemy type (crossBall, sphere, pyramid, cube), replace:
```typescript
if (qualitySettings.glowEnabled) { ctx.shadowBlur = 25; ctx.shadowColor = baseColor; }
// ... draw ...
ctx.shadowBlur = 0;
```
With:
```typescript
if (qualitySettings.shadowsEnabled) {
  drawDropShadow(ctx, centerX, centerY, singleEnemy.width, singleEnemy.height);
}
// ... draw (no shadowBlur at all) ...
```

Affected locations (line numbers approximate):
- Line 1572: crossBall enemy glow
- Line 1671: sphere enemy glow
- Line 1752: pyramid enemy glow (inside face loop -- remove entirely, draw one shadow before faces)
- Line 1829: cube enemy glow (same -- inside face loop)

**3. Boss drawing -- replace glow with shadow** in `drawBoss()`:

Same pattern: find `shadowBlur` calls gated by `glowEnabled` in the boss rendering path and replace with `drawDropShadow` called once before the boss shape is drawn.

**4. Bomb drawing -- replace glow with shadow** in `drawBombs()`:

Replace `shadowBlur` on bomb types (pyramidBullet, rocket, default bomb) with the shadow helper.

### Total shadowBlur removals in this pass

Targeting only the enemy/boss/bomb glow paths (roughly 15-20 `shadowBlur` assignments). The ball, paddle, and UI glows remain unchanged for now.

## Performance Impact

- **Before**: Each enemy draws 1-6 faces, each triggering a Gaussian blur (cost scales with blur radius^2 x DPR^2). With 3 enemies on screen, that's 18+ blur passes per frame.
- **After**: One cheap `ctx.ellipse` fill per entity, zero blur passes. Estimated **5-15ms saved per frame** on high-DPI displays.

## Visual Result

Enemies and bosses will have a subtle dark shadow beneath them instead of a colored glow aura. This looks clean and retro-appropriate, and actually improves visual clarity of the entities against busy backgrounds.

## Files Changed

| File | Change |
|------|--------|
| `src/engine/canvasRenderer.ts` | Add `drawDropShadow` helper; replace ~20 `shadowBlur` glow calls in `drawEnemies`, `drawBoss`, `drawBombs` with shadow ellipses |

