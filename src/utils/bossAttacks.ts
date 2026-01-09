import type { Boss, BossAttack, BossAttackType } from "@/types/game";
import { BOSS_CONFIG, ATTACK_PATTERNS } from "@/constants/bossConfig";
import { soundManager } from "@/utils/sounds";
import { debugToast as toast } from "@/utils/debugToast";

export function performBossAttack(
  boss: Boss,
  paddleX: number,
  paddleY: number,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>,
  setLaserWarnings: React.Dispatch<React.SetStateAction<Array<{ x: number; startTime: number }>>>,
  setSuperWarnings: React.Dispatch<React.SetStateAction<Array<{ x: number; y: number; startTime: number }>>>
): void {
  const config = BOSS_CONFIG[boss.type];
  
  // All bosses use weighted attack selection
  let attackType: BossAttackType;
  const rand = Math.random();
  const weights = config.attackWeights;
  
  let cumulative = 0;
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) {
      attackType = type as BossAttackType;
      break;
    }
  }
  
  // Fallback to first attack type if weights don't add up
  if (!attackType!) {
    attackType = Object.keys(weights)[0] as BossAttackType;
  }
  
  soundManager.playBombDropSound();
  
  if (attackType === 'shot') {
    const angle = Math.atan2(paddleY - (boss.y + boss.height / 2), paddleX - (boss.x + boss.width / 2));
    
    const attack: BossAttack = {
      bossId: boss.id,
      type: 'shot',
      x: boss.x + boss.width / 2,
      y: boss.y + boss.height / 2,
      width: ATTACK_PATTERNS.shot.size,
      height: ATTACK_PATTERNS.shot.size,
      speed: ATTACK_PATTERNS.shot.speed,
      angle: angle,
      dx: Math.cos(angle) * ATTACK_PATTERNS.shot.speed,
      dy: Math.sin(angle) * ATTACK_PATTERNS.shot.speed,
      damage: 1
    };
    
    setBossAttacks(prev => [...prev, attack]);
    
  } else if (attackType === 'laser') {
    const laserX = boss.x + boss.width / 2 - ATTACK_PATTERNS.laser.width / 2;
    
    setLaserWarnings(prev => [...prev, { x: laserX, startTime: Date.now() }]);
    toast.warning(`${boss.type.toUpperCase()} CHARGING LASER!`, { duration: 1000 });
    soundManager.playLaserChargingSound();
    
    setTimeout(() => {
      const laserStartY = boss.y + boss.height;
      const laserHeight = 650 - laserStartY;
      
      const attack: BossAttack = {
        bossId: boss.id,
        type: 'laser',
        x: laserX,
        y: laserStartY,
        width: ATTACK_PATTERNS.laser.width,
        height: laserHeight,
        speed: 0,
        dx: 0,
        dy: 0,
        damage: 1
      };
      
      setBossAttacks(prev => [...prev, attack]);
      soundManager.playExplosion();
      
      setTimeout(() => {
        setBossAttacks(prev => prev.filter(a => !(a.type === 'laser' && a.bossId === boss.id && a.x === laserX)));
      }, ATTACK_PATTERNS.laser.duration);
      
    }, ATTACK_PATTERNS.laser.warningDuration);
    
  } else if (attackType === 'super') {
    const centerX = boss.x + boss.width / 2;
    const centerY = boss.y + boss.height / 2;
    
    // Add super warning
    setSuperWarnings(prev => [...prev, { x: centerX, y: centerY, startTime: Date.now() }]);
    toast.error(`${boss.type.toUpperCase()} SUPER ATTACK!`);
    soundManager.playShoot();
    
    // Delay the actual attack
    setTimeout(() => {
      const attacks: BossAttack[] = [];
      
      for (let i = 0; i < ATTACK_PATTERNS.super.count; i++) {
        const angle = (i / ATTACK_PATTERNS.super.count) * Math.PI * 2;
        
        attacks.push({
          bossId: boss.id,
          type: 'super',
          x: centerX,
          y: centerY,
          width: ATTACK_PATTERNS.super.size,
          height: ATTACK_PATTERNS.super.size,
          speed: ATTACK_PATTERNS.super.speed,
          angle: angle,
          dx: Math.cos(angle) * ATTACK_PATTERNS.super.speed,
          dy: Math.sin(angle) * ATTACK_PATTERNS.super.speed,
          damage: 1
        });
      }
      
      setBossAttacks(prev => [...prev, ...attacks]);
      soundManager.playExplosion();
    }, ATTACK_PATTERNS.super.warningDuration);
    
  } else if (attackType === 'spiral') {
    const centerX = boss.x + boss.width / 2;
    const centerY = boss.y + boss.height / 2;
    const attacks: BossAttack[] = [];
    const spiralOffset = Date.now() / 1000; // Animated spiral
    
    for (let i = 0; i < ATTACK_PATTERNS.spiral.count; i++) {
      const angle = (i / ATTACK_PATTERNS.spiral.count) * Math.PI * 2 + spiralOffset;
      
      attacks.push({
        bossId: boss.id,
        type: 'spiral',
        x: centerX,
        y: centerY,
        width: ATTACK_PATTERNS.spiral.size,
        height: ATTACK_PATTERNS.spiral.size,
        speed: ATTACK_PATTERNS.spiral.speed,
        angle: angle,
        dx: Math.cos(angle) * ATTACK_PATTERNS.spiral.speed,
        dy: Math.sin(angle) * ATTACK_PATTERNS.spiral.speed,
        damage: 1
      });
    }
    
    setBossAttacks(prev => [...prev, ...attacks]);
    toast.warning(`${boss.type.toUpperCase()} SPIRAL ATTACK!`);
    soundManager.playExplosion();
    
  } else if (attackType === 'cross') {
    const centerX = boss.x + boss.width / 2;
    const centerY = boss.y + boss.height / 2;
    const attacks: BossAttack[] = [];
    
    // Calculate base angle toward paddle (but we'll launch upward first)
    const baseAngle = Math.atan2(paddleY - centerY, paddleX - centerX);
    
    // Create 3 shots in a cone pattern - launching UPWARD initially
    const coneSpread = (ATTACK_PATTERNS.cross.coneAngle * Math.PI) / 180;
    const offsets = [-coneSpread / 2, 0, coneSpread / 2];
    const now = Date.now();
    
    offsets.forEach(offset => {
      // Calculate horizontal spread based on angle offset
      const horizontalSpread = Math.sin(offset) * ATTACK_PATTERNS.cross.speed * 0.5;
      
      attacks.push({
        bossId: boss.id,
        type: 'cross',
        x: centerX,
        y: centerY,
        width: ATTACK_PATTERNS.cross.size,
        height: ATTACK_PATTERNS.cross.size,
        speed: ATTACK_PATTERNS.cross.speed,
        angle: baseAngle + offset,
        dx: horizontalSpread, // Slight horizontal movement during launch
        dy: -ATTACK_PATTERNS.cross.speed * 0.7, // Launch UPWARD (negative = up)
        damage: 1,
        isStopped: false,
        isLaunchingUp: true, // Start in launch phase
        launchApexTime: now + 400, // Reach apex after 400ms
        nextCourseChangeTime: now + 1500 + Math.random() * 1000, // First course change after falling
        spawnTime: now // Track spawn time for merge cooldown
      });
    });
    
    setBossAttacks(prev => [...prev, ...attacks]);
    toast.warning(`${boss.type.toUpperCase()} CROSS ATTACK!`);
    soundManager.playBombDropSound();
    
  }
}
