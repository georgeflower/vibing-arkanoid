// Mega Boss (Level 20) Configuration
export const MEGA_BOSS_LEVEL = 20;

export const MEGA_BOSS_CONFIG = {
  level: 20,
  size: 120,
  healthPhase1: 20,
  healthPhase2: 10, // After resurrection
  positions: 9,
  moveSpeed: 2.0,
  angryMoveSpeed: 3.5,
  attackInterval: 2500,
  points: 50000,
  
  // Hatch mechanics
  hatchOpenDuration: 5000,
  hatchCooldown: 25000, // Cooldown between trapped ball sequences
  
  // Danger ball settings
  dangerBallCount: 3,
  dangerBallIntervalMin: 2000,
  dangerBallIntervalMax: 6000,
  dangerBallSpeed: 2.5,
  dangerBallSize: 12,
  
  // Resurrection settings
  resurrectionInvulnDuration: 1500,
  
  // Attack weights by phase
  attackWeights: {
    phase1: { hatchSalvo: 0.2, sweepTurret: 0.3, shot: 0.3, super: 0.2 },
    phase2: { hatchSalvo: 0.15, sweepTurret: 0.25, shot: 0.2, super: 0.25, empPulse: 0.15 },
    phase3: { hatchSalvo: 0.1, sweepTurret: 0.2, shot: 0.15, super: 0.3, empPulse: 0.1, phaseBurst: 0.15 }
  }
} as const;

// Corner targets for danger ball trajectories
export const CORNER_TARGETS = [
  { name: 'topLeft', x: 50, y: 50 },
  { name: 'topRight', x: 800, y: 50 },
  { name: 'bottomLeft', x: 50, y: 600 },
  { name: 'bottomRight', x: 800, y: 600 }
] as const;

// Mega Boss positions (similar to other bosses but adjusted for larger size)
export const MEGA_BOSS_POSITIONS = [
  { x: 0.15, y: 0.15 },
  { x: 0.5, y: 0.12 },
  { x: 0.85, y: 0.15 },
  { x: 0.2, y: 0.32 },
  { x: 0.5, y: 0.28 },
  { x: 0.8, y: 0.32 },
  { x: 0.15, y: 0.48 },
  { x: 0.5, y: 0.42 },
  { x: 0.85, y: 0.48 }
] as const;

// Perimeter path configuration
export const PERIMETER_CONFIG = {
  cornerRadius: 40, // Radius of rounded corners
  wallMargin: 10, // Distance from canvas edge
  paddleWallHeight: 200, // How far up the walls the paddle can travel
} as const;

// EMP Pulse settings
export const EMP_CONFIG = {
  duration: 1500, // How long paddle is slowed
  slowFactor: 0.4, // Paddle speed multiplier during EMP
  pulseRadius: 300,
  cooldown: 10000
} as const;
