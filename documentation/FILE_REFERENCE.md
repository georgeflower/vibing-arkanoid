# Complete File Reference

Alphabetical index of every file in the Vibing Arkanoid codebase with purpose, exports, and dependencies.

---

## Core Application Files

### `src/main.tsx`
**Purpose**: Application entry point, React mounting  
**Exports**: None (side effects only)  
**Key Functions**:
- Mounts React app to `#root`
- Registers service worker for PWA
- Sets up update checking (5-minute intervals)
- Handles controller change events

**Dependencies**: React, ReactDOM, App.tsx, service worker

---

### `src/App.tsx`
**Purpose**: Root app component, routing setup  
**Exports**: `App` (default)  
**Key Functions**:
- Sets up React Router
- Defines routes: `/`, `/level-editor`, `*` (404)
- Wraps app in Toaster for notifications

**Dependencies**: React Router, Toaster, Index, LevelEditor, NotFound

---

### `src/index.css`
**Purpose**: Global styles, design system tokens  
**Exports**: CSS variables, global styles  
**Key Styles**:
- HSL color tokens (--background, --foreground, etc.)
- Retro pixel fonts (@font-face)
- Reset styles (box-sizing, margins)
- CRT effect variables
- iOS gesture prevention

**Dependencies**: Tailwind CSS, custom fonts

---

## Pages

### `src/pages/Index.tsx`
**Purpose**: Main page - shows menu or active game  
**Exports**: `Index` (default)  
**State**: `showGame` (boolean), `gameSettings` (object)  
**Key Functions**:
- Renders MainMenu or Game based on state
- Manages game start/exit flow
- Passes settings to Game component

**Dependencies**: MainMenu, Game, GameSettings type

---

### `src/pages/LevelEditor.tsx`
**Purpose**: Visual level design tool  
**Exports**: `LevelEditor` (default)  
**Key Functions**:
- Canvas-based brick placement (click/drag)
- Brick type selection (normal, metal, cracked, explosive)
- Export level as JSON
- Import level from JSON
- Visual preview of brick types

**Dependencies**: React, Canvas API, levelLayouts constants

---

### `src/pages/NotFound.tsx`
**Purpose**: 404 error page  
**Exports**: `NotFound` (default)  
**Key Functions**:
- Displays "Page not found" message
- Link back to home

**Dependencies**: React Router Link

---

## Game Components

### `src/components/Game.tsx`
**Purpose**: Core game orchestrator, central game logic  
**Exports**: `Game` (default)  
**Props**: `onExit`, `gameSettings`  
**State**: 60+ state variables (lives, score, balls, bricks, etc.)  
**Key Functions**:
- `initGame()` - Initialize game state
- `startGame()` - Start game loop
- `handleFixedUpdate(dt)` - Physics update callback
- `processBallCollisions()` - Handle CCD results
- `checkGameOver()` - Win/lose conditions
- 20+ game logic functions

**Dependencies**: Every hook, utility, and constant in the game

---

### `src/components/GameCanvas.tsx`
**Purpose**: Canvas 2D rendering engine  
**Exports**: `GameCanvas` (default)  
**Props**: All game state (balls, bricks, paddle, etc.)  
**Key Functions**:
- `drawBricks()` - Render all brick types
- `drawBall()` - 3D gradient sphere
- `drawPaddle()` - Rounded rectangle with turrets
- `drawBosses()` - 3D wireframe bosses
- `drawEffects()` - Particles, explosions, screen shake

**Dependencies**: Canvas 2D API, images, constants

---

### `src/components/GameUI.tsx`
**Purpose**: HUD and overlay UI elements  
**Exports**: `GameUI` (default)  
**Props**: Game state, UI settings  
**Key Functions**:
- HUD: Time, Score, Level, Lives, Speed
- Pause overlay with controls
- Ready message
- Boss cooldown timer
- Turret ammo counter
- God mode indicator

**Dependencies**: React, Tailwind, UI components

---

### `src/components/MainMenu.tsx`
**Purpose**: Main menu screen  
**Exports**: `MainMenu` (default)  
**Props**: `onStartGame`, `onExit`  
**Key Functions**:
- Start game with settings
- Options (difficulty, lives, god mode)
- High scores, changelog, instructions
- Music settings
- Top scores marquee

**Dependencies**: UI components, MusicSettings, TopScoresDisplay

---

### `src/components/EndScreen.tsx`
**Purpose**: Game over statistics screen  
**Exports**: `EndScreen` (default)  
**Props**: Game statistics object  
**Key Functions**:
- Display animated counters (score, stats)
- Show game time, bricks destroyed, etc.
- Buttons: Main Menu, Retry Level, High Scores

**Dependencies**: UI components, motion animations

---

## UI Components (Menus & Overlays)

### `src/components/HighScoreDisplay.tsx`
**Purpose**: Leaderboard view (all-time, weekly, daily)  
**Exports**: `HighScoreDisplay` (default)  
**Key Functions**:
- Tabbed view (3 leaderboards)
- Fetch from Supabase via useHighScores
- Display top 20 scores
- Retro styling (QUM font)

**Dependencies**: useHighScores, UI components

---

### `src/components/HighScoreEntry.tsx`
**Purpose**: Initial entry form for new high scores  
**Exports**: `HighScoreEntry` (default)  
**Props**: `score`, `level`, `onSubmit`  
**Key Functions**:
- 3-character initial input (A-Z, 0-9)
- Animated particle effects
- Submit to Supabase
- Navigate to statistics after submit

**Dependencies**: useHighScores, particle animations

---

### `src/components/TopScoresDisplay.tsx`
**Purpose**: Marquee high score display on main menu  
**Exports**: `TopScoresDisplay` (default)  
**Key Functions**:
- Cycles daily → weekly → all-time every 5 seconds
- Horizontal scroll animation (3 seconds)
- LED-style amber text
- Pinball machine aesthetic

**Dependencies**: useHighScores, animations

---

### `src/components/MusicSettings.tsx`
**Purpose**: Audio control panel  
**Exports**: `MusicSettings` (default)  
**Key Functions**:
- Music toggle, volume sliders
- Track navigation (next/previous)
- Repeat modes
- SFX volume controls

**Dependencies**: sounds utility, UI components

---

### `src/components/Changelog.tsx`
**Purpose**: Version history and updates  
**Exports**: `Changelog` (default)  
**Key Functions**:
- List all version changes
- Grouped by version number
- "What's New" highlight

**Dependencies**: version constant, UI components

---

### `src/components/CRTOverlay.tsx`
**Purpose**: Retro CRT scanline effect  
**Exports**: `CRTOverlay` (default)  
**Key Functions**:
- Animated scanlines
- Curvature effect
- Flicker animation
- Adaptive quality (disabled on low)

**Dependencies**: CSS animations

---

## Debug Components

### `src/components/DebugDashboard.tsx`
**Purpose**: Centralized debug control panel  
**Exports**: `DebugDashboard` (default)  
**Toggle**: § key  
**Key Functions**:
- Enable/disable all debug features
- Overlay toggles
- Logging toggles
- Visual effect toggles
- Instructions reference

**Dependencies**: useDebugSettings

---

### `src/components/GameLoopDebugOverlay.tsx`
**Purpose**: Game loop performance metrics  
**Exports**: `GameLoopDebugOverlay` (default)  
**Key Data**: FPS, accumulator, frame tick  

### `src/components/SubstepDebugOverlay.tsx`
**Purpose**: CCD substep information  
**Key Data**: Substeps, TOI iterations

### `src/components/CCDPerformanceOverlay.tsx`
**Purpose**: CCD timing breakdown  
**Key Data**: Boss sweep, CCD core, post-process times

### `src/components/FrameProfilerOverlay.tsx`
**Purpose**: Subsystem profiling  
**Key Data**: Physics, rendering, events timing

### `src/components/CollisionHistoryViewer.tsx`
**Purpose**: Last 50 collision events  
**Key Data**: Full collision state snapshots

### `src/components/QualityIndicator.tsx`
**Purpose**: FPS and quality level display  
**Always Visible**: Yes (production and dev)

---

## Custom Hooks

### `src/hooks/usePowerUps.ts`
**Exports**: `usePowerUps`  
**Returns**: `{ powerUps, createPowerUp, updatePowerUps, checkPowerUpCollision, extraLifeUsedLevels }`  
**Key Functions**:
- Create power-up from brick
- Update power-up positions (fall)
- Check collision with paddle
- Apply power-up effects

---

### `src/hooks/useBullets.ts`
**Exports**: `useBullets`  
**Returns**: `{ bullets, fireBullet, updateBullets }`  
**Key Functions**:
- Fire turret bullets
- Update bullet positions
- Check collisions with bricks/enemies
- Track level completion from turret kills

---

### `src/hooks/useHighScores.ts`
**Exports**: `useHighScores`  
**Returns**: `{ highScores, topScores, loading, error, submitHighScore, isHighScore, refreshScores }`  
**Key Functions**:
- Fetch all-time, weekly, daily scores from Supabase
- Submit new high score
- Check if score qualifies for leaderboard
- Refresh scores on demand

---

### `src/hooks/useAdaptiveQuality.ts`
**Exports**: `useAdaptiveQuality`  
**Returns**: `{ quality, fps }`  
**Key Functions**:
- Monitor FPS every 2 seconds
- Adjust quality: High (60+ FPS) → Medium (35+ FPS) → Low (25+ FPS)
- Apply quality settings globally

---

### `src/hooks/useSwipeGesture.ts`
**Exports**: `useSwipeGesture`  
**Returns**: Void (side effects only)  
**Key Functions**:
- Detect swipe right from left edge → Pause game
- iOS Safari gesture prevention
- gesturestart/gesturechange handlers

---

### `src/hooks/useDebugSettings.ts`
**Exports**: `useDebugSettings`  
**Returns**: `{ settings, toggleSetting, resetSettings }`  
**Key Functions**:
- Manage 20+ debug toggle states
- Overlay visibility
- Logging controls
- Visual effect toggles

---

## Utility Files

### `src/utils/gameLoop.ts`
**Exports**: `FixedStepGameLoop` (class), type definitions  
**Key Functions**:
- `start()`, `stop()`, `pause()`, `resume()`
- `setFixedUpdateCallback(fn)`
- `setRenderCallback(fn)`
- `getFrameTick()` - Deterministic counter
- `getDebugInfo()` - FPS, accumulator, etc.

---

### `src/utils/gameCCD.ts`
**Exports**: `processBallWithCCD`  
**Returns**: `CCDResult` (ball, events, timings)  
**Key Functions**:
- Convert game objects to CCD format
- Calculate adaptive substeps
- Call processBallCCD
- Process collision events
- Return updated ball state

---

### `src/utils/processBallCCD.ts`
**Exports**: `processBallCCD`  
**Returns**: CCD collision data  
**Key Functions**:
- Swept circle collision detection
- TOI calculation
- Velocity reflection
- Multi-substep iteration
- Collision event generation

---

### `src/utils/eventQueue.ts`
**Exports**: `eventQueue` (singleton), `GameEvent`, `EventPriority` types  
**Key Functions**:
- `enqueue(event)` - Add event to queue
- `process()` - Process up to budget (50 events, 5ms)
- `clear()` - Reset queue
- Priority-based sorting

---

### `src/utils/paddleCollision.ts`
**Exports**: `checkCircleVsRoundedPaddle`  
**Key Functions**:
- Circle vs rounded rectangle collision
- Position-based angle launcher (±80°)
- Corner handling
- Normal calculation

---

### `src/utils/sounds.ts`
**Exports**: Sound manager functions  
**Key Functions**:
- `playSound(name, volume)` - Play sound effect
- `playMusic(track)` - Play background music
- `stopMusic()`, `pauseMusic()`, `resumeMusic()`
- `setMusicVolume(vol)`, `setSFXVolume(vol)`
- Preload all audio files

---

### `src/utils/bossUtils.ts`
**Exports**: `createBoss`, `createResurrectedPyramid`  
**Key Functions**:
- Create boss entity with config
- Create resurrected pyramid with positioning
- Calculate health and stats based on level

---

### `src/utils/bossAttacks.ts`
**Exports**: `performBossAttack`  
**Key Functions**:
- Select attack pattern (weighted random)
- Generate projectiles for attack type
- Trigger laser warnings
- Play attack sounds

---

### `src/utils/frameProfiler.ts`
**Exports**: `frameProfiler` (singleton), types  
**Key Functions**:
- `startFrame()`, `endFrame()`
- `startTiming(subsystem)`, `endTiming(subsystem)`
- `incrementCounter(counter)`
- `getStats()` - FPS, timings, counters, bottlenecks
- `logStats()` - Console output

---

### `src/utils/powerUpAssignment.ts`
**Exports**: `assignPowerUpsToBricks`  
**Key Functions**:
- Pre-assign power-ups to 5% of bricks
- Handle extra life limit (1 per 5 levels)
- Turret time bonus (50% chance at 90+ seconds)
- Random distribution

---

### `src/utils/powerUpImages.ts`
**Exports**: `powerUpImages` (Record)  
**Key Data**: HTMLImageElement for each power-up type  
**Images**: multiball, turrets, fireball, life, slowdown, paddleExtend, paddleShrink, shield

---

### `src/utils/bonusLetterImages.ts`
**Exports**: `bonusLetterImages` (Record)  
**Key Data**: HTMLImageElement for Q, U, M, R, A, N letters

---

### `src/utils/collisionHistory.ts`
**Exports**: `collisionHistory` (singleton), `CollisionHistoryEntry` type  
**Key Functions**:
- `addEntry(entry)` - Add collision to history
- `getHistory()` - Get last 50 collisions
- `exportToJSON()` - Export for debugging
- `clear()` - Reset history

---

### `src/utils/particleLimits.ts`
**Exports**: Particle count limits by quality  
**Key Data**:
- High: 100 particles
- Medium: 50 particles
- Low: 20 particles

---

### `src/utils/performanceProfiler.ts`
**Exports**: Performance profiling utilities  
**Key Functions**:
- `startProfile(label)`, `endProfile(label)`
- `logPerformance()` - Output timing report
- Track bottlenecks

---

### `src/utils/rollingStats.ts`
**Exports**: `RollingStats` class  
**Key Functions**:
- Calculate rolling average
- Track min/max values
- Window-based statistics

---

## Constants

### `src/constants/game.ts`
**Exports**: All game constants  
**Key Constants**:
- Canvas dimensions (800x600)
- Brick dimensions (56x21, padding 4)
- Ball physics (speed 4.5, radius 8)
- Paddle dimensions (100x15)
- Color palettes
- Physics constants

---

### `src/constants/bossConfig.ts`
**Exports**: `BOSS_CONFIGS`  
**Key Data**: Health, size, speed, attacks for cube, sphere, pyramid

---

### `src/constants/levelLayouts.ts`
**Exports**: `levelLayouts`, `getBrickHits`  
**Key Data**: 20+ level patterns with brick types

---

### `src/constants/version.ts`
**Exports**: `GAME_VERSION`  
**Current**: "0.8.0+"

---

## Types

### `src/types/game.ts`
**Exports**: All game type definitions  
**Key Types**:
- `Ball`, `Paddle`, `Brick`, `PowerUp`
- `Enemy`, `Boss`, `BossAttack`
- `GameState`, `Difficulty`, `BrickType`
- `Particle`, `Explosion`, `ShieldImpact`
- 50+ interfaces and types

---

## Integration

### `src/integrations/supabase/client.ts`
**Purpose**: Supabase client configuration  
**Exports**: `supabase` (client instance)  
**Auto-generated**: ✅ Do not edit manually

### `src/integrations/supabase/types.ts`
**Purpose**: Database type definitions  
**Exports**: `Database`, `Tables`, `TablesInsert`, etc.  
**Auto-generated**: ✅ Do not edit manually

---

## Summary Statistics

**Total Files**: 80+  
**Lines of Code**: ~15,000  
**Components**: 30+  
**Custom Hooks**: 6  
**Utility Functions**: 15+  
**Constants**: 100+  
**Type Definitions**: 50+
