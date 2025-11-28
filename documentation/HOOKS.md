# Custom React Hooks

Complete documentation of all custom React hooks used in Vibing Arkanoid for state management and side effects.

---

## Overview

The game uses 6 custom hooks to encapsulate reusable logic for power-ups, bullets, scores, quality management, gestures, and debug settings.

---

## `usePowerUps`

**File**: `src/hooks/usePowerUps.ts`

**Purpose**: Manage power-up creation, movement, collision detection, and effects

### Return Value

```typescript
interface UsePowerUpsReturn {
  powerUps: PowerUp[];
  createPowerUp: (type: PowerUpType, x: number, y: number) => void;
  updatePowerUps: (dt: number) => void;
  checkPowerUpCollision: (paddle: Paddle) => void;
  extraLifeUsedLevels: Set<number>;
}
```

### State

```typescript
const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
const [extraLifeUsedLevels, setExtraLifeUsedLevels] = useState<Set<number>>(new Set());
```

### Key Functions

#### `createPowerUp`

```typescript
const createPowerUp = useCallback((type: PowerUpType, x: number, y: number) => {
  // Check extra life constraints (1 per 5 levels)
  const levelGroup = Math.floor((currentLevel - 1) / 5);
  if (type === 'life' && extraLifeUsedLevels.has(levelGroup)) {
    return; // Skip - already used in this level group
  }
  
  const newPowerUp: PowerUp = {
    id: `powerup-${Date.now()}-${Math.random()}`,
    type,
    x,
    y,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    vy: 2, // Fall speed
    active: true
  };
  
  setPowerUps(prev => [...prev, newPowerUp]);
}, [currentLevel, extraLifeUsedLevels]);
```

#### `updatePowerUps`

```typescript
const updatePowerUps = useCallback((dt: number) => {
  setPowerUps(prev => 
    prev
      .map(powerUp => ({
        ...powerUp,
        y: powerUp.y + powerUp.vy
      }))
      .filter(powerUp => powerUp.y < CANVAS_HEIGHT) // Remove off-screen
  );
}, []);
```

#### `checkPowerUpCollision`

```typescript
const checkPowerUpCollision = useCallback((paddle: Paddle) => {
  setPowerUps(prev => {
    return prev.filter(powerUp => {
      // AABB collision detection
      const collision = 
        powerUp.x < paddle.x + paddle.width &&
        powerUp.x + powerUp.width > paddle.x &&
        powerUp.y < paddle.y + paddle.height &&
        powerUp.y + powerUp.height > paddle.y;
      
      if (collision) {
        // Apply power-up effect
        applyPowerUpEffect(powerUp.type);
        
        // Mark extra life as used for level group
        if (powerUp.type === 'life') {
          const levelGroup = Math.floor((currentLevel - 1) / 5);
          setExtraLifeUsedLevels(prev => new Set(prev).add(levelGroup));
        }
        
        // Play sound
        playSound(POWERUP_SOUNDS[powerUp.type]);
        
        // Remove power-up
        return false;
      }
      
      return true; // Keep power-up
    });
  });
}, [currentLevel, applyPowerUpEffect]);
```

#### `applyPowerUpEffect`

```typescript
const applyPowerUpEffect = useCallback((type: PowerUpType) => {
  switch (type) {
    case 'multiball':
      // Duplicate all balls
      setBalls(prev => [
        ...prev,
        ...prev.map(ball => ({
          ...ball,
          id: `ball-${Date.now()}-${Math.random()}`,
          vx: ball.vx + (Math.random() - 0.5) * 2,
          vy: ball.vy,
          attached: false
        }))
      ]);
      break;
      
    case 'turrets':
      setTurretsActive(true);
      setTurretAmmo(godMode ? 15 : 30);
      setTimeout(() => setTurretsActive(false), 20000); // 20 seconds
      break;
      
    case 'fireball':
      setBalls(prev => prev.map(ball => ({ ...ball, fireball: true })));
      setTimeout(() => {
        setBalls(prev => prev.map(ball => ({ ...ball, fireball: false })));
      }, 10000); // 10 seconds
      break;
      
    case 'life':
      setLives(prev => prev + 1);
      toast.success('Extra Life!');
      break;
      
    case 'slowdown':
      setBalls(prev => prev.map(ball => ({ 
        ...ball, 
        speed: ball.speed * 0.7 
      })));
      setTimeout(() => {
        setBalls(prev => prev.map(ball => ({ 
          ...ball, 
          speed: ball.speed / 0.7 
        })));
      }, 15000); // 15 seconds
      break;
      
    case 'paddleExtend':
      setPaddle(prev => ({ ...prev, width: prev.width * 1.5 }));
      setTimeout(() => {
        setPaddle(prev => ({ ...prev, width: prev.width / 1.5 }));
      }, 12000); // 12 seconds
      break;
      
    case 'paddleShrink':
      // Shrink enemy paddles (future feature)
      break;
      
    case 'shield':
      setShieldActive(true);
      setTimeout(() => setShieldActive(false), 15000); // 15 seconds
      break;
  }
}, [setBalls, setLives, setPaddle, setTurretsActive, setShieldActive]);
```

---

## `useBullets`

**File**: `src/hooks/useBullets.ts`

**Purpose**: Manage turret bullet firing, movement, and collision detection

### Return Value

```typescript
interface UseBulletsReturn {
  bullets: Bullet[];
  fireBullet: (paddleX: number, paddleY: number) => void;
  updateBullets: (dt: number) => void;
}
```

### State

```typescript
const [bullets, setBullets] = useState<Bullet[]>([]);
```

### Key Functions

#### `fireBullet`

```typescript
const fireBullet = useCallback((paddleX: number, paddleY: number) => {
  if (turretAmmo <= 0) return;
  
  // Fire from left and right turret positions
  const leftTurretX = paddleX - paddleWidth * 0.4;
  const rightTurretX = paddleX + paddleWidth * 0.4;
  const turretY = paddleY - 10;
  
  const newBullets: Bullet[] = [
    {
      id: `bullet-${Date.now()}-left`,
      x: leftTurretX,
      y: turretY,
      vy: -8, // Move upward
      radius: 3,
      damage: 1
    },
    {
      id: `bullet-${Date.now()}-right`,
      x: rightTurretX,
      y: turretY,
      vy: -8,
      radius: 3,
      damage: 1
    }
  ];
  
  setBullets(prev => [...prev, ...newBullets]);
  setTurretAmmo(prev => prev - 1);
  
  playSound('turrets', 0.2);
}, [turretAmmo, paddleWidth, setTurretAmmo]);
```

#### `updateBullets`

```typescript
const updateBullets = useCallback((dt: number) => {
  setBullets(prev => {
    const survivingBullets: Bullet[] = [];
    
    prev.forEach(bullet => {
      // Move bullet upward
      bullet.y += bullet.vy;
      
      // Check if off-screen (top)
      if (bullet.y < 0) {
        return; // Remove bullet
      }
      
      // Check collision with bricks
      let hit = false;
      bricksRef.current.forEach(brick => {
        if (brick.type === 'metal') return; // Turrets can't destroy metal
        
        const collision = 
          bullet.x > brick.x &&
          bullet.x < brick.x + brick.width &&
          bullet.y > brick.y &&
          bullet.y < brick.y + brick.height;
        
        if (collision) {
          // Damage brick
          brick.hitsRemaining -= bullet.damage;
          
          if (brick.hitsRemaining <= 0) {
            // Destroy brick
            onBrickDestroy(brick);
            addScore(brick.points);
            turretsKillCountRef.current += 1;
            
            // Check level completion
            const remainingBricks = bricksRef.current.filter(b => b.type !== 'metal').length;
            if (remainingBricks === 0) {
              onLevelComplete?.();
            }
          }
          
          hit = true;
          playSound('glass-breaking', 0.2);
        }
      });
      
      // Check collision with enemies
      enemiesRef.current.forEach(enemy => {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < bullet.radius + enemy.radius) {
          onEnemyDestroy(enemy);
          hit = true;
        }
      });
      
      if (!hit) {
        survivingBullets.push(bullet);
      }
    });
    
    return survivingBullets;
  });
}, [bricksRef, enemiesRef, onBrickDestroy, onEnemyDestroy, addScore, onLevelComplete]);
```

---

## `useHighScores`

**File**: `src/hooks/useHighScores.ts`

**Purpose**: Manage cloud-based high score leaderboards (Supabase integration)

### Return Value

```typescript
interface UseHighScoresReturn {
  highScores: {
    allTime: HighScore[];
    weekly: HighScore[];
    daily: HighScore[];
  };
  topScores: {
    daily: HighScore | null;
    weekly: HighScore | null;
    allTime: HighScore | null;
  };
  loading: boolean;
  error: string | null;
  submitHighScore: (score: HighScoreSubmission) => Promise<void>;
  isHighScore: (score: number) => boolean;
  refreshScores: () => Promise<void>;
}
```

### State

```typescript
const [highScores, setHighScores] = useState({
  allTime: [],
  weekly: [],
  daily: []
});
const [topScores, setTopScores] = useState({
  daily: null,
  weekly: null,
  allTime: null
});
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### Key Functions

#### `fetchHighScores`

```typescript
const fetchHighScores = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    // Fetch all-time scores (top 20)
    const { data: allTimeData, error: allTimeError } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(20);
    
    if (allTimeError) throw allTimeError;
    
    // Fetch weekly scores (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('high_scores')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .order('score', { ascending: false })
      .limit(20);
    
    if (weeklyError) throw weeklyError;
    
    // Fetch daily scores (last 24 hours)
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    
    const { data: dailyData, error: dailyError } = await supabase
      .from('high_scores')
      .select('*')
      .gte('created_at', dayAgo.toISOString())
      .order('score', { ascending: false })
      .limit(20);
    
    if (dailyError) throw dailyError;
    
    setHighScores({
      allTime: allTimeData || [],
      weekly: weeklyData || [],
      daily: dailyData || []
    });
    
    setTopScores({
      allTime: allTimeData?.[0] || null,
      weekly: weeklyData?.[0] || null,
      daily: dailyData?.[0] || null
    });
  } catch (err) {
    console.error('Error fetching high scores:', err);
    setError('Failed to load high scores');
  } finally {
    setLoading(false);
  }
}, []);
```

#### `submitHighScore`

```typescript
const submitHighScore = useCallback(async (submission: HighScoreSubmission) => {
  try {
    const { error } = await supabase
      .from('high_scores')
      .insert({
        player_name: submission.playerName,
        score: submission.score,
        level: submission.level,
        difficulty: submission.difficulty,
        starting_lives: submission.startingLives,
        beat_level_50: submission.level >= 50
      });
    
    if (error) throw error;
    
    // Refresh scores after submission
    await fetchHighScores();
    
    toast.success('High score submitted!');
  } catch (err) {
    console.error('Error submitting high score:', err);
    toast.error('Failed to submit high score');
  }
}, [fetchHighScores]);
```

#### `isHighScore`

```typescript
const isHighScore = useCallback((score: number): boolean => {
  if (score <= 0) return false;
  
  // Check if qualifies for any leaderboard (top 20)
  const qualifiesAllTime = 
    highScores.allTime.length < 20 || 
    score > (highScores.allTime[19]?.score || 0);
  
  const qualifiesWeekly = 
    highScores.weekly.length < 20 || 
    score > (highScores.weekly[19]?.score || 0);
  
  const qualifiesDaily = 
    highScores.daily.length < 20 || 
    score > (highScores.daily[19]?.score || 0);
  
  return qualifiesAllTime || qualifiesWeekly || qualifiesDaily;
}, [highScores]);
```

#### `refreshScores`

```typescript
const refreshScores = useCallback(async () => {
  await fetchHighScores();
}, [fetchHighScores]);
```

### Initial Load

```typescript
useEffect(() => {
  fetchHighScores();
  
  // Refresh every 5 minutes
  const interval = setInterval(fetchHighScores, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [fetchHighScores]);
```

---

## `useAdaptiveQuality`

**File**: `src/hooks/useAdaptiveQuality.ts`

**Purpose**: Dynamically adjust visual quality based on real-time FPS monitoring

### Return Value

```typescript
interface UseAdaptiveQualityReturn {
  quality: 'high' | 'medium' | 'low';
  fps: number;
}
```

### State

```typescript
const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
const [fps, setFps] = useState(60);
```

### Key Logic

```typescript
useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;
    
    if (elapsed >= 2000) { // Measure every 2 seconds
      const currentFPS = (frameCount / elapsed) * 1000;
      setFps(Math.round(currentFPS));
      
      // Adjust quality based on FPS
      if (currentFPS >= 60) {
        setQuality('high');
      } else if (currentFPS >= 35) {
        setQuality('medium');
      } else if (currentFPS >= 25) {
        setQuality('low');
      }
      
      // Reset counters
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  };
  
  const rafId = requestAnimationFrame(measureFPS);
  
  return () => cancelAnimationFrame(rafId);
}, []);
```

### Quality Settings

```typescript
const QUALITY_SETTINGS = {
  high: {
    particles: 100,
    particlesPerBrick: 12,
    crtEffects: true,
    shadowEffects: true,
    bossDetail: 'full'
  },
  medium: {
    particles: 50,
    particlesPerBrick: 6,
    crtEffects: true,
    shadowEffects: true,
    bossDetail: 'reduced'
  },
  low: {
    particles: 20,
    particlesPerBrick: 3,
    crtEffects: false,
    shadowEffects: false,
    bossDetail: 'minimal'
  }
};
```

---

## `useSwipeGesture`

**File**: `src/hooks/useSwipeGesture.ts`

**Purpose**: Detect swipe gestures for mobile controls

### Parameters

```typescript
interface UseSwipeGestureProps {
  onSwipeRight?: () => void;  // Pause game
  onSwipeLeft?: () => void;   // Future use
  enabled: boolean;
  gameCanvas?: React.RefObject<HTMLElement>;
}
```

### State

```typescript
const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
```

### Key Logic

```typescript
useEffect(() => {
  if (!enabled || !gameCanvas?.current) return;
  
  const element = gameCanvas.current;
  
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const edgeZoneWidth = window.innerWidth * 0.15; // 15% from left edge
    
    // Only track swipes starting from left edge
    if (touch.clientX <= edgeZoneWidth) {
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      });
      
      // Prevent iOS Safari back navigation
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const dt = Date.now() - touchStart.time;
    
    // Swipe right detection
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const isRightSwipe = dx > 50; // Min 50px movement
    const isFastEnough = dt < 300; // Max 300ms duration
    
    if (isHorizontal && isRightSwipe && isFastEnough) {
      onSwipeRight?.();
    }
    
    setTouchStart(null);
  };
  
  // iOS Safari gesture prevention
  const handleGestureStart = (e: Event) => {
    e.preventDefault();
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('gesturestart', handleGestureStart);
  element.addEventListener('gesturechange', handleGestureStart);
  
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('gesturestart', handleGestureStart);
    element.removeEventListener('gesturechange', handleGestureStart);
  };
}, [enabled, gameCanvas, touchStart, onSwipeRight]);
```

---

## `useDebugSettings`

**File**: `src/hooks/useDebugSettings.ts`

**Purpose**: Manage debug feature toggles

### Return Value

```typescript
interface UseDebugSettingsReturn {
  settings: DebugSettings;
  toggleSetting: (key: keyof DebugSettings) => void;
  resetSettings: () => void;
}
```

### Settings Interface

```typescript
interface DebugSettings {
  // Overlays
  showDebugModeIndicator: boolean;
  showGameLoopDebug: boolean;
  showSubstepDebug: boolean;
  showCCDPerformance: boolean;
  showCollisionHistory: boolean;
  showFrameProfiler: boolean;
  
  // Logging
  enableCollisionLogging: boolean;
  enablePowerUpLogging: boolean;
  enablePerformanceLogging: boolean;
  enableFPSLogging: boolean;
  enableDetailedFrameLogging: boolean;
  enablePaddleLogging: boolean;
  enableBossLogging: boolean;
  enableFrameProfilerLogging: boolean;
  
  // Visual Effects
  enableScreenShake: boolean;
  enableParticles: boolean;
  enableExplosions: boolean;
  enableCRTEffects: boolean;
}
```

### Default Settings

```typescript
const DEFAULT_SETTINGS: DebugSettings = {
  showDebugModeIndicator: true,
  showGameLoopDebug: false,
  showSubstepDebug: false,
  showCCDPerformance: false,
  showCollisionHistory: false,
  showFrameProfiler: false,
  enableCollisionLogging: false,
  enablePowerUpLogging: false,
  enablePerformanceLogging: true,
  enableFPSLogging: true,
  enableDetailedFrameLogging: false,
  enablePaddleLogging: false,
  enableBossLogging: false,
  enableFrameProfilerLogging: false,
  enableScreenShake: true,
  enableParticles: true,
  enableExplosions: true,
  enableCRTEffects: true
};
```

### State Management

```typescript
const [settings, setSettings] = useState<DebugSettings>(DEFAULT_SETTINGS);

const toggleSetting = useCallback((key: keyof DebugSettings) => {
  setSettings(prev => ({ ...prev, [key]: !prev[key] }));
}, []);

const resetSettings = useCallback(() => {
  setSettings(DEFAULT_SETTINGS);
}, []);
```

---

## Hook Usage Best Practices

### 1. Memoization

Use `useCallback` for functions passed to child components:

```typescript
const createPowerUp = useCallback((type, x, y) => {
  // ...
}, [dependencies]);
```

### 2. Cleanup

Always cleanup side effects:

```typescript
useEffect(() => {
  const interval = setInterval(/* ... */, 1000);
  return () => clearInterval(interval);
}, []);
```

### 3. Refs for Performance

Use refs to avoid re-renders when reading current values:

```typescript
const bricksRef = useRef<Brick[]>([]);
bricksRef.current = bricks; // Update without re-render

// Later...
const currentBricks = bricksRef.current; // No dependency needed
```

---

## Related Files

- `src/hooks/*.ts` - All custom hooks
- `src/components/Game.tsx` - Primary hook consumer
- `src/integrations/supabase/client.ts` - Supabase client for useHighScores

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
