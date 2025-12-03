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
    const promptTimer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(promptTimer);
  }, []);

  // Scale animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScale(1 + Math.sin(Date.now() * 0.003) * 0.02);
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

  return (
    <div 
      className="absolute inset-0 z-[200] flex items-center justify-center"
      onClick={onDismiss}
      style={{
        backgroundColor: isPaused ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Slow motion indicator */}
      {isSlowMotion && !isPaused && (
        <div className="absolute top-4 right-4 retro-pixel-text text-yellow-400 text-sm animate-pulse">
          ⏱️ SLOW MOTION
        </div>
      )}

      {/* Main tutorial box */}
      <div 
        className="relative max-w-lg mx-4 p-6 rounded-lg border-4"
        style={{
          backgroundColor: 'rgba(10, 25, 50, 0.95)',
          borderColor: 'hsl(180, 100%, 50%)',
          boxShadow: '0 0 30px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.1)',
          transform: `scale(${scale})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 
          className="retro-pixel-text text-2xl md:text-3xl text-center mb-4"
          style={{
            color: 'hsl(48, 100%, 60%)',
            textShadow: '0 0 10px hsl(48, 100%, 60%), 0 0 20px hsl(48, 100%, 40%)',
          }}
        >
          {step.title}
        </h2>

        {/* Message */}
        <div 
          className="retro-pixel-text text-sm md:text-base text-center mb-6 whitespace-pre-line"
          style={{
            color: 'hsl(0, 0%, 90%)',
            lineHeight: '1.8',
          }}
        >
          {step.message}
        </div>

        {/* Continue prompt */}
        {showPrompt && (
          <div 
            className="retro-pixel-text text-center animate-pulse"
            style={{
              color: 'hsl(120, 100%, 60%)',
              textShadow: '0 0 10px hsl(120, 100%, 50%)',
            }}
          >
            {isPaused ? '▶ PRESS SPACE TO CONTINUE ◀' : '▶ CLICK OR PRESS SPACE ◀'}
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkipAll();
          }}
          className="absolute bottom-2 right-2 retro-pixel-text text-xs opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'hsl(0, 0%, 60%)' }}
        >
          SKIP ALL TUTORIALS
        </button>
      </div>
    </div>
  );
};
