# Game Constants Reference

Complete listing of all hardcoded constants and configuration values in Vibing Arkanoid.

**Primary File**: `src/constants/game.ts`

---

## Canvas Dimensions

```typescript
export const CANVAS_WIDTH = 800;   // pixels
export const CANVAS_HEIGHT = 600;  // pixels
```

**Aspect Ratio**: 4:3

---

## Brick Constants

### Dimensions

```typescript
export const BRICK_WIDTH = 56;     // pixels
export const BRICK_HEIGHT = 21;    // pixels
export const BRICK_PADDING = 4;    // pixels (gap between bricks)
```

### Layout Grid

```typescript
export const BRICK_ROWS = 14;      // maximum rows per level
export const BRICK_COLS = 12;      // columns per row
```

**Total Grid Width**: `(56 + 4) × 12 = 720px`  
**Total Grid Height**: `(21 + 4) × 14 = 350px`

### Brick Types

```typescript
export const BRICK_TYPES = {
  NORMAL: 'normal',
  METAL: 'metal',
  CRACKED: 'cracked',
  EXPLOSIVE: 'explosive'
} as const;
```

### Point Values

```typescript
export const BRICK_POINTS = {
  normal: 10,
  metal: 0,        // Can't be destroyed normally
  cracked: 30,     // 3 hits required
  explosive: 50    // Chain reaction
};
```

---

## Ball Constants

### Physics

```typescript
export const BASE_BALL_SPEED = 4.5;      // pixels per frame (60Hz)
export const BALL_RADIUS = 8;            // pixels
export const BALL_SPEED_INCREMENT = 0.02; // +2% per level
```

### Speed Calculation

```typescript
// Speed for a given level and difficulty
const levelMultiplier = 1 + (level - 1) * BALL_SPEED_INCREMENT;
const difficultyMultiplier = {
  easy: 0.85,
  normal: 1.0,
  hard: 1.25
};

const finalSpeed = BASE_BALL_SPEED * levelMultiplier * difficultyMultiplier;
```

---

## Paddle Constants

```typescript
export const PADDLE_WIDTH = 100;         // pixels (default)
export const PADDLE_HEIGHT = 15;         // pixels
export const PADDLE_Y = 550;             // Y position (fixed)
export const PADDLE_SPEED = 12;          // keyboard movement speed (px/frame)
```

### Paddle Bounds

```typescript
export const PADDLE_MIN_X = PADDLE_WIDTH / 2;
export const PADDLE_MAX_X = CANVAS_WIDTH - PADDLE_WIDTH / 2;
```

### Power-up Modifiers

```typescript
export const PADDLE_EXTEND_MULTIPLIER = 1.5;   // 150% width for 12 seconds
export const PADDLE_SHRINK_MULTIPLIER = 0.5;   // 50% width (enemy paddle, future)
```

---

## Power-up Constants

### Dimensions

```typescript
export const POWERUP_SIZE = 61;          // width and height (pixels)
export const POWERUP_FALL_SPEED = 2;     // pixels per frame
```

### Drop Rate

```typescript
export const POWERUP_DROP_CHANCE = 0.05; // 5% of destructible bricks
```

**Pre-assignment**: Power-ups are assigned to 5% of bricks at level initialization, not rolled on destruction.

### Power-up Durations

```typescript
export const POWERUP_DURATIONS = {
  turrets: 20000,        // 20 seconds
  fireball: 10000,       // 10 seconds
  slowdown: 15000,       // 15 seconds
  paddleExtend: 12000,   // 12 seconds
  shield: 15000          // 15 seconds
};
```

### Turret Ammo

```typescript
export const TURRET_AMMO_NORMAL = 30;    // shots in normal mode
export const TURRET_AMMO_GOD = 15;       // shots in god mode
```

---

## Enemy Constants

```typescript
export const ENEMY_RADIUS = 12;          // pixels
export const ENEMY_SPEED = 2;            // pixels per frame
export const ENEMY_HP = 1;               // hit points
export const ENEMY_POINTS = 100;         // score value
export const ENEMY_SPAWN_INTERVAL = 5000; // 5 seconds
```

---

## Boss Constants

### Boss Levels

```typescript
export const BOSS_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
```

### Boss Sequence

```typescript
export const BOSS_SEQUENCE = {
  5: 'cube',
  10: 'sphere',
  15: 'pyramid',
  20: 'cube',
  25: 'sphere',
  // ... repeating pattern
};
```

### Boss Dimensions

```typescript
export const BOSS_SIZE = {
  cube: 100,       // half-width
  sphere: 80,      // radius
  pyramid: 120     // base half-width
};
```

### Boss HP Scaling

```typescript
export const BOSS_BASE_HP = {
  cube: 300,
  sphere: 400,
  pyramid: 500
};

export const BOSS_HP_SCALING = 1.5; // Multiplier per 5 levels

// HP calculation
const bossHP = BOSS_BASE_HP[type] * Math.pow(BOSS_HP_SCALING, Math.floor(level / 5));
```

### Boss Cooldowns

```typescript
export const BOSS_HIT_COOLDOWN = 1000;     // 1 second between hits
export const BOSS_ATTACK_COOLDOWN = 3000;  // 3 seconds between attacks
```

### Boss Angry Threshold

```typescript
export const BOSS_ANGRY_THRESHOLD = 0.3;   // 30% HP remaining
```

---

## Color Palettes

### Brick Colors (4 Palettes)

```typescript
export const BRICK_PALETTES = [
  // Palette 1 (Levels 1-5, 21-25, 41-45)
  [
    "hsl(210, 100%, 60%)",  // Blue
    "hsl(30, 100%, 60%)",   // Orange
    "hsl(150, 100%, 50%)",  // Green
    "hsl(270, 100%, 60%)",  // Purple
    "hsl(0, 100%, 60%)",    // Red
    "hsl(60, 100%, 60%)"    // Yellow
  ],
  
  // Palette 2 (Levels 6-10, 26-30, 46-50)
  [
    "hsl(180, 100%, 50%)",  // Cyan
    "hsl(300, 100%, 60%)",  // Magenta
    "hsl(90, 100%, 50%)",   // Lime
    "hsl(330, 100%, 60%)",  // Pink
    "hsl(200, 100%, 60%)",  // Sky Blue
    "hsl(40, 100%, 60%)"    // Gold
  ],
  
  // Palette 3 (Levels 11-15, 31-35)
  [
    "hsl(240, 100%, 60%)",  // Indigo
    "hsl(15, 100%, 60%)",   // Coral
    "hsl(120, 100%, 50%)",  // Emerald
    "hsl(280, 100%, 60%)",  // Violet
    "hsl(350, 100%, 60%)",  // Crimson
    "hsl(50, 100%, 60%)"    // Amber
  ],
  
  // Palette 4 (Levels 16-20, 36-40)
  [
    "hsl(190, 100%, 50%)",  // Turquoise
    "hsl(310, 100%, 60%)",  // Fuchsia
    "hsl(100, 100%, 50%)",  // Chartreuse
    "hsl(340, 100%, 60%)",  // Rose
    "hsl(220, 100%, 60%)",  // Azure
    "hsl(45, 100%, 60%)"    // Sunflower
  ]
];
```

### Color Assignment

```typescript
const paletteIndex = Math.floor((level - 1) / 5) % 4;
const colorIndex = row % BRICK_PALETTES[paletteIndex].length;
```

---

## Physics Constants

### Gravity

```typescript
export const GRAVITY = 0.2;              // pixels per frame² (for particles)
```

### Friction

```typescript
export const AIR_FRICTION = 0.98;        // velocity multiplier per frame
```

### Collision Tolerance

```typescript
export const COLLISION_EPSILON = 0.001;  // minimum TOI to consider
export const PENETRATION_EPSILON = 0.5;  // max allowed penetration (pixels)
```

---

## CCD Constants

### Substeps

```typescript
export const MIN_SUBSTEPS = 1;
export const MAX_SUBSTEPS = 8;

// Adaptive substep calculation
const substeps = Math.min(
  MAX_SUBSTEPS,
  Math.max(MIN_SUBSTEPS, Math.ceil(ball.speed / 4))
);
```

### TOI Iterations

```typescript
export const MAX_TOI_ITERATIONS = 10;    // max iterations to find TOI
export const TOI_TOLERANCE = 0.0001;     // convergence threshold
```

---

## Explosion Constants

```typescript
export const EXPLOSION_RADIUS = BRICK_WIDTH * 1.5;  // 84 pixels
export const EXPLOSION_GROWTH_RATE = 8;             // px/frame
export const EXPLOSION_DECAY_RATE = 0.05;           // alpha/frame
```

---

## Particle System Constants

### Particle Limits

```typescript
export const PARTICLE_LIMITS = {
  high: 100,       // max particles on high quality
  medium: 50,
  low: 20
};
```

### Particle Counts per Event

```typescript
export const PARTICLES_PER_BRICK = {
  high: 12,
  medium: 6,
  low: 3
};
```

### Particle Physics

```typescript
export const PARTICLE_SPEED_MIN = 2;     // px/frame
export const PARTICLE_SPEED_MAX = 6;     // px/frame
export const PARTICLE_DECAY = 0.02;      // life reduction per frame
export const PARTICLE_SIZE_MIN = 2;      // pixels
export const PARTICLE_SIZE_MAX = 6;      // pixels
```

---

## Screen Shake Constants

```typescript
export const SCREEN_SHAKE_INTENSITY = {
  brick: 3,        // pixels
  enemy: 5,
  boss: 8,
  explosion: 10
};

export const SCREEN_SHAKE_DURATION = {
  brick: 100,      // milliseconds
  enemy: 150,
  boss: 200,
  explosion: 300
};
```

---

## Performance Thresholds

### FPS Targets

```typescript
export const TARGET_FPS = 60;            // frames per second
export const FIXED_TIME_STEP = 1 / 60;   // 16.67 milliseconds
```

### Quality Thresholds

```typescript
export const FPS_THRESHOLDS = {
  high: 60,        // 60+ FPS
  medium: 35,      // 35-59 FPS
  low: 25          // < 35 FPS
};
```

### Frame Budget

```typescript
export const MAX_FRAME_TIME = 16.67;     // milliseconds (60 FPS)
export const EVENT_BUDGET = 5;           // max ms per frame for events
export const MAX_EVENTS_PER_FRAME = 50;  // max events processed per frame
```

---

## Bonus Letter Constants

```typescript
export const BONUS_LETTERS = ['Q', 'U', 'M', 'R', 'A', 'N'];
export const BONUS_LETTER_SIZE = 40;     // pixels
export const BONUS_LETTER_FALL_SPEED = 1.5; // px/frame
export const BONUS_LETTER_REWARD = {
  points: 500000,    // 500k points
  lives: 5           // 5 extra lives
};
```

### Bonus Letter Assignment

```typescript
export const BONUS_LETTER_ELIGIBLE_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];
```

First 6 levels from this list get randomized letters (Q, U, M, R, A, N).

---

## Sound Constants

### Volume Defaults

```typescript
export const DEFAULT_MUSIC_VOLUME = 0.5;    // 50%
export const DEFAULT_SFX_VOLUME = 0.7;      // 70%
```

### Sound Effects

```typescript
export const SOUND_COOLDOWN = 50;           // ms between same sounds
```

---

## UI Constants

### HUD Positioning

```typescript
export const HUD_MARGIN = 20;               // pixels from edges
export const HUD_SPACING = 30;              // pixels between elements
```

### Font Sizes

```typescript
export const FONT_SIZES = {
  title: '64px',
  subtitle: '32px',
  hud: '20px',
  score: '24px',
  message: '48px'
};
```

---

## Mobile Constants

### Touch Zones

```typescript
export const TOUCH_ZONE_LEFT = 0.15;        // 15% of screen width
export const TOUCH_ZONE_RIGHT = 0.85;       // 85% of screen width
export const TOUCH_ZONE_CONTROL_START = 0.15; // Start of control zone
export const TOUCH_ZONE_CONTROL_END = 0.85;   // End of control zone
```

### Gesture Thresholds

```typescript
export const SWIPE_MIN_DISTANCE = 50;       // pixels
export const SWIPE_MAX_TIME = 300;          // milliseconds
```

---

## Timing Constants

### Countdowns

```typescript
export const READY_COUNTDOWN = 2000;        // 2 seconds before ball launch
export const BOSS_SPAWN_DELAY = 2000;       // 2 seconds after level start
export const LEVEL_TRANSITION_DELAY = 3000; // 3 seconds after boss defeat
```

### Intervals

```typescript
export const ENEMY_SPAWN_INTERVAL = 5000;   // 5 seconds
export const SHIELD_CLEANUP_INTERVAL = 500; // 0.5 seconds
export const PERFORMANCE_LOG_INTERVAL = 5000; // 5 seconds
```

---

## High Score Constants

### Leaderboard Size

```typescript
export const LEADERBOARD_SIZE = 20;         // Top 20 scores per leaderboard
```

### Time Windows

```typescript
export const DAILY_WINDOW = 24 * 60 * 60 * 1000;   // 24 hours
export const WEEKLY_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
```

---

## Debug Constants

### Keyboard Shortcuts

```typescript
export const DEBUG_KEYS = {
  DASHBOARD: '§',        // Toggle debug dashboard
  GAME_LOOP: '1',
  SUBSTEP: '2',
  CCD_PERF: '3',
  FRAME_PROFILER: '4',
  COLLISION_HISTORY: '5',
  LOGGING: 'L',
  PAUSE: 'P',
  LEVEL_SKIP: '0',       // Cheater!
  FULLSCREEN: 'F',
  MUSIC_SETTINGS: 'M',
  NEXT_TRACK: 'N',
  PREV_TRACK: 'B'
};
```

---

## Version

```typescript
export const GAME_VERSION = '0.8.0+';
```

---

## Related Files

- `src/constants/game.ts` - Main constants file
- `src/constants/bossConfig.ts` - Boss-specific constants
- `src/constants/levelLayouts.ts` - Level layout data
- `src/constants/version.ts` - Version string

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
