

# Shape-Matched Shadows with Top-Left Lighting

## Overview

Currently, all entities (balls, paddle, bosses, enemies) share a single `drawDropShadow` helper that draws a generic dark ellipse directly below them. The goal is to replace this with shape-specific shadows that match each entity's actual silhouette, offset toward the bottom-right to simulate light coming from the top-left corner.

## Shadow Offset Convention

- Light source: top-left corner
- Shadow offset: `+offsetX` (right), `+offsetY` (down)
- Default offset: `(4, 4)` pixels -- tunable per entity size
- Shadow color: `rgba(0, 0, 0, 0.35)` (unchanged)

## Changes in `src/engine/canvasRenderer.ts`

### 1. Replace the generic `drawDropShadow` helper

The current ellipse-based helper (lines 93-103) will be replaced with a **set of shape-specific shadow functions**:

**`drawCircleShadow(ctx, x, y, radius, offsetX, offsetY)`**
- For: balls, sphere enemies, sphere boss, crossBall enemies, danger balls
- Draws a filled circle at `(x + offsetX, y + offsetY)` with the same radius

**`drawRectShadow(ctx, x, y, width, height, offsetX, offsetY)`**
- For: paddle (both image and fallback), turrets, lasers, bombs
- Draws a filled rectangle at `(x + offsetX, y + offsetY)` with the same dimensions

**`drawPolygonShadow(ctx, points, offsetX, offsetY)`**
- For: pyramid boss, pyramid enemies, boss attacks (diamond/triangle shapes)
- Takes an array of `[x, y]` points, draws the same polygon offset by `(offsetX, offsetY)`

**`drawProjectedFacesShadow(ctx, projectedVertices, faces, offsetX, offsetY)`**
- For: cube boss, cube enemies (3D projected shapes)
- Takes the already-projected vertex array and face index lists, draws the convex hull / outer silhouette offset

**`drawHexShadow(ctx, radius, rotation, offsetX, offsetY)`**
- For: mega boss hexagon body
- Draws the same hexagonal shape offset

A backward-compatible `drawDropShadow` wrapper will remain for minor entities (rockets, bombs) where an ellipse is acceptable, but updated with the `(+4, +4)` offset instead of only `(0, +4)`.

### 2. Ball shadows (lines 505-507)

Currently:
```typescript
drawDropShadow(ctx, 0, 0, visualRadius * 2, visualRadius * 2);
```
Replace with:
```typescript
drawCircleShadow(ctx, 4, 4, visualRadius);
```
This draws a circle shadow offset bottom-right from the ball center.

### 3. Paddle shadow (lines 259-266)

Currently uses ellipse shadow centered on paddle. Replace with:
```typescript
drawRectShadow(ctx, paddle.x + 4, paddle.y + 4, paddle.width, paddle.height);
```
The shadow will be the same rectangular shape as the paddle, offset 4px right and down.

### 4. Sphere enemies (lines 1636-1638) and crossBall enemies (lines 1536-1538)

Replace ellipse with:
```typescript
drawCircleShadow(ctx, centerX + 4, centerY + 4, radius);
```

### 5. Cube enemies (lines 1795-1797)

After computing `projected` vertices and `sortedFaces`, draw the shadow by rendering all face polygons offset by `(+4, +4)` in shadow color before drawing the actual faces:
```typescript
drawProjectedFacesShadow(ctx, projected, sortedFaces, 4, 4);
```

### 6. Pyramid enemies (lines 1717-1719)

Same approach -- use the projected vertices to draw the triangular faces offset:
```typescript
drawProjectedFacesShadow(ctx, projected, sortedFaces, 4, 4);
```

### 7. Cube boss (line 2225)

Replace the ellipse with projected-face shadow using the same vertex/face data already computed:
```typescript
drawProjectedFacesShadow(ctx, projected, sortedFaces, 5, 5);
```
(Slightly larger offset for bosses since they're bigger entities.)

### 8. Sphere boss (line 2257)

Replace with:
```typescript
drawCircleShadow(ctx, 5, 5, radius);
```

### 9. Pyramid boss (line 2142)

The pyramid boss is drawn with a simple triangle path. Draw the same triangle offset:
```typescript
// Shadow triangle
ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
ctx.beginPath();
ctx.moveTo(5, -size + 5);
ctx.lineTo(size + 5, size + 5);
ctx.lineTo(-size + 5, size + 5);
ctx.closePath();
ctx.fill();
```

### 10. Mega boss (lines 2346-2348)

Replace with `drawHexShadow` that traces the same hexagonal path offset by `(5, 5)`.

### 11. Minor entities (bombs, rockets, boss attacks)

Keep using a simple offset shape:
- Round bombs/projectiles: `drawCircleShadow`
- Rectangular lasers: `drawRectShadow`  
- Diamond boss attacks: offset the same diamond path

## New helper functions (added near line 93)

```typescript
function drawCircleShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  alpha: number = 0.35,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawRectShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  alpha: number = 0.35,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(x, y, width, height);
}

function drawPolygonShadow(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  offsetX: number, offsetY: number,
  alpha: number = 0.35,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(points[0][0] + offsetX, points[0][1] + offsetY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] + offsetX, points[i][1] + offsetY);
  }
  ctx.closePath();
  ctx.fill();
}

function drawProjectedFacesShadow(
  ctx: CanvasRenderingContext2D,
  projected: number[][],
  faces: { indices: number[] }[],
  offsetX: number, offsetY: number,
  alpha: number = 0.35,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  faces.forEach(face => {
    ctx.beginPath();
    ctx.moveTo(projected[face.indices[0]][0] + offsetX,
               projected[face.indices[0]][1] + offsetY);
    face.indices.forEach(i => {
      ctx.lineTo(projected[i][0] + offsetX, projected[i][1] + offsetY);
    });
    ctx.closePath();
    ctx.fill();
  });
}

function drawHexShadow(
  ctx: CanvasRenderingContext2D,
  radius: number,
  offsetX: number, offsetY: number,
  alpha: number = 0.35,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius + offsetX;
    const y = Math.sin(angle) * radius + offsetY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
```

## Shadow offset constants

| Entity type | Offset (x, y) |
|-------------|---------------|
| Ball | (4, 4) |
| Paddle | (4, 4) |
| Enemy (all types) | (4, 4) |
| Boss (cube/sphere/pyramid) | (5, 5) |
| Mega boss | (5, 5) |
| Bombs/projectiles | (3, 3) |
| Boss attacks | (3, 3) |

## Also update `tutorialEntityRenderer.ts`

The tutorial renderer in `src/utils/tutorialEntityRenderer.ts` uses `ctx.shadowBlur` for some boss shapes (sphere, pyramid). These will be updated to use the same shape-matched shadow approach for visual consistency.

## Performance notes

- Shape-matched shadows use the same path operations already being computed for the entities themselves -- no additional geometric computation
- For 3D-projected faces (cube boss/enemies), the shadow reuses the already-computed `projected` vertex array
- No `ctx.shadowBlur` used (per project convention)
- The shadow is drawn once per entity as a single fill operation

## Files changed

| File | Change |
|------|--------|
| `src/engine/canvasRenderer.ts` | Replace `drawDropShadow` with shape-specific shadow helpers; update all ~20 call sites |
| `src/utils/tutorialEntityRenderer.ts` | Replace `ctx.shadowBlur` usage with shape-matched shadow rendering |

