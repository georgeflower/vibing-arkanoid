

# Decouple GameCanvas Rendering from React

## Problem

GameCanvas is a 3,800-line React component with a single massive `useEffect` that redraws the entire canvas. It receives ~30 props from Game.tsx, creating two problems:

1. **Unnecessary coupling**: Game.tsx reads `world.*` properties and passes them as props. Since `world` mutations don't trigger React re-renders, canvas redraws only happen as a side-effect of other React state changes -- making frame timing unpredictable.
2. **React overhead**: When a re-render *does* happen, React must diff the entire GameCanvas component, compare all 30+ props, and re-run the 3,800-line useEffect -- all wasted work since the canvas is imperatively drawn anyway.

## Solution

Replace the React-driven rendering with a standalone `requestAnimationFrame` loop that reads directly from `world` (engine/state.ts) and draws to the canvas every frame, completely bypassing React's reconciliation.

## Architecture

```text
BEFORE:
  Game.tsx (React) --> props --> GameCanvas (useEffect draws)
     ^                              |
     |-- world.* reads as props ----+

AFTER:
  Game.tsx (React) --> owns <canvas> element (ref)
                        |
  canvasRenderer.ts --> requestAnimationFrame loop
     reads world.* directly
     reads renderState.* for non-entity data (level, gameState, etc.)
```

## Implementation Steps

### Step 1: Create `src/engine/renderState.ts`

A small mutable singleton (like `world` and `hudSnapshot`) for rendering-only state that doesn't live in `world`:

- `level`, `gameState`, `collectedLetters`, `qualitySettings`
- `showHighScoreEntry`, `bossIntroActive`, `bossSpawnAnimation`
- `tutorialHighlight`, `debugEnabled`, `isMobile`
- `getReadyGlow`, `secondChanceImpact`, `ballReleaseHighlight`
- Canvas dimensions (`width`, `height`)

Game.tsx writes to this whenever these values change. The render loop reads it directly.

### Step 2: Create `src/engine/canvasRenderer.ts`

Extract the 3,500+ lines of drawing logic from GameCanvas.tsx's useEffect into a pure function:

```
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  renderState: RenderState,
  assets: AssetRefs
): void { ... }
```

- Reads all entity data from `world` (balls, bricks, paddle, boss, etc.)
- Reads UI/config data from `renderState`
- Receives pre-loaded image assets via an `assets` object (refs populated once on mount)
- Captures `Date.now()` once at the top and passes it to all sub-functions (eliminates 50+ redundant calls)

### Step 3: Create `src/engine/renderLoop.ts`

A standalone rAF loop manager:

```
export function startRenderLoop(
  canvas: HTMLCanvasElement,
  assets: AssetRefs
): () => void  // returns cleanup/stop function
```

- Calls `requestAnimationFrame` independently of the game logic loop
- Calls `renderFrame()` each frame
- No React dependency -- just reads `world` and `renderState`
- Returns a stop function for cleanup

### Step 4: Simplify GameCanvas component

Reduce GameCanvas to a thin wrapper:

- Renders `<canvas>` element
- Loads image assets into refs on mount (keeps existing image loading useEffects)
- On mount: calls `startRenderLoop(canvas, assets)`
- On unmount: calls the stop function
- No more massive prop list -- only needs `width`, `height`
- Remove the 3,800-line drawing useEffect entirely

### Step 5: Update Game.tsx

- Remove all GameCanvas prop-passing (bricks, balls, paddle, etc.)
- Write to `renderState` when UI-only values change (level, gameState, quality, etc.)
- GameCanvas becomes `<GameCanvas ref={canvasRef} width={w} height={h} />`

## Key Design Decisions

- **`Date.now()` caching**: Captured once per frame and threaded through all drawing functions. Eliminates 50+ system calls per frame.
- **Asset management**: Image refs stay in React (loaded on mount), passed to the render loop as a stable object. No per-frame image loading.
- **Gradients**: Frequently-used gradients (ball glow, shield effects) will be cached and reused rather than recreated every frame.
- **No breaking changes to game logic**: Game.tsx's game loop, physics, and all callbacks remain untouched. Only the rendering pipeline changes.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/engine/renderState.ts` | New | Mutable singleton for render-only config |
| `src/engine/canvasRenderer.ts` | New | Pure render function (extracted from GameCanvas) |
| `src/engine/renderLoop.ts` | New | rAF loop manager |
| `src/components/GameCanvas.tsx` | Rewrite | Thin wrapper: canvas element + asset loading + loop start/stop |
| `src/components/Game.tsx` | Edit | Remove GameCanvas props, write to renderState |

## Risk Mitigation

- The drawing code is a direct extraction -- logic stays identical, just reads from `world`/`renderState` instead of props
- Image loading remains in React useEffects (proven stable)
- If any rendering breaks, the old GameCanvas code is the reference for exact behavior

