import { useEffect, useState } from "react";

interface GetReadyOverlayProps {
  ballPosition: { x: number; y: number } | null;
  onComplete: () => void;
}

export const GetReadyOverlay = ({
  ballPosition,
  onComplete,
}: GetReadyOverlayProps) => {
  const [scale, setScale] = useState(0.5);
  const [opacity, setOpacity] = useState(0);
  const [progress, setProgress] = useState(0);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setScale(1);
      setOpacity(1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Progress animation over 3 seconds
  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fade out then complete
        setOpacity(0);
        setScale(1.2);
        setTimeout(onComplete, 300);
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  // Use ball position directly since we're inside the scaled container
  const ringX = ballPosition ? ballPosition.x : 0;
  const ringY = ballPosition ? ballPosition.y : 0;

  // Text position above the ball
  const textY = ringY - 60;

  // Ring size
  const ringRadius = 30 + progress * 20;

  if (!ballPosition) return null;

  return (
    <div 
      className="absolute inset-0 z-[150] pointer-events-none"
      style={{
        opacity,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* Ball highlight ring */}
      <div
        className="absolute rounded-full"
        style={{
          left: ringX,
          top: ringY,
          width: ringRadius * 2,
          height: ringRadius * 2,
          transform: 'translate(-50%, -50%)',
          border: '3px solid rgba(0, 255, 255, 0.8)',
          boxShadow: `
            0 0 20px rgba(0, 255, 255, 0.6),
            0 0 40px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.2)
          `,
          animation: 'pulse 0.5s ease-in-out infinite',
        }}
      />

      {/* Floating text */}
      <div
        className="absolute retro-pixel-text"
        style={{
          left: ringX,
          top: textY,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition: 'transform 0.3s ease-out',
          fontSize: '24px',
          color: 'hsl(48, 100%, 60%)',
          textShadow: `
            0 0 10px hsl(48, 100%, 60%),
            0 0 20px hsl(48, 100%, 50%),
            0 0 30px hsl(48, 100%, 40%)
          `,
          whiteSpace: 'nowrap',
        }}
      >
        GET READY!
      </div>
    </div>
  );
};
