// processBallCCD.ts
// Ready-to-paste TypeScript: swept-circle (CCD) per substep for Arkanoid-style ball
// Exports: processBallCCD, types
//
// UNITS EXPECTED:
// - ball.dx, ball.dy: px/sec (pixels per second)
// - dt: seconds (fraction of a second for the frame)
// - currentTick: integer frame counter (deterministic)
// - lastHitTick: integer frame counter

export type Vec2 = { x: number; y: number };

export type Ball = {
  id: number;
  x: number;
  y: number;
  dx: number; // px/sec
  dy: number; // px/sec
  radius: number;
  lastHitTick?: number; // optional integer tick for cooldowns
  isFireball?: boolean; // if true, passes through bricks without reflection
  // any other fields are preserved and returned
  [k: string]: any;
};

export type Brick = { id: number; x: number; y: number; width: number; height: number; visible: boolean };

export type Paddle = { id?: number; x: number; y: number; width: number; height: number; };

export type CollisionEvent = {
  t: number; // fraction of substep [0,1]
  normal: Vec2;
  objectType: 'wall' | 'brick' | 'paddle' | 'corner';
  objectId?: number | string;
  point: Vec2;
};

export type CCDConfig = {
  dt: number; // seconds for the full frame
  substeps: number; // PHYSICS_SUBSTEPS (adaptive)
  maxToiIterations?: number; // default 3
  epsilon?: number; // separation after collision
  minBrickDimension?: number; // used for safety clamp
  tilemapQuery?: (aabb: { x: number; y: number; w: number; h: number }) => Brick[]; // broadphase provider
  paddle?: Paddle;
  bricks?: Brick[];
  canvasSize?: { w: number; h: number }; // for walls
  currentTick?: number; // integer tick for cooldowns
  maxSubstepTravelFactor?: number; // fraction of minBrickDimension allowed per substep (default 0.9)
};

const vAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const vSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const vScale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const vDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const vLen = (a: Vec2): number => Math.hypot(a.x, a.y);
const normalize = (a: Vec2): Vec2 => { const L = vLen(a) || 1; return { x: a.x / L, y: a.y / L }; };
const reflect = (vel: Vec2, normal: Vec2): Vec2 => {
  const n = normalize(normal);
  const vn = vDot(vel, n);
  return vSub(vel, vScale(n, 2 * vn));
};

/*
Ray vs expanded AABB intersection (parametric)
Returns { tEntry, tExit, normal } where tEntry is earliest entry in [0,1] along ray from r0->r1
If no hit, returns null.
normal: the collision normal at entry (approx axis-aligned)
*/
function rayAABB(
  r0: Vec2,
  r1: Vec2,
  aabb: { x: number; y: number; w: number; h: number }
): { tEntry: number; tExit: number; normal: Vec2 } | null {
  const EPS = 1e-9;
  const dir = vSub(r1, r0);
  const invDirX = dir.x === 0 ? 1e12 : 1 / dir.x;
  const invDirY = dir.y === 0 ? 1e12 : 1 / dir.y;
  let tmin = (aabb.x - r0.x) * invDirX;
  let tmax = (aabb.x + aabb.w - r0.x) * invDirX;
  if (tmin > tmax) { const tmp = tmin; tmin = tmax; tmax = tmp; }
  let tymin = (aabb.y - r0.y) * invDirY;
  let tymax = (aabb.y + aabb.h - r0.y) * invDirY;
  if (tymin > tymax) { const tmp = tymin; tymin = tymax; tymax = tmp; }
  const entry = Math.max(tmin, tymin);
  const exit = Math.min(tmax, tymax);
  if (entry > exit || exit < 0 || entry > 1) return null;
  // determine normal: which axis gave entry (with epsilon for tie-breaking)
  let normal: Vec2 = { x: 0, y: 0 };
  if (Math.abs(tmin - tymin) < EPS) {
    // Tie - use direction magnitude to choose axis
    normal.x = Math.abs(dir.x) > Math.abs(dir.y) ? (invDirX < 0 ? 1 : -1) : 0;
    normal.y = Math.abs(dir.y) > Math.abs(dir.x) ? (invDirY < 0 ? 1 : -1) : 0;
  } else if (tmin > tymin) {
    normal.x = invDirX < 0 ? 1 : -1;
  } else {
    normal.y = invDirY < 0 ? 1 : -1;
  }
  return { tEntry: Math.max(0, entry), tExit: Math.min(1, exit), normal };
}

/*
Segment-to-circle (corner) check: returns t along segment [0,1] of closest approach where distance <= r
If intersects, returns { t, point, normal }
*/
function segmentCircleTOI(a: Vec2, b: Vec2, center: Vec2, r: number): { t: number; point: Vec2; normal: Vec2 } | null {
  const d = vSub(b, a);
  const f = vSub(a, center);
  const A = vDot(d, d);
  
  // Guard against zero-length segment (A === 0)
  if (A < 1e-12) {
    // Zero-length segment - treat as point-circle distance check
    const dist = vLen(f);
    if (dist <= r) {
      const normal = dist > 0.001 ? normalize(f) : { x: 0, y: 1 };
      return { t: 0, point: a, normal };
    }
    return null;
  }
  
  const B = 2 * vDot(f, d);
  const C = vDot(f, f) - r * r;
  const disc = B * B - 4 * A * C;
  
  // Clamp small negative discriminant to zero (numerical precision)
  if (disc < 0) {
    if (disc > -1e-9) {
      // Numerical precision issue - treat as tangent
      const t = -B / (2 * A);
      if (t >= 0 && t <= 1) {
        const point = vAdd(a, vScale(d, t));
        const normal = normalize(vSub(point, center));
        return { t, point, normal };
      }
    }
    return null;
  }
  
  const sqrtD = Math.sqrt(disc);
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);
  const t = (t1 >= 0 && t1 <= 1) ? t1 : (t2 >= 0 && t2 <= 1 ? t2 : NaN);
  if (isNaN(t)) return null;
  const point = vAdd(a, vScale(d, t));
  const normal = normalize(vSub(point, center));
  return { t, point, normal };
}

/*
Expand an AABB by radius r
*/
const expandAABB = (b: Brick, r: number) => ({ x: b.x - r, y: b.y - r, w: b.width + 2 * r, h: b.height + 2 * r });

/*
Default tilemap broadphase fallback:
Assumes uniform bricks array on grid with known BRICK_WIDTH/HEIGHT; compute candidate bricks overlapping swept aabb.
If user supplies tilemapQuery in config, it will be used instead.
*/
function defaultTilemapQuery(bricks: Brick[] | undefined, swept: { x: number; y: number; w: number; h: number }) {
  if (!bricks) return [];
  // simple filter by AABB overlap
  const res: Brick[] = [];
  for (const b of bricks) {
    if (!b.visible) continue;
    if (b.x + b.width < swept.x || b.x > swept.x + swept.w || b.y + b.height < swept.y || b.y > swept.y + swept.h) continue;
    res.push(b);
  }
  return res;
}

/*
Main exported function:
processBallCCD(ball, dt, state, config) -> { ball: Ball | null, events: CollisionEvent[], debug?: any }
- state: contains bricks[], paddle?, canvasSize?
*/
export function processBallCCD(
  ballIn: Ball,
  cfg: CCDConfig
): { ball: Ball | null; events: CollisionEvent[]; debug?: any } {
  const {
    dt,
    substeps,
    maxToiIterations = 3,
    epsilon = 1e-3,
    minBrickDimension = cfg.minBrickDimension ?? 16,
    tilemapQuery,
    paddle,
    bricks,
    canvasSize,
    currentTick,
    maxSubstepTravelFactor = cfg.maxSubstepTravelFactor ?? 0.9
  } = cfg;

  if (!ballIn) return { ball: null, events: [] };

  // clone to avoid mutating external object until commit
  const ball: Ball = { ...ballIn };
  const events: CollisionEvent[] = [];
  const debug: any[] = [];

  // velocities are px/sec; per-substep movement fraction
  const subDt = dt / Math.max(1, substeps);
  // safety: clamp per-substep travel
  const maxAllowed = minBrickDimension * maxSubstepTravelFactor;
  const travelThisSubstep = Math.hypot(ball.dx * subDt, ball.dy * subDt);
  if (travelThisSubstep > maxAllowed) {
    // warn by increasing substeps if caller can adapt; here we cap the movement vector
    const scale = maxAllowed / travelThisSubstep;
    ball.dx *= scale;
    ball.dy *= scale;
  }

  // For each substep: perform TOI loop
  for (let s = 0; s < substeps; s++) {
    // remaining fraction of this substep (1.0 means whole substep left)
    let remaining = 1.0;
    let iter = 0;

    // initial positions for this substep
    let pos0: Vec2 = { x: ball.x, y: ball.y };

    // desired move over full substep
    const fullMove: Vec2 = { x: ball.dx * subDt, y: ball.dy * subDt };

    // Safety: if zero movement, skip
    if (Math.abs(fullMove.x) < 1e-9 && Math.abs(fullMove.y) < 1e-9) break;

    while (remaining > 1e-6 && iter < maxToiIterations) {
      iter++;
      const move = vScale(fullMove, remaining); // remaining portion of this substep
      const pos1 = vAdd(pos0, move);

      // broadphase swept AABB for candidate bricks
      const sweptAabb = {
        x: Math.min(pos0.x, pos1.x) - ball.radius,
        y: Math.min(pos0.y, pos1.y) - ball.radius,
        w: Math.abs(pos1.x - pos0.x) + 2 * ball.radius,
        h: Math.abs(pos1.y - pos0.y) + 2 * ball.radius
      };

      const candidates = tilemapQuery ? tilemapQuery(sweptAabb) : defaultTilemapQuery(bricks, sweptAabb);
      // Collect earliest hit among walls, paddle, bricks, corners
      let earliest: { t: number; normal: Vec2; objectType: CollisionEvent['objectType']; objectId?: number | string; point: Vec2 } | null = null;

      // 1) Walls (canvas bounds): treat as planes
      if (canvasSize) {
        // left wall (x = 0), right wall (x = w), top wall (y = 0), bottom handled elsewhere
        // compute t for x-plane intersection
        const moveDir = vSub(pos1, pos0);
        // X planes
        if (moveDir.x !== 0) {
          const txLeft = (ball.radius - pos0.x) / moveDir.x; // when center reaches radius
          if (txLeft >= 0 && txLeft <= 1) {
            const tAbs = txLeft;
            if (!earliest || tAbs < earliest.t) {
              earliest = { t: tAbs, normal: { x: 1, y: 0 }, objectType: 'wall', objectId: 'left', point: { x: pos0.x + moveDir.x * tAbs, y: pos0.y + moveDir.y * tAbs } };
            }
          }
          const txRight = ((canvasSize.w - ball.radius) - pos0.x) / moveDir.x;
          if (txRight >= 0 && txRight <= 1) {
            const tAbs = txRight;
            if (!earliest || tAbs < earliest.t) {
              earliest = { t: tAbs, normal: { x: -1, y: 0 }, objectType: 'wall', objectId: 'right', point: { x: pos0.x + moveDir.x * tAbs, y: pos0.y + moveDir.y * tAbs } };
            }
          }
        }
        if (moveDir.y !== 0) {
          const tyTop = (ball.radius - pos0.y) / moveDir.y;
          if (tyTop >= 0 && tyTop <= 1) {
            const tAbs = tyTop;
            if (!earliest || tAbs < earliest.t) earliest = { t: tAbs, normal: { x: 0, y: 1 }, objectType: 'wall', objectId: 'top', point: { x: pos0.x + moveDir.x * tAbs, y: pos0.y + moveDir.y * tAbs } };
          }
          // bottom is allowed (ball falling out) — we do not reflect bottom here; caller may treat y>canvas.h as lost ball
        }
      }

      // 2) Paddle (prioritize)
      if (paddle) {
        const expanded = { x: paddle.x - ball.radius, y: paddle.y - ball.radius, w: paddle.width + 2 * ball.radius, h: paddle.height + 2 * ball.radius };
        const rayHit = rayAABB(pos0, pos1, expanded);
        if (rayHit) {
          const candidatePoint = vAdd(pos0, vScale(vSub(pos1, pos0), rayHit.tEntry));
          if (!earliest || rayHit.tEntry < earliest.t - 1e-8 || (Math.abs(rayHit.tEntry - earliest.t) < 1e-8 && earliest.objectType !== 'paddle')) {
            earliest = { t: rayHit.tEntry, normal: rayHit.normal, objectType: 'paddle', objectId: 'paddle', point: candidatePoint };
          }
        } else {
          // corner checks (paddle rounded corners)
          const cornerRadius = 5;
          const corners = [
            { x: paddle.x + cornerRadius, y: paddle.y + cornerRadius }, // top-left
            { x: paddle.x + paddle.width - cornerRadius, y: paddle.y + cornerRadius }, // top-right
            { x: paddle.x + cornerRadius, y: paddle.y + paddle.height - cornerRadius }, // bottom-left
            { x: paddle.x + paddle.width - cornerRadius, y: paddle.y + paddle.height - cornerRadius } // bottom-right
          ];
          for (const c of corners) {
            const sc = segmentCircleTOI(pos0, pos1, c, ball.radius);
            if (sc && (!earliest || sc.t < earliest.t)) {
              earliest = { t: sc.t, normal: sc.normal, objectType: 'corner', objectId: 'paddle-corner', point: sc.point };
            }
          }
        }
      }

      // 3) Bricks (use candidates)
      for (const b of candidates) {
        // expanded AABB
        const exp = expandAABB(b, ball.radius);
        const rayHit = rayAABB(pos0, pos1, exp);
        if (rayHit) {
          const hitPoint = vAdd(pos0, vScale(vSub(pos1, pos0), rayHit.tEntry));
          if (!earliest || rayHit.tEntry < earliest.t) {
            earliest = { t: rayHit.tEntry, normal: rayHit.normal, objectType: 'brick', objectId: b.id, point: hitPoint };
          }
        } else {
          // corner tests: check rectangle corners
          const corners = [{ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y }, { x: b.x, y: b.y + b.height }, { x: b.x + b.width, y: b.y + b.height }];
          for (const c of corners) {
            const sc = segmentCircleTOI(pos0, pos1, c, ball.radius);
            if (sc && (!earliest || sc.t < earliest.t)) {
              earliest = { t: sc.t, normal: sc.normal, objectType: 'corner', objectId: b.id, point: sc.point };
            }
          }
        }
      }

      debug.push({ sweptAabb, candidates: candidates.map(b => b.id), earliest, iter });

      if (!earliest) {
        // no collision this iteration: commit full remaining move
        pos0 = pos1;
        remaining = 0;
        break;
      }

      // Found earliest collision at fraction earliest.t of remaining
      const tHit = Math.max(0, Math.min(1, earliest.t));
      // move to contact point
      pos0 = vAdd(pos0, vScale(vSub(pos1, pos0), tHit));
      
      // Robust normal validation and fallback
      let n = earliest.normal;
      const nLen = Math.hypot(n.x, n.y);
      if (nLen < 1e-4) {
        // Fallback: compute normal from collision point to ball center
        const dirX = pos0.x - earliest.point.x;
        const dirY = pos0.y - earliest.point.y;
        const dLen = Math.hypot(dirX, dirY) || 1e-6;
        n = { x: dirX / dLen, y: dirY / dLen };
      } else {
        // Normalize if not already unit length
        n = { x: n.x / nLen, y: n.y / nLen };
      }
      
      // Determine if reflection should apply
      // Walls/paddle/corners: always reflect
      // Bricks: reflect UNLESS fireball AND destructible
      const shouldReflect = 
        earliest.objectType === 'wall' || 
        earliest.objectType === 'paddle' || 
        earliest.objectType === 'corner' ||
        (earliest.objectType === 'brick' && !ball.isFireball);

      if (shouldReflect) {
        const vel = { x: ball.dx, y: ball.dy };
        const dot = vel.x * n.x + vel.y * n.y;
        ball.dx = vel.x - 2 * dot * n.x;
        ball.dy = vel.y - 2 * dot * n.y;
      }
      // Proportional epsilon: scales with ball radius and travel distance
      const proportionalEpsilon = Math.max(0.5, Math.min(ball.radius * 0.1, travelThisSubstep * 0.3));
      pos0 = vAdd(pos0, vScale(earliest.normal, proportionalEpsilon));

      // record event (time is fraction of this substep: (1 - remaining) + remaining * tHit)
      const eventT = (1 - remaining) + remaining * tHit;
      events.push({
        t: eventT,
        normal: earliest.normal,
        objectType: earliest.objectType,
        objectId: earliest.objectId,
        point: earliest.point
      });

      // reduce remaining fraction and continue
      remaining = remaining * (1 - tHit);

      // optional cooldown set using tick if provided
      if (currentTick !== undefined) ball.lastHitTick = currentTick;

      // If hit paddle or brick, break depending on game rules: here we continue to resolve remaining fraction (multiple collisions allowed),
      // but game may want to break on paddle to avoid multiple reflections; caller can inspect events for that.
    } // end TOI loop

    // commit pos0 as ball position for this substep
    ball.x = pos0.x;
    ball.y = pos0.y;
    // after substep continue to next substep (ball.dx/dy already updated)
  } // end substeps loop

  return { ball, events, debug };
}
