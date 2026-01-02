import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface BossVictoryOverlayProps {
  active: boolean;
  onComplete: () => void;
}

const COLORS = [
  "#FFD700", // Gold
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#A855F7", // Purple
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#F97316", // Orange
  "#EC4899", // Pink
];

export const BossVictoryOverlay = ({ active, onComplete }: BossVictoryOverlayProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [textVisible, setTextVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      setTextVisible(false);
      setFadeOut(false);
      return;
    }

    // Create initial burst of particles
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 6;
      initialParticles.push({
        id: i,
        x: 50, // Center percentage
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
      });
    }
    setParticles(initialParticles);

    // Show text after short delay
    const textTimer = setTimeout(() => setTextVisible(true), 200);

    // Animate particles
    const animationInterval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 0.3,
            y: p.y + p.vy * 0.3,
            vy: p.vy + 0.15, // Gravity
            life: p.life - 0.015,
          }))
          .filter((p) => p.life > 0)
      );
    }, 16);

    // Start fade out
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);

    // Complete after animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(textTimer);
      clearInterval(animationInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      className={`absolute inset-0 z-50 pointer-events-none overflow-hidden transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.life,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

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
