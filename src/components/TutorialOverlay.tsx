import { useEffect, useState, useCallback } from "react";
import type { TutorialStep } from "@/hooks/useTutorial";
import { powerUpImages } from "@/utils/powerUpImages";
import type { PowerUpType } from "@/types/game";

interface TutorialOverlayProps {
  step: TutorialStep;
  onDismiss: () => void;
  onSkipAll: () => void;
  isPaused: boolean;
  isSlowMotion: boolean;
  highlightPosition?: { x: number; y: number; width: number; height: number; type?: string } | null;
  canvasRect?: DOMRect | null;
}

export const TutorialOverlay = ({
  step,
  onDismiss,
  onSkipAll,
  isPaused,
  isSlowMotion,
  highlightPosition,
  canvasRect,
}: TutorialOverlayProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [scale, setScale] = useState(1);
  const [wobble, setWobble] = useState({ x: 0, y: 0 });
  const [isDismissing, setIsDismissing] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Animate zoom in on mount
  useEffect(() => {
    const timer = setTimeout(() => setZoomScale(3), 50); // 300% = 3x
    return () => clearTimeout(timer);
  }, []);

  // Pulsing animation for the prompt
  useEffect(() => {
    const promptTimer = setTimeout(() => setShowPrompt(true), 300);
    return () => clearTimeout(promptTimer);
  }, []);

  // Scale animation for popup box
  useEffect(() => {
    const interval = setInterval(() => {
      setScale(1 + Math.sin(Date.now() * 0.004) * 0.02);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Wobble animation for flashlight (like someone holding it)
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const time = Date.now() * 0.001; // Convert to seconds
      setWobble({
        x: Math.sin(time * 0.7) * 8 + Math.sin(time * 1.3) * 4,
        y: Math.cos(time * 0.5) * 6 + Math.cos(time * 1.1) * 3,
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    if (isDismissing) return;
    setIsDismissing(true);
    setZoomScale(1); // Zoom out
    setTimeout(() => {
      onDismiss();
    }, 400); // Wait for animation to complete
  }, [isDismissing, onDismiss]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  // Handle mouse click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        handleDismiss();
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [handleDismiss]);

  // Handle touch input
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleDismiss();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [handleDismiss]);

  // Calculate spotlight position relative to overlay
  const hasHighlight = step.highlight?.type === 'power_up' && highlightPosition && canvasRect;
  const spotlightX = hasHighlight ? highlightPosition.x + highlightPosition.width / 2 + wobble.x : 0;
  const spotlightY = hasHighlight ? highlightPosition.y + highlightPosition.height / 2 + wobble.y : 0;
  const baseSpotlightRadius = hasHighlight ? Math.max(highlightPosition.width, highlightPosition.height) * 1.5 : 0;
  const spotlightRadius = baseSpotlightRadius * zoomScale;

  return (
    <div 
      className="absolute inset-0 z-[200] pointer-events-auto"
      style={{
        opacity: isDismissing ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* SVG mask for flashlight effect */}
      {hasHighlight ? (
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <radialGradient id="spotlightGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="black" stopOpacity="0" />
              <stop offset="70%" stopColor="black" stopOpacity="0" />
              <stop offset="100%" stopColor="black" stopOpacity="0.85" />
            </radialGradient>
            <mask id="spotlightMask">
              <rect width="100%" height="100%" fill="white" />
              <circle 
                cx={spotlightX} 
                cy={spotlightY} 
                r={spotlightRadius}
                fill="url(#spotlightGradient)"
                style={{
                  transition: isDismissing ? 'r 0.4s ease-in-out' : 'r 0.5s ease-out',
                }}
              />
            </mask>
          </defs>
          {/* Dimmed background with spotlight cutout */}
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(0, 0, 0, 0.75)" 
            mask="url(#spotlightMask)"
          />
          {/* Glow ring around spotlight */}
          <circle 
            cx={spotlightX} 
            cy={spotlightY} 
            r={spotlightRadius * 1.1}
            fill="none"
            stroke="rgba(0, 255, 255, 0.3)"
            strokeWidth="4"
            style={{
              transition: isDismissing ? 'r 0.4s ease-in-out, opacity 0.3s' : 'r 0.5s ease-out',
              opacity: isDismissing ? 0 : 1,
            }}
          />
          <circle 
            cx={spotlightX} 
            cy={spotlightY} 
            r={spotlightRadius * 1.05}
            fill="none"
            stroke="rgba(255, 255, 0, 0.2)"
            strokeWidth="2"
            style={{
              transition: isDismissing ? 'r 0.4s ease-in-out, opacity 0.3s' : 'r 0.5s ease-out',
              opacity: isDismissing ? 0 : 1,
            }}
          />
        </svg>
      ) : (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        />
      )}

      {/* Zoomed power-up rendering */}
      {hasHighlight && highlightPosition && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: spotlightX,
            top: spotlightY,
            width: highlightPosition.width,
            height: highlightPosition.height,
            transform: `translate(-50%, -50%) scale(${zoomScale})`,
            transition: isDismissing ? 'transform 0.4s ease-in-out, opacity 0.3s' : 'transform 0.5s ease-out',
            opacity: isDismissing ? 0 : 1,
            zIndex: 201,
          }}
        >
          {/* Render boss power-ups with emoji, regular power-ups with image */}
          {highlightPosition.type === 'bossStunner' || highlightPosition.type === 'reflectShield' || highlightPosition.type === 'homingBall' ? (
            <span style={{ fontSize: `${highlightPosition.width}px` }}>
              {highlightPosition.type === 'bossStunner' ? '⚡' : highlightPosition.type === 'reflectShield' ? '🪞' : '🎯'}
            </span>
          ) : highlightPosition.type && powerUpImages[highlightPosition.type as PowerUpType] ? (
            <div
              style={{
                width: highlightPosition.width,
                height: highlightPosition.height,
                borderRadius: 4,
                backgroundColor: 'hsl(0, 0%, 70%)',
                boxShadow: '0 0 10px hsl(280, 60%, 55%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={powerUpImages[highlightPosition.type as PowerUpType]}
                alt="Power-up"
                style={{
                  width: '80%',
                  height: '80%',
                  objectFit: 'contain',
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Tutorial popup box */}
      <div 
        className="absolute top-8 left-1/2 -translate-x-1/2 flex items-start justify-center"
        style={{
          opacity: isDismissing ? 0 : 1,
          transform: `translateX(-50%) scale(${isDismissing ? 0.9 : 1})`,
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        }}
      >
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
          {showPrompt && !isDismissing && (
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
    </div>
  );
};
