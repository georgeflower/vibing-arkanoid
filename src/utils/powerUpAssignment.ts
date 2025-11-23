import type { PowerUpType, Brick } from "@/types/game";

/**
 * Pre-assigns power-ups to 20% of destructible bricks at level initialization
 * @param bricks Array of all bricks in the level
 * @param extraLifeUsedLevels Array of level groups that already used extra life
 * @param currentLevel Current level number
 * @param difficulty Game difficulty setting
 * @returns Map of brick ID to PowerUpType
 */
export const assignPowerUpsToBricks = (
  bricks: Brick[],
  extraLifeUsedLevels: number[],
  currentLevel: number,
  difficulty: "normal" | "godlike"
): Map<number, PowerUpType> => {
  const assignments = new Map<number, PowerUpType>();

  // Get all destructible bricks (not metal, not indestructible)
  const destructibleBricks = bricks.filter(
    (brick) => brick.visible && !brick.isIndestructible && brick.type !== "metal"
  );

  if (destructibleBricks.length === 0) return assignments;

  // Calculate 20% of destructible bricks
  const powerUpCount = Math.max(1, Math.floor(destructibleBricks.length * 0.2));

  // Shuffle and select random bricks
  const shuffled = [...destructibleBricks].sort(() => Math.random() - 0.5);
  const selectedBricks = shuffled.slice(0, powerUpCount);

  // Available power-up types
  const powerUpTypes: PowerUpType[] = [
    "multiball",
    "turrets",
    "fireball",
    "slowdown",
    "paddleExtend",
    "paddleShrink",
    "shield",
  ];

  // Check if extra life should be included
  const levelGroup = Math.floor(currentLevel / 5);
  const includeExtraLife = difficulty !== "godlike" && !extraLifeUsedLevels.includes(levelGroup);

  if (includeExtraLife) {
    powerUpTypes.push("life");
  }

  // Assign random power-up types to selected bricks
  selectedBricks.forEach((brick) => {
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    assignments.set(brick.id, randomType);
  });

  return assignments;
};
