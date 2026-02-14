

# Fix: Game activity continues after boss defeat

## Problem

When a boss is defeated, the game loop keeps running because it only checks `gameState !== "playing"` (line 5288). Since `gameState` stays `"playing"` during the boss defeat transition, balls continue moving, enemies remain active, and the player can lose a life while the victory overlay is showing.

The root cause has two parts:

1. **The game loop has no early exit for boss defeat** -- `bossDefeatedTransitioning` is React state, but the game loop uses `useCallback` and doesn't include it in its dependency array (intentionally, to avoid recreation). So even if we added a check, the game loop would read a stale value.

2. **Some boss defeat code paths are inconsistent** -- Several defeat paths inside `checkCollision` (around lines 6883-6900 and 6985-6993) set `bossDefeatedTransitioning` but don't call `setBossVictoryOverlayActive(true)`, and defer `setBossActive(false)` via `setTimeout`, leaving a 3-second window where the game loop runs freely.

## Solution

### 1. Add a ref mirror for `bossDefeatedTransitioning`

Create a `bossDefeatedTransitioningRef` that mirrors the React state. The game loop can read this ref without needing it in a dependency array (no stale closure issue).

```typescript
const bossDefeatedTransitioningRef = useRef(false);
// Keep in sync:
useEffect(() => {
  bossDefeatedTransitioningRef.current = bossDefeatedTransitioning;
}, [bossDefeatedTransitioning]);
```

### 2. Add early return in the game loop

At the top of `gameLoop` (right after line 5288's `gameState` check), add:

```typescript
if (bossDefeatedTransitioningRef.current) return;
```

This completely freezes all game activity (ball movement, enemy updates, collision detection, life loss) while the boss defeat overlay is showing.

### 3. Fix inconsistent boss defeat paths in `checkCollision`

Several boss defeat code paths inside `checkCollision` (reflected attacks killing bosses, around lines 6883-6900 and 6985-6993) are missing:
- `setBossVictoryOverlayActive(true)` -- so no overlay appears
- Immediate `setBossActive(false)` -- they defer it via `setTimeout`, leaving a gap

Update these paths to match the pattern used in the `useBullets` callbacks (lines 1404-1417):
- Set `setBossVictoryOverlayActive(true)` immediately
- Set `setBossActive(false)` immediately (not deferred)
- Keep `setTimeout(() => nextLevel(), 3000)` for level transition timing

### 4. Clear laser warnings on boss defeat

Add `setLaserWarnings([])` to all boss defeat cleanup blocks that are missing it, ensuring no visual artifacts remain.

## Files changed

- `src/components/Game.tsx` -- all changes in this single file

## Risk

Low. The ref-mirror pattern is standard React. The early return prevents all game processing during the transition, which is the expected behavior per the user's requirement.

