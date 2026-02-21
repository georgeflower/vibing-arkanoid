export const BOSS_RUSH_CONFIG = {
  startingLives: 3,
  bossOrder: [5, 10, 15, 20] as const,
  bossNames: {
    5: "CUBE GUARDIAN",
    10: "SPHERE DESTROYER",
    15: "PYRAMID LORD",
    20: "MEGA BOSS"
  } as const,
  // Speed multipliers for each boss level in Boss Rush mode
  speedMultipliers: {
    5: 1.25,   // 125%
    10: 1.30,  // 130%
    15: 1.40,  // 140%
    20: 1.40   // 140%
  } as const,
  completionBonus: 50000
} as const;

export type BossRushLevel = typeof BOSS_RUSH_CONFIG.bossOrder[number];
