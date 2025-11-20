import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { HighScoreTable } from "./HighScoreTable";
import { HighScoreEntry } from "./HighScoreEntry";
import { HighScoreDisplay } from "./HighScoreDisplay";
import { EndScreen } from "./EndScreen";
import { GameLoopDebugOverlay } from "./GameLoopDebugOverlay";
import { SubstepDebugOverlay } from "./SubstepDebugOverlay";
import { QualityIndicator } from "./QualityIndicator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { Maximize2, Minimize2, Home } from "lucide-react";
import type { Brick, Ball, Paddle, GameState, Enemy, Bomb, Explosion, BonusLetter, BonusLetterType, GameSettings, EnemyType, Particle, Boss, BossAttack, ShieldImpact } from "@/types/game";
import { useHighScores } from "@/hooks/useHighScores";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_PADDING, BRICK_OFFSET_TOP, BRICK_OFFSET_LEFT, brickColors, POWERUP_DROP_CHANCE, getHitColor, getBrickColors } from "@/constants/game";
import { levelLayouts, getBrickHits } from "@/constants/levelLayouts";
import { usePowerUps } from "@/hooks/usePowerUps";
import { useBullets } from "@/hooks/useBullets";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import { soundManager } from "@/utils/sounds";
import { FixedStepGameLoop } from "@/utils/gameLoop";
import { createBoss, createResurrectedPyramid } from "@/utils/bossUtils";
import { performBossAttack } from "@/utils/bossAttacks";
import { BOSS_LEVELS, BOSS_CONFIG, ATTACK_PATTERNS } from "@/constants/bossConfig";
import { processBallWithCCD } from "@/utils/gameCCD";
interface GameProps {
  settings: GameSettings;
  onReturnToMenu: () => void;
}
export const Game = ({
  settings,
  onReturnToMenu
}: GameProps) => {
  // Detect updates but don't apply during gameplay - defer until back at menu
  useServiceWorkerUpdate({ shouldApplyUpdate: false });
  
  // Detect Mac and apply 10% scale reduction
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
  const scaleFactor = isMac ? 0.9 : 1;

  // Scale all game constants for Mac
  const SCALED_CANVAS_WIDTH = CANVAS_WIDTH * scaleFactor;
  const SCALED_CANVAS_HEIGHT = CANVAS_HEIGHT * scaleFactor;
  const SCALED_PADDLE_WIDTH = PADDLE_WIDTH * scaleFactor;
  const SCALED_PADDLE_HEIGHT = PADDLE_HEIGHT * scaleFactor;
  const SCALED_BALL_RADIUS = BALL_RADIUS * scaleFactor;
  const SCALED_BRICK_WIDTH = BRICK_WIDTH * scaleFactor;
  const SCALED_BRICK_HEIGHT = BRICK_HEIGHT * scaleFactor;
  const SCALED_BRICK_PADDING = BRICK_PADDING * scaleFactor;
  const SCALED_BRICK_OFFSET_TOP = BRICK_OFFSET_TOP * scaleFactor;
  const SCALED_BRICK_OFFSET_LEFT = (SCALED_CANVAS_WIDTH - (BRICK_COLS * SCALED_BRICK_WIDTH + (BRICK_COLS - 1) * SCALED_BRICK_PADDING)) / 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.startingLives);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [showHighScoreDisplay, setShowHighScoreDisplay] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [beatLevel50Completed, setBeatLevel50Completed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [totalPlayTime, setTotalPlayTime] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [backgroundPhase, setBackgroundPhase] = useState(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [enemySpawnCount, setEnemySpawnCount] = useState(0);
  const [lastEnemySpawnTime, setLastEnemySpawnTime] = useState(0);
  const [launchAngle, setLaunchAngle] = useState(-20);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bonusLetters, setBonusLetters] = useState<BonusLetter[]>([]);
  const [droppedLettersThisLevel, setDroppedLettersThisLevel] = useState<Set<BonusLetterType>>(new Set());
  const [collectedLetters, setCollectedLetters] = useState<Set<BonusLetterType>>(new Set());
  const [letterLevelAssignments, setLetterLevelAssignments] = useState<Record<number, BonusLetterType>>({});
  const [boss, setBoss] = useState<Boss | null>(null);
  const [resurrectedBosses, setResurrectedBosses] = useState<Boss[]>([]);
  const [bossAttacks, setBossAttacks] = useState<BossAttack[]>([]);
  const [bossActive, setBossActive] = useState(false);
  const [bossHitCooldown, setBossHitCooldown] = useState(0);
  const [laserWarnings, setLaserWarnings] = useState<Array<{ x: number; startTime: number }>>([]);
  const bossSpawnedEnemiesRef = useRef<Set<number>>(new Set());
  const [isMobileDevice] = useState(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window && window.matchMedia('(max-width: 768px)').matches);
  });
  const [isIOSDevice] = useState(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad Pro detection
  });
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [framesVisible, setFramesVisible] = useState(true);
  const [titleVisible, setTitleVisible] = useState(true);
  const [gameScale, setGameScale] = useState(1);
  const [disableAutoZoom, setDisableAutoZoom] = useState(false);
  const [brickHitSpeedAccumulated, setBrickHitSpeedAccumulated] = useState(0);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [lastPaddleHitTime, setLastPaddleHitTime] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const [backgroundFlash, setBackgroundFlash] = useState(0);
  const [lastBossSpawnTime, setLastBossSpawnTime] = useState(0);
  const [bossSpawnAnimation, setBossSpawnAnimation] = useState<{active: boolean; startTime: number} | null>(null);
  const [shieldImpacts, setShieldImpacts] = useState<ShieldImpact[]>([]);
  const [lastScoreMilestone, setLastScoreMilestone] = useState(0);
  const [scoreBlinking, setScoreBlinking] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showSubstepDebug, setShowSubstepDebug] = useState(false);
  const [currentFps, setCurrentFps] = useState(60);
  
  // Game statistics tracking
  const [totalBricksDestroyed, setTotalBricksDestroyed] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [bricksHit, setBricksHit] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [levelSkipped, setLevelSkipped] = useState(false);
  const [bossIntroActive, setBossIntroActive] = useState(false);
  const [gameOverParticles, setGameOverParticles] = useState<Particle[]>([]);
  const [highScoreParticles, setHighScoreParticles] = useState<Particle[]>([]);
  const [retryLevelData, setRetryLevelData] = useState<{level: number, layout: any} | null>(null);
  const [powerUpsCollectedTypes, setPowerUpsCollectedTypes] = useState<Set<string>>(new Set());
  const [bricksDestroyedByTurrets, setBricksDestroyedByTurrets] = useState(0);
  const [bossesKilled, setBossesKilled] = useState(0);
  
  const launchAngleDirectionRef = useRef(1);
  const animationFrameRef = useRef<number>();
  const nextBallId = useRef(1);
  const nextEnemyId = useRef(1);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const totalPlayTimeIntervalRef = useRef<NodeJS.Timeout>();
  const totalPlayTimeStartedRef = useRef(false);
  const bombIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const launchAngleIntervalRef = useRef<NodeJS.Timeout>();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const timerStartedRef = useRef(false);
  
  // Fixed-step game loop
  const gameLoopRef = useRef<FixedStepGameLoop | null>(null);
  
  // Initialize fixed-step game loop on mount
  useEffect(() => {
    if (!gameLoopRef.current) {
      gameLoopRef.current = new FixedStepGameLoop({
        fixedStep: 16.6667, // 60Hz
        maxDeltaMs: 250,
        maxUpdatesPerFrame: 8,
        timeScale: 1.0,
        mode: "fixedStep"
      });
    }
    
    return () => {
      if (gameLoopRef.current) {
        gameLoopRef.current.stop();
      }
    };
  }, []);
  const {
    isHighScore,
    addHighScore
  } = useHighScores();
  const {
    powerUps,
    createPowerUp,
    updatePowerUps,
    checkPowerUpCollision,
    setPowerUps
  } = usePowerUps(
    level, 
    setLives, 
    timer, 
    settings.difficulty, 
    setBrickHitSpeedAccumulated,
    (type: string) => setPowerUpsCollectedTypes(prev => new Set(prev).add(type))
  );
  const {
    bullets,
    setBullets,
    fireBullets,
    updateBullets
  } = useBullets(
    setScore, 
    setBricks, 
    bricks, 
    enemies, 
    setPaddle,
    () => setBricksDestroyedByTurrets(prev => prev + 1),
    boss,
    resurrectedBosses,
    setBoss,
    setResurrectedBosses
  );

  // Adaptive quality system
  const {
    quality,
    qualitySettings,
    updateFps,
    setQuality,
    toggleAutoAdjust,
    autoAdjustEnabled
  } = useAdaptiveQuality({
    initialQuality: 'high',
    autoAdjust: true,
    lowFpsThreshold: 30,
    mediumFpsThreshold: 45,
    highFpsThreshold: 55,
    sampleWindow: 3
  });

  // Helper function to create explosion particles based on enemy type
  const createExplosionParticles = useCallback((x: number, y: number, enemyType: EnemyType): Particle[] => {
    const particles: Particle[] = [];
    const particleCount = Math.round(qualitySettings.explosionParticles); // Adjust based on quality

    // Determine colors based on enemy type
    let colors: string[] = [];
    if (enemyType === "cube") {
      colors = ["hsl(200, 100%, 60%)",
      // Cyan
      "hsl(180, 100%, 50%)",
      // Light cyan
      "hsl(220, 100%, 70%)" // Light blue
      ];
    } else if (enemyType === "sphere") {
      colors = ["hsl(330, 100%, 60%)",
      // Pink
      "hsl(350, 100%, 65%)",
      // Light pink
      "hsl(310, 100%, 55%)" // Magenta
      ];
    } else if (enemyType === "pyramid") {
      colors = ["hsl(280, 100%, 60%)",
      // Purple
      "hsl(260, 100%, 65%)",
      // Light purple
      "hsl(300, 100%, 55%)" // Violet
      ];
    }
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.PI * 2 * i / particleCount + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      const size = 3 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 30,
        maxLife: 30
      });
    }
    return particles;
  }, [qualitySettings.explosionParticles]);

  const createHighScoreParticles = useCallback((): Particle[] => {
    const particles: Particle[] = [];
    const particleCount = Math.round(150 * (qualitySettings.explosionParticles / 50));
    const centerX = SCALED_CANVAS_WIDTH / 2;
    const centerY = SCALED_CANVAS_HEIGHT / 2;
    
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i / particleCount) + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2;
      
      particles.push({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 100,
        vx,
        vy,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 120,
        maxLife: 120
      });
    }
    
    return particles;
  }, [qualitySettings.explosionParticles, SCALED_CANVAS_WIDTH, SCALED_CANVAS_HEIGHT]);

  // Initialize sound settings - always enabled
  useEffect(() => {
    soundManager.setMusicEnabled(true);
    soundManager.setSfxEnabled(true);
  }, []);

  // Cleanup expired shield impacts periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setShieldImpacts(prev => prev.filter(impact => now - impact.startTime < impact.duration));
    }, 100);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Create random letter assignments for a new game
  const createRandomLetterAssignments = useCallback(() => {
    const availableLevels = [4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19];
    const allLetters: BonusLetterType[] = ["Q", "U", "M", "R", "A", "N"];
    
    // Shuffle letters
    const shuffledLetters = [...allLetters].sort(() => Math.random() - 0.5);
    
    // Assign first 6 letters to first 6 levels
    const assignments: Record<number, BonusLetterType> = {};
    for (let i = 0; i < 6; i++) {
      assignments[availableLevels[i]] = shuffledLetters[i];
    }
    
    return assignments;
  }, []);

  // Bonus letter drop logic - random letters on random levels
  const dropBonusLetter = useCallback((x: number, y: number) => {
    // Check if this level has a letter assigned
    const assignedLetter = letterLevelAssignments[level];
    
    if (!assignedLetter) return; // No letter for this level
    
    // Only drop if letter hasn't been collected yet
    if (collectedLetters.has(assignedLetter)) return;
    
    // Check if letter was already dropped this level
    if (droppedLettersThisLevel.has(assignedLetter)) return;
    
    // Check if this letter is already falling
    const alreadyFalling = bonusLetters.some(bl => bl.type === assignedLetter && bl.active);
    if (alreadyFalling) return;
    
    // Mark letter as dropped for this level
    setDroppedLettersThisLevel(prev => new Set(prev).add(assignedLetter));
    
    setBonusLetters(prev => [...prev, {
      x: x - 15,
      y: y,
      width: 30,
      height: 30,
      type: assignedLetter,
      speed: 2,
      active: true
    }]);
    
    toast(`Bonus letter ${assignedLetter} dropped!`, {
      icon: "🎯"
    });
  }, [level, collectedLetters, bonusLetters, droppedLettersThisLevel, letterLevelAssignments]);
  const checkBonusLetterCollision = useCallback(() => {
    if (!paddle) return;
    setBonusLetters(prev => {
      const updated = prev.filter(letter => {
        if (!letter.active) return false;

        // Check collision with paddle
        if (letter.x + letter.width > paddle.x && letter.x < paddle.x + paddle.width && letter.y + letter.height > paddle.y && letter.y < paddle.y + paddle.height) {
          // Letter collected
          setCollectedLetters(prevCollected => {
            const newCollected = new Set(prevCollected);
            newCollected.add(letter.type);

            // Check if all letters collected
            if (newCollected.size === 6) {
              setScore(s => s + 500000);
              setLives(l => l + 5);
              soundManager.playBonusComplete();
              toast.success("QUMRAN Complete! +5 Lives & +500,000 Points!", {
                duration: 5000
              });
              // Long flash and screen shake for all letters
              setBackgroundFlash(1);
              setScreenShake(10);
              setTimeout(() => setBackgroundFlash(0), 800);
              setTimeout(() => setScreenShake(0), 800);
            } else {
              soundManager.playBonusLetterPickup();
              toast.success(`Letter ${letter.type} collected!`);
              // Quick flash for single letter
              setBackgroundFlash(0.5);
              setTimeout(() => setBackgroundFlash(0), 200);
            }
            return newCollected;
          });
          return false;
        }

        // Check if letter went off screen (missed)
        if (letter.y > SCALED_CANVAS_HEIGHT) {
          return false;
        }
        return true;
      });
      return updated;
    });
  }, [paddle]);
  const initBricksForLevel = useCallback((currentLevel: number) => {
    // Check if this is a boss level
    if (BOSS_LEVELS.includes(currentLevel)) {
      const newBoss = createBoss(currentLevel, SCALED_CANVAS_WIDTH, SCALED_CANVAS_HEIGHT);
      setBoss(newBoss);
      setBossActive(true);
      setResurrectedBosses([]);
      setBossAttacks([]);
      setLaserWarnings([]);
      const bossName = newBoss?.type.toUpperCase();
      toast.success(`LEVEL ${currentLevel}: ${bossName} BOSS!`, { duration: 3000 });
      return []; // No bricks on boss levels
    }
    
    const layoutIndex = Math.min(currentLevel - 1, levelLayouts.length - 1);
    const layout = levelLayouts[layoutIndex];
    const levelColors = getBrickColors(currentLevel);
    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const cellValue = layout[row][col];
        if (cellValue === true || cellValue === 2 || cellValue === 3 || cellValue === 4) {
          const isIndestructible = cellValue === 2;
          
          // Determine brick type based on cell value
          let brickType: "normal" | "metal" | "cracked" | "explosive" = "normal";
          if (cellValue === 2) {
            brickType = "metal";
          } else if (cellValue === 3) {
            brickType = "explosive";
          } else if (cellValue === 4) {
            brickType = "cracked";
          }
          
          const hasPowerUp = isIndestructible ? false : Math.random() < POWERUP_DROP_CHANCE;
          const maxHits = isIndestructible ? 1 : (brickType === "cracked" ? 3 : getBrickHits(currentLevel, row));
          
          let baseColor: string;
          if (isIndestructible) {
            baseColor = "hsl(0, 0%, 20%)"; // Dark gray for metal
          } else if (brickType === "explosive") {
            baseColor = "hsl(15, 90%, 50%)"; // Orange-red for explosive
          } else if (brickType === "cracked") {
            baseColor = "hsl(40, 15%, 45%)"; // Brownish-gray for cracked
          } else {
            baseColor = levelColors[row % levelColors.length];
          }

          // Metal bricks expand to fill padding space, creating continuous surfaces
          const brickWidth = isIndestructible 
            ? SCALED_BRICK_WIDTH + SCALED_BRICK_PADDING 
            : SCALED_BRICK_WIDTH;
          const brickHeight = isIndestructible 
            ? SCALED_BRICK_HEIGHT + SCALED_BRICK_PADDING 
            : SCALED_BRICK_HEIGHT;

          // Metal bricks are positioned to overlap into the padding space
          const xPos = col * (SCALED_BRICK_WIDTH + SCALED_BRICK_PADDING) + SCALED_BRICK_OFFSET_LEFT 
            - (isIndestructible && col > 0 ? SCALED_BRICK_PADDING / 2 : 0);
          const yPos = row * (SCALED_BRICK_HEIGHT + SCALED_BRICK_PADDING) + SCALED_BRICK_OFFSET_TOP 
            - (isIndestructible && row > 0 ? SCALED_BRICK_PADDING / 2 : 0);
          newBricks.push({
            id: newBricks.length, // Unique ID based on array index
            x: xPos,
            y: yPos,
            width: brickWidth,
            height: brickHeight,
            color: baseColor,
            visible: true,
            points: isIndestructible ? 0 : (BRICK_ROWS - row) * 10 * maxHits,
            hasPowerUp,
            maxHits,
            hitsRemaining: maxHits,
            isIndestructible,
            type: brickType
          });
        }
      }
    }
    return newBricks;
  }, []);
  const initGame = useCallback(() => {
    // Initialize paddle
    setPaddle({
      x: SCALED_CANVAS_WIDTH / 2 - SCALED_PADDLE_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      width: SCALED_PADDLE_WIDTH,
      height: SCALED_PADDLE_HEIGHT,
      hasTurrets: false
    });

    // Initialize ball with speed multiplier - waiting to launch
    const baseSpeed = 5.175; // 50% faster than previous base speed of 3.45
    const initialAngle = -20 * Math.PI / 180; // Start from left side
    const initialBall: Ball = {
      x: SCALED_CANVAS_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      dx: baseSpeed * Math.sin(initialAngle),  // Calculate from angle
      dy: -baseSpeed * Math.cos(initialAngle), // Calculate from angle
      radius: SCALED_BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true,
      rotation: 0
    };
    setBalls([initialBall]);
    setLaunchAngle(-20); // Start from left side
    launchAngleDirectionRef.current = 1; // Move right initially
    setShowInstructions(true); // Show instructions for new game

    // Create random letter assignments
    setLetterLevelAssignments(createRandomLetterAssignments());
    
    // Initialize bricks for level 1
    setBricks(initBricksForLevel(1));
    setScore(0);
    setLives(3);
    setLevel(1);
    setSpeedMultiplier(1);
    setGameState("ready");
    setPowerUps([]);
    setTimer(0);
    setTotalPlayTime(0);
    timerStartedRef.current = false;
    totalPlayTimeStartedRef.current = false;
    setEnemies([]);
    setBombs([]);
    setBackgroundPhase(0);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
    setBonusLetters([]);
    setDroppedLettersThisLevel(new Set());
    setCollectedLetters(new Set());
    setEnemiesKilled(0);
    setLastBossSpawnTime(0);
    setBossSpawnAnimation(null);
    setBoss(null);
    setResurrectedBosses([]);
    setBossAttacks([]);
    setBossActive(false);
    setLaserWarnings([]);
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();
  }, [setPowerUps, initBricksForLevel, createRandomLetterAssignments]);
  const nextLevel = useCallback(() => {
    // Stop game loop before starting new level
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }

    // Clear timer interval before resetting
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerStartedRef.current = false;
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();
    setBonusLetters([]);
    setDroppedLettersThisLevel(new Set());
    const newLevel = level + 1;
    const maxSpeedMultiplier = settings.difficulty === "godlike" ? 1.75 : 1.5; // 175% godlike, 150% normal
    // Godlike starts at 125%, normal at 100%, both increase 5% per level
    const baseMultiplier = settings.difficulty === "godlike" ? 1.25 : 1.0;
    const newSpeedMultiplier = Math.min(maxSpeedMultiplier, baseMultiplier + (newLevel - 1) * 0.05);
    setLevel(newLevel);
    setSpeedMultiplier(newSpeedMultiplier);

    // Reset paddle (preserve shield across levels)
    setPaddle(prev => ({
      x: SCALED_CANVAS_WIDTH / 2 - SCALED_PADDLE_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      width: SCALED_PADDLE_WIDTH,
      height: SCALED_PADDLE_HEIGHT,
      hasTurrets: false,
      hasShield: prev?.hasShield || false
    }));

    // Initialize ball with new speed - waiting to launch (capped at 175%)
    const baseSpeed = 5.175 * Math.min(newSpeedMultiplier, 1.75); // 50% faster base speed
    const initialBall: Ball = {
      x: SCALED_CANVAS_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: SCALED_BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true
    };
    setBalls([initialBall]);
    setLaunchAngle(-20); // Start from left side
    launchAngleDirectionRef.current = 1; // Move right initially
    setShowInstructions(true); // Show instructions for new level

    // Initialize bricks for new level
    setBricks(initBricksForLevel(newLevel));
    setPowerUps([]);
    setBullets([]);
    setTimer(0);
    setEnemies([]);
    setBombs([]);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
    setBonusLetters([]);
    // Don't reset collected letters between levels
    // Reset accumulated slowdown speed on level clear
    setBrickHitSpeedAccumulated(0);
    setLastBossSpawnTime(0);
    setBossSpawnAnimation(null);
    setTimer(0); // Reset timer on level clear (for turret drop chance reset)
    // Only clear boss state if the new level is NOT a boss level
    if (!BOSS_LEVELS.includes(newLevel)) {
      setBoss(null);
      setResurrectedBosses([]);
      setBossAttacks([]);
      setBossActive(false);
      setLaserWarnings([]);
    } else {
      // Boss level - trigger intro sequence
      setBossIntroActive(true);
      soundManager.playBossIntroSound();
      
      // Show boss name and start boss music after 1 second
      setTimeout(() => {
        soundManager.playBossMusic(newLevel);
        const bossName = newLevel === 5 ? 'CUBE GUARDIAN' : newLevel === 10 ? 'SPHERE DESTROYER' : 'PYRAMID LORD';
        toast.error(`⚠️ BOSS APPROACHING: ${bossName} ⚠️`, { duration: 3000 });
      }, 1000);
      
      // End intro after 3 seconds
      setTimeout(() => {
        setBossIntroActive(false);
      }, 3000);
    }
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();
    setGameState("playing");
    if (newLevel === 10) {
      toast.success(`Level ${newLevel}! New music unlocked!`);
    } else {
      toast.success(`Level ${newLevel}! Speed: ${Math.round(newSpeedMultiplier * 100)}%`);
    }
  }, [level, initBricksForLevel, setPowerUps]);
  useEffect(() => {
    initGame();
    
    // Preload power-up sounds
    soundManager.preloadSounds().catch(err => {
      console.error('Failed to preload sounds:', err);
    });
  }, [initGame]);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !paddle) return;

    // Use movementX when pointer is locked, otherwise use absolute position
    if (isPointerLocked) {
      const sensitivity = 1.5;
      const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, paddle.x + e.movementX * sensitivity));
      setPaddle(prev => prev ? {
        ...prev,
        x: newX
      } : null);
    } else if (gameState === "playing") {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = SCALED_CANVAS_WIDTH / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, mouseX - paddle.width / 2));
      setPaddle(prev => prev ? {
        ...prev,
        x: newX
      } : null);
    }
  }, [gameState, paddle, isPointerLocked, SCALED_CANVAS_WIDTH]);
  const activeTouchRef = useRef<number | null>(null);
  const secondTouchRef = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canvasRef.current || !paddle) return;
    e.preventDefault();

    // Single-tap to start game when in "ready" state (mobile start)
    if (gameState === "ready" && e.touches.length === 1) {
      console.log('[Ready Tap Debug] readyTapStart: enabled - Single tap detected, starting game');
      const hasDestructibleBricks = bricks.some(brick => !brick.isIndestructible);
      const isLevelComplete = hasDestructibleBricks && bricks.every(brick => !brick.visible || brick.isIndestructible);
      
      if (isLevelComplete) {
        nextLevel();
      } else {
        // Start game - start music only if not already playing (and not boss music)
        setGameState("playing");
        if (!soundManager.isMusicPlaying() && !soundManager.isBossMusicPlaying()) {
          soundManager.playBackgroundMusic();
        }
        toast.success("Tap again to launch!");
      }
      return;
    }
    const waitingBall = balls.find(ball => ball.waitingToLaunch);

    // If ball is waiting and there are 2 fingers, second finger controls launch angle
    if (e.touches.length > 1 && waitingBall && gameState === "playing") {
      // First touch controls paddle, second touch sets launch angle
      if (activeTouchRef.current !== null && secondTouchRef.current === null) {
        // Find the second touch (not the first one)
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier !== activeTouchRef.current) {
            secondTouchRef.current = e.touches[i].identifier;

            // Calculate launch angle from second finger position relative to paddle
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = SCALED_CANVAS_WIDTH / rect.width;
            const touchX = (e.touches[i].clientX - rect.left) * scaleX;

            // Calculate angle: -60 to +60 degrees based on second finger position relative to paddle center
            const paddleCenter = paddle.x + paddle.width / 2;
            const relativeX = touchX - paddleCenter;
            const maxDistance = SCALED_CANVAS_WIDTH / 3; // Max distance for full angle range
            const normalizedX = Math.max(-1, Math.min(1, relativeX / maxDistance));
            const angle = normalizedX * 60; // -60 to +60 degrees

            setLaunchAngle(angle);
            console.log('[Launch Debug] audioAndLaunchMode: applied - Second finger angle:', angle);
            break;
          }
        }
      }

      // Fire turrets if paddle has turrets
      if (paddle.hasTurrets) {
        fireBullets(paddle);
      }
      return; // Don't launch ball yet
    }

    // Fire turrets if there are multiple touches (2+ fingers) and paddle has turrets and ball is NOT waiting
    if (e.touches.length > 1 && paddle.hasTurrets && gameState === "playing" && !waitingBall) {
      fireBullets(paddle);
      return;
    }

    // Track the first touch for paddle control
    if (e.touches.length > 0 && activeTouchRef.current === null) {
      activeTouchRef.current = e.touches[0].identifier;

      // Update paddle position immediately on touch start
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = SCALED_CANVAS_WIDTH / rect.width;
      const touchX = (e.touches[0].clientX - rect.left) * scaleX;
      const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, touchX - paddle.width / 2));
      setPaddle(prev => prev ? {
        ...prev,
        x: newX
      } : null);

      // Single tap on ball when waiting launches it (explicit launch)
      if (waitingBall && gameState === "playing" && e.touches.length === 1) {
        setShowInstructions(false);

        // Start timer on first ball launch
        if (!timerStartedRef.current) {
          timerStartedRef.current = true;
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          timerIntervalRef.current = setInterval(() => {
            setTimer(prev => prev + 1);
          }, 1000);
        }
        
        // Start total play time on first ball launch
        if (!totalPlayTimeStartedRef.current) {
          totalPlayTimeStartedRef.current = true;
          if (totalPlayTimeIntervalRef.current) {
            clearInterval(totalPlayTimeIntervalRef.current);
          }
          totalPlayTimeIntervalRef.current = setInterval(() => {
            setTotalPlayTime(prev => prev + 1);
          }, 1000);
        }
        console.log('[Launch Debug] audioAndLaunchMode: applied - Ball launched at angle:', launchAngle);
        setBalls(prev => prev.map(ball => {
          if (ball.waitingToLaunch) {
            const speed = ball.speed;
            const angle = launchAngle * Math.PI / 180;
            // Track shot fired
            setTotalShots(prev => prev + 1);
            
            return {
              ...ball,
              dx: speed * Math.sin(angle),
              dy: -speed * Math.cos(angle),
              waitingToLaunch: false
            };
          }
          return ball;
        }));
      }
    }
  }, [paddle, balls, gameState, launchAngle, fireBullets, SCALED_CANVAS_WIDTH, bricks, nextLevel]);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canvasRef.current || !paddle) return;
    e.preventDefault();
    const waitingBall = balls.find(ball => ball.waitingToLaunch);

    // Update launch angle if second finger is moving and ball is waiting
    if (waitingBall && secondTouchRef.current !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === secondTouchRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = SCALED_CANVAS_WIDTH / rect.width;
          const touchX = (e.touches[i].clientX - rect.left) * scaleX;

          // Calculate angle from second finger position relative to paddle center
          const paddleCenter = paddle.x + paddle.width / 2;
          const relativeX = touchX - paddleCenter;
          const maxDistance = SCALED_CANVAS_WIDTH / 3;
          const normalizedX = Math.max(-1, Math.min(1, relativeX / maxDistance));
          const angle = normalizedX * 60;
          setLaunchAngle(angle);
          break;
        }
      }
    }

    // Track the first touch for paddle control
    let activeTouch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchRef.current) {
        activeTouch = e.touches[i];
        break;
      }
    }

    // If no active touch found, use the first touch
    if (!activeTouch && e.touches.length > 0) {
      activeTouch = e.touches[0];
      activeTouchRef.current = activeTouch.identifier;
    }
    if (!activeTouch) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = SCALED_CANVAS_WIDTH / rect.width;
    const touchX = (activeTouch.clientX - rect.left) * scaleX;
    const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, touchX - paddle.width / 2));
    setPaddle(prev => prev ? {
      ...prev,
      x: newX
    } : null);
  }, [paddle, balls, SCALED_CANVAS_WIDTH]);
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear active touches when they end
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchRef.current) {
        activeTouchRef.current = null;
      }
      if (e.changedTouches[i].identifier === secondTouchRef.current) {
        secondTouchRef.current = null;
        console.log('[Launch Debug] audioAndLaunchMode: default - Second finger released');
      }
    }
  }, []);
  const handleClick = useCallback(() => {
    // Request pointer lock on canvas click
    if (canvasRef.current && document.pointerLockElement !== canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }

    // If game is ready, start the game first
    if (gameState === "ready") {
      // Check if there are destructible bricks
      const hasDestructibleBricks = bricks.some(brick => !brick.isIndestructible);
      const isLevelComplete = hasDestructibleBricks && bricks.every(brick => !brick.visible || brick.isIndestructible);
      
      if (isLevelComplete) {
        nextLevel();
      } else {
        // Start game - start music only if not already playing (and not boss music)
        setGameState("playing");
        if (!soundManager.isMusicPlaying() && !soundManager.isBossMusicPlaying()) {
          soundManager.playBackgroundMusic(level);
        }
        toast.success("Click again to launch!");
      }
      return;
    }
    if (!paddle || gameState !== "playing") return;

    // Check if ball is waiting to launch
    const waitingBall = balls.find(ball => ball.waitingToLaunch);
    if (waitingBall) {
      // Launch ball in the direction of the current angle
      setShowInstructions(false);

      // Start timer on first ball launch
      if (!timerStartedRef.current) {
        timerStartedRef.current = true;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        timerIntervalRef.current = setInterval(() => {
          setTimer(prev => prev + 1);
        }, 1000);
      }
      
      // Start total play time on first ball launch
      if (!totalPlayTimeStartedRef.current) {
        totalPlayTimeStartedRef.current = true;
        if (totalPlayTimeIntervalRef.current) {
          clearInterval(totalPlayTimeIntervalRef.current);
        }
        totalPlayTimeIntervalRef.current = setInterval(() => {
          setTotalPlayTime(prev => prev + 1);
        }, 1000);
      }
      setBalls(prev => prev.map(ball => {
        if (ball.waitingToLaunch) {
          const speed = ball.speed;
          const angle = launchAngle * Math.PI / 180;
          return {
            ...ball,
            dx: speed * Math.sin(angle),
            dy: -speed * Math.cos(angle),
            waitingToLaunch: false
          };
        }
        return ball;
      }));
      return;
    }

    // Fire turrets
    if (paddle.hasTurrets) {
      fireBullets(paddle);
    }
  }, [paddle, gameState, fireBullets, bricks, nextLevel, balls, launchAngle, level]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Exit pointer lock
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } else if (e.key === "n" || e.key === "N") {
        soundManager.nextTrack();
        toast.success("Next track");
      } else if (e.key === "b" || e.key === "B") {
        soundManager.previousTrack();
        toast.success("Previous track");
      } else if (e.key === "p" || e.key === "P") {
        // Toggle pause
        if (gameState === "playing") {
          setGameState("paused");
          if (gameLoopRef.current) {
            gameLoopRef.current.pause();
          }
          toast.success("Game paused");
        } else if (gameState === "paused") {
          setGameState("playing");
          if (gameLoopRef.current) {
            gameLoopRef.current.resume();
          }
          toast.success("Game resumed");
        }
      } else if (e.key === "m" || e.key === "M") {
        const enabled = soundManager.toggleMute();
        toast.success(enabled ? "Music on" : "Music muted");
      } else if (e.key === "Tab") {
        e.preventDefault(); // Prevent default tab behavior
        // Toggle substep debug overlay
        setShowSubstepDebug(prev => {
          const newValue = !prev;
          toast.success(newValue ? "Ball substep debug enabled" : "Ball substep debug disabled");
          return newValue;
        });
      } else if (e.key === "l" || e.key === "L") {
        // Toggle debug overlay
        setShowDebugOverlay(prev => {
          const newValue = !prev;
          toast.success(newValue ? "Debug overlay enabled" : "Debug overlay disabled");
          return newValue;
        });
      } else if (e.key === "[") {
        // Decrease time scale
        if (gameLoopRef.current) {
          const newScale = Math.max(0.1, gameLoopRef.current.getTimeScale() - 0.1);
          gameLoopRef.current.setTimeScale(newScale);
          toast.success(`Time scale: ${newScale.toFixed(1)}x`);
        }
      } else if (e.key === "]") {
        // Increase time scale
        if (gameLoopRef.current) {
          const newScale = Math.min(3.0, gameLoopRef.current.getTimeScale() + 0.1);
          gameLoopRef.current.setTimeScale(newScale);
          toast.success(`Time scale: ${newScale.toFixed(1)}x`);
        }
      } else if (e.key === "\\") {
        // Toggle loop mode
        if (gameLoopRef.current) {
          const newMode = gameLoopRef.current.getMode() === "fixedStep" ? "legacy" : "fixedStep";
          gameLoopRef.current.setMode(newMode);
          toast.success(`Loop mode: ${newMode}`);
        }
      } else if (e.key === "q" || e.key === "Q") {
        if (e.shiftKey) {
          // Shift+Q: Toggle auto-adjust
          toggleAutoAdjust();
        } else {
          // Q: Cycle quality levels
          const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
          const currentIndex = levels.indexOf(quality);
          const nextIndex = (currentIndex + 1) % levels.length;
          const nextQuality = levels[nextIndex];
          
          // Use the hook's setQuality which handles everything properly
          setQuality(nextQuality);
        }
      } else if (e.key === "0") {
        // Clear level and advance - mark as level skipped (disqualified from high scores)
        setLevelSkipped(true);
        if (soundManager.isBossMusicPlaying()) {
          soundManager.stopBossMusic();
        }
        nextLevel();
        toast.warning("Level skipped! You are DISQUALIFIED from high scores!", { duration: 3000 });
      }
    };
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === canvas);
    };
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchstart", handleTouchStart, {
      passive: false
    });
    canvas.addEventListener("touchmove", handleTouchMove, {
      passive: false
    });
    canvas.addEventListener("touchend", handleTouchEnd, {
      passive: false
    });
    canvas.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyPress);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [handleMouseMove, handleTouchMove, handleClick, nextLevel, gameState]);
  
  // Get substep debug info for overlay
  const getSubstepDebugInfo = useCallback(() => {
    if (balls.length === 0) {
      return { 
        substeps: 0, 
        ballSpeed: 0, 
        ballCount: 0, 
        maxSpeed: 0,
        collisionsPerFrame: 0,
        toiIterations: 0
      };
    }
    
    const speeds = balls.map(ball => Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy));
    const maxBallSpeed = Math.max(...speeds);
    const minBrickDimension = Math.min(SCALED_BRICK_WIDTH, SCALED_BRICK_HEIGHT);
    const substeps = Math.max(2, Math.ceil(maxBallSpeed * speedMultiplier / (minBrickDimension * 0.15)));
    
    return {
      substeps,
      ballSpeed: maxBallSpeed * speedMultiplier,
      ballCount: balls.length,
      maxSpeed: maxBallSpeed,
      collisionsPerFrame: 0, // Will be updated by CCD results
      toiIterations: 0 // Will be updated by CCD results
    };
  }, [balls, speedMultiplier, SCALED_BRICK_WIDTH, SCALED_BRICK_HEIGHT]);
  
  const checkCollision = useCallback(() => {
    if (!paddle || balls.length === 0) return;
    
    const dt = 1 / 60; // Fixed timestep (60 FPS)
    const minBrickDimension = Math.min(SCALED_BRICK_WIDTH, SCALED_BRICK_HEIGHT);
    
    setBalls(prevBalls => {
      // Phase 1: Run CCD for all balls
      const ballResults = prevBalls.map(ball => 
        processBallWithCCD(ball, dt, {
          bricks,
          paddle,
          canvasSize: { w: SCALED_CANVAS_WIDTH, h: SCALED_CANVAS_HEIGHT },
          speedMultiplier,
          minBrickDimension,
          boss: boss || null,
          resurrectedBosses,
          enemies
        })
      );

      // Phase 2: Deduplicate collision events by object
      const processedObjects = new Set<string>();
      const brickUpdates = new Map<number, { hitsRemaining: number; visible: boolean }>();
      let scoreIncrease = 0;
      let bricksDestroyedCount = 0;
      let comboIncrease = 0;
      const powerUpsToCreate: Brick[] = [];
      const explosiveBricksToDetonate: Brick[] = [];
      const soundsToPlay: Array<{ type: string; param?: any }> = [];
      
      // Enemy batched updates
      const enemiesToUpdate = new Map<number, Partial<Enemy>>();
      const enemiesToDestroy = new Set<number>();
      const explosionsToCreate: Array<{x: number, y: number, type: EnemyType}> = [];
      const bonusLetterDrops: Array<{x: number, y: number}> = [];
      const bombIntervalsToClean: number[] = [];
      let enemiesKilledIncrease = 0;
      
      ballResults.forEach((result, ballIndex) => {
        if (!result.ball) return;

        result.events.forEach(event => {
          const now = Date.now();
          const objectKey = `${event.objectType}-${event.objectId}`;
          
          // Debug log for boss-related IDs
          if (typeof event.objectId === 'number' && event.objectId <= 0) {
            console.log('[CCD] Negative objectId event', {
              objectType: event.objectType,
              objectId: event.objectId,
              point: event.point,
              bossPresent: !!boss,
              bossRect: boss ? { x: boss.x, y: boss.y, w: boss.width, h: boss.height } : null,
            });
          }
          
          // Skip if already processed this frame
          if (event.objectType !== 'wall' && event.objectType !== 'paddle' && processedObjects.has(objectKey)) {
            return;
          }
          processedObjects.add(objectKey);
          
          switch (event.objectType) {
            case 'wall':
              soundManager.playBounce();
              break;

            case 'paddle':
              // Adjust angle based on hit position
              const hitPos = (event.point.x - paddle.x) / paddle.width;
              const angle = (hitPos - 0.5) * Math.PI * 0.6;
              const speed = Math.sqrt(result.ball.dx * result.ball.dx + result.ball.dy * result.ball.dy);
              result.ball.dx = speed * Math.sin(angle);
              result.ball.dy = -Math.abs(speed * Math.cos(angle));
              soundManager.playBounce();
              setLastPaddleHitTime(now);
              break;

            case 'brick':
            case 'corner':
              // Find the object by ID
              const objectId = typeof event.objectId === 'number' ? event.objectId : -1;
              
              // Handle boss collision (ID = -1) or explicit boss event
              if ((objectId === -1 || (event as any).objectType === 'boss' || (boss && objectId === boss.id)) && boss) {
                console.log('[BossHit] Boss collision detected', { 
                  currentHealth: boss.currentHealth,
                  lastHitTime: result.ball.lastHitTime,
                  now,
                  cooldownRemaining: result.ball.lastHitTime ? now - result.ball.lastHitTime : 'none',
                  eventType: (event as any).objectType,
                  objectId
                });
                
                if (!result.ball.lastHitTime || now - result.ball.lastHitTime >= 1000) {
                  result.ball.lastHitTime = now;
                  soundManager.playBossHitSound();
                  
                  // Visual feedback
                  setScreenShake(8);
                  setTimeout(() => setScreenShake(0), 400);
                  
                  setBoss(prev => {
                    if (!prev) return prev;
                    const newHealth = Math.max(0, prev.currentHealth - 1);
                    console.log('[BossHit] HP updated', { oldHealth: prev.currentHealth, newHealth });
                    
                    if (newHealth <= 0) {
                      soundManager.playExplosion();
                      toast.success(`Boss defeated! +${BOSS_CONFIG[prev.type].points} points`);
                      // Create massive explosion
                      explosionsToCreate.push({
                        x: prev.x + prev.width / 2,
                        y: prev.y + prev.height / 2,
                        type: prev.type as EnemyType
                      });
                    } else {
                      toast.info(`BOSS: ${newHealth} HP`, { 
                        duration: 1000,
                        style: { background: '#ff0000', color: '#fff' }
                      });
                    }
                    return { ...prev, currentHealth: newHealth };
                  });
                }
                break;
              }
              
              // Handle resurrected boss collision (ID = -2, -3, -4)
              if (objectId < -1) {
                const resBossIndex = Math.abs(objectId) - 2;
                if (resBossIndex >= 0 && resBossIndex < resurrectedBosses.length) {
                  if (!result.ball.lastHitTime || now - result.ball.lastHitTime >= 1000) {
                    result.ball.lastHitTime = now;
                    soundManager.playBossHitSound();
                    
                    setResurrectedBosses(prev => {
                      const newBosses = [...prev];
                      const resBoss = newBosses[resBossIndex];
                      const newHealth = Math.max(0, resBoss.currentHealth - 1);
                      if (newHealth <= 0) {
                        newBosses.splice(resBossIndex, 1);
                        soundManager.playExplosion();
                      } else {
                        newBosses[resBossIndex] = { ...resBoss, currentHealth: newHealth };
                      }
                      return newBosses;
                    });
                  }
                }
                break;
              }
              
              // Handle enemy collision (ID >= 100000)
              if (objectId >= 100000) {
                const enemyIndex = objectId - 100000;
                const enemy = enemies[enemyIndex];
                
                if (enemy) {
                  // Handle different enemy types with multi-hit logic
                  if (enemy.type === "pyramid") {
                    const currentHits = enemy.hits || 0;
                    
                    if (currentHits < 2) {
                      // Pyramid not destroyed yet - damage it
                      soundManager.playBounce();
                      enemiesToUpdate.set(enemy.id!, {
                        hits: currentHits + 1,
                        isAngry: currentHits === 1,
                        speed: currentHits === 1 ? enemy.speed * 1.5 : enemy.speed,
                        dx: currentHits === 1 ? enemy.dx * 1.5 : enemy.dx,
                        dy: currentHits === 1 ? enemy.dy * 1.5 : enemy.dy
                      });
                      if (currentHits === 0) {
                        toast.warning("Pyramid hit! 2 more hits needed");
                      } else {
                        toast.warning("Pyramid is angry! 1 more hit!");
                      }
                      setScreenShake(5);
                      setTimeout(() => setScreenShake(0), 500);
                    } else {
                      // Third hit - destroy pyramid
                      enemiesToDestroy.add(enemyIndex);
                      explosionsToCreate.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        type: enemy.type
                      });
                      scoreIncrease += 300;
                      toast.success("Pyramid destroyed! +300 points");
                      soundManager.playExplosion();
                      enemiesKilledIncrease++;
                      bonusLetterDrops.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 });
                      
                      if (enemy.id !== undefined) {
                        bombIntervalsToClean.push(enemy.id);
                      }
                    }
                  } 
                  else if (enemy.type === "sphere") {
                    const currentHits = enemy.hits || 0;
                    
                    if (currentHits === 0) {
                      // First hit - make angry
                      soundManager.playBounce();
                      enemiesToUpdate.set(enemy.id!, {
                        hits: 1,
                        isAngry: true,
                        speed: enemy.speed * 1.3,
                        dx: enemy.dx * 1.3,
                        dy: enemy.dy * 1.3
                      });
                      toast.warning("Sphere enemy is angry!");
                      setScreenShake(5);
                      setTimeout(() => setScreenShake(0), 500);
                    } else {
                      // Second hit - destroy sphere
                      enemiesToDestroy.add(enemyIndex);
                      explosionsToCreate.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        type: enemy.type
                      });
                      scoreIncrease += 200;
                      toast.success("Sphere enemy destroyed! +200 points");
                      soundManager.playExplosion();
                      enemiesKilledIncrease++;
                      bonusLetterDrops.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 });
                      
                      if (enemy.id !== undefined) {
                        bombIntervalsToClean.push(enemy.id);
                      }
                    }
                  } 
                  else {
                    // Cube enemy - one hit kill
                    enemiesToDestroy.add(enemyIndex);
                    explosionsToCreate.push({
                      x: enemy.x + enemy.width / 2,
                      y: enemy.y + enemy.height / 2,
                      type: enemy.type
                    });
                    scoreIncrease += 100;
                    toast.success("Cube enemy destroyed! +100 points");
                    soundManager.playExplosion();
                    enemiesKilledIncrease++;
                    setScreenShake(3);
                    setTimeout(() => setScreenShake(0), 300);
                    bonusLetterDrops.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 });
                    
                    if (enemy.id !== undefined) {
                      bombIntervalsToClean.push(enemy.id);
                    }
                  }
                }
                break;
              }
              
              // Handle brick collision - find brick by ID
              const brick = bricks.find(b => b.id === objectId);
              if (brick) {
                
                if (!brick.visible) break;

                // Handle indestructible (metal) bricks
                if (brick.isIndestructible) {
                  soundManager.playBounce();
                  setCurrentCombo(0);
                  break;
                }

                // Check if already updated this frame
                if (brickUpdates.has(brick.id)) break;

                const currentHitsRemaining = brick.hitsRemaining;
                const newHitsRemaining = currentHitsRemaining - 1;
                const brickDestroyed = newHitsRemaining <= 0;

                // Play sound based on CURRENT state before hit
                if (brick.type === 'cracked') {
                  soundsToPlay.push({ type: 'cracked', param: currentHitsRemaining });
                } else {
                  soundsToPlay.push({ type: 'brick' });
                }

                if (brickDestroyed) {
                  // Mark brick for destruction
                  brickUpdates.set(brick.id, { visible: false, hitsRemaining: 0 });
                  
                  scoreIncrease += brick.points;
                  bricksDestroyedCount += 1;
                  comboIncrease += 1;

                  // Speed increase (cap at 30%)
                  if (brickHitSpeedAccumulated < 0.3) {
                    const speedIncrease = 0.005;
                    setBrickHitSpeedAccumulated(prev => Math.min(0.3, prev + speedIncrease));
                    result.ball.dx *= (1 + speedIncrease);
                    result.ball.dy *= (1 + speedIncrease);
                  }

                  // Power-up drop
                  if (Math.random() < POWERUP_DROP_CHANCE) {
                    powerUpsToCreate.push(brick);
                  }

                  // Explosive brick handling
                  if (brick.type === 'explosive') {
                    explosiveBricksToDetonate.push(brick);
                  }
                } else {
                  // Brick damaged but not destroyed
                  brickUpdates.set(brick.id, { visible: true, hitsRemaining: newHitsRemaining });
                }
              }
              break;
          }
        });
      });

      // Phase 3: Apply all batched updates
      // Play all sounds
      soundsToPlay.forEach(sound => {
        if (sound.type === 'cracked') {
          soundManager.playBrickHit('cracked', sound.param);
        } else {
          soundManager.playBrickHit();
        }
      });

      // Create all power-ups
      powerUpsToCreate.forEach(brick => createPowerUp(brick));

      // Handle explosive bricks
      explosiveBricksToDetonate.forEach(brick => {
        const explosionRadius = 55;
        const brickCenterX = brick.x + brick.width / 2;
        const brickCenterY = brick.y + brick.height / 2;

        // Create explosion visual
        setExplosions(prev => [...prev, {
          x: brickCenterX,
          y: brickCenterY,
          frame: 0,
          maxFrames: 30,
          size: explosionRadius * 2,
          particles: createExplosionParticles(brickCenterX, brickCenterY, 'cube')
        }]);

        // Destroy nearby bricks
        bricks.forEach(otherBrick => {
          if (otherBrick.id === brick.id || !otherBrick.visible) return;
          
          const otherCenterX = otherBrick.x + otherBrick.width / 2;
          const otherCenterY = otherBrick.y + otherBrick.height / 2;
          const distance = Math.sqrt(
            Math.pow(otherCenterX - brickCenterX, 2) + 
            Math.pow(otherCenterY - brickCenterY, 2)
          );

          if (distance <= explosionRadius) {
            if (!brickUpdates.has(otherBrick.id)) {
              brickUpdates.set(otherBrick.id, { visible: false, hitsRemaining: 0 });
              scoreIncrease += otherBrick.points;
              bricksDestroyedCount += 1;
            }
          }
        });

        soundManager.playExplosiveBrickSound();
        setBackgroundFlash(10);
        setTimeout(() => setBackgroundFlash(0), 100);
      });

      // Update brick state
      if (brickUpdates.size > 0) {
        setBricks(prevBricks => {
          const newBricks = prevBricks.map(b => {
            const update = brickUpdates.get(b.id);
            return update ? { ...b, ...update } : b;
          });

          // Check win condition
          if (newBricks.every(b => !b.visible || b.isIndestructible)) {
            const hasDestructibleBricks = newBricks.some(b => !b.isIndestructible);
            if (hasDestructibleBricks) {
              soundManager.playWin();

              if (level >= 50) {
                setScore(prev => prev + 1000000);
                setBeatLevel50Completed(true);
                setGameState("won");
                setShowEndScreen(true);
                soundManager.stopBackgroundMusic();
                toast.success(`🎉 YOU WIN! Level ${level} Complete! Bonus: +1,000,000 points!`);
              } else {
                setGameState("ready");
                toast.success(`Level ${level} Complete! Click to continue.`);
              }

              return newBricks.map(b => ({ ...b, visible: false }));
            } else if (!BOSS_LEVELS.includes(level)) {
              soundManager.playWin();
              if (level >= 50) {
                setScore(prev => prev + 1000000);
                setBeatLevel50Completed(true);
                setGameState("won");
                setShowEndScreen(true);
                soundManager.stopBackgroundMusic();
                toast.success(`🎉 YOU WIN! Level ${level} Complete! Bonus: +1,000,000 points!`);
              } else {
                setGameState("ready");
                toast.success(`Level ${level} Complete! Click to continue.`);
              }
              return newBricks.map(b => ({ ...b, visible: false }));
            }
          }

          return newBricks;
        });
      }

      // Update score and stats
      if (scoreIncrease > 0) setScore(s => s + scoreIncrease);
      if (bricksDestroyedCount > 0) {
        setTotalBricksDestroyed(t => t + bricksDestroyedCount);
        setBricksHit(b => b + bricksDestroyedCount);
      }
      if (comboIncrease > 0) setCurrentCombo(c => c + comboIncrease);

      // Apply enemy updates
      setEnemies(prev => {
        const updated = prev.map((e, idx) => {
          if (enemiesToDestroy.has(idx)) return null;
          if (e.id !== undefined && enemiesToUpdate.has(e.id)) {
            return { ...e, ...enemiesToUpdate.get(e.id)! };
          }
          return e;
        }).filter((e): e is Enemy => e !== null);
        return updated;
      });

      // Create explosions with particles
      explosionsToCreate.forEach(exp => {
        setExplosions(prev => [...prev, {
          x: exp.x,
          y: exp.y,
          frame: 0,
          maxFrames: 20,
          enemyType: exp.type,
          particles: createExplosionParticles(exp.x, exp.y, exp.type)
        }]);
      });

      // Handle bonus letter drops
      bonusLetterDrops.forEach(drop => {
        dropBonusLetter(drop.x, drop.y);
      });

      // Clean up bomb intervals
      bombIntervalsToClean.forEach(enemyId => {
        const interval = bombIntervalsRef.current.get(enemyId);
        if (interval) {
          clearInterval(interval);
          bombIntervalsRef.current.delete(enemyId);
        }
      });

      // Update enemies killed counter and handle power-up drops
      if (enemiesKilledIncrease > 0) {
        setEnemiesKilled(prev => {
          const newCount = prev + enemiesKilledIncrease;
          
          // Check for power-up drops based on enemy kill count
          enemiesToDestroy.forEach(idx => {
            const enemy = enemies[idx];
            if (!enemy) return;
            
            const isBossSpawned = bossSpawnedEnemiesRef.current.has(enemy.id || -1);
            const shouldDrop = isBossSpawned ? Math.random() < 0.5 : (newCount % 3 === 0);
            
            if (shouldDrop) {
              const fakeBrick: Brick = {
                id: -1,
                x: enemy.x,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height,
                visible: true,
                color: "",
                points: 0,
                hasPowerUp: true,
                hitsRemaining: 0,
                maxHits: 1,
                isIndestructible: false,
                type: "normal"
              };
              let powerUp = createPowerUp(fakeBrick);
              let attempts = 0;
              while (!powerUp && attempts < 10) {
                powerUp = createPowerUp(fakeBrick);
                attempts++;
              }
              if (powerUp) {
                setPowerUps(prev => [...prev, powerUp]);
                if (isBossSpawned) {
                  toast.success("Boss minion bonus! Power-up dropped!");
                } else {
                  toast.success("Enemy kill bonus! Power-up dropped!");
                }
              }
            }
          });
          
          return newCount;
        });
      }

      // Phase 3.5: Shape-Specific Boss Collision Check (rotating hitboxes)
      // Hitbox is 1 pixel WIDER than the visual shape and rotates with the boss
      
      // Helper: Circle vs Rotated Rectangle (for cube boss)
      const checkCircleVsRotatedRect = (ball: Ball, boss: Boss): { newX: number; newY: number; newVelocityX: number; newVelocityY: number } | null => {
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        const HITBOX_EXPAND = 1;
        
        const dx = ball.x - centerX;
        const dy = ball.y - centerY;
        
        const cos = Math.cos(-boss.rotationY);
        const sin = Math.sin(-boss.rotationY);
        const ux = dx * cos - dy * sin;
        const uy = dx * sin + dy * cos;
        
        const halfW = (boss.width + 2 * HITBOX_EXPAND) / 2;
        const halfH = (boss.height + 2 * HITBOX_EXPAND) / 2;
        
        const closestX = Math.max(-halfW, Math.min(ux, halfW));
        const closestY = Math.max(-halfH, Math.min(uy, halfH));
        
        const distX = ux - closestX;
        const distY = uy - closestY;
        const distSq = distX * distX + distY * distY;
        
        if (distSq > ball.radius * ball.radius) return null;
        
        let normalX = 0, normalY = 0;
        if (Math.abs(ux) > halfW) {
          normalX = ux > 0 ? 1 : -1;
        } else if (Math.abs(uy) > halfH) {
          normalY = uy > 0 ? 1 : -1;
        } else {
          const overlapX = halfW - Math.abs(ux);
          const overlapY = halfH - Math.abs(uy);
          if (overlapX < overlapY) {
            normalX = ux > 0 ? 1 : -1;
          } else {
            normalY = uy > 0 ? 1 : -1;
          }
        }
        
        // Calculate penetration and push out in unrotated space
        const dist = Math.sqrt(distSq);
        const penetration = ball.radius - dist;
        const pushX = ux + (distX / dist) * penetration;
        const pushY = uy + (distY / dist) * penetration;
        
        // Rotate corrected position back to world space
        const worldPushX = pushX * Math.cos(boss.rotationY) - pushY * Math.sin(boss.rotationY);
        const worldPushY = pushX * Math.sin(boss.rotationY) + pushY * Math.cos(boss.rotationY);
        const newX = centerX + worldPushX;
        const newY = centerY + worldPushY;
        
        const worldNormalX = normalX * cos + normalY * sin;
        const worldNormalY = -normalX * sin + normalY * cos;
        
        const dot = ball.dx * worldNormalX + ball.dy * worldNormalY;
        const newVx = ball.dx - 2 * dot * worldNormalX;
        const newVy = ball.dy - 2 * dot * worldNormalY;
        
        return { newX, newY, newVelocityX: newVx, newVelocityY: newVy };
      };
      
      // Helper: Circle vs Circle (for sphere boss)
      const checkCircleVsCircle = (ball: Ball, boss: Boss): { newX: number; newY: number; newVelocityX: number; newVelocityY: number } | null => {
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        const HITBOX_EXPAND = 1;
        
        const dx = ball.x - centerX;
        const dy = ball.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const bossRadius = boss.width / 2 + HITBOX_EXPAND;
        const totalRadius = ball.radius + bossRadius;
        
        if (dist >= totalRadius) return null;
        
        const normalX = dx / dist;
        const normalY = dy / dist;
        
        // Push ball out to correct position
        const overlap = totalRadius - dist;
        const newX = ball.x + normalX * overlap;
        const newY = ball.y + normalY * overlap;
        
        const dot = ball.dx * normalX + ball.dy * normalY;
        const newVx = ball.dx - 2 * dot * normalX;
        const newVy = ball.dy - 2 * dot * normalY;
        
        return { newX, newY, newVelocityX: newVx, newVelocityY: newVy };
      };
      
      // Helper: Circle vs Rotated Triangle (for pyramid boss)
      const checkCircleVsRotatedTriangle = (ball: Ball, boss: Boss): { newX: number; newY: number; newVelocityX: number; newVelocityY: number } | null => {
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        const HITBOX_EXPAND = 1;
        const size = boss.width / 2 + HITBOX_EXPAND;
        
        const v0 = { x: 0, y: -size };
        const v1 = { x: size, y: size };
        const v2 = { x: -size, y: size };
        
        const cos = Math.cos(boss.rotationY);
        const sin = Math.sin(boss.rotationY);
        
        const rotatePoint = (p: { x: number; y: number }) => ({
          x: p.x * cos - p.y * sin,
          y: p.x * sin + p.y * cos
        });
        
        const rv0 = rotatePoint(v0);
        const rv1 = rotatePoint(v1);
        const rv2 = rotatePoint(v2);
        
        const wv0 = { x: centerX + rv0.x, y: centerY + rv0.y };
        const wv1 = { x: centerX + rv1.x, y: centerY + rv1.y };
        const wv2 = { x: centerX + rv2.x, y: centerY + rv2.y };
        
        const edges = [
          { a: wv0, b: wv1 },
          { a: wv1, b: wv2 },
          { a: wv2, b: wv0 }
        ];
        
        let closestDist = Infinity;
        let closestNormal = { x: 0, y: 0 };
        
        for (const edge of edges) {
          const ex = edge.b.x - edge.a.x;
          const ey = edge.b.y - edge.a.y;
          const len = Math.sqrt(ex * ex + ey * ey);
          const edgeNormX = ex / len;
          const edgeNormY = ey / len;
          
          const normalX = -edgeNormY;
          const normalY = edgeNormX;
          
          const toBallX = ball.x - edge.a.x;
          const toBallY = ball.y - edge.a.y;
          const t = Math.max(0, Math.min(len, toBallX * edgeNormX + toBallY * edgeNormY));
          
          const closestX = edge.a.x + t * edgeNormX;
          const closestY = edge.a.y + t * edgeNormY;
          
          const distX = ball.x - closestX;
          const distY = ball.y - closestY;
          const dist = Math.sqrt(distX * distX + distY * distY);
          
          if (dist < closestDist) {
            closestDist = dist;
            const toCenterX = ball.x - centerX;
            const toCenterY = ball.y - centerY;
            const dotProduct = normalX * toCenterX + normalY * toCenterY;
            closestNormal = dotProduct > 0 
              ? { x: normalX, y: normalY }
              : { x: -normalX, y: -normalY };
          }
        }
        
        if (closestDist >= ball.radius) return null;
        
        // Push ball out to correct position
        const penetration = ball.radius - closestDist;
        const newX = ball.x + closestNormal.x * penetration;
        const newY = ball.y + closestNormal.y * penetration;
        
        const dot = ball.dx * closestNormal.x + ball.dy * closestNormal.y;
        const newVx = ball.dx - 2 * dot * closestNormal.x;
        const newVy = ball.dy - 2 * dot * closestNormal.y;
        
        return { newX, newY, newVelocityX: newVx, newVelocityY: newVy };
      };
      
      // Dispatch to shape-specific collision check
      ballResults.forEach((result) => {
        if (!result.ball || !boss) return;
        
        let collision = null;
        
        switch (boss.type) {
          case 'cube':
            collision = checkCircleVsRotatedRect(result.ball, boss);
            break;
          case 'sphere':
            collision = checkCircleVsCircle(result.ball, boss);
            break;
          case 'pyramid':
            collision = checkCircleVsRotatedTriangle(result.ball, boss);
            break;
        }
        
        if (collision) {
          // ALWAYS apply position and velocity corrections (physics)
          result.ball.x = collision.newX;
          result.ball.y = collision.newY;
          result.ball.dx = collision.newVelocityX;
          result.ball.dy = collision.newVelocityY;
          
          // ONLY deal damage if cooldown has elapsed (game logic)
          const now = Date.now();
          if (!result.ball.lastHitTime || now - result.ball.lastHitTime >= 1000) {
            result.ball.lastHitTime = now;
            setBossHitCooldown(1000); // Start 1 second cooldown
            
            soundManager.playBossHitSound();
            setScreenShake(8);
            setTimeout(() => setScreenShake(0), 400);
            
            setBoss(prev => {
              if (!prev) return prev;
              const newHealth = Math.max(0, prev.currentHealth - 1);
              
              if (newHealth <= 0) {
                soundManager.playExplosion();
                toast.success(`Boss defeated! +${BOSS_CONFIG[prev.type].points} points`);
                explosionsToCreate.push({
                  x: prev.x + prev.width / 2,
                  y: prev.y + prev.height / 2,
                  type: prev.type as EnemyType
                });
              } else {
                toast.info(`BOSS: ${newHealth} HP`, { 
                  duration: 1000,
                  style: { background: '#ff0000', color: '#fff' }
                });
              }
              return { ...prev, currentHealth: newHealth };
            });
          }
        }
      });

      // Phase 3.5: Explicit Paddle Overlap Resolution
      ballResults.forEach((result) => {
        if (!result.ball || !paddle) return;
        
        const ball = result.ball;
        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;
        
        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + paddle.width;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + paddle.height;
        
        // Check overlap
        if (ballRight > paddleLeft && ballLeft < paddleRight && 
            ballBottom > paddleTop && ballTop < paddleBottom) {
          
          // Calculate overlap depths on each axis
          const overlapLeft = ballRight - paddleLeft;
          const overlapRight = paddleRight - ballLeft;
          const overlapTop = ballBottom - paddleTop;
          const overlapBottom = paddleBottom - ballTop;
          
          // Find minimum overlap (push out along shortest axis)
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          
          if (minOverlap === overlapTop) {
            // Push ball up (most common case - ball inside paddle from top)
            ball.y = paddleTop - ball.radius;
            if (ball.dy > 0) ball.dy = -Math.abs(ball.dy);
          } else if (minOverlap === overlapBottom) {
            // Push ball down
            ball.y = paddleBottom + ball.radius;
            if (ball.dy < 0) ball.dy = Math.abs(ball.dy);
          } else if (minOverlap === overlapLeft) {
            // Push ball left
            ball.x = paddleLeft - ball.radius;
            if (ball.dx > 0) ball.dx = -Math.abs(ball.dx);
          } else if (minOverlap === overlapRight) {
            // Push ball right
            ball.x = paddleRight + ball.radius;
            if (ball.dx < 0) ball.dx = Math.abs(ball.dx);
          }
        }
      });

      // Phase 4: Update ball positions and check for lost balls
      // CRITICAL: Use the ball instances from ballResults to preserve lastHitTime
      const updatedBalls = ballResults
        .map(r => r.ball)
        .filter((ball): ball is NonNullable<typeof ball> => {
          if (!ball) return false;
          // Check if ball fell off bottom
          return ball.y <= SCALED_CANVAS_HEIGHT + ball.radius;
        });

      // Check if all balls are lost
      if (updatedBalls.length === 0) {
        setCurrentCombo(0);
        
        setLives(prev => {
          const newLives = prev - 1;
          soundManager.playLoseLife();
          
          if (newLives <= 0) {
            setGameState("gameOver");
            soundManager.stopBossMusic();
            soundManager.stopBackgroundMusic();
            setBossAttacks([]);

            // Create game over particles
            const particles: Particle[] = [];
            for (let i = 0; i < 100; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 4;
              particles.push({
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                life: 60,
                maxLife: 60
              });
            }
            setGameOverParticles(particles);

            // Check for high score
            isHighScore(score).then(result => {
              if (!levelSkipped && result) {
                setShowHighScoreEntry(true);
                setHighScoreParticles(createHighScoreParticles());
                soundManager.playHighScoreMusic();
                toast.error("Game Over - New High Score!");
              } else {
                setShowEndScreen(true);
                toast.error("Game Over!");
              }
            });
          } else {
            // Reset ball and continue
            const baseSpeed = 5.175;
            const initialAngle = -20 * Math.PI / 180;
            const resetBall: Ball = {
              x: SCALED_CANVAS_WIDTH / 2,
              y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
              dx: baseSpeed * Math.sin(initialAngle),
              dy: -baseSpeed * Math.cos(initialAngle),
              radius: SCALED_BALL_RADIUS,
              speed: baseSpeed,
              id: nextBallId.current++,
              isFireball: false,
              waitingToLaunch: true
            };
            setBalls([resetBall]);
            setLaunchAngle(-20);
            launchAngleDirectionRef.current = 1;
            setShowInstructions(true);
            setPowerUps([]);
            setPaddle(prev => prev ? {
              ...prev,
              hasTurrets: false,
              hasShield: false,
              width: SCALED_PADDLE_WIDTH
            } : null);
            setBullets([]);
            if (speedMultiplier < 1) {
              setSpeedMultiplier(1);
            }
            setBrickHitSpeedAccumulated(0);
            setTimer(0);
            setEnemies([]);
            setBossAttacks([]);
            setLaserWarnings([]);
            setBombs([]);
            setExplosions([]);
            bombIntervalsRef.current.forEach(interval => clearInterval(interval));
            bombIntervalsRef.current.clear();
            setGameState("ready");
            toast(`Life lost! ${newLives} lives remaining. Click to continue.`);
          }
          return newLives;
        });
      }

      return updatedBalls;
    });
  }, [paddle, balls, bricks, boss, resurrectedBosses, enemies, createPowerUp, setPowerUps, nextLevel, speedMultiplier, brickHitSpeedAccumulated, level, SCALED_CANVAS_WIDTH, SCALED_CANVAS_HEIGHT, SCALED_BRICK_WIDTH, SCALED_BRICK_HEIGHT, SCALED_PADDLE_WIDTH, SCALED_BALL_RADIUS, scaleFactor, levelSkipped, score, isHighScore, createHighScoreParticles, setHighScoreParticles, bombIntervalsRef, createExplosionParticles]);
  
  // Boss defeat handler
  const handleBossDefeat = useCallback((defeatedBoss: Boss) => {
    const config = BOSS_CONFIG[defeatedBoss.type];
    
    setScore(s => s + config.points);
    setBossesKilled(prev => prev + 1);
    toast.success(`${defeatedBoss.type.toUpperCase()} BOSS DEFEATED! +${config.points} points`, { duration: 4000 });
    
    // Big explosion
    setExplosions(prev => [...prev, {
      x: defeatedBoss.x + defeatedBoss.width / 2,
      y: defeatedBoss.y + defeatedBoss.height / 2,
      frame: 0,
      maxFrames: 40,
      enemyType: defeatedBoss.type as EnemyType,
      particles: createExplosionParticles(
        defeatedBoss.x + defeatedBoss.width / 2,
        defeatedBoss.y + defeatedBoss.height / 2,
        defeatedBoss.type as EnemyType
      )
    }]);
    
    soundManager.playExplosion();
    setScreenShake(15);
    setBackgroundFlash(1);
    setTimeout(() => {
      setScreenShake(0);
      setBackgroundFlash(0);
    }, 1000);
    
    // Clear all balls immediately
    setBalls([]);
    
    // Progress to next level after delay
    setTimeout(() => {
      soundManager.stopBossMusic();
      soundManager.resumeBackgroundMusic();
      setBossActive(false);
      nextLevel();
    }, 3000);
  }, [createExplosionParticles, nextLevel]);
  
  // FPS tracking for adaptive quality
  const fpsTrackerRef = useRef({ lastTime: performance.now(), frameCount: 0, fps: 60 });
  const lastFrameTimeRef = useRef(performance.now());
  const targetFrameTime = 1000 / 60; // 60 FPS cap
  
  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;

    // Throttle to 60 FPS
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;
    
    if (elapsed < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    lastFrameTimeRef.current = now - (elapsed % targetFrameTime);

    // Track FPS
    fpsTrackerRef.current.frameCount++;
    const deltaTime = now - fpsTrackerRef.current.lastTime;
    
    if (deltaTime >= 1000) {
      const fps = Math.min(60, Math.round(fpsTrackerRef.current.frameCount * 1000 / deltaTime));
      fpsTrackerRef.current.fps = fps;
      fpsTrackerRef.current.frameCount = 0;
      fpsTrackerRef.current.lastTime = now;
      
      // Update adaptive quality system and display
      updateFps(fps);
      setCurrentFps(fps);
    }
    
    // Also feed real-time FPS from fixed-step game loop if available
    if (gameLoopRef.current) {
      const debugInfo = gameLoopRef.current.getDebugInfo();
      if (debugInfo.fps > 0) {
        updateFps(debugInfo.fps);
      }
    }

    // Update background animation
    setBackgroundPhase(prev => (prev + 1) % 360);

    // Update balls rotation only (position is updated in checkCollision with substeps)
    setBalls(prev => prev.map(ball => {
      if (ball.waitingToLaunch && paddle) {
        // Keep ball attached to paddle
        return {
          ...ball,
          x: paddle.x + paddle.width / 2,
          y: paddle.y - ball.radius - 5
        };
      }
      return {
        ...ball,
        rotation: ((ball.rotation || 0) + 3) % 360 // Spinning rotation
      };
    }));

    // Update power-ups
    updatePowerUps();

    // Update bonus letters
    setBonusLetters(prev => prev.map(letter => ({
      ...letter,
      y: letter.y + letter.speed
    })));

    // Check bonus letter collisions
    checkBonusLetterCollision();

    // Update bullets
    updateBullets(bricks);

    // Update enemies
    setEnemies(prev => prev.map(enemy => {
      let newX = enemy.x + enemy.dx;
      let newY = enemy.y + enemy.dy;
      let newDx = enemy.dx;
      let newDy = enemy.dy;

      // Sphere and Pyramid enemies have more random movement
      if (enemy.type === "sphere" || enemy.type === "pyramid") {
        // Add some randomness to movement
        if (Math.random() < (enemy.type === "pyramid" ? 0.08 : 0.05)) {
          const randomAngle = (Math.random() - 0.5) * Math.PI / 4;
          const currentAngle = Math.atan2(newDy, newDx);
          const newAngle = currentAngle + randomAngle;
          newDx = Math.cos(newAngle) * enemy.speed;
          newDy = Math.sin(newAngle) * enemy.speed;
        }
      }

      // Bounce off walls
      if (newX <= 0 || newX >= SCALED_CANVAS_WIDTH - enemy.width) {
        newDx = -enemy.dx;
        newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - enemy.width, newX));
      }

      // Bounce off top and 60% boundary
      const maxY = SCALED_CANVAS_HEIGHT * 0.6;
      if (newY <= 0 || newY >= maxY - enemy.height) {
        newDy = -enemy.dy;
        newY = Math.max(0, Math.min(maxY - enemy.height, newY));
      }
      return {
        ...enemy,
        x: newX,
        y: newY,
        dx: newDx,
        dy: newDy,
        rotationX: enemy.rotationX + (enemy.type === "pyramid" ? 0.06 : enemy.type === "sphere" ? 0.08 : 0.05),
        rotationY: enemy.rotationY + (enemy.type === "pyramid" ? 0.09 : enemy.type === "sphere" ? 0.12 : 0.08),
        rotationZ: enemy.rotationZ + (enemy.type === "pyramid" ? 0.04 : enemy.type === "sphere" ? 0.06 : 0.03)
      };
    }));


    // Update explosions and their particles
    setExplosions(prev => prev.map(exp => ({
      ...exp,
      frame: exp.frame + 1,
      particles: exp.particles.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.2,
        // Add gravity
        life: p.life - 1
      })).filter(p => p.life > 0)
    })).filter(exp => exp.frame < exp.maxFrames));
    
    // Update game over particles
    setGameOverParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.15, // Gravity
      vx: p.vx * 0.98, // Air resistance
      life: p.life - 1
    })).filter(p => p.life > 0));

    // Update high score celebration particles
    setHighScoreParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.2, // Gravity effect
      life: p.life - 1
    })).filter(p => p.life > 0));

    // Update bombs and rockets (pyramid bullets move in straight lines with angle)
    setBombs(prev => prev.map(bomb => {
      if (bomb.type === "pyramidBullet" && bomb.dx !== undefined) {
        // Pyramid bullets move in straight line at angle
        return {
          ...bomb,
          x: bomb.x + (bomb.dx || 0),
          y: bomb.y + bomb.speed
        };
      }
      return {
        ...bomb,
        y: bomb.y + bomb.speed
      };
    }).filter(bomb => bomb.y < SCALED_CANVAS_HEIGHT));

    // Check bomb-paddle collision
    if (paddle) {
      bombs.forEach(bomb => {
        // Check for shield first
        if (paddle.hasShield && bomb.x + bomb.width > paddle.x && bomb.x < paddle.x + paddle.width && bomb.y + bomb.height > paddle.y - 10 && bomb.y < paddle.y) {
          // Bomb hit shield - destroy both
          soundManager.playBounce();
          
          // Add shield impact effect at bomb position
          setShieldImpacts(prev => [...prev, {
            x: bomb.x + bomb.width / 2,
            y: bomb.y + bomb.height / 2,
            startTime: Date.now(),
            duration: 600
          }]);
          
          setBombs(prev => prev.filter(b => b.enemyId !== bomb.enemyId));
          setPaddle(prev => prev ? {
            ...prev,
            hasShield: false
          } : null);
          toast.success("Shield absorbed the hit!");
          return;
        }
        if (bomb.x + bomb.width > paddle.x && bomb.x < paddle.x + paddle.width && bomb.y + bomb.height > paddle.y && bomb.y < paddle.y + paddle.height) {
          // Bomb hit paddle - lose a life
          soundManager.playLoseLife();
          setBombs(prev => prev.filter(b => b.enemyId !== bomb.enemyId));
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState("gameOver");
              soundManager.stopBossMusic();
              soundManager.stopBackgroundMusic();
              setBossAttacks([]);
              setLaserWarnings([]);
              // Check for high score immediately
              isHighScore(score).then(result => {
                if (!levelSkipped && result) {
                  setShowHighScoreEntry(true);
                  soundManager.playHighScoreMusic();
                  toast.error("Game Over - New High Score!");
                } else {
                  setShowEndScreen(true);
                  toast.error("Game Over!");
                }
              });
            } else {
              // Reset ball and clear power-ups, but wait for click to continue
              const baseSpeed = 5.175; // 50% faster base speed
              const resetBall: Ball = {
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: SCALED_BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true
              };
              setBalls([resetBall]);
              setLaunchAngle(-20);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setBonusLetters([]);
              setPaddle(prev => prev ? {
                ...prev,
                hasTurrets: false,
                hasShield: false,
                width: SCALED_PADDLE_WIDTH
              } : null);
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
              // Reset accumulated brick hit speed on death
              setBrickHitSpeedAccumulated(0);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setEnemies([]); // Clear all enemies
              setBossAttacks([]);
              setLaserWarnings([]);
              setBombs([]); // Clear all bombs
              setExplosions([]);
              // Clear all bomb intervals
              bombIntervalsRef.current.forEach(interval => clearInterval(interval));
              bombIntervalsRef.current.clear();
              setGameState("ready");
              toast.error(`Bomb hit! ${newLives} lives remaining. Click to continue.`);
            }
            return newLives;
          });
        }
      });
    }

    // Check bounced bullet-paddle collision
    if (paddle) {
      bullets.forEach(bullet => {
        // Check for shield first
        if (paddle.hasShield && bullet.isBounced && bullet.x + bullet.width > paddle.x && bullet.x < paddle.x + paddle.width && bullet.y + bullet.height > paddle.y - 10 && bullet.y < paddle.y) {
          // Bullet hit shield - destroy both
          soundManager.playBounce();
          
          // Add shield impact effect at bullet position
          setShieldImpacts(prev => [...prev, {
            x: bullet.x + bullet.width / 2,
            y: bullet.y + bullet.height / 2,
            startTime: Date.now(),
            duration: 600
          }]);
          
          setBullets(prev => prev.filter(b => b !== bullet));
          setPaddle(prev => prev ? {
            ...prev,
            hasShield: false
          } : null);
          toast.success("Shield absorbed the hit!");
          return;
        }
        if (bullet.isBounced && bullet.x + bullet.width > paddle.x && bullet.x < paddle.x + paddle.width && bullet.y + bullet.height > paddle.y && bullet.y < paddle.y + paddle.height) {
          // Bounced bullet hit paddle - lose a life
          soundManager.playLoseLife();
          setBullets(prev => prev.filter(b => b !== bullet));
          setLives(prev => {
            const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState("gameOver");
            soundManager.stopBossMusic();
            soundManager.stopBackgroundMusic();
            setBossAttacks([]);
            setLaserWarnings([]);
            // Check for high score immediately
            isHighScore(score).then(result => {
              if (!levelSkipped && result) {
                setShowHighScoreEntry(true);
                soundManager.playHighScoreMusic();
                toast.error("Game Over - New High Score!");
              } else {
                setShowEndScreen(true);
                toast.error("Game Over!");
              }
            });
          } else {
              // Reset ball and clear power-ups, but wait for click to continue
              const baseSpeed = 5.175; // 50% faster base speed
              const resetBall: Ball = {
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: SCALED_BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true
              };
              setBalls([resetBall]);
              setLaunchAngle(-20);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setBonusLetters([]);
              setPaddle(prev => prev ? {
                ...prev,
                hasTurrets: false,
                hasShield: false,
                width: SCALED_PADDLE_WIDTH
              } : null);
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
              // Reset accumulated brick hit speed on death
              setBrickHitSpeedAccumulated(0);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setEnemies([]); // Clear all enemies
              setBossAttacks([]);
              setLaserWarnings([]);
              setBombs([]); // Clear all bombs
              setExplosions([]);
              // Clear all bomb intervals
              bombIntervalsRef.current.forEach(interval => clearInterval(interval));
              bombIntervalsRef.current.clear();
              setGameState("ready");
              toast.error(`Bullet hit! ${newLives} lives remaining. Click to continue.`);
            }
            return newLives;
          });
        }
      });
    }

    // Update boss movement and attacks
    if (boss && boss.phase === 'moving') {
      const dx = boss.targetPosition.x - boss.x;
      const dy = boss.targetPosition.y - boss.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        setBoss(prev => prev ? { ...prev, phase: 'attacking', x: boss.targetPosition.x, y: boss.targetPosition.y, dx: 0, dy: 0, lastAttackTime: Date.now() } : null);
      } else {
        const config = BOSS_CONFIG[boss.type];
        const moveSpeed = boss.isSuperAngry && 'superAngryMoveSpeed' in config ? config.superAngryMoveSpeed : (boss.isAngry && 'angryMoveSpeed' in config ? config.angryMoveSpeed : boss.speed);
        setBoss(prev => prev ? { ...prev, x: prev.x + (dx / distance) * moveSpeed, y: prev.y + (dy / distance) * moveSpeed, rotationX: prev.rotationX + 0.05, rotationY: prev.rotationY + 0.08, rotationZ: prev.rotationZ + 0.03 } : null);
      }
    }
    
    if (boss && boss.phase === 'attacking' && Date.now() - boss.lastAttackTime >= boss.attackCooldown && paddle) {
      performBossAttack(boss, paddle.x + paddle.width / 2, paddle.y, setBossAttacks, setLaserWarnings);
      const nextIndex = (boss.currentPositionIndex + 1) % boss.positions.length;
      setBoss(prev => prev ? { ...prev, phase: 'moving', targetPosition: prev.positions[nextIndex], currentPositionIndex: nextIndex, lastAttackTime: Date.now() } : null);
    }
    
    // Update resurrected bosses
    resurrectedBosses.forEach((resBoss, idx) => {
      if (resBoss.phase === 'moving') {
        const dx = resBoss.targetPosition.x - resBoss.x;
        const dy = resBoss.targetPosition.y - resBoss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          setResurrectedBosses(prev => prev.map((b, i) => i === idx ? { ...b, phase: 'attacking', lastAttackTime: Date.now() } : b));
        } else {
          setResurrectedBosses(prev => prev.map((b, i) => i === idx ? { ...b, x: b.x + (dx/dist) * b.speed, y: b.y + (dy/dist) * b.speed, rotationX: b.rotationX + 0.08, rotationY: b.rotationY + 0.12 } : b));
        }
      } else if (resBoss.phase === 'attacking' && Date.now() - resBoss.lastAttackTime >= resBoss.attackCooldown && paddle) {
        performBossAttack(resBoss, paddle.x + paddle.width / 2, paddle.y, setBossAttacks, setLaserWarnings);
        const nextIdx = (resBoss.currentPositionIndex + 1) % resBoss.positions.length;
        setResurrectedBosses(prev => prev.map((b, i) => i === idx ? { ...b, phase: 'moving', targetPosition: b.positions[nextIdx], currentPositionIndex: nextIdx, lastAttackTime: Date.now() } : b));
      }
    });
    
    // Update boss attacks
    setBossAttacks(prev => prev.filter(attack => {
      if (attack.type === 'laser') return true;
      const newX = attack.x + (attack.dx || 0);
      const newY = attack.y + (attack.dy || 0);
      if (newX < 0 || newX > SCALED_CANVAS_WIDTH || newY < 0 || newY > SCALED_CANVAS_HEIGHT) return false;
      attack.x = newX;
      attack.y = newY;
      // Check boss shot collisions with paddle
      if (paddle && attack.x + attack.width > paddle.x && attack.x < paddle.x + paddle.width && attack.y + attack.height > paddle.y && attack.y < paddle.y + paddle.height) {
        // Check for shield first
        if (paddle.hasShield) {
          soundManager.playBounce();
          
          // Add shield impact effect at attack position
          setShieldImpacts(prev => [...prev, {
            x: attack.x + attack.width / 2,
            y: attack.y + attack.height / 2,
            startTime: Date.now(),
            duration: 600
          }]);
          
          setPaddle(prev => prev ? { ...prev, hasShield: false } : null);
          toast.success("Shield absorbed boss attack!");
          return false; // Remove attack
        }
        
        // No shield - take damage
        soundManager.playLoseLife();
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState("gameOver");
            soundManager.stopBossMusic();
            soundManager.stopBackgroundMusic();
            setBossAttacks([]);
            setLaserWarnings([]);
            // Check for high score immediately
            isHighScore(score).then(result => {
              if (!levelSkipped && result) {
                setShowHighScoreEntry(true);
                soundManager.playHighScoreMusic();
                toast.error("Game Over - New High Score!");
              } else {
                setShowEndScreen(true);
                toast.error("Game Over!");
              }
            });
          } else {
            // Reset ball and clear power-ups, wait for click to continue
            const baseSpeed = 5.175;
            setBalls([{
              id: nextBallId.current++,
              x: SCALED_CANVAS_WIDTH / 2,
              y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
              dx: baseSpeed,
              dy: -baseSpeed,
              radius: SCALED_BALL_RADIUS,
              speed: baseSpeed,
              waitingToLaunch: true,
              isFireball: false
            }]);
            setLaunchAngle(-20);
            launchAngleDirectionRef.current = 1;
            setShowInstructions(true);
            setPowerUps([]);
            setBonusLetters([]);
            setBullets([]);
            setEnemies([]);
            setBossAttacks([]);
            setLaserWarnings([]);
            setBombs([]);
            setExplosions([]);
            setPaddle(prev => prev ? {
              ...prev,
              hasTurrets: false,
              hasShield: false,
              width: SCALED_PADDLE_WIDTH
            } : null);
            // Clear all bomb intervals
            bombIntervalsRef.current.forEach(interval => clearInterval(interval));
            bombIntervalsRef.current.clear();
            setGameState("ready");
            toast.error(`Boss attack hit! ${newLives} lives remaining. Click to continue.`);
          }
          return newLives;
        });
        return false;
      }
      return true;
    }));
    
    // Check laser collisions with paddle separately
    bossAttacks.forEach(attack => {
      if (attack.type === 'laser' && paddle) {
        // Check if paddle is within laser X range
        const laserRight = attack.x + attack.width;
        const paddleRight = paddle.x + paddle.width;
        
        if (paddle.x < laserRight && paddleRight > attack.x) {
          // Check for shield first
          if (paddle.hasShield) {
            soundManager.playBounce();
            
            // Add shield impact effect at paddle center (laser is wide)
            setShieldImpacts(prev => [...prev, {
              x: paddle.x + paddle.width / 2,
              y: paddle.y,
              startTime: Date.now(),
              duration: 600
            }]);
            
            setPaddle(prev => prev ? { ...prev, hasShield: false } : null);
            toast.success("Shield absorbed laser!");
            // Remove laser attack
            setBossAttacks(prev => prev.filter(a => a !== attack));
            return;
          }
          
          // No shield - paddle is hit by laser!
          soundManager.playLoseLife();
          setLives(prev => {
            const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState("gameOver");
            soundManager.stopBossMusic();
            soundManager.stopBackgroundMusic();
            setBossAttacks([]);
            setLaserWarnings([]);
            // Check for high score immediately
            isHighScore(score).then(result => {
              if (!levelSkipped && result) {
                setShowHighScoreEntry(true);
                soundManager.playHighScoreMusic();
                toast.error("Game Over - New High Score!");
              } else {
                setShowEndScreen(true);
                toast.error("Game Over!");
              }
            });
          } else {
              // Reset game to ready state
              const baseSpeed = 5.175;
              setBalls([{
                id: nextBallId.current++,
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: SCALED_BALL_RADIUS,
                speed: baseSpeed,
                waitingToLaunch: true,
                isFireball: false
              }]);
              setLaunchAngle(-20);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true);
              setPowerUps([]);
              setBonusLetters([]);
              setBullets([]);
              setEnemies([]);
              setBossAttacks([]);
              setLaserWarnings([]);
              setBombs([]);
              setExplosions([]);
              setPaddle(prev => prev ? {
                ...prev,
                hasTurrets: false,
                hasShield: false,
                width: SCALED_PADDLE_WIDTH
              } : null);
              bombIntervalsRef.current.forEach(interval => clearInterval(interval));
              bombIntervalsRef.current.clear();
              setGameState("ready");
              toast.error(`LASER HIT! ${newLives} lives remaining. Click to continue.`);
            }
            return newLives;
          });
          
          // Remove the laser after hit
          setBossAttacks(prev => prev.filter(a => a !== attack));
        }
      }
    });
    
    // Clean up expired laser warnings
    setLaserWarnings(prev => prev.filter(warning => Date.now() - warning.startTime < 800));
    
    // Boss collision with balls
    if (boss && paddle) {
      balls.forEach(ball => {
        // Add cooldown check to prevent multiple hits - 1000ms cooldown
        const now = Date.now();
        if (ball.lastHitTime && now - ball.lastHitTime < 1000) {
          return; // Skip this collision check
        }
        
        if (!ball.waitingToLaunch && ball.x + ball.radius > boss.x && ball.x - ball.radius < boss.x + boss.width && ball.y + ball.radius > boss.y && ball.y - ball.radius < boss.y + boss.height) {
          soundManager.playBossHitSound();
          setScreenShake(10);
          setBackgroundFlash(0.3);
          setTimeout(() => {
            setScreenShake(0);
            setBackgroundFlash(0);
          }, 500);
          
          // Create hit particles
          const hitParticles: Particle[] = [];
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            hitParticles.push({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 3 + Math.random() * 3,
              color: boss.type === 'cube' ? 'hsl(200, 100%, 60%)' : boss.type === 'sphere' ? 'hsl(330, 100%, 60%)' : 'hsl(280, 100%, 60%)',
              life: 20,
              maxLife: 20
            });
          }
          setExplosions(prev => [...prev, {
            x: ball.x,
            y: ball.y,
            frame: 0,
            maxFrames: 20,
            enemyType: boss.type as EnemyType,
            particles: hitParticles
          }]);
          
          const angle = Math.atan2(ball.y - (boss.y + boss.height/2), ball.x - (boss.x + boss.width/2));
          setBalls(prev => prev.map(b => b.id === ball.id ? { ...b, dx: Math.cos(angle) * b.speed, dy: Math.sin(angle) * b.speed, lastHitTime: now } : b));
          
          setBoss(prev => {
            if (!prev) return null;
            const newHealth = prev.currentHealth - 1;
            if (prev.type === 'cube' && newHealth <= 0) { handleBossDefeat(prev); return null; }
            if (prev.type === 'sphere') {
              if (newHealth === 0 && !prev.isAngry) { 
                toast.warning("SPHERE BOSS ENRAGED!"); 
                soundManager.playBossPhaseTransitionSound();
                setScreenShake(15);
                setTimeout(() => setScreenShake(0), 600);
                return { ...prev, currentHealth: BOSS_CONFIG.sphere.healthPhase2, maxHealth: BOSS_CONFIG.sphere.healthPhase2, isAngry: true, speed: BOSS_CONFIG.sphere.angryMoveSpeed }; 
              }
              if (newHealth <= 0 && prev.isAngry) { handleBossDefeat(prev); return null; }
            }
            if (prev.type === 'pyramid' && !prev.isResurrected) {
              if (newHealth === 0 && !prev.isAngry) { 
                toast.warning("PYRAMID BOSS ENRAGED!"); 
                soundManager.playBossPhaseTransitionSound();
                setScreenShake(15);
                setTimeout(() => setScreenShake(0), 600);
                return { ...prev, currentHealth: BOSS_CONFIG.pyramid.healthPhase2, maxHealth: BOSS_CONFIG.pyramid.healthPhase2, isAngry: true }; 
              }
              if (newHealth <= 0 && prev.isAngry) {
                toast.error("PYRAMID RESURRECTS!");
                soundManager.playExplosion();
                soundManager.playExplosion();
                setScreenShake(20);
                setTimeout(() => setScreenShake(0), 800);
                const resurrected = [0,1,2].map(i => createResurrectedPyramid(prev, i, SCALED_CANVAS_WIDTH, SCALED_CANVAS_HEIGHT));
                setResurrectedBosses(resurrected);
                return null;
              }
            }
            toast.info(`${prev.type.toUpperCase()}: ${newHealth} HP`);
            return { ...prev, currentHealth: newHealth };
          });
        }
      });
    }
    
    // Resurrected boss collisions with balls
    resurrectedBosses.forEach((resBoss, bossIdx) => {
      balls.forEach(ball => {
        // Add cooldown check to prevent multiple hits - 1000ms cooldown
        const now = Date.now();
        if (ball.lastHitTime && now - ball.lastHitTime < 1000) {
          return; // Skip this collision check
        }
        
        if (!ball.waitingToLaunch && ball.x + ball.radius > resBoss.x && ball.x - ball.radius < resBoss.x + resBoss.width && ball.y + ball.radius > resBoss.y && ball.y - ball.radius < resBoss.y + resBoss.height) {
          soundManager.playBossHitSound();
          setScreenShake(8);
          setBackgroundFlash(0.2);
          setTimeout(() => {
            setScreenShake(0);
            setBackgroundFlash(0);
          }, 400);
          
          // Create hit particles
          const hitParticles: Particle[] = [];
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            hitParticles.push({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2 + Math.random() * 3,
              color: 'hsl(280, 100%, 60%)',
              life: 15,
              maxLife: 15
            });
          }
          setExplosions(prev => [...prev, {
            x: ball.x,
            y: ball.y,
            frame: 0,
            maxFrames: 15,
            enemyType: 'pyramid' as EnemyType,
            particles: hitParticles
          }]);
          
          const angle = Math.atan2(ball.y - (resBoss.y + resBoss.height/2), ball.x - (resBoss.x + resBoss.width/2));
          setBalls(prev => prev.map(b => b.id === ball.id ? { ...b, dx: Math.cos(angle) * b.speed, dy: Math.sin(angle) * b.speed, lastHitTime: now } : b));
          
          setResurrectedBosses(prev => {
            const updated = [...prev];
            const newHealth = updated[bossIdx].currentHealth - 1;
            
            if (newHealth <= 0) {
              // Boss destroyed
              const config = BOSS_CONFIG.pyramid;
              setScore(s => s + config.resurrectedPoints);
              toast.success(`PYRAMID DESTROYED! +${config.resurrectedPoints} points`);
              soundManager.playBossDefeatSound();
              
              setExplosions(e => [...e, {
                x: resBoss.x + resBoss.width / 2,
                y: resBoss.y + resBoss.height / 2,
                frame: 0,
                maxFrames: 30,
                enemyType: 'pyramid' as EnemyType,
                particles: createExplosionParticles(resBoss.x + resBoss.width / 2, resBoss.y + resBoss.height / 2, 'pyramid' as EnemyType)
              }]);
              soundManager.playExplosion();
              
              // Remove this boss
              const remaining = updated.filter((_, i) => i !== bossIdx);
              
              // Check if only one remains - make it super angry
              if (remaining.length === 1) {
                toast.error("FINAL PYRAMID ENRAGED!");
                remaining[0] = { ...remaining[0], isSuperAngry: true, speed: BOSS_CONFIG.pyramid.superAngryMoveSpeed };
              }
              
              // Check if all defeated
              if (remaining.length === 0) {
                toast.success("ALL PYRAMIDS DEFEATED!");
                setBossActive(false);
                setTimeout(() => nextLevel(), 3000);
              }
              
              return remaining;
            } else {
              toast.info(`PYRAMID: ${newHealth} HP`);
              updated[bossIdx] = { ...updated[bossIdx], currentHealth: newHealth };
              return updated;
            }
          });
        }
      });
    });

    // Check collisions
    checkCollision();

    // Check power-up collision
    if (paddle) {
      checkPowerUpCollision(paddle, balls, setBalls, setPaddle, setSpeedMultiplier);
    }

    // Check ball timeout without paddle hit (15s and 25s)
    if (lastPaddleHitTime > 0) {
      const timeSinceHit = (Date.now() - lastPaddleHitTime) / 1000;
      if (timeSinceHit >= 25 && enemies.length > 0) {
        // 25s - nearest enemy kamikaze
        const activeBall = balls.find(b => !b.waitingToLaunch);
        if (activeBall) {
          // Find closest enemy
          let closestEnemy = enemies[0];
          let minDistance = Infinity;
          for (const enemy of enemies) {
            const dx = enemy.x + enemy.width / 2 - activeBall.x;
            const dy = enemy.y + enemy.height / 2 - activeBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
              minDistance = distance;
              closestEnemy = enemy;
            }
          }

          // Make closest enemy go kamikaze towards ball
          setEnemies(prev => prev.map(e => e.id === closestEnemy.id ? {
            ...e,
            dx: (activeBall.x - (e.x + e.width / 2)) / minDistance * e.speed * 3,
            dy: (activeBall.y - (e.y + e.height / 2)) / minDistance * e.speed * 3
          } : e));
          toast.warning("Enemy kamikaze attack!");
          setLastPaddleHitTime(Date.now()); // Reset timer
        }
      } else if (timeSinceHit >= 15) {
        // 15s - divert ball by 10 degrees
        setBalls(prev => prev.map(ball => {
          if (!ball.waitingToLaunch) {
            const currentAngle = Math.atan2(ball.dy, ball.dx);
            const divertAngle = currentAngle + 10 * Math.PI / 180;
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            return {
              ...ball,
              dx: Math.cos(divertAngle) * speed,
              dy: Math.sin(divertAngle) * speed
            };
          }
          return ball;
        }));
        setLastPaddleHitTime(Date.now()); // Reset timer
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, checkCollision, updatePowerUps, updateBullets, paddle, balls, checkPowerUpCollision, speedMultiplier, enemies, bombs, bricks, score, isHighScore, explosions, lastPaddleHitTime, lastScoreMilestone, updateFps]);
  
  useEffect(() => {
    if (gameState === "playing") {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);


  // Separate useEffect for timer management - handle pause/resume
  useEffect(() => {
    if (gameState === "playing" && timerStartedRef.current) {
      // Resume timer if it was started and we're playing
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(() => {
          setTimer(prev => prev + 1);
        }, 1000);
      }
    } else if (gameState === "paused") {
      // Pause: clear interval but keep timerStartedRef true
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = undefined;
      }
    } else if (gameState !== "playing") {
      // Game over or not started: clear everything
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = undefined;
      }
      timerStartedRef.current = false;
      bombIntervalsRef.current.forEach(interval => clearInterval(interval));
      bombIntervalsRef.current.clear();
    }
    
    // Handle total play time independently
    if (gameState === "playing" && totalPlayTimeStartedRef.current) {
      // Resume total play time if it was started and we're playing
      if (!totalPlayTimeIntervalRef.current) {
        totalPlayTimeIntervalRef.current = setInterval(() => {
          setTotalPlayTime(prev => prev + 1);
        }, 1000);
      }
    } else if (gameState === "paused") {
      // Pause: clear interval but keep totalPlayTimeStartedRef true
      if (totalPlayTimeIntervalRef.current) {
        clearInterval(totalPlayTimeIntervalRef.current);
        totalPlayTimeIntervalRef.current = undefined;
      }
    } else if (gameState !== "playing") {
      // Game over or not started: clear total play time interval
      if (totalPlayTimeIntervalRef.current) {
        clearInterval(totalPlayTimeIntervalRef.current);
        totalPlayTimeIntervalRef.current = undefined;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (totalPlayTimeIntervalRef.current) {
        clearInterval(totalPlayTimeIntervalRef.current);
      }
      bombIntervalsRef.current.forEach(interval => clearInterval(interval));
      bombIntervalsRef.current.clear();
    };
  }, [gameState]);

  // Enemy spawn at regular intervals
  useEffect(() => {
    // Don't spawn normal enemies during boss fights
    if (bossActive) return;
    
    if (gameState === "playing" && timer > 0) {
      // Spawn interval decreases with level
      // Normal: 30s at level 1, 20s at level 2, 15s at level 3+
      // Godlike: 20s at level 1, 12s at level 2, 8s at level 3+
      const baseInterval = settings.difficulty === "godlike" ? 20 : 30;
      const minInterval = settings.difficulty === "godlike" ? 8 : 15;
      const spawnInterval = Math.max(minInterval, baseInterval - (level - 1) * (settings.difficulty === "godlike" ? 4 : 5));
      if (timer - lastEnemySpawnTime >= spawnInterval) {
        // Cap speed increase at 5 enemies (30% * 5 = 150%, so cap at 200%)
        const speedIncrease = Math.min(2.0, 1 + Math.min(enemySpawnCount, 5) * 0.3);
        const enemyId = nextEnemyId.current++;

        // Determine enemy type - sphere from level 3+, pyramid from level 6+
        let enemyType: "cube" | "sphere" | "pyramid";
        if (level >= 6 && Math.random() < 0.3) {
          enemyType = "pyramid";
        } else if (level >= 3 && Math.random() > 0.5) {
          enemyType = "sphere";
        } else {
          enemyType = "cube";
        }
        let newEnemy: Enemy;
        if (enemyType === "pyramid") {
          // Pyramid enemy - very slow random movement, 3 hits to destroy
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 * speedIncrease; // Very slow
          newEnemy = {
            id: enemyId,
            type: "pyramid",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 40,
            height: 40,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            hits: 0,
            isAngry: false
          };
        } else if (enemyType === "sphere") {
          // Sphere enemy - random movement pattern
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 * speedIncrease; // Slightly faster
          newEnemy = {
            id: enemyId,
            type: "sphere",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 35,
            height: 35,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            hits: 0,
            isAngry: false
          };
        } else {
          // Cube enemy - straight line movement
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 * speedIncrease;
          newEnemy = {
            id: enemyId,
            type: "cube",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 30,
            height: 30,
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.abs(Math.sin(angle)) * speed // Always move downward initially
          };
        }
        setEnemies(prev => [...prev, newEnemy]);
        setLastEnemySpawnTime(timer);
        setEnemySpawnCount(prev => prev + 1);
        const enemyName = enemyType === "sphere" ? "Sphere" : enemyType === "pyramid" ? "Pyramid" : "Cube";
        toast.warning(`${enemyName} enemy ${enemySpawnCount + 1} appeared! Speed: ${Math.round(speedIncrease * 100)}%`);

        // Start dropping projectiles for this enemy
        // Set up bomb/rocket drop with level-scaled intervals
        // Base: 7-12 seconds, increases 0.5s per level until level 8 (4-8s), then 3-7s from level 9+
        let minInterval, maxInterval;
        if (level <= 8) {
          const levelBonus = (level - 1) * 0.5;
          minInterval = Math.max(4, 7 - levelBonus);
          maxInterval = Math.max(8, 12 - levelBonus);
        } else {
          minInterval = 3;
          maxInterval = 7;
        }
        const randomInterval = minInterval * 1000 + Math.random() * (maxInterval - minInterval) * 1000;
        const projectileInterval = setInterval(() => {
          setEnemies(currentEnemies => {
            const currentEnemy = currentEnemies.find(e => e.id === enemyId);
            if (!currentEnemy) {
              clearInterval(projectileInterval);
              bombIntervalsRef.current.delete(enemyId);
              return currentEnemies;
            }

            // Pyramid enemies shoot bullets in random angles
            if (currentEnemy.type === "pyramid") {
              const randomAngle = (Math.random() * 160 - 80) * (Math.PI / 180); // -80 to +80 degrees
              const bulletSpeed = 4;
              const newBullet: Bomb = {
                x: currentEnemy.x + currentEnemy.width / 2 - 4,
                y: currentEnemy.y + currentEnemy.height,
                width: 8,
                height: 12,
                speed: bulletSpeed,
                enemyId: enemyId,
                type: "pyramidBullet",
                dx: Math.sin(randomAngle) * bulletSpeed
              };
              soundManager.playPyramidBulletSound();
              setBombs(prev => [...prev, newBullet]);
            } else {
              const newProjectile: Bomb = {
                x: currentEnemy.x + currentEnemy.width / 2 - 5,
                y: currentEnemy.y + currentEnemy.height,
                width: 10,
                height: 10,
                speed: 3,
                enemyId: enemyId,
                type: currentEnemy.type === "sphere" ? "rocket" : "bomb",
                dx: 0 // Initialize horizontal velocity for rockets
              };
              soundManager.playBombDropSound();
              setBombs(prev => [...prev, newProjectile]);
            }
            return currentEnemies;
          });
        }, randomInterval);
        bombIntervalsRef.current.set(enemyId, projectileInterval);
      }
    }
  }, [timer, gameState, lastEnemySpawnTime, enemySpawnCount, level, settings.difficulty]);

  // Boss enemy spawning system
  useEffect(() => {
    if (gameState !== "playing" || !boss) return;
    
    const BOSS_SPAWN_INTERVAL = 15; // 15 seconds
    const MAX_BOSS_ENEMIES = 6; // Maximum enemies on screen
    const ENEMIES_PER_SPAWN = 2; // Spawn 2 at a time
    
    // Check if enough time has passed and we haven't reached the cap
    if (timer - lastBossSpawnTime >= BOSS_SPAWN_INTERVAL && enemies.length < MAX_BOSS_ENEMIES) {
      const enemiesToSpawn = Math.min(ENEMIES_PER_SPAWN, MAX_BOSS_ENEMIES - enemies.length);
      const newEnemies: Enemy[] = [];
      
      for (let i = 0; i < enemiesToSpawn; i++) {
        const enemyId = nextEnemyId.current++;
        const enemyType = boss.type;
        
        // Track that this enemy was spawned by the boss
        bossSpawnedEnemiesRef.current.add(enemyId);
        
        // Calculate spawn position (from boss center with slight offset)
        const spawnAngle = (Math.PI / 3) * i - Math.PI / 6;
        const spawnOffsetX = Math.cos(spawnAngle) * 40;
        const spawnOffsetY = Math.sin(spawnAngle) * 40;
        
        // Create enemy based on type with smaller size
        let newEnemy: Enemy;
        const baseSpeed = 2.0;
        
        if (enemyType === "pyramid") {
          const angle = Math.random() * Math.PI * 2;
          newEnemy = {
            id: enemyId,
            type: "pyramid",
            x: boss.x + boss.width / 2 - 17.5 + spawnOffsetX,
            y: boss.y + boss.height / 2 - 17.5 + spawnOffsetY,
            width: 35,
            height: 35,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: baseSpeed,
            dx: Math.cos(angle) * baseSpeed,
            dy: Math.sin(angle) * baseSpeed
          };
        } else if (enemyType === "sphere") {
          const angle = Math.random() * Math.PI * 2;
          newEnemy = {
            id: enemyId,
            type: "sphere",
            x: boss.x + boss.width / 2 - 15 + spawnOffsetX,
            y: boss.y + boss.height / 2 - 15 + spawnOffsetY,
            width: 30,
            height: 30,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: baseSpeed * 1.25,
            dx: Math.cos(angle) * baseSpeed * 1.25,
            dy: Math.sin(angle) * baseSpeed * 1.25,
            hits: 0,
            isAngry: false
          };
        } else { // cube
          const angle = Math.random() * Math.PI * 2;
          newEnemy = {
            id: enemyId,
            type: "cube",
            x: boss.x + boss.width / 2 - 12.5 + spawnOffsetX,
            y: boss.y + boss.height / 2 - 12.5 + spawnOffsetY,
            width: 25,
            height: 25,
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            speed: baseSpeed,
            dx: Math.cos(angle) * baseSpeed,
            dy: Math.abs(Math.sin(angle)) * baseSpeed
          };
        }
        
        newEnemies.push(newEnemy);
        
        // Set up bomb dropping for this enemy
        const minInterval = 5;
        const maxInterval = 10;
        const randomInterval = minInterval * 1000 + Math.random() * (maxInterval - minInterval) * 1000;
        
        const projectileInterval = setInterval(() => {
          setEnemies(currentEnemies => {
            const currentEnemy = currentEnemies.find(e => e.id === enemyId);
            if (!currentEnemy) {
              clearInterval(projectileInterval);
              bombIntervalsRef.current.delete(enemyId);
              return currentEnemies;
            }
            
            const projectileType = enemyType === "pyramid" ? "pyramidBullet" : "bomb";
            
            setBombs(prev => [...prev, {
              x: currentEnemy.x + currentEnemy.width / 2 - 5,
              y: currentEnemy.y + currentEnemy.height,
              width: 10,
              height: 10,
              speed: 3,
              enemyId: enemyId,
              type: projectileType
            }]);
            
            if (enemyType === "pyramid") {
              soundManager.playPyramidBulletSound();
            } else {
              soundManager.playBombDropSound();
            }
            
            return currentEnemies;
          });
        }, randomInterval);
        
        bombIntervalsRef.current.set(enemyId, projectileInterval);
      }
      
      setEnemies(prev => [...prev, ...newEnemies]);
      setLastBossSpawnTime(timer);
      
      // Trigger spawn animation
      setBossSpawnAnimation({ active: true, startTime: Date.now() });
      setTimeout(() => setBossSpawnAnimation(null), 500);
      
      soundManager.playExplosion();
      toast.warning(`${boss.type.toUpperCase()} spawned ${enemiesToSpawn} minion${enemiesToSpawn > 1 ? 's' : ''}!`, { duration: 2000 });
    }
  }, [timer, gameState, boss, enemies.length, lastBossSpawnTime, SCALED_CANVAS_WIDTH]);

  // Keyboard controls for launch angle
  useEffect(() => {
    const waitingBall = balls.find(ball => ball.waitingToLaunch);
    if (gameState !== "playing" || !waitingBall) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setLaunchAngle(prev => Math.max(prev - 3, -80));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setLaunchAngle(prev => Math.min(prev + 3, 80));
      }
    };
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // Scroll up = left
        setLaunchAngle(prev => Math.max(prev - 3, -80));
      } else if (e.deltaY > 0) {
        // Scroll down = right
        setLaunchAngle(prev => Math.min(prev + 3, 80));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [gameState, balls]);
  const handleStart = () => {
    if (gameState === "ready") {
      // Check if this is level completion (all bricks destroyed)
      const isLevelComplete = bricks.every(brick => !brick.visible) && bricks.length > 0;
      if (isLevelComplete) {
        // Start next level
        nextLevel();
      } else {
        // Continue current level - start music only if not already playing (and not boss music)
        setGameState("playing");
        if (!soundManager.isMusicPlaying() && !soundManager.isBossMusicPlaying()) {
          soundManager.playBackgroundMusic(level);
        }
        toast.success("Continue!");
      }
    }
  };
  const handleRestart = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    soundManager.stopBossMusic();
    soundManager.stopBackgroundMusic();
    soundManager.stopHighScoreMusic();
    setShowHighScoreEntry(false);
    setShowHighScoreDisplay(false);
    setShowEndScreen(false);
    setBeatLevel50Completed(false);
    initGame();
    toast("Game Reset!");
  }, [initGame]);
  const handleHighScoreSubmit = async (name: string) => {
    try {
      // Create a burst of particles on submission
      setHighScoreParticles(createHighScoreParticles());
      
      // Flash the screen
      setBackgroundFlash(1);
      setTimeout(() => setBackgroundFlash(0), 200);
      
      await addHighScore(name, score, level, settings.difficulty, beatLevel50Completed, settings.startingLives);
      
      toast.success('🎉 HIGH SCORE SAVED! 🎉', {
        duration: 3000,
      });
      
      // Delay transition to show celebration
      setTimeout(() => {
        setShowHighScoreEntry(false);
        setShowHighScoreDisplay(true);
      }, 1000);
    } catch (err) {
      console.error('Failed to submit high score:', err);
      setShowHighScoreEntry(false);
      setShowHighScoreDisplay(true);
    }
  };
  const handleEndScreenContinue = () => {
    setShowEndScreen(false);
    setShowHighScoreDisplay(true);
  };
  
  const handleEndScreenReturnToMenu = () => {
    soundManager.stopHighScoreMusic();
    soundManager.stopBossMusic();
    soundManager.stopBackgroundMusic();
    setShowEndScreen(false);
    setHighScoreParticles([]);
    setGameOverParticles([]);
    onReturnToMenu();
  };
  
  const handleCloseHighScoreDisplay = () => {
    setShowHighScoreDisplay(false);
    // If end screen hasn't been shown yet, show it
    if (!showEndScreen) {
      setShowEndScreen(true);
    } else {
      // If coming back from end screen, go to menu
      soundManager.stopHighScoreMusic();
      onReturnToMenu();
    }
  };
  
  const handleRetryLevel = useCallback(() => {
    // Stop all music first
    soundManager.stopHighScoreMusic();
    soundManager.stopBossMusic();
    soundManager.stopBackgroundMusic();
    
    // Stop game loop before restarting level
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }

    // Clear timer interval before resetting
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerStartedRef.current = false;
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();

    // Keep the current level
    const currentLevel = level;
    const maxSpeedMultiplier = settings.difficulty === "godlike" ? 1.75 : 1.5;
    const baseMultiplier = settings.difficulty === "godlike" ? 1.25 : 1.0;
    const levelSpeedMultiplier = Math.min(maxSpeedMultiplier, baseMultiplier + (currentLevel - 1) * 0.05);
    setSpeedMultiplier(levelSpeedMultiplier);

    // Reset paddle
    setPaddle({
      x: SCALED_CANVAS_WIDTH / 2 - SCALED_PADDLE_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      width: SCALED_PADDLE_WIDTH,
      height: SCALED_PADDLE_HEIGHT,
      hasTurrets: false
    });

    // Initialize ball with level speed - waiting to launch
    const baseSpeed = 5.175 * Math.min(levelSpeedMultiplier, 1.75);
    const initialBall: Ball = {
      x: SCALED_CANVAS_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: SCALED_BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true
    };
    setBalls([initialBall]);
    setLaunchAngle(-20);
    launchAngleDirectionRef.current = 1;
    setShowInstructions(true);

    // Reset bricks for current level
    setBricks(initBricksForLevel(currentLevel));
    
    // Reset all stats and score
    setScore(0);
    setTotalBricksDestroyed(0);
    setTotalShots(0);
    setBricksHit(0);
    setCurrentCombo(0);
    setLevelSkipped(false);
    setPowerUpsCollectedTypes(new Set());
    setBricksDestroyedByTurrets(0);
    setBossesKilled(0);
    setHighScoreParticles([]);
    setGameOverParticles([]);
    setLives(settings.startingLives);
    
    // Clear all entities
    setPowerUps([]);
    setBullets([]);
    setTimer(0);
    setTotalPlayTime(0);
    totalPlayTimeStartedRef.current = false;
    setEnemies([]);
    setBombs([]);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
    setBonusLetters([]);
    setCollectedLetters(new Set());
    setLetterLevelAssignments(createRandomLetterAssignments());
    setBrickHitSpeedAccumulated(0);
    setLastBossSpawnTime(0);
    setBossSpawnAnimation(null);
    setEnemiesKilled(0);
    
    // Clear boss state if not a boss level, or reset and trigger intro if it is
    if (!BOSS_LEVELS.includes(currentLevel)) {
      setBoss(null);
      setResurrectedBosses([]);
      setBossAttacks([]);
      setBossActive(false);
      setLaserWarnings([]);
      setBossIntroActive(false);
    } else {
      // Boss level - clear everything first
      setBoss(null);
      setResurrectedBosses([]);
      setBossAttacks([]);
      setBossActive(false);
      setLaserWarnings([]);
      soundManager.stopBossMusic();
      
      // Trigger boss intro sequence after a brief delay to ensure clean state
      setTimeout(() => {
        // Reinitialize the boss
        setBricks(initBricksForLevel(currentLevel));
        
        // Start intro sequence
        setBossIntroActive(true);
        soundManager.playBossIntroSound();
        
        // Show boss name and start boss music after 1 second
        setTimeout(() => {
          soundManager.playBossMusic(currentLevel);
          const bossName = currentLevel === 5 ? 'CUBE GUARDIAN' : currentLevel === 10 ? 'SPHERE DESTROYER' : 'PYRAMID LORD';
          toast.error(`⚠️ BOSS APPROACHING: ${bossName} ⚠️`, { duration: 3000 });
        }, 1000);
        
        // End intro after 3 seconds
        setTimeout(() => {
          setBossIntroActive(false);
        }, 3000);
      }, 100);
    }

    // Hide screens
    setShowEndScreen(false);
    setShowHighScoreEntry(false);
    
    // Set to ready state
    setGameState("ready");
    
    toast.info(`Retrying Level ${currentLevel}`);
  }, [level, settings.startingLives, settings.difficulty, initBricksForLevel, setPowerUps, createRandomLetterAssignments]);
  
  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;
    
    // iOS doesn't support the Fullscreen API
    // Use CSS-based fullscreen instead
    if (isIOSDevice) {
      const entering = !isFullscreen;
      setIsFullscreen(entering);
      
      if (entering) {
        // Scroll to top to minimize Safari UI
        window.scrollTo(0, 0);
        // Prevent scrolling during gameplay
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
      } else {
        // Restore scrolling
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.height = "";
      }
      return;
    }
    
    // Standard Fullscreen API for other browsers
    try {
      if (!document.fullscreenElement) {
        // Try standard API
        if (fullscreenContainerRef.current.requestFullscreen) {
          await fullscreenContainerRef.current.requestFullscreen();
        } 
        // Try webkit prefix (for older Safari on non-iOS)
        else if ((fullscreenContainerRef.current as any).webkitRequestFullscreen) {
          await (fullscreenContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      // Fallback to CSS-based fullscreen on error
      setIsFullscreen(!isFullscreen);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    // iOS doesn't fire fullscreenchange events
    if (isIOSDevice) return;
    
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // On mobile: if exiting fullscreen and game is playing, pause and show prompt
      if (isMobileDevice && !isNowFullscreen && gameState === "playing") {
        setGameState("paused");
        if (gameLoopRef.current) {
          gameLoopRef.current.pause();
        }
        setShowFullscreenPrompt(true);
      }
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isMobileDevice, gameState, isIOSDevice]);

  // Auto-enter fullscreen on mobile when game starts (disabled for iOS - user gesture required)
  useEffect(() => {
    if (isMobileDevice && !isIOSDevice && gameState === "ready" && !isFullscreen && fullscreenContainerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        toggleFullscreen();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileDevice, isIOSDevice, gameState]);

  // F key to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Adaptive header and frame visibility based on vertical space
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const checkFrameVisibility = () => {
      if (!fullscreenContainerRef.current) return;
      const containerHeight = fullscreenContainerRef.current.clientHeight;
      const containerWidth = fullscreenContainerRef.current.clientWidth;
      const isMobile = containerWidth < 768; // Mobile breakpoint

      const titleBarHeight = 60;
      const statsBarHeight = 80;
      const bottomBarHeight = 60;
      const sideFrameHeight = 40;

      // Desktop-specific adaptive layout
      if (!isMobile) {
        const playableAreaHeight = SCALED_CANVAS_HEIGHT;
        const statsAndBottomHeight = statsBarHeight + bottomBarHeight + sideFrameHeight;
        const fullHeightNeeded = playableAreaHeight + titleBarHeight + statsAndBottomHeight;

        // Check if we need to hide title
        const shouldShowTitle = containerHeight >= fullHeightNeeded;
        if (!shouldShowTitle && !disableAutoZoom) {
          // Hide title and calculate scale
          const availableHeight = containerHeight - statsAndBottomHeight;
          const minimalTopMargin = 20;
          const scalableHeight = playableAreaHeight + minimalTopMargin;
          let scaleFactor = availableHeight / scalableHeight;

          // Clamp scale to prevent unreadably small UI
          const minScale = 0.5;
          scaleFactor = Math.max(minScale, Math.min(1.0, scaleFactor));
          if (titleVisible || gameScale !== scaleFactor) {
            setTitleVisible(false);
            setGameScale(scaleFactor);
            console.log(`[Desktop Layout] desktopLayoutMode: titleHidden, scale: ${scaleFactor.toFixed(2)}`);
          }
        } else {
          // Show title and reset scale
          if (!titleVisible || gameScale !== 1) {
            setTitleVisible(true);
            setGameScale(1);
            console.log(`[Desktop Layout] desktopLayoutMode: titleVisible, scale: 1.0`);
          }
        }

        // Stats and controls always visible on desktop
        if (!framesVisible) {
          setFramesVisible(true);
          setHeaderVisible(true);
        }
      } else {
        // Mobile: hide all frames when in fullscreen, otherwise check space
        if (isFullscreen) {
          // Force hide all frames in fullscreen on mobile
          if (framesVisible || headerVisible || titleVisible) {
            setFramesVisible(false);
            setHeaderVisible(false);
            setTitleVisible(false);
            setGameScale(1);
            console.log(`[Layout Debug] layoutMode: mobileFullscreenFramesHidden`);
          }
        } else {
          // Normal mobile behavior - hide all frames if constrained
          const requiredHeight = SCALED_CANVAS_HEIGHT + titleBarHeight + statsBarHeight + bottomBarHeight + sideFrameHeight;
          const shouldShowFrames = containerHeight >= requiredHeight;
          if (shouldShowFrames !== framesVisible) {
            setFramesVisible(shouldShowFrames);
            setHeaderVisible(shouldShowFrames);
            setTitleVisible(shouldShowFrames);
            setGameScale(1);
            const layoutMode = shouldShowFrames ? "headerVisible" : "headerHidden";
            console.log(`[Layout Debug] layoutMode: ${layoutMode}`);
          }
        }
      }
    };
    const debouncedCheck = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkFrameVisibility, 120);
    };

    // Check on mount and resize
    checkFrameVisibility();
    window.addEventListener("resize", debouncedCheck);
    const handleFullscreenChange = () => {
      setTimeout(checkFrameVisibility, 100);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("resize", debouncedCheck);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [framesVisible, titleVisible, gameScale, disableAutoZoom, SCALED_CANVAS_HEIGHT, isFullscreen]);
  // Handle tap to resume fullscreen on mobile
  const handleFullscreenPromptClick = async () => {
    setShowFullscreenPrompt(false);
    await toggleFullscreen();
    setGameState("playing");
    if (gameLoopRef.current) {
      gameLoopRef.current.resume();
    }
  };

  return <div ref={fullscreenContainerRef} className={`flex items-center justify-center ${
    isIOSDevice
      ? "ios-fullscreen-container"  // Always use iOS container on iOS devices
      : (isFullscreen 
          ? "h-screen bg-background overflow-hidden"
          : "h-screen overflow-hidden")
  }`}>
      {/* Mobile fullscreen prompt overlay */}
      {showFullscreenPrompt && isMobileDevice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={handleFullscreenPromptClick}
        >
          <div className="text-center p-8 bg-background/90 rounded-lg border-2 border-primary">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Game Paused</h2>
            <p className="text-lg text-muted-foreground mb-2">Tap to enter fullscreen</p>
            <p className="text-sm text-muted-foreground">and resume playing</p>
          </div>
        </div>
      )}
      
      {showEndScreen ? <EndScreen 
        onContinue={handleEndScreenContinue} 
        onReturnToMenu={handleEndScreenReturnToMenu}
        onRetryLevel={handleRetryLevel}
        stats={{
          totalBricksDestroyed,
          totalShots,
          accuracy: totalShots > 0 ? (bricksHit / totalShots) * 100 : 0,
          levelSkipped,
          finalScore: score,
          finalLevel: level,
          powerUpsCollected: powerUpsCollectedTypes.size,
          bricksDestroyedByTurrets,
          enemiesKilled,
          bossesKilled,
          totalPlayTime: totalPlayTime
        }}
      /> : showHighScoreDisplay ? <HighScoreDisplay onClose={handleCloseHighScoreDisplay} /> : <>
          {showHighScoreEntry ? <HighScoreEntry score={score} level={level} onSubmit={handleHighScoreSubmit} /> : <div className={`metal-frame ${isIOSDevice ? 'mobile-fullscreen-mode' : (isMobileDevice && isFullscreen ? 'mobile-fullscreen-mode' : '')}`}>
              {/* Title Bar - Adaptive Visibility (Desktop: only title hides, Mobile: all hides) */}
              <div className={`metal-title-bar transition-all duration-150 ${titleVisible ? 'opacity-100 max-h-[60px]' : 'opacity-0 max-h-0 overflow-hidden'}`} style={{
          transform: titleVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 150ms ease-in-out, max-height 150ms ease-in-out, transform 150ms ease-in-out'
        }}>
                <h1 style={{
            color: "hsl(0, 0%, 95%)",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)"
          }} className="text-2xl sm:text-3xl retro-pixel-text tracking-widest text-center lg:text-lg">
                  Vibing Arkanoid
                </h1>
              </div>


              {/* Main Content with Side Panels */}
              <div className="metal-main-content">
                {/* Left Panel */}
                <div className="metal-side-panel metal-side-panel-left">
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                </div>

                {/* Game Canvas - Apply scale transform when title is hidden (desktop only) */}
                <div className="metal-game-area">
                  <div className={`game-glow ${isFullscreen ? "game-canvas-wrapper" : ""}`} style={{
              transform: `scale(${gameScale})`,
              transformOrigin: 'top center',
              transition: 'transform 150ms ease-in-out'
            }}>
                    <GameCanvas 
                      ref={canvasRef} 
                      width={SCALED_CANVAS_WIDTH} 
                      height={SCALED_CANVAS_HEIGHT} 
                      bricks={bricks} 
                      balls={balls} 
                      paddle={paddle} 
                      gameState={gameState} 
                      powerUps={powerUps} 
                      bullets={bullets} 
                      enemy={enemies} 
                      bombs={bombs} 
                      level={level} 
                      backgroundPhase={backgroundPhase} 
                      explosions={explosions} 
                      launchAngle={launchAngle} 
                      bonusLetters={bonusLetters} 
                      collectedLetters={collectedLetters} 
                      screenShake={screenShake} 
                      backgroundFlash={backgroundFlash}
                      qualitySettings={qualitySettings}
                      boss={boss}
                      resurrectedBosses={resurrectedBosses}
                      bossAttacks={bossAttacks}
                      laserWarnings={laserWarnings}
                      gameOverParticles={gameOverParticles}
                      highScoreParticles={highScoreParticles}
                      showHighScoreEntry={showHighScoreEntry}
                      bossIntroActive={bossIntroActive}
                      bossSpawnAnimation={bossSpawnAnimation}
                      shieldImpacts={shieldImpacts}
                    />
                    {showDebugOverlay && gameLoopRef.current && (
                      <GameLoopDebugOverlay 
                        getDebugInfo={() => gameLoopRef.current?.getDebugInfo() ?? {
                          mode: "legacy",
                          fixedHz: 60,
                          maxDeltaMs: 250,
                          accumulator: 0,
                          timeScale: 1,
                          fps: 0,
                          updatesThisFrame: 0,
                          alpha: 0
                        }}
                        visible={showDebugOverlay}
                      />
                    )}
                  </div>
                </div>

                {/* Quality Indicator */}
                <QualityIndicator 
                  quality={quality}
                  autoAdjustEnabled={autoAdjustEnabled}
                  fps={currentFps}
                />
                
                {/* Substep Debug Overlay */}
                <SubstepDebugOverlay 
                  getDebugInfo={getSubstepDebugInfo}
                  visible={showSubstepDebug}
                />

                {/* Right Panel - Stats and Controls */}
                <div className={`metal-side-panel metal-side-panel-right transition-all duration-150 ${framesVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {/* Control Buttons */}
                  <div className="flex flex-col gap-2 mb-4">
                    <button onClick={onReturnToMenu} className="right-panel-btn" title="Return to Main Menu">
                      <Home size={20} />
                    </button>
                    {!isIOSDevice && (
                      <button onClick={toggleFullscreen} className="right-panel-btn" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                      </button>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col gap-3">
                    {/* Score */}
                    <div className="right-stat-box">
                      <div className="right-stat-label" style={{ color: "hsl(180, 70%, 60%)" }}>
                        SCORE
                      </div>
                      <div className={`right-stat-value ${scoreBlinking ? "animate-pulse" : ""}`}>
                        {score.toString().padStart(6, "0")}
                      </div>
                    </div>

                    {/* Level */}
                    <div className="right-stat-box">
                      <div className="right-stat-label" style={{ color: "hsl(30, 75%, 55%)" }}>
                        LEVEL
                      </div>
                      <div className="right-stat-value">{level.toString().padStart(2, "0")}</div>
                    </div>

                    {/* Lives */}
                    <div className="right-stat-box">
                      <div className="right-stat-label" style={{ color: "hsl(0, 70%, 55%)" }}>
                        LIVES
                      </div>
                      <div className="right-stat-value">{lives}</div>
                    </div>

                    {/* Timer */}
                    <div className="right-stat-box">
                      <div className="right-stat-label" style={{ color: "hsl(210, 60%, 55%)" }}>
                        TIMER
                      </div>
                      <div className="right-stat-value">{timer}s</div>
                    </div>

                    {/* Speed */}
                    <div className="right-stat-box">
                      <div className="right-stat-label" style={{ color: "hsl(120, 50%, 50%)" }}>
                        SPEED
                      </div>
                      <div className="right-stat-value">{Math.round(speedMultiplier * 100)}%</div>
                    </div>

                    {/* Turret Ammo - Only show when turrets are active */}
                    {paddle?.hasTurrets && paddle?.turretShots !== undefined && (
                      <div className="right-stat-box">
                        <div className="right-stat-label" style={{
                          color: paddle.turretShots <= 5 ? "hsl(0, 80%, 60%)" : "hsl(280, 60%, 60%)"
                        }}>
                          AMMO
                        </div>
                        <div className={`right-stat-value ${paddle.turretShots <= 5 ? 'animate-pulse' : ''}`} style={{
                          color: paddle.turretShots <= 5 ? "hsl(0, 80%, 65%)" : "hsl(0, 0%, 85%)"
                        }}>
                          {paddle.turretShots}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compact HUD Overlay - Shown when frames are hidden */}
              {!framesVisible && <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none" style={{
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>
                  <div className="flex gap-4 items-center bg-black/30 backdrop-blur-sm px-3 py-2 rounded">
                    <div className="retro-pixel-text text-xs" style={{
              color: "hsl(180, 70%, 60%)"
            }}>
                      SCORE: <span style={{
                color: "hsl(0, 0%, 95%)"
              }}>{score.toString().padStart(6, "0")}</span>
                    </div>
                    <div className="retro-pixel-text text-xs" style={{
              color: "hsl(30, 75%, 55%)"
            }}>
                      LV: <span style={{
                color: "hsl(0, 0%, 95%)"
              }}>{level.toString().padStart(2, "0")}</span>
                    </div>
                    <div className="retro-pixel-text text-xs" style={{
              color: "hsl(0, 70%, 55%)"
            }}>
                      LIVES: <span style={{
                color: "hsl(0, 0%, 95%)"
              }}>{lives}</span>
                    </div>
                  </div>
                </div>}

              {/* Bottom Controls - Adaptive Visibility */}
              <div className={`metal-bottom-bar transition-all duration-150 ${framesVisible ? 'opacity-100 max-h-[80px]' : 'opacity-0 max-h-0 overflow-hidden'}`} style={{
          transform: framesVisible ? 'translateY(0)' : 'translateY(10px)'
        }}>
                <div className="flex gap-4 justify-center items-center">
                  {gameState === "ready" && <button onClick={handleStart} className="amiga-box px-8 py-3 retro-pixel-text hover:bg-muted/50 transition-all text-sm" style={{
              color: "hsl(0, 0%, 85%)"
            }}>
                      {bricks.every(brick => !brick.visible) && level > 0 ? "NEXT LEVEL" : "START GAME"}
                    </button>}
                  {(gameState === "gameOver" || gameState === "won") && <button onClick={handleRestart} className="amiga-box px-8 py-3 retro-pixel-text hover:bg-muted/50 transition-all text-sm" style={{
              color: "hsl(0, 0%, 85%)"
            }}>
                      PLAY AGAIN
                    </button>}
                  {gameState === "playing" && <div className="retro-pixel-text text-xs" style={{
              color: "hsl(0, 0%, 60%)"
            }}>
                      Move your mouse or touch to control the paddle • Press ESC to release mouse • Click canvas to
                      recapture
                    </div>}
                </div>
              </div>
            </div>}
        </>}
    </div>;
};