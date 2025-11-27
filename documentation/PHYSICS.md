# Physics & Collision System

Complete documentation of the physics simulation and collision detection systems in Vibing Arkanoid.

---

## 🏐 Ball Physics

### Core Properties

```typescript
interface Ball {
  x: number;           // Position X (pixels)
  y: number;           // Position Y (pixels)
  dx: number;          // Velocity X (pixels per frame)
  dy: number;          // Velocity Y (pixels per frame)
  speed: number;       // Magnitude (pixels per frame)
  radius: number;      // Collision radius (typically 8px)
  isFireball: boolean; // Pass through non-metal bricks
}
```

### Velocity Units

**Critical**: All velocities are in **pixels per frame**, NOT pixels per second.

```typescript
// Correct: Frame-based velocity
ball.dx = 3.0;  // 3 pixels per frame
ball.dy = -4.0; // 4 pixels per frame upward

// At 60Hz fixed step (1/60 second)
ball.x += ball.dx;  // Simple position update
ball.y += ball.dy;

// Speed is magnitude
ball.speed = Math.sqrt(ball.dx**2 + ball.dy**2);  // = 5.0
```

**Why frame-based?**
- Fixed-step loop runs at constant 60Hz
- Simple arithmetic (no multiplication by dt)
- Deterministic (same every frame)

### Speed Preservation

**Rule**: Speed magnitude is always preserved after collisions

```typescript
// Before collision
const speedBefore = Math.sqrt(ball.dx**2 + ball.dy**2);

// After reflection
const speedAfter = Math.sqrt(ball.dx**2 + ball.dy**2);

// Assert: speedBefore === speedAfter (within floating point error)
```

**Why?**
- Prevents unintended acceleration/deceleration
- Consistent gameplay feel
- Energy conservation (arcade physics)

### Base Speed Progression

**File**: `src/constants/game.ts`

```typescript
BASE_BALL_SPEED = 4.5;  // px/frame at level 1

// Progressive speed increase
const levelSpeed = BASE_BALL_SPEED + (level - 1) * 0.1;

// God mode multiplier
if (godMode) {
  levelSpeed *= 1.25;  // 25% faster
}
```

**Examples**:
- Level 1: 4.5 px/frame
- Level 10: 5.4 px/frame
- Level 20: 6.3 px/frame
- Level 50: 9.4 px/frame (nearly doubled!)

---

## 🏓 Paddle Collision System

**File**: `src/utils/paddleCollision.ts`

### Geometry: Rounded Rectangle

```
         cornerRadius
          ╭───╮
          │   │  ← Top edge
╭─────────┴───┴─────────╮
│                       │  ← Width
│       Paddle          │
╰───────────────────────╯
          ↑
       Height
```

**Dimensions**:
```typescript
paddle.width = 100;                    // Standard width
paddle.height = 15;                    // Standard height
paddle.cornerRadius = width * 0.15;    // 15px rounded corners
```

### Collision Detection: `checkCircleVsRoundedPaddle`

**Purpose**: Accurate collision between ball (circle) and paddle (rounded rectangle)

**Algorithm**:

#### 1. Circle vs Rectangle Core

```typescript
// Find closest point on rectangle to circle center
const closestX = Math.max(paddle.left, Math.min(ball.x, paddle.right));
const closestY = Math.max(paddle.top, Math.min(ball.y, paddle.bottom));

// Distance from ball to closest point
const dx = ball.x - closestX;
const dy = ball.y - closestY;
const distanceSquared = dx*dx + dy*dy;

// Collision if distance < radius
if (distanceSquared < ball.radius**2) {
  // Collision detected!
}
```

#### 2. Corner Handling

```typescript
// Define 4 corner circles
const corners = [
  { x: paddle.left + cornerRadius, y: paddle.top + cornerRadius },     // Top-left
  { x: paddle.right - cornerRadius, y: paddle.top + cornerRadius },    // Top-right
  { x: paddle.left + cornerRadius, y: paddle.bottom - cornerRadius },  // Bottom-left
  { x: paddle.right - cornerRadius, y: paddle.bottom - cornerRadius }  // Bottom-right
];

// Check if ball is in corner region
for (const corner of corners) {
  const dx = ball.x - corner.x;
  const dy = ball.y - corner.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  
  if (dist < cornerRadius + ball.radius) {
    // Collision with rounded corner
    // Normal points outward from corner center
    normal = { x: dx / dist, y: dy / dist };
  }
}
```

### Position-Based Angle Launcher

**Purpose**: Ball's outgoing angle depends ONLY on impact position, NOT incoming angle

**Philosophy**: Classic arcade physics (Breakout, Arkanoid, DX-Ball)

```typescript
// Calculate impact position on paddle
const paddleCenter = paddle.x + paddle.width / 2;
const impactOffset = ball.x - paddleCenter;
const normalizedPos = impactOffset / (paddle.width / 2);
// normalizedPos: -1.0 (left edge) to +1.0 (right edge)

// Map to launch angle (linear)
const maxDeflection = 80; // degrees
const launchAngle = normalizedPos * maxDeflection;
// launchAngle: -80° (left) to +80° (right)

// Convert to velocity (preserve speed)
ball.dx = Math.sin(launchAngle * Math.PI / 180) * ball.speed;
ball.dy = -Math.cos(launchAngle * Math.PI / 180) * ball.speed;
```

**Angle Map**:
```
Impact Position → Launch Angle
─────────────────────────────
-1.0 (far left)  → -80° (steep left)
-0.5             → -40°
 0.0 (center)    →   0° (straight up)
+0.5             → +40°
+1.0 (far right) → +80° (steep right)
```

**Strategic Implication**: Player positioning is critical!
- Hit with left edge → ball shoots left
- Hit with center → ball shoots straight up
- Hit with right edge → ball shoots right

### Paddle Movement Integration

**Paddle Velocity**: Calculated in **pixels per frame**

```typescript
// Track previous position
prevPaddleX = paddle.x;

// Update paddle position (input handling)
paddle.x = mouseX;

// Calculate frame-based velocity
const paddleVelocity = paddle.x - prevPaddleX;
// NOT: paddleVelocity = (paddle.x - prevPaddleX) * 60  // ❌ WRONG!
```

**Why this matters**:
- Used for "English" (spin transfer) in some collision modes
- Must match velocity units (px/frame)
- Overestimation causes speed explosion bugs

---

## 🧱 Brick Collision

### Brick Types

```typescript
type BrickType = 'normal' | 'metal' | 'cracked' | 'explosive';

interface Brick {
  id: number;
  x: number;
  y: number;
  width: number;           // 56px
  height: number;          // 21px
  type: BrickType;
  hitsRemaining: number;   // 1-3 for cracked, calculated for normal
  isVisible: boolean;
  color: string;
}
```

### Collision Detection: AABB (Axis-Aligned Bounding Box)

```typescript
// Expand brick AABB by ball radius (Minkowski sum)
const expandedAABB = {
  left: brick.x - ball.radius,
  right: brick.x + brick.width + ball.radius,
  top: brick.y - ball.radius,
  bottom: brick.y + brick.height + ball.radius
};

// Ray-cast ball trajectory against expanded AABB
const toi = rayVsAABB(
  ball.x, ball.y,           // Ray start
  ball.dx, ball.dy,         // Ray direction
  expandedAABB              // Target AABB
);

if (toi >= 0 && toi <= 1.0) {
  // Collision! toi is time of impact (0.0 to 1.0)
}
```

### Collision Normal Calculation

**Purpose**: Determine which face of brick was hit

```typescript
// Move ball to collision point
const collisionX = ball.x + ball.dx * toi;
const collisionY = ball.y + ball.dy * toi;

// Find brick center
const brickCenterX = brick.x + brick.width / 2;
const brickCenterY = brick.y + brick.height / 2;

// Vector from brick center to collision point
const dx = collisionX - brickCenterX;
const dy = collisionY - brickCenterY;

// Determine dominant axis
if (Math.abs(dx) > Math.abs(dy)) {
  // Horizontal collision (left or right face)
  normal = { x: Math.sign(dx), y: 0 };
} else {
  // Vertical collision (top or bottom face)
  normal = { x: 0, y: Math.sign(dy) };
}
```

### Corner Detection (Diagonal Hits)

```typescript
// Define brick corners
const corners = [
  { x: brick.x, y: brick.y },                               // Top-left
  { x: brick.x + brick.width, y: brick.y },                // Top-right
  { x: brick.x, y: brick.y + brick.height },               // Bottom-left
  { x: brick.x + brick.width, y: brick.y + brick.height }  // Bottom-right
];

const CORNER_THRESHOLD = ball.radius * 0.7;

for (const corner of corners) {
  const dist = Math.sqrt((collisionX - corner.x)**2 + (collisionY - corner.y)**2);
  
  if (dist < CORNER_THRESHOLD) {
    // Corner hit! Normal points away from corner
    normal = {
      x: (collisionX - corner.x) / dist,
      y: (collisionY - corner.y) / dist
    };
  }
}
```

### Reflection Formula

```typescript
// Reflect velocity around normal
// Formula: V' = V - 2 * (V · N) * N

const dotProduct = ball.dx * normal.x + ball.dy * normal.y;
ball.dx -= 2 * dotProduct * normal.x;
ball.dy -= 2 * dotProduct * normal.y;

// Preserve speed (correct floating point errors)
const currentSpeed = Math.sqrt(ball.dx**2 + ball.dy**2);
const scale = ball.speed / currentSpeed;
ball.dx *= scale;
ball.dy *= scale;
```

**Visual Example**:
```
Before:          After:
→ ●             ← ●
  │ Normal       │
  ↓              ↓
─────          ─────
 Wall           Wall
```

---

## 🧊 Special Brick Types

### Metal Bricks (Indestructible)

```typescript
if (brick.type === 'metal') {
  // Ball reflects, brick takes no damage
  reflectBall(ball, normal);
  playSound('metal-clang');
  // Do NOT decrement hitsRemaining
  // Do NOT create power-up
}
```

**Melting Visuals**: Adjacent metal bricks render as single continuous piece
- Internal borders removed
- Shadows only on outer edges
- Creates "solid wall" appearance

### Cracked Bricks (Multi-Hit)

```typescript
if (brick.type === 'cracked') {
  brick.hitsRemaining--;  // 3 → 2 → 1 → 0 (destroyed)
  
  // Progressive sound pitch
  const soundPitch = brick.hitsRemaining === 2 ? 500 : 700;
  playSound('crack', { pitch: soundPitch });
  
  // Visual texture progression
  if (brick.hitsRemaining === 2) {
    brick.texture = 'cracked-1';
  } else if (brick.hitsRemaining === 1) {
    brick.texture = 'cracked-2';
  } else {
    playSound('glass-breaking');
    brick.isVisible = false;
  }
}
```

### Explosive Bricks (Chain Reaction)

```typescript
if (brick.type === 'explosive') {
  brick.isVisible = false;
  playSound('explosion-big');
  
  // Destroy surrounding bricks in radius
  const EXPLOSION_RADIUS = 80; // pixels
  
  for (const otherBrick of bricks) {
    const dist = Math.sqrt(
      (brick.x - otherBrick.x)**2 + 
      (brick.y - otherBrick.y)**2
    );
    
    if (dist <= EXPLOSION_RADIUS) {
      // Metal bricks CAN be destroyed by explosions
      otherBrick.isVisible = false;
      
      // Chain reaction: if otherBrick is explosive, trigger it too
      if (otherBrick.type === 'explosive') {
        // Queue explosion event for next frame
        eventQueue.enqueue({ type: 'EXPLOSIVE_TRIGGER', data: otherBrick });
      }
    }
  }
}
```

---

## 🧱 Wall Collision

### Canvas Boundaries

```typescript
const WALL_PADDING = 10; // pixels from edge

const walls = {
  left: WALL_PADDING,
  right: canvasWidth - WALL_PADDING,
  top: WALL_PADDING,
  bottom: canvasHeight  // No bottom wall (life lost)
};
```

### Wall Reflection

```typescript
// Left wall
if (ball.x - ball.radius <= walls.left) {
  ball.x = walls.left + ball.radius;  // Correct position
  ball.dx = Math.abs(ball.dx);        // Reflect right
}

// Right wall
if (ball.x + ball.radius >= walls.right) {
  ball.x = walls.right - ball.radius;
  ball.dx = -Math.abs(ball.dx);       // Reflect left
}

// Top wall
if (ball.y - ball.radius <= walls.top) {
  ball.y = walls.top + ball.radius;
  ball.dy = Math.abs(ball.dy);        // Reflect down
}

// Bottom wall = life lost
if (ball.y - ball.radius >= walls.bottom) {
  loseLife();
  removeBall(ball);
}
```

---

## 👾 Enemy Collision

### Enemy Types

```typescript
type EnemyType = 'cube' | 'sphere' | 'pyramid';

interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: EnemyType;
  health: number;
}
```

### Collision Handling

```typescript
// Enemies use AABB collision (same as bricks)
const toi = sweepCircleVsAABB(ball, enemy);

if (toi >= 0 && toi <= 1.0) {
  enemy.health--;
  
  if (enemy.health <= 0) {
    enemy.isAlive = false;
    score += 500;
    playSound('enemy-death');
    spawnPowerUp(enemy.x, enemy.y, 0.5); // 50% chance for boss minions
  }
  
  // Ball reflects
  reflectBall(ball, normal);
}
```

---

## 🤖 Boss Collision (Legacy System)

**File**: `src/components/Game.tsx` (Phase 0: Boss Collision)

### Why Legacy?

Boss shapes are complex:
- **Cube**: 8 vertices, 12 edges, 6 faces
- **Sphere**: True circle/sphere geometry
- **Pyramid**: 5 vertices, 8 edges, 5 faces

AABB approximation loses accuracy. Legacy system uses exact geometry.

### Boss Collision (Cube Example)

```typescript
function checkBallVsCube(ball: Ball, boss: Boss): Collision | null {
  // Define cube in 3D space (8 vertices)
  const vertices = calculateCubeVertices(boss.x, boss.y, boss.size, boss.rotation);
  
  // Project to 2D (perspective projection)
  const projected2D = vertices.map(v => project3DTo2D(v));
  
  // Define 12 edges
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],  // Front face
    [4, 5], [5, 6], [6, 7], [7, 4],  // Back face
    [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting edges
  ];
  
  // Check ball vs each edge (circle-line segment collision)
  for (const [i, j] of edges) {
    const p1 = projected2D[i];
    const p2 = projected2D[j];
    
    const collision = circleVsLineSegment(ball, p1, p2);
    if (collision) return collision;
  }
  
  return null;
}
```

### Boss Damage Cooldown

```typescript
// Prevent multiple hits in rapid succession
boss.lastHitAt = boss.lastHitAt || 0;
const BOSS_COOLDOWN = 1000; // ms

if (performance.now() - boss.lastHitAt >= BOSS_COOLDOWN) {
  boss.health--;
  boss.lastHitAt = performance.now();
  playSound('boss-hit');
  screenShake(10);
  
  if (boss.health <= 0) {
    defeatBoss(boss);
  }
}

// Position/velocity correction ALWAYS applied (no cooldown)
correctBallPosition(ball, collision);
reflectBall(ball, collision.normal);
```

---

## 🔥 Fireball Mechanic

### Pass-Through Logic

```typescript
if (ball.isFireball && brick.type !== 'metal') {
  // Step 1: Brick is destroyed immediately
  brick.isVisible = false;
  score += calculateScore(brick);
  
  // Step 2: Undo CCD reflection
  // CCD already reflected the velocity, we need to restore pre-bounce
  
  // Formula: If V' = V - 2(V·N)N, then V = V' + 2(V·N)N
  const dotProduct = ball.dx * normal.x + ball.dy * normal.y;
  ball.dx += 2 * dotProduct * normal.x;
  ball.dy += 2 * dotProduct * normal.y;
  
  // Step 3: Ball continues through brick
  // No position correction needed (already at collision point)
}
```

**Why undo reflection?**
- CCD applies reflection automatically
- Fireball should pass through, not bounce
- Reconstruct pre-bounce velocity to continue trajectory

---

## 🎯 Performance Considerations

### Collision Culling

**Broad Phase**: Quickly eliminate obviously non-colliding objects

```typescript
// Ball movement bounding box
const ballBounds = {
  minX: Math.min(ball.x, ball.x + ball.dx) - ball.radius,
  maxX: Math.max(ball.x, ball.x + ball.dx) + ball.radius,
  minY: Math.min(ball.y, ball.y + ball.dy) - ball.radius,
  maxY: Math.max(ball.y, ball.y + ball.dy) + ball.radius
};

// Only check bricks that overlap ball's path
const potentialCollisions = bricks.filter(brick =>
  brick.isVisible &&
  brick.x < ballBounds.maxX &&
  brick.x + brick.width > ballBounds.minX &&
  brick.y < ballBounds.maxY &&
  brick.y + brick.height > ballBounds.minY
);

// Narrow phase: CCD on potential collisions only
for (const brick of potentialCollisions) {
  const toi = sweepCircleVsAABB(ball, brick);
  // ...
}
```

**Performance Gain**: O(n) → O(k) where k << n

### Collision Deduplication

**Problem**: Grazing diagonal can trigger multiple brick hits

**Solution**: Re-validate collisions during processing

```typescript
const processedBricks = new Set<number>();

for (const event of collisionEvents) {
  if (event.objectType === 'brick') {
    // Check if brick still exists and hasn't been processed
    const brick = bricks.find(b => b.id === event.objectId && b.isVisible);
    
    if (!brick || processedBricks.has(brick.id)) {
      continue; // Skip duplicate/invalid collision
    }
    
    processedBricks.add(brick.id);
    handleBrickCollision(brick, event);
  }
}
```

---

## 🐛 Common Physics Bugs & Solutions

### Bug: Ball Tunnels Through Bricks

**Symptom**: Ball passes through brick without collision

**Cause**: Too few substeps for ball speed

**Solution**: Increase substeps dynamically
```typescript
if (ball.speed > 6) substeps++;
```

### Bug: Ball Gets Stuck in Paddle

**Symptom**: Ball vibrates inside paddle

**Cause**: Conflicting collision corrections (paddle vs boss)

**Solution**: Priority flag system
```typescript
if (ball._hitBossThisFrame) {
  // Skip paddle correction
  continue;
}
```

### Bug: Speed Explosion After Paddle Hit

**Symptom**: Ball speed increases from 5 to 173+ px/frame

**Cause**: Paddle velocity in wrong units (px/s instead of px/frame)

**Solution**: Use frame-based velocity
```typescript
const paddleVelocity = paddle.x - prevPaddleX;  // NOT * 60
```

### Bug: Duplicate Brick Destruction

**Symptom**: Single collision destroys multiple bricks

**Cause**: Grazing diagonal triggers multiple events

**Solution**: Re-validate during event processing (see above)

---

## 🎯 Next Steps

- **Learn game features**: Read [Game Mechanics](./GAME_MECHANICS.md)
- **Understand bosses**: Read [Boss System](./BOSS_SYSTEM.md)
- **Performance tuning**: Read [Performance Optimization](./PERFORMANCE.md)
