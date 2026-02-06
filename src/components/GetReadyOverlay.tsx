import { useEffect, useState } from "react";

interface GetReadyOverlayProps {
  onComplete: () => void;
}

export const GetReadyOverlay = ({ onComplete }: GetReadyOverlayProps) => {
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

  return (
    <div 
      className="absolute inset-0 z-[150] pointer-events-none flex items-center justify-center"
      style={{
        opacity,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <div
        className="retro-pixel-text"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.3s ease-out',
          fontSize: '32px',
          color: 'hsl(48, 100%, 60%)',
          textShadow: `
            0 0 10px hsl(48, 100%, 60%),
            0 0 20px hsl(48, 100%, 50%),
            0 0 30px hsl(48, 100%, 40%),
            0 0 40px hsl(48, 100%, 30%)
          `,
          whiteSpace: 'nowrap',
        }}
      >
        GET READY!
      </div>
    </div>
  );
};
