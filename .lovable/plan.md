

# Phase 1: Extract Game State from React

## Goal
Move all per-frame entity data out of `useState` hooks in `Game.tsx` and into a plain TypeScript module (`src/engine/state.ts`). This eliminates React reconciliation from the hot path, removing ~15 per-frame `setState` calls and the `useCallback` dependency churn that forces the game loop callback to be recreated every frame.

## Current Problem (lines 7672-7691 of Game.tsx)
The `gameLoop` callback depends on `balls`, `enemies`, `bombs`, `bricks`, `score`, `paddle`, `speedMultiplier`, `explosions`, and more via its `useCallback` dependency array. Every time any of these change (every frame), the callback is recreated, and the `useEffect` on line 7693 re-registers the `requestAnimationFrame`. This is the single biggest source of overhead.

---

## What Gets Extracted vs. What Stays in React

### Extracted to `engine/state.ts` (per-frame hot data)
These are mutated every frame in the game loop and should NOT trigger React re-renders:

| State Variable | Current Hook | Reason |
|---|---|---|
| `balls` | `useState<Ball[]>` | Updated every frame (position, velocity) |
| `paddle` | `useState<Paddle \| null>` | Position updated every frame via input |
| `bricks` | `useState<Brick[]>` | Visibility changes during gameplay |
| `enemies` | `useState<Enemy[]>` | Position/rotation updated every frame |
| `bombs` | `useState<Bomb[]>` | Position updated every frame |
| `explosions` | `useState<Explosion[]>` | Particle positions updated every frame |
| `powerUps` (from hook) | `useState<PowerUp[]>` | Fall position updated every frame |
| `bullets` (from hook) | `useState<Bullet[]>` | Position updated every frame |
| `bonusLetters` | `useState<BonusLetter[]>` | Position updated every frame |
| `bossAttacks` | `useState<BossAttack[]>` | Position updated every frame |
| `boss` | `useState<Boss \| null>` | Position/rotation updated every frame |
| `resurrectedBosses` | `useState<Boss[]>` | Position updated every frame |
| `dangerBalls` | `useState<DangerBall[]>` | Mega boss projectiles |
| `laserWarnings` | `useState<Array>` | Visual warnings |
| `superWarnings` | `useState<Array>` | Visual warnings |
| `shieldImpacts` | `useState<ShieldImpact[]>` | Visual effects |
| `bulletImpacts` | `useState<Array>` | Visual effects |
| `screenShake` | `useState<number>` | Decay per frame |
| `backgroundFlash` | `useState<number>` | Decay per frame |
| `highlightFlash` | `useState<number>` | Decay per frame |
| `backgroundPhase` | `useState<number>` | Animation counter |
| `launchAngle` | `useState<number>` | Oscillating pre-launch angle |
| `speedMultiplier` | `useState<number>` | Changes during gameplay |
| `brickHitSpeedAccumulated` | `useState<number>` | Accumulator |
| `enemiesKilled` | `useState<number>` | Counter |
| `enemySpawnCount` | `useState<number>` | Counter |
| `lastEnemySpawnTime` | `useState<number>` | Timestamp |
| `lastBossSpawnTime` | `useState<number>` | Timestamp |
| `bossHitCooldown` | `useState<number>` | Timer |
| `bossActive` | `useState<boolean>` | Flag |

### Stays in React (UI-layer state, changes infrequently)
These trigger legitimate UI re-renders (menus, overlays, HUD text):

| State Variable | Reason to Keep |
|---|---|
| `score` | Displayed in HUD (throttled snapshot) |
| `lives` | Displayed in HUD (throttled snapshot) |
| `level` | Displayed in HUD, triggers level transitions |
| `timer` | Displayed in HUD (already on 1s interval) |
| `totalPlayTime` | Stats display |
| `gameState` | Controls which React UI is shown (menus, overlays) |
| `showHighScoreEntry/Display/EndScreen` | Modal visibility |
| `showBossRushVictory/ScoreEntry/StatsOverlay` | Modal visibility |
| `bossVictoryOverlayActive` | Overlay visibility |
| `bossRushStatsOverlayActive` | Overlay visibility |
| `getReadyActive` | Overlay visibility |
| `tutorialActive/step` | Tutorial overlay |
| `isFullscreen`, `headerVisible`, `framesVisible` | Layout |
| `musicEnabled`, `sfxEnabled` | Settings toggles |
| `collectedLetters` | HUD bonus display |
| `qualitySettings` | Adaptive quality |
| All boss power-up end times | Timer displays |
| All Boss Rush stat counters | Stats overlay data |

---

## New File: `src/engine/state.ts`

A plain TypeScript module exporting a mutable `GameWorld` object. No React. No hooks. No reactivity.

```typescript
// All per-frame game entity data lives here.
// The game loop reads/writes this directly.
// GameCanvas reads this directly for rendering.
// React never sees these mutations.

export const world = {
  balls: [] as Ball[],
  paddle: null as Paddle | null,
  bricks: [] as Brick[],
  enemies: [] as Enemy[],
  bombs: [] as Bomb[],
  explosions: [] as Explosion[],
  powerUps: [] as PowerUp[],
  bullets: [] as Bullet[],
  bonusLetters: [] as BonusLetter[],
  boss: null as Boss | null,
  resurrectedBosses: [] as Boss[],
  bossAttacks: [] as BossAttack[],
  dangerBalls: [] as DangerBall[],
  laserWarnings: [] as LaserWarning[],
  superWarnings: [] as SuperWarning[],
  shieldImpacts: [] as ShieldImpact[],
  bulletImpacts: [] as BulletImpact[],
  
  // Numeric state
  screenShake: 0,
  backgroundFlash: 0,
  highlightFlash: 0,
  backgroundPhase: 0,
  launchAngle: -20,
  speedMultiplier: 1.05,
  brickHitSpeedAccumulated: 0,
  enemiesKilled: 0,
  enemySpawnCount: 0,
  lastEnemySpawnTime: 0,
  lastBossSpawnTime: 0,
  bossHitCooldown: 0,
  bossActive: false,
  
  // ... additional fields as needed
};

// Reset function for new game / level
export function resetWorld() { ... }
```

## New File: `src/engine/hudSnapshot.ts`

A throttled bridge between the engine and React HUD. The game loop writes to this object every frame; React reads it on a `setInterval` (every 100-166ms = 6-10fps).

```typescript
export const hudSnapshot = {
  score: 0,
  lives: 0,
  level: 0,
  speedPercent: 100,
  bossHealth: 0,
  bossMaxHealth: 0,
  turretShots: 0,
  hasTurrets: false,
  // ... other HUD-visible values
  dirty: false, // flip to trigger React poll
};
```

In `Game.tsx`, a single `useEffect` with `setInterval` at ~100ms polls `hudSnapshot` and batch-updates React state only when `dirty` is true.

---

## Migration Strategy (Incremental)

This is the critical part. We migrate one entity type at a time so the game stays playable after each sub-step.

### Step 1: Create `engine/state.ts` and `engine/hudSnapshot.ts`
- Define `world` object with all entity fields
- Define `hudSnapshot` with HUD-visible fields
- No changes to `Game.tsx` yet

### Step 2: Migrate `balls` 
- Remove `const [balls, setBalls] = useState<Ball[]>([])` from Game.tsx
- Replace all `balls` reads with `world.balls`
- Replace all `setBalls(...)` calls with direct mutation of `world.balls`
- In `GameCanvas`, read `world.balls` instead of props
- Remove `balls` from `gameLoop` dependency array

### Step 3: Migrate `paddle`
- Same pattern as balls
- `paddleXRef` merges naturally into `world.paddle.x`

### Step 4: Migrate `enemies`, `bombs`, `bossAttacks`
- Bulk migration since they follow the same pattern
- Pool helpers (`clearAllEnemies`, `clearAllBombs`) mutate `world` directly

### Step 5: Migrate `bricks`
- Special care: spatial hash rebuild must be triggered on brick visibility changes
- Call `brickSpatialHash.rebuild(world.bricks)` directly after mutations instead of via `useEffect`
- Call `brickRenderer.invalidate()` directly

### Step 6: Migrate `explosions`, `bonusLetters`, `powerUps`, `bullets`
- `usePowerUps` and `useBullets` hooks will need refactoring to read/write `world` instead of using `useState`
- These hooks can become plain functions or lightweight wrappers

### Step 7: Migrate `boss`, `resurrectedBosses`, visual effects
- Boss state, shield impacts, screen shake, flashes
- All visual effect state moves to `world`

### Step 8: Migrate `GameCanvas` to read from `world` directly
- Remove all entity props from `GameCanvasProps` interface
- `GameCanvas` imports `world` and reads directly in its `useEffect` draw loop
- This eliminates React prop diffing for ~20 entity arrays every frame

### Step 9: Decouple `gameLoop` from React
- The `gameLoop` `useCallback` becomes a plain function that reads/writes `world`
- Its dependency array shrinks to `[gameState]` only
- The `useEffect` that starts/stops rAF depends only on `gameState`

### Step 10: Add HUD throttling
- Game loop writes `hudSnapshot.score = world.score` etc. every frame
- React polls at 6-10fps and batch-updates the 5-6 HUD values
- Score, lives, speed, timer, ammo, boss cooldown

---

## Impact on Existing Hooks

### `usePowerUps`
- Currently returns `[powerUps, setPowerUps, ...]` with internal `useState`
- Will be refactored to read/write `world.powerUps` directly
- The `createPowerUp` and `checkPowerUpCollision` functions become plain functions operating on `world`

### `useBullets`
- Same pattern as `usePowerUps`
- Read/write `world.bullets` directly

### `useAdaptiveQuality`
- Stays as-is (React-only, infrequent updates)

### `useLevelProgress`
- Stays as-is (writes to localStorage, infrequent)

---

## Impact on GameCanvas

Currently receives ~30 props, all of which trigger React re-renders when changed. After Phase 1:

```typescript
// Before: 30+ props, re-renders every frame
<GameCanvas balls={balls} paddle={paddle} bricks={bricks} ... />

// After: ~5 props (only non-hot-path data)
<GameCanvas 
  width={SCALED_CANVAS_WIDTH} 
  height={SCALED_CANVAS_HEIGHT}
  level={level}
  gameState={gameState}
  debugEnabled={ENABLE_DEBUG_FEATURES}
/>
```

The `useEffect` inside `GameCanvas` that draws to canvas will import `world` and read entities directly. It already runs its own draw loop -- it just needs to stop depending on React props for entity data.

---

## Risk Mitigation

1. **Stale closure risk**: Since `world` is a module-level mutable object, closures always see the latest data. This actually eliminates the current stale closure bugs that React hooks introduce.

2. **React UI still needs some values**: Score, lives, level changes trigger React UI updates (modals, overlays). These will use the `hudSnapshot` polling mechanism or direct event callbacks (e.g., `onGameOver`, `onLevelComplete`).

3. **Spatial hash sync**: Currently done via `useEffect([bricks])`. After migration, `brickSpatialHash.rebuild()` is called directly after any brick mutation in the game loop -- simpler and more predictable.

4. **Testing**: Each step keeps the game playable. If balls render wrong after Step 2, we fix before proceeding.

---

## Expected Performance Improvement

- **Eliminates ~15 `setState` calls per frame** (the biggest win)
- **Game loop `useCallback` dependency array shrinks from 17 items to 1** (`gameState`)
- **GameCanvas stops re-rendering via React** -- canvas draws happen via its own internal loop reading `world`
- **Estimated frame budget recovery**: 3-8ms per frame (currently spent in React reconciliation + effect scheduling)

This sets the stage for Phase 2 (fully decoupling the rAF loop from React) which becomes straightforward once all hot data lives in `world`.

