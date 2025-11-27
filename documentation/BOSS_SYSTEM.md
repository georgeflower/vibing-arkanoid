# Boss System Documentation

Complete guide to boss battles, attack patterns, and boss mechanics in Vibing Arkanoid.

---

## 👾 Boss Overview

Bosses appear on **levels 5, 10, and 15** with increasing difficulty and unique mechanics.

| Level | Boss Type | Health | Attack Patterns |
|-------|-----------|--------|-----------------|
| 5 | Cube | 10 | Shot, Laser, Super |
| 10 | Sphere | 15 | Shot, Laser, Super, Spiral |
| 15 | Pyramid | 20 | Shot, Laser, Super, Spiral, Cross + Resurrection |

---

## 🎯 Boss Configuration

**File**: `src/constants/bossConfig.ts`

```typescript
export const BOSS_CONFIGS = {
  cube: {
    health: 10,
    size: 80,
    speed: 2,
    attackPatterns: ['shot', 'laser', 'super'],
    attackWeights: { shot: 40, laser: 30, super: 30 },
    attackCooldown: 3000, // ms between attacks
    movementPattern: 'linear',
    angryThreshold: 0.3 // Becomes angry at 30% HP
  },
  
  sphere: {
    health: 15,
    size: 90,
    speed: 2.5,
    attackPatterns: ['shot', 'laser', 'super', 'spiral'],
    attackWeights: { shot: 30, laser: 25, super: 25, spiral: 20 },
    attackCooldown: 2500,
    movementPattern: 'sinusoidal',
    angryThreshold: 0.25
  },
  
  pyramid: {
    health: 20,
    size: 100,
    speed: 3,
    attackPatterns: ['shot', 'laser', 'super', 'spiral', 'cross'],
    attackWeights: { shot: 20, laser: 20, super: 20, spiral: 20, cross: 20 },
    attackCooldown: 2000,
    movementPattern: 'teleport',
    angryThreshold: 0.2,
    canResurrect: true,
    resurrectionCount: 3
  }
};
```

---

## 🏗️ Boss Creation

**File**: `src/utils/bossUtils.ts`

### `createBoss(level, canvasWidth, canvasHeight)`

```typescript
export function createBoss(level: number, canvasWidth: number, canvasHeight: number): Boss | null {
  const bossType = level === 5 ? 'cube' : level === 10 ? 'sphere' : level === 15 ? 'pyramid' : null;
  if (!bossType) return null;
  
  const config = BOSS_CONFIGS[bossType];
  
  return {
    id: `boss-${level}-${Date.now()}`,
    type: bossType,
    x: canvasWidth / 2 - config.size / 2,
    y: 100,
    targetX: canvasWidth / 2,
    targetY: 100,
    width: config.size,
    height: config.size,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    isAngry: false,
    lastAttackTime: 0,
    lastHitAt: 0, // Damage cooldown
    rotation: 0,
    phase: 1
  };
}
```

### Resurrected Pyramid

```typescript
export function createResurrectedPyramid(
  parentBoss: Boss,
  index: number,
  canvasWidth: number,
  canvasHeight: number
): Boss {
  const angle = (index * 120) * (Math.PI / 180); // 0°, 120°, 240°
  const distance = 150;
  
  return {
    ...parentBoss,
    id: `resurrected-pyramid-${index}-${Date.now()}`,
    x: parentBoss.x + Math.cos(angle) * distance,
    y: parentBoss.y + Math.sin(angle) * distance,
    width: 60,
    height: 60,
    health: 5,
    maxHealth: 5,
    isResurrected: true,
    parentBossId: parentBoss.id
  };
}
```

---

## ⚔️ Attack Patterns

**File**: `src/utils/bossAttacks.ts`

### Attack Types

#### 1. Shot Attack (Basic Projectile)

```typescript
{
  type: 'shot',
  projectiles: 1,
  speed: 5, // px/frame
  damage: 1,
  pattern: 'aimed' // Aims at paddle
}
```

Creates single projectile toward paddle position.

#### 2. Laser Attack (Fast Line)

```typescript
{
  type: 'laser',
  projectiles: 1,
  speed: 12, // Very fast
  damage: 1,
  pattern: 'vertical',
  warningTime: 1000 // 1 second warning indicator
}
```

Fast vertical laser with visual warning before firing.

#### 3. Super Attack (Spread)

```typescript
{
  type: 'super',
  projectiles: 5,
  speed: 4,
  damage: 1,
  pattern: 'spread',
  angleSpread: 45 // degrees
}
```

5 projectiles in 45° spread pattern.

#### 4. Spiral Attack (Rotating)

```typescript
{
  type: 'spiral',
  projectiles: 8,
  speed: 3,
  damage: 1,
  pattern: 'circular',
  rotationSpeed: 5 // degrees per frame
}
```

8 projectiles in circular pattern, rotating outward.

#### 5. Cross Attack (4 Directions)

```typescript
{
  type: 'cross',
  projectiles: 4,
  speed: 4,
  damage: 1,
  pattern: 'cardinal' // N, S, E, W
}
```

4 projectiles in cardinal directions.

### Attack Selection

```typescript
function selectAttack(boss: Boss): string {
  const config = BOSS_CONFIGS[boss.type];
  const weights = config.attackWeights;
  
  // Weighted random selection
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const [attack, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return attack;
  }
  
  return 'shot'; // Fallback
}
```

---

## 🎭 Boss Phases

### Normal Phase

```typescript
if (boss.health > boss.maxHealth * config.angryThreshold) {
  boss.isAngry = false;
  boss.speed = config.speed;
  boss.attackCooldown = config.attackCooldown;
}
```

### Angry Phase

```typescript
if (boss.health <= boss.maxHealth * config.angryThreshold) {
  boss.isAngry = true;
  boss.speed = config.speed * 1.5; // 50% faster movement
  boss.attackCooldown = config.attackCooldown * 0.7; // 30% faster attacks
  
  playSound('boss-angry');
  screenShake(20);
}
```

**Visual Changes**:
- Cube: Red color scheme, faster rotation
- Sphere: Red glow, pulsing effect
- Pyramid: Red edges, rapid rotation

---

## 💀 Boss Defeat & Resurrection

### Standard Defeat

```typescript
if (boss.health <= 0 && !boss.canResurrect) {
  boss.isAlive = false;
  score += 5000 + (level * 500);
  bossesKilled++;
  
  // Clear all enemies and projectiles
  enemies = [];
  bossAttacks = [];
  laserWarnings = [];
  
  // Visual effects
  playSound('boss-defeated');
  triggerExplosion(boss.x, boss.y, 200);
  screenShake(30);
  showMessage('BOSS DEFEATED!');
  
  // Transition to next level after 3 seconds
  setTimeout(() => nextLevel(), 3000);
}
```

### Pyramid Resurrection

```typescript
if (boss.type === 'pyramid' && boss.health <= 0 && boss.canResurrect) {
  boss.isAlive = false;
  
  // Spawn 3 smaller pyramids
  for (let i = 0; i < 3; i++) {
    const resurrected = createResurrectedPyramid(boss, i, canvasWidth, canvasHeight);
    bosses.push(resurrected);
  }
  
  playSound('boss-resurrect');
  showMessage('PYRAMID RESURRECTED!');
  
  // Prevent infinite resurrection
  boss.canResurrect = false;
}
```

**Resurrected Pyramid Stats**:
- Health: 5 (1/4 of original)
- Size: 60px (60% of original)
- Independent movement
- Full attack capabilities

---

## 🛡️ Boss Collision & Damage

### Collision Detection (Legacy System)

```typescript
// Phase 0: Boss-First Collision (before CCD)
if (boss && boss.isAlive) {
  const collision = checkBallVsBoss(ball, boss);
  
  if (collision) {
    // Position correction (always applied)
    ball.x = collision.point.x;
    ball.y = collision.point.y;
    
    // Velocity reflection (always applied)
    const dotProduct = ball.dx * collision.normal.x + ball.dy * collision.normal.y;
    ball.dx -= 2 * dotProduct * collision.normal.x;
    ball.dy -= 2 * dotProduct * collision.normal.y;
    
    // Damage (cooldown-gated)
    const BOSS_COOLDOWN = 1000; // ms
    if (performance.now() - boss.lastHitAt >= BOSS_COOLDOWN) {
      boss.health--;
      boss.lastHitAt = performance.now();
      
      playSound('boss-hit');
      screenShake(10);
      
      // Check phase transition
      if (boss.health <= boss.maxHealth * 0.3 && !boss.isAngry) {
        boss.isAngry = true;
      }
      
      // Check defeat
      if (boss.health <= 0) {
        handleBossDefeat(boss);
      }
    }
    
    // Flag ball to skip CCD boss collision
    ball._hitBossThisFrame = true;
  }
}
```

### Damage Cooldown System

**Purpose**: Prevent multiple hits in single frame or rapid succession

```typescript
// Boss-local cooldown (1 second)
boss.lastHitAt = performance.now();

// On subsequent collisions within 1 second:
if (performance.now() - boss.lastHitAt < 1000) {
  // Skip damage, sound, screen shake
  // BUT still apply position/velocity correction
}
```

**Why cooldown?**
- Ball can overlap boss for multiple frames at high speed
- Without cooldown: Boss loses 5+ HP per hit
- With cooldown: Boss loses 1 HP per hit (max)

---

## 🎨 Boss Rendering

**File**: `src/components/GameCanvas.tsx`

### Cube Boss (3D Wireframe)

```typescript
// Define 8 vertices in 3D space
const vertices = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // Front face
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]      // Back face
];

// Apply rotation
const rotated = vertices.map(v => rotateVertex(v, boss.rotation));

// Project to 2D
const projected = rotated.map(v => project3D(v, boss.x, boss.y, boss.width));

// Define 12 edges
const edges = [
  [0,1], [1,2], [2,3], [3,0], // Front
  [4,5], [5,6], [6,7], [7,4], // Back
  [0,4], [1,5], [2,6], [3,7]  // Connecting
];

// Draw edges
for (const [i, j] of edges) {
  ctx.strokeStyle = boss.isAngry ? '#ff0000' : '#00ffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(projected[i].x, projected[i].y);
  ctx.lineTo(projected[j].x, projected[j].y);
  ctx.stroke();
}
```

### Sphere Boss (Gradient Circle)

```typescript
const gradient = ctx.createRadialGradient(
  boss.x, boss.y, 0,
  boss.x, boss.y, boss.width / 2
);

if (boss.isAngry) {
  gradient.addColorStop(0, '#ff6666');
  gradient.addColorStop(0.5, '#ff0000');
  gradient.addColorStop(1, '#660000');
} else {
  gradient.addColorStop(0, '#66ffff');
  gradient.addColorStop(0.5, '#00aaff');
  gradient.addColorStop(1, '#0066aa');
}

ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(boss.x, boss.y, boss.width / 2, 0, Math.PI * 2);
ctx.fill();
```

### Pyramid Boss (3D Pyramid)

```typescript
// 5 vertices: 4 base + 1 apex
const vertices = [
  [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], // Base
  [0, -1, 0]  // Apex
];

// Rotate and project
const projected = vertices.map(v => 
  project3D(rotateVertex(v, boss.rotation), boss.x, boss.y, boss.width)
);

// Draw 4 triangular faces
const faces = [
  [0, 1, 4], // Front
  [1, 2, 4], // Right
  [2, 3, 4], // Back
  [3, 0, 4]  // Left
];

for (const face of faces) {
  ctx.fillStyle = boss.isAngry ? '#ff0000' : '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
  ctx.lineTo(projected[face[1]].x, projected[face[1]].y);
  ctx.lineTo(projected[face[2]].x, projected[face[2]].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
```

---

## 🎯 Boss Movement Patterns

### Linear (Cube)

```typescript
// Move between 9 fixed positions
const positions = [
  [100, 100], [400, 100], [700, 100],
  [100, 200], [400, 200], [700, 200],
  [100, 300], [400, 300], [700, 300]
];

// Teleport or smooth movement
if (atTarget(boss)) {
  boss.targetX = positions[nextIndex][0];
  boss.targetY = positions[nextIndex][1];
}

boss.x += (boss.targetX - boss.x) * 0.05; // Smooth interpolation
boss.y += (boss.targetY - boss.y) * 0.05;
```

### Sinusoidal (Sphere)

```typescript
boss.x = canvasWidth / 2 + Math.sin(time * 0.002) * 200;
boss.y = 150 + Math.cos(time * 0.003) * 50;
```

### Teleport (Pyramid)

```typescript
if (Math.random() < 0.01) { // 1% chance per frame
  boss.x = random(100, canvasWidth - 100);
  boss.y = random(100, 300);
  
  playSound('boss-teleport');
  triggerParticles(boss.x, boss.y, 30);
}
```

---

## 📊 Boss Statistics

Tracked for end-game statistics:

```typescript
{
  bossesKilled: number,      // Total bosses defeated
  bossDamageDealt: number,   // Total HP removed from bosses
  bossAttacksDodged: number, // Projectiles that didn't hit
  bossTimeSpent: number      // Total time fighting bosses (ms)
}
```

---

## 🎯 Next Steps

- Learn level layouts: [Level System](./LEVEL_SYSTEM.md)
- Understand rendering: [Rendering & Graphics](./RENDERING.md)
- Explore audio: [Audio System](./AUDIO.md)
