import { useEffect, useState } from "react";

interface BossVictoryOverlayProps {
  active: boolean;
  onComplete: () => void;
}

export const BossVictoryOverlay = ({ active, onComplete }: BossVictoryOverlayProps) => {
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setTextVisible(false);
      return;
    }

    // Show text after short delay
    const textTimer = setTimeout(() => setTextVisible(true), 200);

    return () => {
      clearTimeout(textTimer);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Celebration Text */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
          textVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="text-center space-y-2">
          <div
            className="text-4xl md:text-5xl font-bold text-yellow-400 animate-pulse"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "0 0 20px #FFD700, 0 0 40px #FFD700, 2px 2px 0 #000",
              letterSpacing: "2px",
            }}
          >
            Great Job!
          </div>
          <div
            className="text-2xl md:text-3xl font-bold text-white"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "0 0 10px #fff, 2px 2px 0 #000",
              letterSpacing: "1px",
            }}
          >
            Boss defeated!
          </div>
          <div
            className="text-xl md:text-2xl font-bold text-green-400"
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              textShadow: "0 0 15px #22C55E, 2px 2px 0 #000",
              letterSpacing: "1px",
            }}
          >
            Extra Life granted!
          </div>
        </div>

        {/* Sparkle effects around text */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`,
              }}
            >
              <div
                className="w-2 h-2 bg-yellow-300 rounded-full"
                style={{
                  boxShadow: "0 0 10px #FFD700",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};