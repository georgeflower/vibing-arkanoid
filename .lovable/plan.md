

# Migrate bricks, speedMultiplier, brickHitSpeedAccumulated to `world`

## Scope (strictly limited)

Only these items move to `world` (plain mutable state):

| Variable | Current location | Notes |
|---|---|---|
| `bricks` | `useState<Brick[]>` (line 234) | ~35 `setBricks()` call sites |
| `speedMultiplier` | `useState<number>` (line 287) | ~60 `setSpeedMultiplier()` call sites |
| `brickHitSpeedAccumulated` | `useState<number>` (line 376) | ~53 references |
| `enemiesKilled` | `useState<number>` (line 377) | Counter, mutated in game loop |
| `launchAngle` | `useState<number>` (line 327) | Oscillates every frame pre-launch |
| `backgroundPhase` | `useState<number>` (line 323) | Incremented every frame |

**NOT migrated** (per user request): enemies, bombs, power-ups, bullets, bosses, mega boss, tutorial, adaptive quality, screen shake, particles, laser warnings, bonuses, explosions, gameOverParticles, bulletImpacts, shieldImpacts.

The `world` object already has fields for all of these -- they just need to be wired up.

---

## Technical approach

### Pattern: Compatibility shim (same as balls/paddle)

Each migrated variable gets:

```typescript
// Read alias (live reference every render, but no useState)
const bricks = world.bricks;

// Write shim (supports both direct value and updater function)
const setBricks = useCallback((updater: Brick[] | ((prev: Brick[]) => Brick[])) => {
  if (typeof updater === 'function') {
    world.bricks = updater(world.bricks);
  } else {
    world.bricks = updater;
  }
}, []);
```

This preserves all ~35-60 existing call sites for each variable without changes.

### Stale closure prevention

Any callback that currently reads these variables and has them removed from its dependency array must perform a **live read** from `world` at the top of execution (shadowing the outer variable). This is the same pattern already proven with `balls` and `paddle`.

Key callbacks needing live reads:
- `checkCollision` -- reads `bricks`, `speedMultiplier`, `brickHitSpeedAccumulated`
- `gameLoop` -- reads `speedMultiplier`, `bricks`, `backgroundPhase`, `launchAngle`
- `calculateSpeedForLevel` -- pure function, no issue
- `handleKeyDown` (debug speed +/-) -- reads `speedMultiplier`

### Spatial hash sync

Currently: `useEffect([bricks])` rebuilds spatial hash on change. After migration, `bricks` no longer triggers React effects, so `brickSpatialHash.rebuild()` must be called directly after any mutation that changes brick visibility or layout. The existing `useEffect` on line 598 stays for now as a safety net (it still fires on render), but the critical path calls will be added inline.

### Dependency array cleanup

After migration, the `gameLoop` dependency array loses: `speedMultiplier`, `bricks`, and the `checkCollision` callback stabilizes (fewer deps = less recreation).

---

## Step-by-step changes

### 1. `src/engine/state.ts` -- no changes needed
All fields (`bricks`, `speedMultiplier`, `brickHitSpeedAccumulated`, `enemiesKilled`, `launchAngle`, `backgroundPhase`) already exist in `GameWorld`.

### 2. `src/components/Game.tsx` -- replace useState with shims

**Remove these useState declarations:**
- Line 234: `const [bricks, setBricks] = useState<Brick[]>([])`
- Line 287-307: `const [speedMultiplier, setSpeedMultiplier] = useState(...)`
- Line 376: `const [brickHitSpeedAccumulated, setBrickHitSpeedAccumulated] = useState(0)`
- Line 377: `const [enemiesKilled, setEnemiesKilled] = useState(0)`
- Line 327: `const [launchAngle, setLaunchAngle] = useState(-20)`
- Line 323: `const [backgroundPhase, setBackgroundPhase] = useState(0)`

**Replace with compatibility shims** (same pattern as balls/paddle):
```typescript
// bricks
const bricks = world.bricks;
const setBricks = useCallback((updater) => { ... }, []);

// speedMultiplier
const speedMultiplier = world.speedMultiplier;
const setSpeedMultiplier = useCallback((updater) => { ... }, []);

// brickHitSpeedAccumulated
const brickHitSpeedAccumulated = world.brickHitSpeedAccumulated;
const setBrickHitSpeedAccumulated = useCallback((updater) => { ... }, []);

// enemiesKilled
const enemiesKilled = world.enemiesKilled;
const setEnemiesKilled = useCallback((updater) => { ... }, []);

// launchAngle
const launchAngle = world.launchAngle;
const setLaunchAngle = useCallback((updater) => { ... }, []);

// backgroundPhase
const backgroundPhase = world.backgroundPhase;
const setBackgroundPhase = useCallback((updater) => { ... }, []);
```

**Initialize world values** in `startGame()` (line ~1800):
```typescript
world.speedMultiplier = startingSpeedMultiplier;
world.brickHitSpeedAccumulated = 0;
world.enemiesKilled = 0;
world.launchAngle = -20;
world.backgroundPhase = 0;
```

### 3. Add live reads in key callbacks

In `checkCollision`:
```typescript
const bricks = world.bricks;
const speedMultiplier = world.speedMultiplier;
const brickHitSpeedAccumulated = world.brickHitSpeedAccumulated;
```

In `gameLoop`:
```typescript
const speedMultiplier = world.speedMultiplier;
const bricks = world.bricks;
const launchAngle = world.launchAngle;
const backgroundPhase = world.backgroundPhase;
```

### 4. Clean up dependency arrays

Remove from `checkCollision` deps (line ~5001-5028):
- `bricks`, `speedMultiplier`, `brickHitSpeedAccumulated`

Remove from `gameLoop` deps (line ~7701-7719):
- `speedMultiplier`, `bricks`

### 5. GameCanvas prop

Line 8907: `bricks={bricks}` becomes `bricks={world.bricks}` (or stays as-is since `bricks` is already an alias).

---

## What is NOT touched

- No changes to `src/engine/state.ts` or `src/engine/hudSnapshot.ts`
- No changes to `GameCanvas.tsx` (props interface unchanged for now)
- No migration of enemies, bombs, boss, power-ups, bullets, explosions, screen shake, particles, laser warnings, bonuses, tutorial, adaptive quality, or mega boss state
- The `useEffect` for spatial hash rebuild on line 598 remains as a safety net

## Risk

Low. This follows the exact same proven pattern as the balls/paddle migration. The compatibility shim ensures all ~150 call sites continue working without modification.

