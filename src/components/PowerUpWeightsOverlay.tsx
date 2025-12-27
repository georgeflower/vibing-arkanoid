import { useState, useEffect } from "react";
import type { PowerUpType, Difficulty } from "@/types/game";
import { calculateCurrentWeights, BASE_POWER_UP_WEIGHTS, BRICK_POWER_UP_TYPES } from "@/utils/powerUpWeights";

interface PowerUpWeightsOverlayProps {
  dropCounts: Partial<Record<PowerUpType, number>>;
  difficulty: Difficulty;
  currentLevel: number;
  extraLifeUsedLevels: number[];
  visible?: boolean;
}

const POWER_UP_DISPLAY_NAMES: Record<PowerUpType, string> = {
  multiball: "Multi-Ball",
  turrets: "Turrets",
  fireball: "Fireball",
  slowdown: "Slowdown",
  paddleExtend: "Extend",
  paddleShrink: "Shrink",
  shield: "Shield",
  secondChance: "Barrier",
  life: "Extra Life",
  bossStunner: "Boss Stun",
  reflectShield: "Reflect",
  homingBall: "Homing",
};

export const PowerUpWeightsOverlay = ({
  dropCounts,
  difficulty,
  currentLevel,
  extraLifeUsedLevels,
  visible = true,
}: PowerUpWeightsOverlayProps) => {
  const [weights, setWeights] = useState<Partial<Record<PowerUpType, number>>>({});

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const currentWeights = calculateCurrentWeights(
        dropCounts,
        difficulty,
        currentLevel,
        extraLifeUsedLevels,
        false // Don't include boss-exclusive for brick drops
      );
      setWeights(currentWeights);
    }, 500);

    // Initial calculation
    setWeights(
      calculateCurrentWeights(dropCounts, difficulty, currentLevel, extraLifeUsedLevels, false)
    );

    return () => clearInterval(interval);
  }, [dropCounts, difficulty, currentLevel, extraLifeUsedLevels, visible]);

  if (!visible) return null;

  // Calculate total weight for percentage display
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);

  return (
    <div className="fixed top-44 left-2 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50 pointer-events-none select-none max-h-80 overflow-y-auto">
      <div className="space-y-1">
        <div className="font-bold text-primary mb-2">Power-Up Weights</div>
        <div className="text-[10px] text-muted-foreground mb-2">
          Level {currentLevel} • {difficulty}
        </div>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-0.5 text-[11px]">
          <div className="text-muted-foreground font-semibold">Type</div>
          <div className="text-muted-foreground font-semibold text-right">Base</div>
          <div className="text-muted-foreground font-semibold text-right">Curr</div>
          <div className="text-muted-foreground font-semibold text-right">Drops</div>

          {BRICK_POWER_UP_TYPES.map((type) => {
            const baseWeight = BASE_POWER_UP_WEIGHTS[type];
            const currentWeight = weights[type] || 0;
            const drops = dropCounts[type] || 0;
            const percentage = totalWeight > 0 ? ((currentWeight / totalWeight) * 100).toFixed(0) : "0";
            const isDecayed = currentWeight < baseWeight * 0.8;

            return (
              <div key={type} className="contents">
                <span className={drops > 0 ? "text-yellow-300" : "text-gray-300"}>
                  {POWER_UP_DISPLAY_NAMES[type]}
                </span>
                <span className="text-gray-500 text-right">{baseWeight}</span>
                <span
                  className={`text-right ${
                    isDecayed ? "text-orange-400" : "text-green-400"
                  }`}
                >
                  {currentWeight.toFixed(1)}
                </span>
                <span
                  className={`text-right ${
                    drops > 0 ? "text-cyan-400" : "text-gray-500"
                  }`}
                >
                  {drops}
                </span>
              </div>
            );
          })}

          {/* Extra life - shown conditionally */}
          {weights.life !== undefined && (
            <div className="contents">
              <span className="text-purple-300">{POWER_UP_DISPLAY_NAMES.life}</span>
              <span className="text-gray-500 text-right">{BASE_POWER_UP_WEIGHTS.life}</span>
              <span className="text-green-400 text-right">{(weights.life || 0).toFixed(1)}</span>
              <span className="text-gray-500 text-right">{dropCounts.life || 0}</span>
            </div>
          )}
        </div>

        <div className="pt-2 mt-2 border-t border-border/20 text-[10px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Weight:</span>
            <span>{totalWeight.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
        Press 'W' to toggle this overlay
      </div>
    </div>
  );
};
