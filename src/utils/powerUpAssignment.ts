import type { PowerUpType, Brick, Difficulty } from "@/types/game";
import { 
  BRICK_POWER_UP_TYPES, 
  calculateCurrentWeights, 
  weightedRandomSelect 
} from "./powerUpWeights";

/**
 * Pre-assigns power-ups to 8% of destructible bricks at level initialization
 * Uses weighted random selection with diminishing returns based on drop history
 * 
 * @param bricks Array of all bricks in the level
 * @param extraLifeUsedLevels Array of level groups that already used extra life
 * @param currentLevel Current level number
 * @param difficulty Game difficulty setting
 * @param dropCounts Optional record of power-up drop counts for weighted selection
 * @returns Map of brick ID to PowerUpType
 */
export const assignPowerUpsToBricks = (
  bricks: Brick[],
  extraLifeUsedLevels: number[],
  currentLevel: number,
  difficulty: Difficulty,
  dropCounts: Partial<Record<PowerUpType, number>> = {}
): Map<number, PowerUpType> => {
  const assignments = new Map<number, PowerUpType>();

  // Get all destructible bricks (not metal, not indestructible)
  const destructibleBricks = bricks.filter(
    (brick) => brick.visible && !brick.isIndestructible && brick.type !== "metal"
  );

  if (destructibleBricks.length === 0) return assignments;

  // Calculate 8% of destructible bricks
  const powerUpCount = Math.max(1, Math.floor(destructibleBricks.length * 0.08));

  // Shuffle and select random bricks
  const shuffled = [...destructibleBricks].sort(() => Math.random() - 0.5);
  const selectedBricks = shuffled.slice(0, powerUpCount);

  // Calculate current weights based on drop history
  const currentWeights = calculateCurrentWeights(
    dropCounts,
    difficulty,
    currentLevel,
    extraLifeUsedLevels,
    false // Don't include boss-exclusive power-ups for brick assignments
  );

  // Track if extra life has been assigned this level (max 1)
  let extraLifeAssigned = false;
  
  // Create a mutable copy of weights to update during assignment
  const mutableWeights = { ...currentWeights };

  // Assign weighted random power-up types to selected bricks
  selectedBricks.forEach((brick) => {
    // If extra life was just assigned, remove it from available weights
    if (extraLifeAssigned && mutableWeights.life !== undefined) {
      delete mutableWeights.life;
    }
    
    // Select using weighted random
    const selectedType = weightedRandomSelect(mutableWeights);
    assignments.set(brick.id, selectedType);
    
    // Mark extra life as assigned if selected
    if (selectedType === "life") {
      extraLifeAssigned = true;
    }
  });

  return assignments;
};

/**
 * Re-assigns power-ups to remaining visible bricks after a power-up is collected
 * This ensures remaining bricks have rebalanced power-ups based on updated weights
 * 
 * @param currentAssignments Current power-up assignments
 * @param bricks Array of all bricks in the level
 * @param extraLifeUsedLevels Array of level groups that already used extra life
 * @param currentLevel Current level number
 * @param difficulty Game difficulty setting
 * @param dropCounts Record of power-up drop counts for weighted selection
 * @returns Updated Map of brick ID to PowerUpType
 */
export const reassignPowerUpsToBricks = (
  currentAssignments: Map<number, PowerUpType>,
  bricks: Brick[],
  extraLifeUsedLevels: number[],
  currentLevel: number,
  difficulty: Difficulty,
  dropCounts: Partial<Record<PowerUpType, number>>
): Map<number, PowerUpType> => {
  // Get remaining visible destructible bricks that still have assignments
  const remainingBricksWithPowerUps = bricks.filter(
    (brick) => 
      brick.visible && 
      !brick.isIndestructible && 
      brick.type !== "metal" &&
      currentAssignments.has(brick.id)
  );

  if (remainingBricksWithPowerUps.length === 0) {
    return new Map();
  }

  // Calculate current weights based on updated drop history
  const currentWeights = calculateCurrentWeights(
    dropCounts,
    difficulty,
    currentLevel,
    extraLifeUsedLevels,
    false
  );

  const newAssignments = new Map<number, PowerUpType>();
  let extraLifeAssigned = false;
  const mutableWeights = { ...currentWeights };

  // Re-assign power-ups to remaining bricks
  remainingBricksWithPowerUps.forEach((brick) => {
    if (extraLifeAssigned && mutableWeights.life !== undefined) {
      delete mutableWeights.life;
    }
    
    const selectedType = weightedRandomSelect(mutableWeights);
    newAssignments.set(brick.id, selectedType);
    
    if (selectedType === "life") {
      extraLifeAssigned = true;
    }
  });

  return newAssignments;
};
