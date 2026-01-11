import { useEffect, useState } from "react";
import { BOSS_RUSH_CONFIG } from "@/constants/bossRushConfig";

interface BossRushVictoryOverlayProps {
  active: boolean;
  score: number;
  onComplete: () => void;
}

export const BossRushVictoryOverlay = ({ active, score, onComplete }: BossRushVictoryOverlayProps) => {
  const [textVisible, setTextVisible] = useState(false);
  const [bonusVisible, setBonusVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setTextVisible(false);
      setBonusVisible(false);
      return;
    }

    // Show text after short delay
    const textTimer = setTimeout(() => setTextVisible(true), 200);
    
    // Show bonus after main text
    const bonusTimer = setTimeout(() => setBonusVisible(true), 1200);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(bonusTimer);
    };
  }, [active]);

  if (!active) return null;

  const totalScore = score + BOSS_RUSH_CONFIG.completionBonus;

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Celebration Content */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
          textVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="text-center space-y-4">
          {/* Main Title */}
          <div
            className="text-3xl md:text-5xl font-bold text-yellow-400 animate-pulse"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700, 2px 2px 0 #000",
              letterSpacing: "2px",
            }}
          >
            BOSS RUSH
          </div>
          <div
            className="text-4xl md:text-6xl font-bold text-green-400"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "0 0 20px #22C55E, 0 0 40px #22C55E, 2px 2px 0 #000",
              letterSpacing: "2px",
            }}
          >
            COMPLETE!
          </div>

          {/* Boss List */}
          <div className="mt-6 space-y-2">
            {BOSS_RUSH_CONFIG.bossOrder.map((bossLevel) => (
              <div
                key={bossLevel}
                className="text-sm md:text-base text-white/80"
                style={{
                  fontFamily: "'Press Start 2P', 'Courier New', monospace",
                }}
              >
                ✓ {BOSS_RUSH_CONFIG.bossNames[bossLevel]}
              </div>
            ))}
          </div>

          {/* Score Section */}
          <div
            className={`mt-8 space-y-2 transition-all duration-500 ${
              bonusVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div
              className="text-xl md:text-2xl text-white"
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                textShadow: "2px 2px 0 #000",
              }}
            >
              Score: {score.toLocaleString()}
            </div>
            <div
              className="text-lg md:text-xl text-cyan-400 animate-pulse"
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                textShadow: "0 0 10px #00CED1, 2px 2px 0 #000",
              }}
            >
              Completion Bonus: +{BOSS_RUSH_CONFIG.completionBonus.toLocaleString()}
            </div>
            <div
              className="text-2xl md:text-3xl text-yellow-300 font-bold mt-4"
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                textShadow: "0 0 15px #FFD700, 2px 2px 0 #000",
              }}
            >
              Total: {totalScore.toLocaleString()}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={onComplete}
            className="mt-8 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "none",
            }}
          >
            CONTINUE
          </button>
        </div>

        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 1}s`,
              }}
            >
              <div
                className="w-3 h-3 bg-yellow-300 rounded-full"
                style={{
                  boxShadow: "0 0 15px #FFD700",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
