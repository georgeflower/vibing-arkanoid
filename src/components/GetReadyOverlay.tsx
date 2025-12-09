import { useEffect, useRef } from "react";

interface GetReadyOverlayProps {
  ballPosition: { x: number; y: number } | null;
  canvasWidth: number;
  canvasHeight: number;
  onComplete: () => void;
  isMobile?: boolean;
}

export const GetReadyOverlay = ({
  onComplete,
}: GetReadyOverlayProps) => {
  const hasCompletedRef = useRef(false);

  // Progress animation over 3 seconds, then complete
  useEffect(() => {
    if (hasCompletedRef.current) return;

    const timer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // No visual elements - glow is rendered in GameCanvas
  return null;
};
