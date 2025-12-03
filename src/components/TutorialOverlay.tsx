import { useEffect, useState } from "react";
import type { TutorialStep } from "@/hooks/useTutorial";

interface TutorialOverlayProps {
  step: TutorialStep;
  onDismiss: () => void;
  onSkipAll: () => void;
  isPaused: boolean;
  isSlowMotion: boolean;
}

export const TutorialOverlay = ({
  step,
  onDismiss,
  onSkipAll,
  isPaused,
  isSlowMotion,
}: TutorialOverlayProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [scale, setScale] = useState(1);

  // Pulsing animation for the prompt
  useEffect(() => {
    const promptTimer = setTimeout(() => setShowPrompt(true), 300);
    return () => clearTimeout(promptTimer);
  }, []);

  // Scale animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScale(1 + Math.sin(Date.now() * 0.004) * 0.02);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  // Handle mouse click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [onDismiss]);

  // Handle touch input
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        onDismiss();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [onDismiss]);

  return (
    <div 
      className="absolute inset-0 z-[200] flex items-start justify-center pt-8 pointer-events-auto"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Compact tutorial box at top */}
      <div 
        className="relative max-w-xs mx-2 px-4 py-3 rounded-lg border-2"
        style={{
          backgroundColor: 'rgba(10, 25, 50, 0.95)',
          borderColor: 'hsl(180, 100%, 50%)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.6)',
          transform: `scale(${scale})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 
          className="retro-pixel-text text-base md:text-lg text-center mb-1"
          style={{
            color: 'hsl(48, 100%, 60%)',
            textShadow: '0 0 8px hsl(48, 100%, 60%)',
          }}
        >
          {step.title}
        </h2>

        {/* Message - compact */}
        <div 
          className="retro-pixel-text text-xs text-center mb-2 whitespace-pre-line"
          style={{
            color: 'hsl(0, 0%, 90%)',
            lineHeight: '1.5',
          }}
        >
          {step.message}
        </div>

        {/* Continue prompt */}
        {showPrompt && (
          <div 
            className="retro-pixel-text text-xs text-center animate-pulse"
            style={{
              color: 'hsl(120, 100%, 60%)',
              textShadow: '0 0 6px hsl(120, 100%, 50%)',
            }}
          >
            ▶ CLICK/TAP ◀
          </div>
        )}

        {/* Skip button - smaller */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkipAll();
          }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 retro-pixel-text text-[10px] opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap"
          style={{ color: 'hsl(0, 0%, 60%)' }}
        >
          skip tutorials
        </button>
      </div>
    </div>
  );
};
