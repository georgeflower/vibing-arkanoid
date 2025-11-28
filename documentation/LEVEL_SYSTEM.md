# Level System

Complete documentation of the level design, progression, and difficulty scaling system.

---

## Overview

Vibing Arkanoid features 50+ levels with progressively increasing difficulty, special boss levels, and dynamic brick patterns. The level system combines pre-designed brick layouts with procedural difficulty scaling.

---

## Level Layouts

**File**: `src/constants/levelLayouts.ts`

### Level Data Structure

Each level is defined as a 2D array of brick codes:

```typescript
export const levelLayouts: LevelLayout[] = [
  {
    id: 1,
    name: "Level 1",
    bricks: [
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      // ... more rows
    ]
  },
  // ... more levels
];
```

### Brick Type Codes

| Code | Type | Description |
|------|------|-------------|
| `false` | Empty | No brick in this cell |
| `true` | Normal | Standard destructible brick |
| `2` | Metal | Indestructible (except by explosions) |
| `3` | Explosive | Destroys surrounding bricks in 1.5 brick radius |
| `4` | Cracked | Requires 3 hits to destroy |

### Grid Dimensions

- **Columns**: 12 bricks per row
- **Rows**: 14 rows maximum (though not all levels use all rows)
- **Brick Size**: 56×21 pixels + 4px padding
- **Total Play Area**: 720×350 pixels (bricks section)

---

## Progressive Difficulty System

**Function**: `getBrickHits(level: number, row: number, brickType?: BrickType): number`

### Base Hit Points by Type

1. **Normal Bricks**: Start at 1 hit
2. **Metal Bricks**: Indestructible (returns Infinity)
3. **Cracked Bricks**: Always 3 hits (fixed)
4. **Explosive Bricks**: 1 hit (then chain reaction)

### Progressive Scaling (Normal Bricks Only)

Normal bricks gain additional hit points as levels progress:

```typescript
// Levels 1-10: 1 hit
// Levels 11-20: 2 hits for top 3 rows, 1 hit for rest
// Levels 21-30: 3 hits for top 6 rows, 2 hits for middle, 1 hit for bottom
// Levels 31+: 4 hits for top rows, scaling down by row depth
```

**Formula**:
```typescript
const levelTier = Math.floor((level - 1) / 10);
const additionalHits = Math.max(0, levelTier - Math.floor(row / 3));
return 1 + additionalHits;
```

### Row-Based Scaling

Top rows require more hits than bottom rows:
- **Rows 0-2**: Maximum difficulty (most hits)
- **Rows 3-5**: Medium-high difficulty
- **Rows 6-8**: Medium difficulty
- **Rows 9+**: Lower difficulty (easier to break)

This creates a natural "dig down" mechanic where players work through tougher bricks first.

---

## Boss Levels

**Levels**: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50

### Boss Sequence

Bosses appear in a repeating cycle:

1. **Level 5, 15, 25, 35, 45**: Cube Boss
2. **Level 10, 20, 30, 40, 50**: Sphere Boss
3. **Level 15, 25, 35, 45**: Pyramid Boss (with resurrection)

### Boss Level Behavior

On boss levels:
- No brick layout is loaded
- Boss spawns after 2-second ready countdown
- Enemies spawn periodically during boss fight
- Level completes when boss HP reaches 0
- Boss HP scales with level number

---

## Color Palettes

**File**: `src/constants/game.ts`

Four color palettes cycle every 5 levels:

### Palette 1 (Levels 1-5, 21-25, 41-45)
```typescript
[
  "hsl(210, 100%, 60%)",  // Blue
  "hsl(30, 100%, 60%)",   // Orange
  "hsl(150, 100%, 50%)",  // Green
  "hsl(270, 100%, 60%)",  // Purple
  "hsl(0, 100%, 60%)",    // Red
  "hsl(60, 100%, 60%)"    // Yellow
]
```

### Palette 2 (Levels 6-10, 26-30, 46-50)
```typescript
[
  "hsl(180, 100%, 50%)",  // Cyan
  "hsl(300, 100%, 60%)",  // Magenta
  "hsl(90, 100%, 50%)",   // Lime
  "hsl(330, 100%, 60%)",  // Pink
  "hsl(200, 100%, 60%)",  // Sky Blue
  "hsl(40, 100%, 60%)"    // Gold
]
```

### Palette 3 (Levels 11-15, 31-35)
```typescript
[
  "hsl(240, 100%, 60%)",  // Indigo
  "hsl(15, 100%, 60%)",   // Coral
  "hsl(120, 100%, 50%)",  // Emerald
  "hsl(280, 100%, 60%)",  // Violet
  "hsl(350, 100%, 60%)",  // Crimson
  "hsl(50, 100%, 60%)"    // Amber
]
```

### Palette 4 (Levels 16-20, 36-40)
```typescript
[
  "hsl(190, 100%, 50%)",  // Turquoise
  "hsl(310, 100%, 60%)",  // Fuchsia
  "hsl(100, 100%, 50%)",  // Chartreuse
  "hsl(340, 100%, 60%)",  // Rose
  "hsl(220, 100%, 60%)",  // Azure
  "hsl(45, 100%, 60%)"    // Sunflower
]
```

### Color Assignment Logic

```typescript
const paletteIndex = Math.floor((level - 1) / 5) % 4;
const palette = BRICK_PALETTES[paletteIndex];
const colorIndex = row % palette.length;
const brickColor = palette[colorIndex];
```

---

## Level Editor

**Route**: `/level-editor`  
**File**: `src/pages/LevelEditor.tsx`

### Features

- **Canvas-Based Interface**: Click and drag to place bricks
- **Brush System**: Select brick type, paint multiple cells
- **Visual Preview**: See exact in-game appearance of each brick type
- **Right-Click Clear**: Remove bricks from grid
- **Export/Import**: Save/load levels as JSON

### Brick Type Selection

1. **Normal Brick**: Standard yellow brick
2. **Metal Brick**: Indestructible gray brick
3. **Cracked Brick**: Multi-hit brick with crack textures
4. **Explosive Brick**: Red brick with bomb emoji indicator
5. **Empty**: Clear cell

### Export Format

```json
{
  "id": 21,
  "name": "Custom Level",
  "bricks": [
    [true, 2, 4, 3, true, true, true, true, true, true, true, true],
    [false, false, false, false, false, false, false, false, false, false, false, false],
    // ... 14 rows total
  ]
}
```

### Integration Workflow

1. Design level in editor
2. Export as JSON
3. Add to `levelLayouts` array in `src/constants/levelLayouts.ts`
4. Assign level number
5. Test in game

---

## Level Completion Logic

**File**: `src/components/Game.tsx`

### Brick-Based Levels

Level is complete when:
```typescript
const remainingDestructibleBricks = bricks.filter(brick => brick.type !== 'metal').length;
if (remainingDestructibleBricks === 0) {
  nextLevel();
}
```

### Boss Levels

Level is complete when:
```typescript
if (boss && boss.hp <= 0) {
  handleBossDefeat();
  setTimeout(() => nextLevel(), 3000); // 3-second victory screen
}
```

### Turret Kill Completion

Turret bullets can complete levels:
```typescript
// In useBullets.ts
const remainingBricks = bricksRef.current.filter(b => b.type !== 'metal').length;
if (remainingBricks === 0) {
  onLevelComplete?.(); // Triggers nextLevel()
}
```

---

## Level Progression

### Starting a Level

```typescript
const initGame = () => {
  // 1. Load level layout
  const levelData = levelLayouts[currentLevel - 1];
  
  // 2. Initialize bricks with progressive HP
  const newBricks = createBricksFromLayout(levelData, currentLevel);
  
  // 3. Assign power-ups (5% of destructible bricks)
  const bricksWithPowerUps = assignPowerUpsToBricks(newBricks, currentLevel);
  
  // 4. Calculate ball speed for this level
  const newBallSpeed = calculateBallSpeed(currentLevel, difficulty);
  
  // 5. Reset paddle, ball, and UI state
  // 6. Show "READY TO PLAY" countdown
};
```

### Next Level Transition

```typescript
const nextLevel = () => {
  // 1. Clear all active entities (balls, enemies, power-ups, bullets)
  // 2. Increment level counter
  // 3. Add level completion bonus to score
  // 4. Check for boss level (5, 10, 15, etc.)
  // 5. Initialize next level
  // 6. Play level music (changes every 5 levels)
};
```

### Level Skip (Debug Only)

- **Key**: `0` (zero)
- **Effect**: Skips current level, marks player as "level skipper"
- **Penalty**: Disqualified from high score leaderboard
- **Display**: "LEVEL SKIPPER! CHEATER" on game over screen

---

## Difficulty Modes

**File**: `src/pages/Index.tsx`

### Easy Mode
- Starting Lives: 5
- Ball Speed Multiplier: 0.85× (15% slower)
- Power-up Drop Rate: Standard (5%)

### Normal Mode (Default)
- Starting Lives: 3
- Ball Speed Multiplier: 1.0×
- Power-up Drop Rate: Standard (5%)

### Hard Mode
- Starting Lives: 3
- Ball Speed Multiplier: 1.25× (25% faster)
- Power-up Drop Rate: Reduced (3%)
- Enemy Spawn Rate: +50%

### God Mode
- Starting Lives: Infinite (respawn on death)
- Ball Speed Multiplier: 1.25×
- Power-up Drop Rate: Standard (5%)
- Turret Ammo: 15 shots (vs. 30 in normal mode)
- **Note**: Cannot submit to high score leaderboard

---

## Speed Scaling System

**File**: `src/constants/game.ts`

### Base Speed

```typescript
export const BASE_BALL_SPEED = 4.5; // pixels per frame (60Hz)
```

### Level-Based Speed Increase

```typescript
const levelSpeedMultiplier = 1 + (currentLevel - 1) * 0.02; // +2% per level
const difficultyMultiplier = getDifficultyMultiplier(difficulty);
const finalSpeed = BASE_BALL_SPEED * levelSpeedMultiplier * difficultyMultiplier;
```

### Speed Display (HUD)

Displays current speed as percentage of base:
```typescript
const speedPercent = Math.round((currentSpeed / BASE_BALL_SPEED) * 100);
// "SPEED: 150%" on Level 25 (Normal difficulty)
```

### Speed Power-ups

- **Slowdown**: Reduces speed to 70% for 15 seconds
- **Fireball**: Maintains current speed, adds pass-through

---

## Level Statistics Tracking

**File**: `src/components/Game.tsx`

### Per-Level Stats

```typescript
interface LevelStats {
  bricksDestroyed: number;
  enemiesKilled: number;
  powerUpsCollected: number;
  turretsKillCount: number;
  bossesKilled: number;
  timeElapsed: number; // milliseconds
}
```

### Game Session Stats

Accumulated across all levels in a single session:
- Total play time (formatted as "XX min YY seconds")
- Total score
- Highest level reached
- Total bricks destroyed
- Total enemies killed
- Total bosses defeated
- Total power-ups collected

### Stats Reset Conditions

Stats reset when:
- Starting a new game from main menu
- Clicking "RETRY LEVEL" on game over screen

Stats persist when:
- Losing a life (continuing same session)
- Completing a level (advancing to next)
- Pausing/resuming game

---

## Level Design Best Practices

### Balance Guidelines

1. **Early Levels (1-10)**: Simple patterns, mostly normal bricks, teach mechanics
2. **Mid Levels (11-30)**: Introduce metal/cracked/explosive combinations, complex patterns
3. **Late Levels (31-50)**: High HP bricks, strategic metal placement, explosive chains

### Special Brick Placement

- **Metal Bricks**: Use for structural barriers, protect valuable areas, force angle shots
- **Cracked Bricks**: Place in high-traffic areas (center), require sustained focus
- **Explosive Bricks**: Create chain reaction opportunities, clear dense clusters

### Empty Space Strategy

Leave strategic gaps to:
- Create ball trap hazards
- Force specific shot angles
- Increase difficulty through fewer collision opportunities

---

## Future Level Expansion

### Adding New Levels

1. Design in Level Editor
2. Export JSON
3. Add to `levelLayouts` array
4. Update boss level logic if adding past level 50
5. Test progressive difficulty scaling
6. Verify color palette assignment

### Level Rotation System (Future)

Potential features:
- Daily challenge levels
- User-generated content (UGC) upload
- Randomized brick patterns
- Procedural generation with seed

---

## Related Files

- `src/constants/levelLayouts.ts` - Level data
- `src/constants/game.ts` - Physics constants, colors
- `src/pages/LevelEditor.tsx` - Visual level designer
- `src/components/Game.tsx` - Level initialization and progression
- `src/components/GameCanvas.tsx` - Brick rendering

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
