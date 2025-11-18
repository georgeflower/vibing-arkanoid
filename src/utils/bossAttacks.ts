import type { Boss, BossAttack, BossAttackType } from "@/types/game";
import { BOSS_CONFIG, ATTACK_PATTERNS } from "@/constants/bossConfig";
import { soundManager } from "@/utils/sounds";
import { toast } from "sonner";

export function performBossAttack(
  boss: Boss,
  paddleX: number,
  paddleY: number,
  setBossAttacks: React.Dispatch<React.SetStateAction<BossAttack[]>>,
  setLaserWarnings: React.Dispatch<React.SetStateAction<Array<{ x: number; startTime: number }>>>
): void {
  const config = BOSS_CONFIG[boss.type];
  const attackTypes = config.attackTypes;
  
  const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)] as BossAttackType;
  
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
    
    setTimeout(() => {
      const attack: BossAttack = {
        bossId: boss.id,
        type: 'laser',
        x: laserX,
        y: 0,
        width: ATTACK_PATTERNS.laser.width,
        height: ATTACK_PATTERNS.laser.height,
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
    toast.error(`${boss.type.toUpperCase()} SUPER ATTACK!`);
    soundManager.playExplosion();
  }
}
