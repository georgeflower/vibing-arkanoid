// Mega Boss attack patterns and danger ball system
import type { Boss, BossAttack, Ball } from "@/types/game";
import { MEGA_BOSS_CONFIG, CORNER_TARGETS } from "@/constants/megaBossConfig";
import { MegaBoss, getMegaBossPhase, isMegaBoss } from "./megaBossUtils";
import { soundManager } from "./sounds";
import { toast } from "sonner";

export interface DangerBall {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
  targetCorner: typeof CORNER_TARGETS[number];
  flashPhase: number; // For white/red flashing animation
  spawnTime: number;
}

let nextDangerBallId = 3000;

// Spawn a danger ball toward a random corner
export function spawnDangerBall(boss: MegaBoss): DangerBall {
  const config = MEGA_BOSS_CONFIG;
  
  // Pick random corner
  const targetCorner = CORNER_TARGETS[Math.floor(Math.random() * CORNER_TARGETS.length)];
  
  // Calculate direction from boss to corner with jitter
  const bossX = boss.x + boss.width / 2;
  const bossY = boss.y + boss.height / 2;
  
  const baseAngle = Math.atan2(targetCorner.y - bossY, targetCorner.x - bossX);
  const jitter = (Math.random() - 0.5) * (40 * Math.PI / 180); // ±20 degrees
  const angle = baseAngle + jitter;
  
  return {
    id: nextDangerBallId++,
    x: bossX,
    y: boss.y + boss.height, // Spawn from hatch area
    dx: Math.cos(angle) * config.dangerBallSpeed,
    dy: Math.sin(angle) * config.dangerBallSpeed,
    radius: config.dangerBallSize,
    speed: config.dangerBallSpeed,
    targetCorner,
    flashPhase: 0,
    spawnTime: Date.now()
  };
}

// Update danger ball position and animation
export function updateDangerBall(ball: DangerBall): DangerBall {
  return {
    ...ball,
    x: ball.x + ball.dx,
    y: ball.y + ball.dy,
    flashPhase: (ball.flashPhase + 0.1) % (Math.PI * 2)
  };
}

// Check if danger ball reached bottom (player loses life)
export function isDangerBallAtBottom(ball: DangerBall, canvasHeight: number): boolean {
  return ball.y + ball.radius >= canvasHeight - 50; // Near bottom
}

// Check if danger ball was intercepted by paddle
export function isDangerBallIntercepted(
  ball: DangerBall,
  paddleX: number,
  paddleY: number,
  paddleWidth: number,
  paddleHeight: number
): boolean {
  return (
    ball.x + ball.radius > paddleX &&
    ball.x - ball.radius < paddleX + paddleWidth &&
    ball.y + ball.radius > paddleY &&
    ball.y - ball.radius < paddleY + paddleHeight
  );
}

// Reflect danger ball off paddle
export function reflectDangerBall(ball: DangerBall, paddleX: number, paddleWidth: number): DangerBall {
  // Calculate hit position on paddle (-1 to 1)
  const hitPos = ((ball.x - paddleX) / paddleWidth) * 2 - 1;
  
  // Reflect angle based on hit position
  const reflectAngle = hitPos * (Math.PI / 4); // ±45 degrees
  const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  
  return {
    ...ball,
    dx: Math.sin(reflectAngle) * speed,
    dy: -Math.abs(ball.dy) // Always go up
  };
}

// Mega Boss attack types
export type MegaBossAttackType = 'hatchSalvo' | 'sweepTurret' | 'empPulse' | 'phaseBurst' | 'shot' | 'super';

// Perform a Mega Boss attack
export function performMegaBossAttack(
  boss: MegaBoss,
  paddleX: number,
  paddleY: number,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>,
  setLaserWarnings: React.Dispatch<React.SetStateAction<Array<{ x: number; startTime: number }>>>,
  setEmpActive?: (active: boolean) => void
): MegaBossAttackType {
  const phase = getMegaBossPhase(boss);
  const weights = MEGA_BOSS_CONFIG.attackWeights[`phase${phase}` as keyof typeof MEGA_BOSS_CONFIG.attackWeights];
  
  // Weighted random selection
  const rand = Math.random();
  let cumulative = 0;
  let selectedAttack: MegaBossAttackType = 'shot';
  
  for (const [attack, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) {
      selectedAttack = attack as MegaBossAttackType;
      break;
    }
  }
  
  soundManager.playBombDropSound();
  
  switch (selectedAttack) {
    case 'hatchSalvo':
      performHatchSalvo(boss, setBossAttacks);
      break;
    case 'sweepTurret':
      performSweepTurret(boss, paddleX, paddleY, setBossAttacks);
      break;
    case 'empPulse':
      performEmpPulse(boss, setEmpActive);
      break;
    case 'phaseBurst':
      performPhaseBurst(boss, setBossAttacks);
      break;
    case 'super':
      performSuperAttack(boss, setBossAttacks);
      break;
    case 'shot':
    default:
      performShotAttack(boss, paddleX, paddleY, setBossAttacks);
      break;
  }
  
  return selectedAttack;
}

function performShotAttack(
  boss: MegaBoss,
  paddleX: number,
  paddleY: number,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>
) {
  const angle = Math.atan2(paddleY - (boss.y + boss.height / 2), paddleX - (boss.x + boss.width / 2));
  
  const attack: BossAttack = {
    bossId: boss.id,
    type: 'shot',
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height / 2,
    width: 12,
    height: 12,
    speed: 4,
    angle,
    dx: Math.cos(angle) * 4,
    dy: Math.sin(angle) * 4,
    damage: 1
  };
  
  setBossAttacks(prev => [...prev, attack]);
}

function performHatchSalvo(
  boss: MegaBoss,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>
) {
  // Fire a cone of micro-projectiles downward from hatch
  const attacks: BossAttack[] = [];
  const centerX = boss.x + boss.width / 2;
  const centerY = boss.y + boss.height;
  
  for (let i = 0; i < 5; i++) {
    const spreadAngle = (i - 2) * 0.2; // -0.4 to +0.4 radians
    const angle = Math.PI / 2 + spreadAngle; // Downward + spread
    
    attacks.push({
      bossId: boss.id,
      type: 'shot',
      x: centerX,
      y: centerY,
      width: 8,
      height: 8,
      speed: 3.5,
      angle,
      dx: Math.cos(angle) * 3.5,
      dy: Math.sin(angle) * 3.5,
      damage: 1
    });
  }
  
  setBossAttacks(prev => [...prev, ...attacks]);
  toast.warning("MEGA BOSS HATCH SALVO!");
}

function performSweepTurret(
  boss: MegaBoss,
  paddleX: number,
  paddleY: number,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>
) {
  // Fire a slow, heavy shot that lingers
  const angle = Math.atan2(paddleY - (boss.y + boss.height / 2), paddleX - (boss.x + boss.width / 2));
  
  const attack: BossAttack = {
    bossId: boss.id,
    type: 'super', // Reuse super type for visual
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height / 2,
    width: 20,
    height: 20,
    speed: 2.5, // Slower
    angle,
    dx: Math.cos(angle) * 2.5,
    dy: Math.sin(angle) * 2.5,
    damage: 1
  };
  
  setBossAttacks(prev => [...prev, attack]);
  toast.warning("MEGA BOSS SWEEP TURRET!");
}

function performEmpPulse(
  boss: MegaBoss,
  setEmpActive?: (active: boolean) => void
) {
  if (setEmpActive) {
    setEmpActive(true);
    toast.error("⚡ EMP PULSE! Paddle slowed!");
    soundManager.playLaserChargingSound();
    
    // Auto-deactivate after duration
    setTimeout(() => {
      setEmpActive(false);
      toast.info("EMP effect ended");
    }, 1500);
  }
}

function performPhaseBurst(
  boss: MegaBoss,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>
) {
  // Radial burst of projectiles (used after resurrection)
  const attacks: BossAttack[] = [];
  const centerX = boss.x + boss.width / 2;
  const centerY = boss.y + boss.height / 2;
  const count = 16;
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    
    attacks.push({
      bossId: boss.id,
      type: 'spiral',
      x: centerX,
      y: centerY,
      width: 10,
      height: 10,
      speed: 3.5,
      angle,
      dx: Math.cos(angle) * 3.5,
      dy: Math.sin(angle) * 3.5,
      damage: 1
    });
  }
  
  setBossAttacks(prev => [...prev, ...attacks]);
  toast.error("🔥 PHASE BURST!");
  soundManager.playExplosion();
}

function performSuperAttack(
  boss: MegaBoss,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>
) {
  const attacks: BossAttack[] = [];
  const centerX = boss.x + boss.width / 2;
  const centerY = boss.y + boss.height / 2;
  const count = 12;
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    
    attacks.push({
      bossId: boss.id,
      type: 'super',
      x: centerX,
      y: centerY,
      width: 10,
      height: 10,
      speed: 3.5,
      angle,
      dx: Math.cos(angle) * 3.5,
      dy: Math.sin(angle) * 3.5,
      damage: 1
    });
  }
  
  setBossAttacks(prev => [...prev, ...attacks]);
  toast.error("MEGA BOSS SUPER ATTACK!");
  soundManager.playExplosion();
}
