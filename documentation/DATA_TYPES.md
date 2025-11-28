# TypeScript Types & Interfaces

Complete reference of all TypeScript type definitions used in Vibing Arkanoid.

**Primary File**: `src/types/game.ts`

---

## Core Game Types

### `GameState`

Represents the current state of the game.

```typescript
type GameState = 'menu' | 'ready' | 'playing' | 'paused' | 'gameover' | 'victory';
```

**States**:
- `menu`: Main menu screen
- `ready`: Countdown before ball launch (2-3 seconds)
- `playing`: Active gameplay
- `paused`: Game paused (ESC or P key)
- `gameover`: Player lost all lives
- `victory`: Player completed all levels

---

### `Difficulty`

Game difficulty setting.

```typescript
type Difficulty = 'easy' | 'normal' | 'hard';
```

**Effects**:
- **Easy**: 5 lives, 85% ball speed
- **Normal**: 3 lives, 100% ball speed (default)
- **Hard**: 3 lives, 125% ball speed, fewer power-ups

---

### `GameSettings`

Configuration passed from main menu to game.

```typescript
interface GameSettings {
  difficulty: Difficulty;
  startingLives: number;
  godMode: boolean;
}
```

---

## Entity Types

### `Ball`

The primary game object that bounces around.

```typescript
interface Ball {
  id: string;
  x: number;              // Center X position (pixels)
  y: number;              // Center Y position (pixels)
  vx: number;             // Velocity X (pixels per frame)
  vy: number;             // Velocity Y (pixels per frame)
  speed: number;          // Magnitude of velocity (px/frame)
  radius: number;         // Collision radius (pixels)
  attached: boolean;      // True if stuck to paddle (pre-launch)
  fireball?: boolean;     // True if fireball power-up active
  rotation?: number;      // Visual rotation angle (radians)
  _hitBossThisFrame?: boolean;  // Internal flag for collision resolution
}
```

---

### `Paddle`

The player-controlled paddle.

```typescript
interface Paddle {
  x: number;              // Center X position
  y: number;              // Center Y position
  width: number;          // Width (affected by extend/shrink power-ups)
  height: number;         // Height (fixed at 15px)
  vx?: number;            // Velocity X (for collision physics)
  turrets?: boolean;      // True if turrets power-up active
}
```

---

### `Brick`

Destructible blocks in level layouts.

```typescript
interface Brick {
  id: string;
  x: number;              // Top-left X position
  y: number;              // Top-left Y position
  width: number;          // Width (56px)
  height: number;         // Height (21px)
  color: string;          // HSL color string
  type: BrickType;        // Brick type (normal, metal, cracked, explosive)
  hitsRemaining: number;  // HP (1-4+ depending on level and type)
  maxHits: number;        // Original HP (for damage visualization)
  points: number;         // Score value (10-50)
  row: number;            // Row index in layout
  col: number;            // Column index in layout
  powerUp?: PowerUpType;  // Pre-assigned power-up (5% chance)
}
```

---

### `BrickType`

Brick variants with special behaviors.

```typescript
type BrickType = 'normal' | 'metal' | 'cracked' | 'explosive';
```

**Behaviors**:
- **normal**: Standard destructible brick
- **metal**: Indestructible (except by explosions), "melts together" visually
- **cracked**: Requires 3 hits, shows damage progression
- **explosive**: Destroys surrounding bricks in 1.5 brick radius on destruction

---

### `PowerUp`

Collectible power-up that falls from destroyed bricks.

```typescript
interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;              // Center X position
  y: number;              // Center Y position
  width: number;          // Size (61px)
  height: number;         // Size (61px)
  vy: number;             // Fall speed (2 px/frame)
  active: boolean;        // False when collected or off-screen
}
```

---

### `PowerUpType`

Types of power-ups available.

```typescript
type PowerUpType = 
  | 'multiball'      // Duplicates all balls
  | 'turrets'        // Adds turret cannons to paddle (30 or 15 shots)
  | 'fireball'       // Balls pass through non-metal bricks
  | 'life'           // Extra life (1 per 5 levels)
  | 'slowdown'       // Reduces ball speed to 70% for 15 seconds
  | 'paddleExtend'   // Increases paddle width by 50% for 12 seconds
  | 'paddleShrink'   // Shrinks enemy paddles (future feature)
  | 'shield';        // Absorbs 1 hit from ball/projectile
```

---

### `Enemy`

Small moving enemies that spawn periodically.

```typescript
interface Enemy {
  id: string;
  x: number;              // Center X position
  y: number;              // Center Y position
  vx: number;             // Velocity X (horizontal movement)
  vy: number;             // Velocity Y (vertical movement)
  radius: number;         // Collision radius
  color: string;          // HSL color
  hp: number;             // Hit points (1-3)
  points: number;         // Score value (50-200)
  type?: EnemyType;       // Enemy type (future variants)
}
```

---

### `EnemyType`

Enemy variants (future expansion).

```typescript
type EnemyType = 'basic' | 'fast' | 'tank' | 'shooter';
```

---

### `Boss`

Large boss enemy that appears every 5 levels.

```typescript
interface Boss {
  id: string;
  x: number;              // Center X position
  y: number;              // Center Y position
  vx: number;             // Velocity X
  vy: number;             // Velocity Y
  size: number;           // Radius or half-width (80-120px)
  hp: number;             // Hit points (300-1000+)
  maxHp: number;          // Original HP (for health bar)
  type: BossType;         // Shape type (cube, sphere, pyramid)
  angry: boolean;         // True when HP < 30% (increases speed, changes color)
  lastHitAt: number;      // Timestamp of last damage (for 1-second cooldown)
  rotation: number;       // Visual rotation angle (radians)
  phase: number;          // Battle phase (1-3, for pyramid resurrection)
  attackCooldown: number; // Time until next attack (milliseconds)
  nextAttackTime: number; // Timestamp of next attack
  currentTarget?: { x: number; y: number };  // Movement target position
  points: number;         // Score value (5000-10000)
}
```

---

### `BossType`

Boss shapes.

```typescript
type BossType = 'cube' | 'sphere' | 'pyramid';
```

**Levels**:
- **cube**: Levels 5, 15, 25, 35, 45
- **sphere**: Levels 10, 20, 30, 40, 50
- **pyramid**: Levels 15, 25, 35, 45 (resurrects at 50% HP)

---

### `BossAttack`

Projectile or effect created by boss.

```typescript
interface BossAttack {
  id: string;
  type: 'shot' | 'laser' | 'super' | 'spiral' | 'cross';
  x: number;              // Origin X
  y: number;              // Origin Y
  vx: number;             // Velocity X
  vy: number;             // Velocity Y
  radius: number;         // Collision radius (for shots)
  damage: number;         // Damage amount (1 life or shield)
  active: boolean;        // False when off-screen or hit
  color: string;          // Visual color
  laserWarning?: boolean; // True for laser pre-warning (2-second delay)
  laserEndX?: number;     // Laser end X position
  laserEndY?: number;     // Laser end Y position
}
```

---

### `Bullet`

Projectile fired by turret paddle.

```typescript
interface Bullet {
  id: string;
  x: number;              // Center X position
  y: number;              // Center Y position
  vy: number;             // Velocity Y (moves upward, -8 px/frame)
  radius: number;         // Collision radius (3px)
  damage: number;         // Damage to bricks/enemies (1)
}
```

---

### `BonusLetter`

Collectible letter for Q-U-M-R-A-N bonus.

```typescript
interface BonusLetter {
  id: string;
  letter: 'Q' | 'U' | 'M' | 'R' | 'A' | 'N';
  x: number;              // Center X position
  y: number;              // Center Y position
  vy: number;             // Fall speed (1.5 px/frame)
  width: number;          // Size (40px)
  height: number;         // Size (40px)
  collected: boolean;     // True when collected by paddle
}
```

---

## Visual Effect Types

### `Particle`

Single particle for explosion/destruction effects.

```typescript
interface Particle {
  id: string;
  x: number;              // Current X position
  y: number;              // Current Y position
  vx: number;             // Velocity X (randomized)
  vy: number;             // Velocity Y (affected by gravity)
  life: number;           // Remaining life (0-1, 1 = just created)
  decay: number;          // Life reduction per frame (0.01-0.05)
  color: string;          // HSL color (matches source object)
  size: number;           // Radius (2-6px)
}
```

---

### `Explosion`

Expanding circle explosion effect.

```typescript
interface Explosion {
  id: string;
  x: number;              // Center X position
  y: number;              // Center Y position
  radius: number;         // Current radius (grows over time)
  maxRadius: number;      // Maximum radius (BRICK_WIDTH * 1.5)
  growth: number;         // Radius increase per frame (8px)
  alpha: number;          // Opacity (0-1, fades out)
  decay: number;          // Alpha reduction per frame (0.05)
}
```

---

### `ShieldImpact`

Visual effect when projectile hits shield.

```typescript
interface ShieldImpact {
  x: number;              // Impact X position
  y: number;              // Impact Y position
  radius: number;         // Ripple radius (grows)
  alpha: number;          // Opacity (fades out)
  timestamp: number;      // Creation time (for cleanup)
}
```

---

### `ScreenShake`

Screen shake effect data.

```typescript
interface ScreenShake {
  intensity: number;      // Shake magnitude (0-10 pixels)
  duration: number;       // Total duration (milliseconds)
  decay: number;          // Intensity reduction per frame
}
```

---

### `BackgroundFlash`

Full-screen color flash effect.

```typescript
interface BackgroundFlash {
  active: boolean;        // True when flashing
  color: string;          // RGB color (e.g., 'rgb(255, 0, 0)')
  alpha: number;          // Opacity (0-1)
  decay: number;          // Alpha reduction per frame
}
```

---

## Collision Detection Types

### `CollisionEvent`

Event generated by CCD system.

```typescript
interface CollisionEvent {
  type: 'brick' | 'enemy' | 'boss' | 'paddle' | 'wall' | 'powerup';
  ballId: string;
  objectId?: string;      // ID of collided object (if applicable)
  brick?: Brick;          // Reference to brick (if type === 'brick')
  enemy?: Enemy;          // Reference to enemy (if type === 'enemy')
  boss?: Boss;            // Reference to boss (if type === 'boss')
  normal: { x: number; y: number };  // Collision normal vector
  toi: number;            // Time of Impact (0-1, fraction of frame)
  position: { x: number; y: number }; // Exact collision point
}
```

---

### `CCDResult`

Result of CCD physics update for a ball.

```typescript
interface CCDResult {
  ball: Ball;                     // Updated ball state
  events: CollisionEvent[];       // All collisions this frame
  timings: {
    bossSweep: number;            // Time for boss collision check (ms)
    ccdCore: number;              // Time for CCD substep loop (ms)
    postProcess: number;          // Time for event processing (ms)
  };
}
```

---

### `CollisionHistoryEntry`

Debug snapshot of collision state.

```typescript
interface CollisionHistoryEntry {
  timestamp: number;              // Date.now()
  frameTick: number;              // Game loop frame counter
  ballId: string;
  ballState: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
  };
  event: CollisionEvent;
  substep: number;                // Which CCD substep (0-N)
  toi: number;                    // Time of Impact
}
```

---

## Game Loop Types

### `GameLoopDebugInfo`

Debug information from game loop.

```typescript
interface GameLoopDebugInfo {
  fps: number;                    // Frames per second
  accumulator: number;            // Time accumulator (milliseconds)
  frameTick: number;              // Total frames simulated
  deltaTime: number;              // Fixed time step (16.67ms)
  running: boolean;               // True if game loop active
  paused: boolean;                // True if game paused
}
```

---

### `FixedUpdateCallback`

Callback function for physics updates.

```typescript
type FixedUpdateCallback = (dt: number) => void;
```

**Parameters**:
- `dt`: Fixed time step in seconds (always 1/60 = 0.01667)

---

### `RenderCallback`

Callback function for rendering.

```typescript
type RenderCallback = (alpha: number) => void;
```

**Parameters**:
- `alpha`: Interpolation factor (0-1) for smooth rendering between physics steps

---

## Performance Types

### `QualityLevel`

Visual quality setting.

```typescript
type QualityLevel = 'high' | 'medium' | 'low';
```

**Thresholds**:
- **high**: 60+ FPS
- **medium**: 35-59 FPS
- **low**: < 35 FPS

---

### `FrameProfilerData`

Performance profiling data.

```typescript
interface FrameProfilerData {
  fps: number;
  timings: {
    physics: number;              // Physics update time (ms)
    rendering: number;            // Canvas rendering time (ms)
    events: number;               // Event processing time (ms)
    total: number;                // Total frame time (ms)
  };
  counters: {
    balls: number;
    bricks: number;
    enemies: number;
    particles: number;
    collisions: number;
  };
  bottlenecks: string[];          // Subsystems exceeding budget
}
```

---

## High Score Types

### `HighScore`

Single high score entry (Supabase schema).

```typescript
interface HighScore {
  id: string;                     // UUID
  player_name: string;            // 3-character initials
  score: number;
  level: number;                  // Level reached
  difficulty: string;             // 'easy' | 'normal' | 'hard'
  starting_lives: number;
  beat_level_50: boolean;         // True if reached level 50
  created_at: string;             // ISO 8601 timestamp
}
```

---

### `HighScoreSubmission`

Data for submitting new high score.

```typescript
interface HighScoreSubmission {
  playerName: string;             // 3-character initials
  score: number;
  level: number;
  difficulty: Difficulty;
  startingLives: number;
}
```

---

## Level System Types

### `LevelLayout`

Level brick pattern definition.

```typescript
interface LevelLayout {
  id: number;                     // Level number (1-50+)
  name: string;                   // Level name
  bricks: (boolean | number)[][]; // 2D array (14 rows × 12 columns)
}
```

**Brick Codes**:
- `false`: Empty cell
- `true`: Normal brick
- `2`: Metal brick
- `3`: Explosive brick
- `4`: Cracked brick (3 hits)

---

## Boss System Types

### `BossConfig`

Boss configuration from `bossConfig.ts`.

```typescript
interface BossConfig {
  type: BossType;                 // 'cube' | 'sphere' | 'pyramid'
  baseHp: number;                 // HP at level 5
  hpScaling: number;              // HP multiplier per 5 levels
  size: number;                   // Collision size (radius or half-width)
  speed: number;                  // Movement speed (px/frame)
  angrySpeed: number;             // Speed when HP < 30%
  attackTypes: BossAttackType[];  // Available attack patterns
  attackCooldown: number;         // Time between attacks (ms)
  points: number;                 // Score value
  resurrect?: boolean;            // True for pyramid boss
}
```

---

### `BossAttackType`

Boss attack pattern types.

```typescript
type BossAttackType = 'shot' | 'laser' | 'super' | 'spiral' | 'cross';
```

**Patterns**:
- **shot**: Single projectile aimed at paddle
- **laser**: Horizontal or vertical laser beam (2-second warning)
- **super**: Ring of 8 projectiles
- **spiral**: Rotating spiral of projectiles
- **cross**: 4-directional cross pattern

---

## Event System Types

### `GameEvent`

Queued event for deferred processing.

```typescript
interface GameEvent {
  type: string;                   // Event type identifier
  priority: EventPriority;        // Processing priority
  timestamp: number;              // Creation time
  data: any;                      // Event-specific data
}
```

---

### `EventPriority`

Event processing priority levels.

```typescript
enum EventPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}
```

---

## Utility Types

### `Vector2`

2D vector (position or velocity).

```typescript
interface Vector2 {
  x: number;
  y: number;
}
```

---

### `AABB`

Axis-Aligned Bounding Box for collision detection.

```typescript
interface AABB {
  x: number;                      // Top-left X
  y: number;                      // Top-left Y
  width: number;
  height: number;
}
```

---

### `Circle`

Circle shape for collision detection.

```typescript
interface Circle {
  x: number;                      // Center X
  y: number;                      // Center Y
  radius: number;
}
```

---

## Type Guards

### `isBall`

```typescript
function isBall(obj: any): obj is Ball {
  return obj && typeof obj.x === 'number' && typeof obj.radius === 'number';
}
```

### `isBrick`

```typescript
function isBrick(obj: any): obj is Brick {
  return obj && typeof obj.type === 'string' && typeof obj.hitsRemaining === 'number';
}
```

---

## Related Files

- `src/types/game.ts` - All type definitions
- `src/integrations/supabase/types.ts` - Supabase-generated types (read-only)
- `src/constants/game.ts` - Type-safe constants

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
