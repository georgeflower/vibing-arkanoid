import type { PowerUpType, Difficulty } from "@/types/game";

/**
 * Base weights for each power-up type (higher = more likely)
 * Regular power-ups are balanced at 15, with exceptions for:
 * - paddleShrink: 8 (negative effect, should appear less often)
 * - life: 10 (special rules, 1 per 5 levels max)
 * - Boss-exclusive: 33 (equal distribution during boss fights)
 */
export const BASE_POWER_UP_WEIGHTS: Record<PowerUpType, number> = {
  // Regular power-ups (from bricks and enemies)
  multiball: 15,
  turrets: 15,
  fireball: 15,
  slowdown: 15,
  paddleExtend: 15,
  paddleShrink: 8,     // Negative effect - lower base weight
  shield: 15,
  secondChance: 15,    // Barrier - same as most power-ups
  life: 10,            // Special handling (1 per 5 levels)
  
  // Boss-exclusive power-ups (only from boss minions on boss levels)
  bossStunner: 33,
  reflectShield: 33,
  homingBall: 33,
};

/**
 * Weight reduction per drop
 * After each drop, weight = weight * WEIGHT_DECAY_FACTOR
 * E.g., 0.6 = reduce to 60% after each drop
 */
export const WEIGHT_DECAY_FACTOR = 0.6;

/**
 * Minimum weight (prevents complete elimination)
 * Even after many drops, a power-up will still have this minimum chance
 */
export const MIN_WEIGHT = 2;

/**
 * Power-up types that can be assigned to bricks (excludes boss-exclusive)
 */
export const BRICK_POWER_UP_TYPES: PowerUpType[] = [
  "multiball",
  "turrets",
  "fireball",
  "slowdown",
  "paddleExtend",
  "paddleShrink",
  "shield",
  "secondChance",
];

/**
 * Calculate current weights with decay applied based on drop history
 * @param dropCounts Record of how many times each power-up has been dropped
 * @param difficulty Game difficulty setting
 * @param currentLevel Current level number
 * @param extraLifeUsedLevels Levels where extra life has already been used
 * @param includeBossExclusive Whether to include boss-exclusive power-ups
 * @returns Record of power-up types to their current weights
 */
export const calculateCurrentWeights = (
  dropCounts: Partial<Record<PowerUpType, number>>,
  difficulty: Difficulty,
  currentLevel: number,
  extraLifeUsedLevels: number[],
  includeBossExclusive: boolean = false
): Partial<Record<PowerUpType, number>> => {
  const weights: Partial<Record<PowerUpType, number>> = {};
  
  // Start with brick power-up types
  for (const type of BRICK_POWER_UP_TYPES) {
    const baseWeight = BASE_POWER_UP_WEIGHTS[type];
    const drops = dropCounts[type] || 0;
    
    // Apply decay: weight = base * (decay^drops), minimum MIN_WEIGHT
    const decayedWeight = Math.max(MIN_WEIGHT, baseWeight * Math.pow(WEIGHT_DECAY_FACTOR, drops));
    weights[type] = decayedWeight;
  }
  
  // Handle "life" power-up with special rules
  const levelGroup = Math.floor(currentLevel / 5);
  if (difficulty !== "godlike" && !extraLifeUsedLevels.includes(levelGroup)) {
    const baseWeight = BASE_POWER_UP_WEIGHTS.life;
    const drops = dropCounts.life || 0;
    const decayedWeight = Math.max(MIN_WEIGHT, baseWeight * Math.pow(WEIGHT_DECAY_FACTOR, drops));
    weights.life = decayedWeight;
  }
  
  // Add boss-exclusive power-ups if requested
  if (includeBossExclusive) {
    const bossTypes: PowerUpType[] = ["bossStunner", "reflectShield", "homingBall"];
    for (const type of bossTypes) {
      const baseWeight = BASE_POWER_UP_WEIGHTS[type];
      const drops = dropCounts[type] || 0;
      const decayedWeight = Math.max(MIN_WEIGHT, baseWeight * Math.pow(WEIGHT_DECAY_FACTOR, drops));
      weights[type] = decayedWeight;
    }
  }
  
  return weights;
};

/**
 * Select a power-up type using weighted random selection
 * @param weights Record of power-up types to their weights
 * @returns Selected power-up type
 */
export const weightedRandomSelect = (
  weights: Partial<Record<PowerUpType, number>>
): PowerUpType => {
  const entries = Object.entries(weights) as [PowerUpType, number][];
  
  if (entries.length === 0) {
    // Fallback to multiball if no weights available
    return "multiball";
  }
  
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const [type, weight] of entries) {
    random -= weight;
    if (random <= 0) return type;
  }
  
  // Fallback to first entry
  return entries[0][0];
};
