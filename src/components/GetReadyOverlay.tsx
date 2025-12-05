import { useEffect, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/constants/game";

interface GetReadyOverlayProps {
  ballPosition: { x: number; y: number } | null;
  canvasRect: DOMRect | null;
  canvasWidth?: number;
  canvasHeight?: number;
  onComplete: () => void;
}

export const GetReadyOverlay = ({
  ballPosition,
  canvasRect,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
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

  // Calculate scale ratios for game coords -> screen coords
  const scaleX = canvasRect ? canvasRect.width / canvasWidth : 1;
  const scaleY = canvasRect ? canvasRect.height / canvasHeight : 1;

  // Calculate position with proper scaling
  const ringX = ballPosition && canvasRect 
    ? canvasRect.left + (ballPosition.x * scaleX)
    : window.innerWidth / 2;
  const ringY = ballPosition && canvasRect 
    ? canvasRect.top + (ballPosition.y * scaleY)
    : window.innerHeight / 2;

  // Text position above the ball
  const textX = ringX;
  const textY = ringY - 60;

  // Calculate glow ring size around ball (scale the ring size too)
  const baseRingRadius = 30 + progress * 20;
  const ringRadius = baseRingRadius * Math.min(scaleX, scaleY);

  return (
    <div 
      className="fixed inset-0 z-[150] pointer-events-none"
      style={{
        opacity,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* Ball highlight ring */}
      {ballPosition && canvasRect && (
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
      )}

      {/* Floating text */}
      <div
        className="absolute retro-pixel-text"
        style={{
          left: textX,
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
