import { useEffect, useState } from "react";

interface BossPowerUpTimerProps {
  label: string;
  endTime: number;
  duration: number;
}

export const BossPowerUpTimer = ({
  label,
  endTime,
  duration,
}: BossPowerUpTimerProps) => {
  const [remaining, setRemaining] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, endTime - now);
      setRemaining(timeLeft);

      // Pulse animation - faster when time is low
      const progress = 1 - timeLeft / duration;
      const pulseSpeed = progress > 0.75 ? 8 : progress > 0.5 ? 4 : 2;
      const pulseIntensity = progress > 0.75 ? 0.15 : 0.08;
      const newScale = 1 + Math.sin(Date.now() * 0.01 * pulseSpeed) * pulseIntensity;
      setScale(newScale);
    }, 50);

    return () => clearInterval(interval);
  }, [endTime, duration]);

  if (remaining <= 0) return null;

  const progress = 1 - remaining / duration;
  
  // Color transition: yellow -> orange -> red
  let color: string;
  if (progress < 0.5) {
    // Yellow to orange
    const hue = 50 - progress * 40; // 50 to 30
    color = `hsl(${hue}, 100%, 50%)`;
  } else {
    // Orange to red
    const hue = 30 - (progress - 0.5) * 60; // 30 to 0
    color = `hsl(${Math.max(0, hue)}, 100%, 50%)`;
  }

  const seconds = (remaining / 1000).toFixed(1);

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div
        className="retro-pixel-text text-sm md:text-base"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center",
          color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        {label}: {seconds}s
      </div>
    </div>
  );
};
