import { useEffect, useState } from "react";

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color?: string; // HSL color
  isWarning?: boolean;
  followTarget?: { x: number; y: number }; // Optional position to follow
}

interface FloatingGameTextProps {
  texts: FloatingText[];
  gameScale: number;
  isMobile: boolean;
  onTextExpired: (id: string) => void;
}

export const FloatingGameText = ({
  texts,
  gameScale,
  isMobile,
  onTextExpired,
}: FloatingGameTextProps) => {
  const [, forceUpdate] = useState(0);

  // Re-render periodically to update animations
  useEffect(() => {
    if (texts.length === 0) return;

    const interval = setInterval(() => {
      forceUpdate((prev) => prev + 1);

      // Check for expired texts
      const now = Date.now();
      texts.forEach((text) => {
        if (now - text.startTime >= text.duration) {
          onTextExpired(text.id);
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [texts, onTextExpired]);

  if (texts.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[150]"
      style={{
        transform: `scale(${gameScale})`,
        transformOrigin: "top center",
      }}
    >
      {texts.map((text) => {
        const elapsed = Date.now() - text.startTime;
        const progress = elapsed / text.duration;

        if (progress >= 1) return null;

        // Zoom in/out animation
        const zoomPhase = (elapsed / 400) * Math.PI;
        const zoomScale = 1 + Math.sin(zoomPhase) * 0.25;

        // Fade in/out
        const fadeInDuration = 300;
        const fadeOutStart = text.duration - 400;
        let opacity = 1;
        if (elapsed < fadeInDuration) {
          opacity = elapsed / fadeInDuration;
        } else if (elapsed > fadeOutStart) {
          opacity = (text.duration - elapsed) / 400;
        }

        // Get position (use followTarget if provided)
        const posX = text.followTarget?.x ?? text.x;
        const posY = text.followTarget?.y ?? text.y;

        // Default colors
        const baseColor = text.isWarning
          ? "hsl(0, 100%, 60%)"
          : text.color || "hsl(48, 100%, 60%)";
        const glowColor = text.isWarning
          ? "hsl(0, 100%, 50%)"
          : text.color || "hsl(48, 100%, 50%)";

        return (
          <div
            key={text.id}
            className="absolute retro-pixel-text text-center whitespace-nowrap"
            style={{
              left: `${posX}px`,
              top: `${posY - 35}px`,
              transform: `translateX(-50%) scale(${zoomScale})`,
              color: baseColor,
              textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
              fontSize: isMobile ? "10px" : "14px",
              fontWeight: "bold",
              opacity,
            }}
          >
            {text.text}
          </div>
        );
      })}
    </div>
  );
};

// Power-up type to display text mapping
export const getPowerUpDisplayText = (type: string): string => {
  const textMap: Record<string, string> = {
    multiball: "MULTIBALL!",
    turrets: "TURRETS!",
    fireball: "FIREBALL!",
    life: "EXTRA LIFE!",
    slowdown: "SLOW DOWN!",
    extend: "EXTEND!",
    shrink: "SHRINK!",
    shield: "SHIELD!",
    bossStunner: "⚡ STUNNER!",
    reflectShield: "🔄 REFLECT!",
    homingBall: "🎯 HOMING!",
  };
  return textMap[type] || type.toUpperCase() + "!";
};
