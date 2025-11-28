# UI Components

Complete documentation of all React components in the Vibing Arkanoid user interface.

---

## Component Hierarchy

```
App.tsx
└── Index.tsx
    ├── MainMenu.tsx
    │   ├── TopScoresDisplay.tsx
    │   ├── MusicSettings.tsx
    │   ├── Changelog.tsx
    │   └── Instructions (Dialog)
    └── Game.tsx
        ├── GameCanvas.tsx
        ├── GameUI.tsx
        ├── CRTOverlay.tsx
        ├── EndScreen.tsx
        ├── HighScoreEntry.tsx
        ├── HighScoreDisplay.tsx
        └── Debug Components
            ├── DebugDashboard.tsx
            ├── GameLoopDebugOverlay.tsx
            ├── SubstepDebugOverlay.tsx
            ├── CCDPerformanceOverlay.tsx
            ├── FrameProfilerOverlay.tsx
            ├── CollisionHistoryViewer.tsx
            └── QualityIndicator.tsx
```

---

## Entry Point Components

### `src/App.tsx`

**Purpose**: Root application component, routing setup

**Key Features**:
- React Router configuration
- Routes: `/`, `/level-editor`, `*` (404)
- Toaster for notifications
- Global error boundary (future)

**Routes**:
```typescript
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/level-editor" element={<LevelEditor />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

### `src/pages/Index.tsx`

**Purpose**: Main page controller, switches between menu and game

**State**:
```typescript
const [showGame, setShowGame] = useState(false);
const [gameSettings, setGameSettings] = useState<GameSettings>({
  difficulty: 'normal',
  startingLives: 3,
  godMode: false
});
```

**Key Functions**:
- `handleStartGame(settings)` - Transition to game with settings
- `handleExitGame()` - Return to main menu

**Render Logic**:
```typescript
return showGame ? (
  <Game onExit={handleExitGame} gameSettings={gameSettings} />
) : (
  <MainMenu onStartGame={handleStartGame} />
);
```

---

## Main Menu Components

### `src/components/MainMenu.tsx`

**Purpose**: Main menu screen with game options and information

**Props**:
```typescript
interface MainMenuProps {
  onStartGame: (settings: GameSettings) => void;
}
```

**State**:
```typescript
const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
const [godMode, setGodMode] = useState(false);
const [showHighScores, setShowHighScores] = useState(false);
const [showChangelog, setShowChangelog] = useState(false);
const [showInstructions, setShowInstructions] = useState(false);
const [showAbout, setShowAbout] = useState(false);
```

**Sections**:
1. **Title**: "VIBING ARKANOID" (retro pixel font)
2. **Top Scores Marquee**: `<TopScoresDisplay />`
3. **Start Button**: Launches game with selected settings
4. **Options**:
   - Difficulty selector (Easy/Normal/Hard)
   - God Mode toggle
5. **Menu Buttons**:
   - High Scores
   - Instructions
   - What's New (Changelog)
   - About
   - Music Settings

**Styling**:
- Retro CRT aesthetic
- Metal frame border
- Pixel font family
- Cyan/yellow color scheme

---

### `src/components/TopScoresDisplay.tsx`

**Purpose**: Animated marquee of top scores (daily/weekly/all-time)

**Data Source**: `useHighScores` hook

**Animation Logic**:
```typescript
const [displayMode, setDisplayMode] = useState<'daily' | 'weekly' | 'alltime'>('daily');
const [isScrolling, setIsScrolling] = useState(false);

useEffect(() => {
  const cycleInterval = setInterval(() => {
    setIsScrolling(true);
    
    setTimeout(() => {
      setDisplayMode(prev => {
        if (prev === 'daily') return 'weekly';
        if (prev === 'weekly') return 'alltime';
        return 'daily';
      });
      setIsScrolling(false);
    }, 3000); // 3-second scroll duration
  }, 8000); // 5 sec display + 3 sec scroll
  
  return () => clearInterval(cycleInterval);
}, []);
```

**Display Format**:
```
DAILY: QUM 000370
   ↓ (scroll left 3s)
WEEKLY: QUM 065670
   ↓ (scroll left 3s)
ALL-TIME: QUM 065670
   ↓ (scroll left 3s)
DAILY: ...
```

**Styling**:
- Amber LED text (`text-amber-500`)
- Monospace pixel font
- Dark background with border
- Horizontal scroll animation
- Random LED flicker effect during transitions

---

### `src/components/MusicSettings.tsx`

**Purpose**: Audio control panel (music & SFX)

**State**:
```typescript
const [musicEnabled, setMusicEnabled] = useState(true);
const [musicVolume, setMusicVolume] = useState(50);
const [sfxVolume, setSfxVolume] = useState(70);
const [repeatMode, setRepeatMode] = useState<'loop' | 'once'>('loop');
```

**Controls**:
1. **Music Toggle**: On/Off switch
2. **Music Volume**: Slider (0-100%)
3. **SFX Volume**: Slider (0-100%)
4. **Track Navigation**: Previous/Next buttons
5. **Current Track Display**: Shows track name
6. **Repeat Mode**: Loop vs. Play Once

**Integration**:
```typescript
import { setMusicVolume, setSFXVolume, nextTrack, previousTrack } from '@/utils/sounds';

const handleMusicVolumeChange = (value: number) => {
  setMusicVolume(value / 100);
  setMusicVol(value);
};
```

---

### `src/components/Changelog.tsx`

**Purpose**: Version history and "What's New" display

**Data Source**: Hardcoded changelog entries

**Structure**:
```typescript
const changelogData = [
  {
    version: '0.8.0',
    date: '2025-01-18',
    changes: [
      'Added mobile swipe gestures',
      'Improved iOS Safari support',
      'Fixed pause overlay behavior',
      // ... more changes
    ]
  },
  // ... previous versions
];
```

**Rendering**:
- Accordion-style version sections
- Latest version expanded by default
- "What's New" badge on current version
- Grouped by feature categories

---

## Game Components

### `src/components/Game.tsx`

**Purpose**: Core game orchestrator, central game logic hub

**Props**:
```typescript
interface GameProps {
  onExit: () => void;
  gameSettings: GameSettings;
}
```

**State** (60+ state variables):
```typescript
// Game state
const [gameState, setGameState] = useState<'menu' | 'ready' | 'playing' | 'paused' | 'gameover'>('ready');
const [currentLevel, setCurrentLevel] = useState(1);
const [score, setScore] = useState(0);
const [lives, setLives] = useState(3);

// Entities
const [balls, setBalls] = useState<Ball[]>([]);
const [bricks, setBricks] = useState<Brick[]>([]);
const [enemies, setEnemies] = useState<Enemy[]>([]);
const [bosses, setBosses] = useState<Boss[]>([]);
const [paddle, setPaddle] = useState<Paddle>({ x: 400, y: 550, width: 100, height: 15 });

// Power-ups
const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
const [activePowerUps, setActivePowerUps] = useState<string[]>([]);

// Visual effects
const [particles, setParticles] = useState<Particle[]>([]);
const [explosions, setExplosions] = useState<Explosion[]>([]);
const [screenShake, setScreenShake] = useState({ intensity: 0, duration: 0 });
const [backgroundFlash, setBackgroundFlash] = useState({ active: false, color: '', alpha: 0 });

// ... 50+ more state variables
```

**Key Functions**:

#### Game Initialization
```typescript
const initGame = useCallback(() => {
  // Load level layout
  const levelData = levelLayouts[currentLevel - 1];
  
  // Create bricks with progressive HP
  const newBricks = createBricksFromLayout(levelData, currentLevel);
  
  // Assign power-ups (5% of bricks)
  const bricksWithPowerUps = assignPowerUpsToBricks(newBricks, currentLevel, extraLifeUsedLevels);
  
  // Reset paddle and ball
  setPaddle({ x: 400, y: 550, width: 100, height: 15 });
  setBalls([{
    x: 400,
    y: 530,
    vx: 0,
    vy: 0,
    speed: calculateBallSpeed(currentLevel, difficulty),
    radius: BALL_RADIUS,
    attached: true
  }]);
  
  // Clear effects
  setParticles([]);
  setExplosions([]);
  setEnemies([]);
  setBosses([]);
  
  // Set state to ready
  setGameState('ready');
}, [currentLevel, difficulty]);
```

#### Game Loop Integration
```typescript
const gameLoop = useRef<FixedStepGameLoop | null>(null);

useEffect(() => {
  gameLoop.current = new FixedStepGameLoop();
  gameLoop.current.setFixedUpdateCallback(handleFixedUpdate);
  gameLoop.current.start();
  
  return () => {
    gameLoop.current?.stop();
  };
}, []);
```

#### Fixed Update (Physics)
```typescript
const handleFixedUpdate = useCallback((dt: number) => {
  if (gameState !== 'playing') return;
  
  // Update paddle position (from mouse/touch input)
  updatePaddle();
  
  // Process ball physics with CCD
  balls.forEach(ball => {
    const ccdResult = processBallWithCCD(ball, {
      bricks,
      enemies,
      bosses,
      paddle,
      walls: CANVAS_BOUNDS
    });
    
    // Handle collision events
    ccdResult.events.forEach(event => {
      handleCollisionEvent(event);
    });
    
    // Update ball state
    updateBall(ccdResult.ball);
  });
  
  // Update power-ups (falling)
  updatePowerUps(dt);
  
  // Update enemies (movement)
  updateEnemies(dt);
  
  // Update bosses (movement, attacks)
  updateBosses(dt);
  
  // Update bullets (turret shots)
  updateBullets(dt);
  
  // Update particles and effects
  updateParticles(dt);
  updateExplosions(dt);
  
  // Check win/lose conditions
  checkGameOver();
}, [gameState, balls, bricks, enemies, bosses, paddle]);
```

#### Collision Event Handling
```typescript
const handleCollisionEvent = (event: CollisionEvent) => {
  switch (event.type) {
    case 'brick':
      handleBrickCollision(event.brick, event.ball);
      break;
    case 'enemy':
      handleEnemyCollision(event.enemy, event.ball);
      break;
    case 'boss':
      handleBossCollision(event.boss, event.ball);
      break;
    case 'paddle':
      handlePaddleCollision(event.ball);
      break;
    case 'wall':
      // Already handled by CCD
      break;
  }
};

const handleBrickCollision = (brick: Brick, ball: Ball) => {
  // Damage brick
  brick.hitsRemaining -= 1;
  
  if (brick.hitsRemaining <= 0) {
    // Destroy brick
    removeBrick(brick);
    addScore(brick.points);
    
    // Create particles
    createBrickParticles(brick);
    
    // Check for power-up drop (pre-assigned)
    if (brick.powerUp) {
      createPowerUp(brick.powerUp, brick.x, brick.y);
    }
    
    // Explosive chain reaction
    if (brick.type === 'explosive') {
      createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2);
    }
    
    // Play sound
    playSound('glass-breaking', 0.3);
  }
  
  // Screen shake
  triggerScreenShake(3, 100);
};
```

**Component Integrations**:
- `GameCanvas` - Rendering
- `GameUI` - HUD and overlays
- `usePowerUps` - Power-up management
- `useBullets` - Turret bullet system
- `useAdaptiveQuality` - Performance monitoring

---

### `src/components/GameCanvas.tsx`

**Purpose**: Canvas 2D rendering engine

**Props**: All game state (balls, bricks, paddle, enemies, bosses, effects, etc.)

**Rendering Functions**:
- `drawBricks()` - All brick types with visual states
- `drawBall()` - 3D gradient spheres
- `drawPaddle()` - Rounded rectangle with turrets
- `drawBosses()` - 3D wireframe shapes
- `drawEnemies()` - Basic shapes with colors
- `drawPowerUps()` - Icon sprites falling
- `drawBullets()` - Turret projectiles
- `drawParticles()` - Explosion effects
- `drawEffects()` - Screen shake, background flash

**Canvas Setup**:
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });
  
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  // Start render loop
  let animationId: number;
  const render = () => {
    drawEverything(ctx);
    animationId = requestAnimationFrame(render);
  };
  render();
  
  return () => cancelAnimationFrame(animationId);
}, [/* dependencies */]);
```

---

### `src/components/GameUI.tsx`

**Purpose**: HUD and overlay UI elements

**Props**:
```typescript
interface GameUIProps {
  gameState: GameState;
  currentLevel: number;
  score: number;
  lives: number;
  timeElapsed: number;
  ballSpeed: number;
  godMode: boolean;
  bossActive: boolean;
  bossCooldown: number;
  turretsActive: boolean;
  turretAmmo: number;
  isPaused: boolean;
  onResume: () => void;
  onExit: () => void;
}
```

**UI Elements**:

#### HUD (Always Visible)
```typescript
<div className="hud">
  <div className="stat">TIME: {formatTime(timeElapsed)}</div>
  <div className="stat">SCORE: {score.toLocaleString()}</div>
  <div className="stat">LEVEL: {currentLevel}</div>
  <div className="stat">LIVES: {lives}</div>
  <div className="stat">SPEED: {Math.round((ballSpeed / BASE_BALL_SPEED) * 100)}%</div>
  {godMode && <div className="god-mode-indicator">GOD MODE</div>}
</div>
```

#### Ready Message
```typescript
{gameState === 'ready' && (
  <div className="ready-message">
    <h2>READY TO PLAY</h2>
    <p>Click or Press Space to Launch Ball</p>
  </div>
)}
```

#### Pause Overlay
```typescript
{isPaused && (
  <div className="pause-overlay">
    <h2>PAUSED</h2>
    
    <div className="controls-section">
      <h3>Resume Game</h3>
      <p>ESC or P</p>
    </div>
    
    <div className="controls-section">
      <h3>Controls</h3>
      <ul>
        <li>Mouse/Touch: Move Paddle</li>
        <li>Click/Space: Launch Ball</li>
        <li>Space (hold): Fire Turrets</li>
      </ul>
    </div>
    
    <div className="controls-section">
      <h3>Game</h3>
      <ul>
        <li>F: Fullscreen Toggle</li>
        <li>M: Music Settings</li>
        <li>N: Next Track</li>
        <li>B: Previous Track</li>
      </ul>
    </div>
    
    <button onClick={onResume} className="resume-button">RESUME</button>
    <button onClick={onExit} className="exit-button">EXIT TO MAIN MENU</button>
    
    {/* Mobile close button (X) */}
    <button className="mobile-close" onClick={onResume}>×</button>
  </div>
)}
```

#### Boss Cooldown Timer
```typescript
{bossActive && bossCooldown > 0 && (
  <div className="boss-cooldown-timer">
    BOSS INVULNERABLE: {(bossCooldown / 1000).toFixed(1)}s
  </div>
)}
```

#### Turret Ammo Counter
```typescript
{turretsActive && (
  <div className="turret-ammo">
    TURRET AMMO: {turretAmmo}
  </div>
)}
```

---

### `src/components/CRTOverlay.tsx`

**Purpose**: Retro CRT scanline and curvature effects

**Effects**:
1. **Scanlines**: Repeating linear gradient, animated scroll
2. **Screen Curvature**: CSS perspective transform
3. **Flicker**: Random opacity variations
4. **Vignette**: Radial gradient darkening at edges

**CSS**:
```css
.crt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.scanlines {
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: scanline 8s linear infinite;
}

@keyframes scanline {
  0% { transform: translateY(0); }
  100% { transform: translateY(100%); }
}

.crt-curve {
  transform: perspective(400px) rotateX(0.5deg);
  border-radius: 2%;
}

.crt-flicker {
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.98; }
}
```

**Quality Toggle**:
```typescript
{quality !== 'low' && <CRTOverlay />}
```

---

## End Game Components

### `src/components/EndScreen.tsx`

**Purpose**: Game over statistics screen

**Props**:
```typescript
interface EndScreenProps {
  stats: {
    score: number;
    level: number;
    totalPlayTime: number;
    bricksDestroyed: number;
    enemiesKilled: number;
    bossesKilled: number;
    powerUpsCollected: number;
    turretsKillCount: number;
    isLevelSkipper: boolean;
  };
  onMainMenu: () => void;
  onRetry: () => void;
  onViewHighScores: () => void;
}
```

**Display**:
```typescript
<div className="end-screen">
  <h1>GAME OVER</h1>
  
  {stats.isLevelSkipper && (
    <div className="cheater-message">
      LEVEL SKIPPER! CHEATER
    </div>
  )}
  
  <div className="stats-grid">
    <StatCounter label="FINAL SCORE" value={stats.score} duration={2000} />
    <StatCounter label="LEVEL REACHED" value={stats.level} duration={1000} />
    <StatCounter label="PLAY TIME" value={formatTime(stats.totalPlayTime)} duration={1500} />
    <StatCounter label="BRICKS DESTROYED" value={stats.bricksDestroyed} duration={1800} />
    <StatCounter label="ENEMIES KILLED" value={stats.enemiesKilled} duration={1600} />
    <StatCounter label="BOSSES DEFEATED" value={stats.bossesKilled} duration={1400} />
    <StatCounter label="POWER-UPS COLLECTED" value={stats.powerUpsCollected} duration={1700} />
    <StatCounter label="TURRET KILLS" value={stats.turretsKillCount} duration={1900} />
  </div>
  
  <div className="buttons">
    <button onClick={onMainMenu}>MAIN MENU</button>
    <button onClick={onRetry}>RETRY LEVEL</button>
    <button onClick={onViewHighScores}>HIGH SCORES</button>
  </div>
</div>
```

**Animated Counter**:
```typescript
const StatCounter = ({ label, value, duration }: { label: string; value: number; duration: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayValue(Math.floor(value * progress));
      
      if (progress >= 1) clearInterval(interval);
    }, 16);
    
    return () => clearInterval(interval);
  }, [value, duration]);
  
  return (
    <div className="stat-counter">
      <div className="label">{label}</div>
      <div className="value">{displayValue.toLocaleString()}</div>
    </div>
  );
};
```

---

### `src/components/HighScoreEntry.tsx`

**Purpose**: Initial entry form for new high scores

**Props**:
```typescript
interface HighScoreEntryProps {
  score: number;
  level: number;
  onSubmit: (initials: string) => void;
  onSkip: () => void;
}
```

**State**:
```typescript
const [initials, setInitials] = useState(['A', 'A', 'A']);
const [selectedIndex, setSelectedIndex] = useState(0);
```

**Input Handling**:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Suppress all game commands (F, P, ESC, etc.)
  e.preventDefault();
  e.stopPropagation();
  
  if (e.key.match(/^[A-Z0-9]$/i)) {
    // Update current initial
    const newInitials = [...initials];
    newInitials[selectedIndex] = e.key.toUpperCase();
    setInitials(newInitials);
    
    // Move to next position
    if (selectedIndex < 2) {
      setSelectedIndex(selectedIndex + 1);
    }
  } else if (e.key === 'Backspace') {
    // Move back
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  } else if (e.key === 'Enter' && initials.every(c => c !== '')) {
    // Submit
    onSubmit(initials.join(''));
  }
};

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
}, [initials, selectedIndex]);
```

**Particle Effects**:
```typescript
// Celebration particles on mount
useEffect(() => {
  const particleCount = quality === 'high' ? 100 : quality === 'medium' ? 50 : 20;
  createCelebrationParticles(particleCount);
}, []);
```

---

### `src/components/HighScoreDisplay.tsx`

**Purpose**: Leaderboard view (all-time, weekly, daily)

**Data Source**: `useHighScores` hook

**State**:
```typescript
const [selectedTab, setSelectedTab] = useState<'alltime' | 'weekly' | 'daily'>('alltime');
```

**Tabs**:
```typescript
<div className="tabs">
  <button 
    className={selectedTab === 'alltime' ? 'active' : ''} 
    onClick={() => setSelectedTab('alltime')}
  >
    ALL-TIME
  </button>
  <button 
    className={selectedTab === 'weekly' ? 'active' : ''} 
    onClick={() => setSelectedTab('weekly')}
  >
    WEEKLY
  </button>
  <button 
    className={selectedTab === 'daily' ? 'active' : ''} 
    onClick={() => setSelectedTab('daily')}
  >
    DAILY
  </button>
</div>
```

**Score List**:
```typescript
<div className="scores-list">
  {scores[selectedTab].slice(0, 20).map((score, index) => (
    <div key={score.id} className="score-entry">
      <span className="rank">#{index + 1}</span>
      <span className="initials">{score.player_name}</span>
      <span className="score">{score.score.toString().padStart(6, '0')}</span>
      <span className="level">LVL {score.level}</span>
    </div>
  ))}
</div>
```

**Exit Button**:
```typescript
<button className="close-button" onClick={onClose}>×</button>
```

---

## Debug Components

### `src/components/DebugDashboard.tsx`

**Purpose**: Centralized debug control panel

**Toggle**: § key

**Sections**:

#### 1. Debug Overlays
```typescript
<div className="debug-section">
  <h3>Debug Overlays</h3>
  <label>
    <input type="checkbox" checked={settings.showGameLoopDebug} onChange={() => toggle('showGameLoopDebug')} />
    Game Loop Debug
  </label>
  <label>
    <input type="checkbox" checked={settings.showSubstepDebug} onChange={() => toggle('showSubstepDebug')} />
    Substep Debug
  </label>
  <label>
    <input type="checkbox" checked={settings.showCCDPerformance} onChange={() => toggle('showCCDPerformance')} />
    CCD Performance
  </label>
  <label>
    <input type="checkbox" checked={settings.showFrameProfiler} onChange={() => toggle('showFrameProfiler')} />
    Frame Profiler
  </label>
  <label>
    <input type="checkbox" checked={settings.showCollisionHistory} onChange={() => toggle('showCollisionHistory')} />
    Collision History
  </label>
</div>
```

#### 2. Logging Controls
```typescript
<div className="debug-section">
  <h3>Logging</h3>
  <label>
    <input type="checkbox" checked={settings.enableCollisionLogging} onChange={() => toggle('enableCollisionLogging')} />
    Collision Logging
  </label>
  <label>
    <input type="checkbox" checked={settings.enablePowerUpLogging} onChange={() => toggle('enablePowerUpLogging')} />
    Power-Up Logging
  </label>
  <label>
    <input type="checkbox" checked={settings.enablePerformanceLogging} onChange={() => toggle('enablePerformanceLogging')} />
    Performance Logging
  </label>
  <label>
    <input type="checkbox" checked={settings.enableFPSLogging} onChange={() => toggle('enableFPSLogging')} />
    FPS Logging
  </label>
</div>
```

#### 3. Visual Effects
```typescript
<div className="debug-section">
  <h3>Visual Effects</h3>
  <label>
    <input type="checkbox" checked={settings.enableScreenShake} onChange={() => toggle('enableScreenShake')} />
    Screen Shake
  </label>
  <label>
    <input type="checkbox" checked={settings.enableParticles} onChange={() => toggle('enableParticles')} />
    Particles
  </label>
  <label>
    <input type="checkbox" checked={settings.enableExplosions} onChange={() => toggle('enableExplosions')} />
    Explosions
  </label>
  <label>
    <input type="checkbox" checked={settings.enableCRTEffects} onChange={() => toggle('enableCRTEffects')} />
    CRT Effects
  </label>
</div>
```

#### 4. Reference Panel
```typescript
<div className="debug-section">
  <h3>Debug Keys Reference</h3>
  <ul>
    <li><kbd>§</kbd> - Toggle Debug Dashboard</li>
    <li><kbd>1</kbd> - Game Loop Debug</li>
    <li><kbd>2</kbd> - Substep Debug</li>
    <li><kbd>3</kbd> - CCD Performance</li>
    <li><kbd>4</kbd> - Frame Profiler</li>
    <li><kbd>5</kbd> - Collision History</li>
    <li><kbd>L</kbd> - Toggle Logging</li>
    <li><kbd>P</kbd> - Pause Game</li>
    <li><kbd>0</kbd> - Skip Level (Cheater!)</li>
  </ul>
</div>
```

---

### `src/components/QualityIndicator.tsx`

**Purpose**: FPS and quality level display

**Always Visible**: Yes (bottom-left corner)

**Display**:
```typescript
<div className="quality-indicator">
  <div className="fps">FPS: {fps}</div>
  <div className={`quality quality-${quality}`}>
    {quality.toUpperCase()}
  </div>
</div>
```

**Color Coding**:
- **High**: Green (60+ FPS)
- **Medium**: Yellow (35-59 FPS)
- **Low**: Red (< 35 FPS)

---

## Related Files

- `src/components/*.tsx` - All component files
- `src/pages/*.tsx` - Page components
- `src/hooks/useDebugSettings.ts` - Debug state management
- `src/index.css` - Global styles
- `src/components/ui/*.tsx` - Shadcn UI components

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
