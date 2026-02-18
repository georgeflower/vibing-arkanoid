

# Cache Frequently-Used Gradients in canvasRenderer.ts

## Problem

The renderer creates ~130 gradient objects per frame via `createRadialGradient` / `createLinearGradient`. While many are position-dependent and cannot be cached directly, several categories use fixed geometry and static colors, making them ideal candidates for caching.

## Approach

Canvas gradients are defined in coordinate space. To cache them, we use a common technique: define gradients at the **origin** (0,0) and use `ctx.translate()` to position them. This lets us reuse the same gradient object across frames and across multiple entities of the same type.

## Cacheable Gradients

### 1. Ball body gradient (line 452) -- called per ball per frame
- Uses relative coordinates: `createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r)`
- Already drawn with `ctx.translate(ball.x, ball.y)` -- perfect for caching
- Two variants: normal (silver) and fireball (orange)
- Cache key: `ball_{normal|fireball}_{radius}`

### 2. Power-up metallic background (line 593) -- called per power-up per frame
- Fixed relative coordinates with static HSL color stops
- Already drawn translated -- can cache a single gradient per power-up size

### 3. Power-up rivet gradients (line 629) -- 4 per power-up per frame
- Fixed size (radius 3), static colors
- Can be cached as a single origin-centered gradient reused via translate

### 4. Specular highlight on enemies (line 1554)
- Fixed size relative to enemy radius, static white color stops
- Can cache per radius and reposition with translate

### 5. Danger ball gradient (line 249)
- Similar to ball gradient, position-dependent but can be origin-centered

## NOT Cacheable (dynamic opacity/position)

These gradients have frame-varying opacity or unique per-instance parameters and will remain as-is:
- Get-ready glow (opacity varies)
- Ball release highlight (pulse varies)
- Chaos glow (chaos level varies)
- Shield energy fill (pulse intensity varies)
- Shield/bullet impact flashes (progress-based fade)
- Second chance shockwave (expanding radius)
- Warning indicator glow (alpha varies)
- Boss intro spotlight (zoom varies)

## Technical Details

### Gradient Cache Module

Add a `gradientCache` object at module scope in `canvasRenderer.ts`:

```text
const gradientCache: Record<string, CanvasGradient> = {};
let cacheCtx: CanvasRenderingContext2D | null = null;
```

A helper function creates-or-returns cached gradients:

```text
function getCachedRadialGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  x0: number, y0: number, r0: number,
  x1: number, y1: number, r1: number,
  stops: [number, string][]
): CanvasGradient {
  if (cacheCtx !== ctx) {
    // Context changed (e.g. canvas resize) -- invalidate all
    for (const k in gradientCache) delete gradientCache[k];
    cacheCtx = ctx;
  }
  if (!gradientCache[key]) {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    stops.forEach(([offset, color]) => g.addColorStop(offset, color));
    gradientCache[key] = g;
  }
  return gradientCache[key];
}
```

A similar `getCachedLinearGradient` helper for linear gradients.

### Usage Pattern (Ball Example)

Before:
```text
ctx.translate(ball.x, ball.y);
const gradient = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
gradient.addColorStop(0.3, "hsl(0, 0%, 95%)");
gradient.addColorStop(0.7, ballColor);
gradient.addColorStop(1, "hsl(0, 0%, 60%)");
ctx.fillStyle = gradient;
```

After:
```text
ctx.translate(ball.x, ball.y);
ctx.fillStyle = getCachedRadialGradient(
  ctx, `ball_normal_${r}`,
  -r*0.3, -r*0.3, 0, 0, 0, r,
  [[0, "rgba(255,255,255,1)"], [0.3, "hsl(0,0%,95%)"], [0.7, ballColor], [1, "hsl(0,0%,60%)"]]
);
```

### Cache Invalidation

The cache is invalidated when:
- The canvas context changes (resize / remount) -- detected by comparing `cacheCtx`
- This is sufficient since gradient geometry is relative (origin-centered)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/engine/canvasRenderer.ts` | Edit | Add gradient cache helpers at module scope; replace ~40 gradient creation calls with cached lookups for balls, power-ups, rivets, enemy highlights, and danger balls |

## Impact

- Eliminates ~40-60 `createRadialGradient` / `createLinearGradient` calls per frame (depending on entity count)
- Zero per-frame allocations for cached gradients after the first frame
- Remaining ~70 gradients are truly dynamic (varying opacity/size) and stay as-is
- No visual changes -- identical rendering output

