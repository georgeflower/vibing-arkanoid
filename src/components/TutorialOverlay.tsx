import { useEffect, useState, useCallback, useRef } from "react";
import type { TutorialStep } from "@/hooks/useTutorial";
import { powerUpImages } from "@/utils/powerUpImages";
import type { PowerUpType, BossType } from "@/types/game";
import { renderBossToCanvas, type EntityType } from "@/utils/tutorialEntityRenderer";

interface TutorialOverlayProps {
  step: TutorialStep;
  onDismiss: () => void;
  onSkipAll: () => void;
  isPaused: boolean;
  isSlowMotion: boolean;
  highlightPosition?: { x: number; y: number; width: number; height: number; type?: string; bossType?: BossType } | null;
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
  const [rotation, setRotation] = useState({ x: 0.3, y: 0, z: 0.1 });
  const [isMobile, setIsMobile] = useState(false);
  const entityCanvasRef = useRef<HTMLCanvasElement>(null);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Target zoom scale based on device
  const targetZoomScale = isMobile ? 2 : 3;

  // Animate zoom in on mount
  useEffect(() => {
    const timer = setTimeout(() => setZoomScale(targetZoomScale), 50);
    return () => clearTimeout(timer);
  }, [targetZoomScale]);

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

  // Rotation animation for boss/enemy
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const time = Date.now() * 0.001;
      setRotation({
        x: 0.3 + Math.sin(time * 0.5) * 0.2,
        y: time * 0.8,
        z: 0.1 + Math.cos(time * 0.3) * 0.1
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Render boss/enemy to canvas
  useEffect(() => {
    if (!entityCanvasRef.current || !highlightPosition) return;
    if (highlightPosition.type !== 'boss' && highlightPosition.type !== 'enemy') return;
    
    const canvas = entityCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const entityType: EntityType = highlightPosition.type === 'boss' 
      ? (highlightPosition.bossType || 'cube') 
      : 'enemy';
    
    const size = Math.min(canvas.width, canvas.height) * 0.8;
    
    renderBossToCanvas(ctx, entityType, canvas.width / 2, canvas.height / 2, size, {
      rotationX: rotation.x,
      rotationY: rotation.y,
      rotationZ: rotation.z
    });
  }, [highlightPosition, rotation]);

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
        e.stopPropagation();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleDismiss]);

  // Handle mouse click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleDismiss();
      }
    };

    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [handleDismiss]);

  // Handle touch input - use capture to intercept before game handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleDismiss();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    return () => document.removeEventListener('touchstart', handleTouchStart, { capture: true });
  }, [handleDismiss]);

  // Calculate canvas dimensions
  const canvasWidth = canvasRect?.width ?? 800;
  const canvasHeight = canvasRect?.height ?? 600;

  // Calculate spotlight position relative to overlay with clamping
  const hasHighlight = (step.highlight?.type === 'power_up' || step.highlight?.type === 'boss' || step.highlight?.type === 'enemy') && highlightPosition && canvasRect;
  
  // Calculate base spotlight radius
  const baseSpotlightRadius = hasHighlight ? Math.max(highlightPosition.width, highlightPosition.height) * 1.5 : 0;
  const spotlightRadius = baseSpotlightRadius * zoomScale;
  
  // Calculate spotlight position with clamping to keep within screen bounds
  const rawSpotlightX = hasHighlight ? highlightPosition.x + highlightPosition.width / 2 + wobble.x : 0;
  const rawSpotlightY = hasHighlight ? highlightPosition.y + highlightPosition.height / 2 + wobble.y : 0;
  
  // Clamp spotlight position to keep the zoomed content within canvas
  const padding = isMobile ? 20 : 40;
  const spotlightX = hasHighlight 
    ? Math.max(spotlightRadius + padding, Math.min(canvasWidth - spotlightRadius - padding, rawSpotlightX))
    : 0;
  const spotlightY = hasHighlight 
    ? Math.max(spotlightRadius + padding, Math.min(canvasHeight - spotlightRadius - padding, rawSpotlightY))
    : 0;

  // Calculate popup position to avoid overlapping with highlight
  const calculatePopupPosition = () => {
    if (!hasHighlight || !highlightPosition || !canvasRect) {
      // No highlight - center the popup vertically on mobile
      return { top: isMobile ? '40%' : 32, bottom: 'auto' };
    }
    
    const highlightCenterY = spotlightY;
    const highlightBottom = highlightCenterY + spotlightRadius;
    const highlightTop = highlightCenterY - spotlightRadius;
    
    // Popup approximate height
    const popupHeight = isMobile ? 120 : 150;
    
    // If highlight is in top half, put popup at bottom
    if (highlightCenterY < canvasHeight * 0.45) {
      // Position below the highlight with some margin
      const topPos = Math.min(highlightBottom + 20, canvasHeight - popupHeight - 50);
      return { top: Math.max(topPos, canvasHeight * 0.5), bottom: 'auto' };
    } else {
      // Highlight is in bottom half - put popup at top, but more centered on mobile
      const desiredTop = isMobile ? canvasHeight * 0.25 : 32;
      const topPos = Math.min(highlightTop - popupHeight - 20, desiredTop);
      return { top: Math.max(isMobile ? canvasHeight * 0.15 : 16, topPos), bottom: 'auto' };
    }
  };
  
  const popupPosition = calculatePopupPosition();

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

      {/* Zoomed highlight rendering */}
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
          {/* Render based on highlight type */}
          {(highlightPosition.type === 'boss' || highlightPosition.type === 'enemy') ? (
            <canvas
              ref={entityCanvasRef}
              width={highlightPosition.width * 2}
              height={highlightPosition.height * 2}
              style={{
                width: highlightPosition.width,
                height: highlightPosition.height,
              }}
            />
          ) : highlightPosition.type === 'bossStunner' || highlightPosition.type === 'reflectShield' || highlightPosition.type === 'homingBall' ? (
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

      {/* Tutorial popup box - dynamically positioned */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-start justify-center px-2"
        style={{
          top: typeof popupPosition.top === 'number' ? popupPosition.top : popupPosition.top,
          opacity: isDismissing ? 0 : 1,
          transform: `translateX(-50%) scale(${isDismissing ? 0.9 : 1})`,
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
          maxWidth: '100%',
        }}
      >
        <div 
          className={`relative mx-2 rounded-lg border-2 ${isMobile ? 'max-w-[280px] px-3 py-2' : 'max-w-xs px-4 py-3'}`}
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
            className={`retro-pixel-text text-center mb-1 ${isMobile ? 'text-sm' : 'text-base md:text-lg'}`}
            style={{
              color: 'hsl(48, 100%, 60%)',
              textShadow: '0 0 8px hsl(48, 100%, 60%)',
            }}
          >
            {step.title}
          </h2>

          {/* Message - compact */}
          <div 
            className={`retro-pixel-text text-center mb-2 whitespace-pre-line ${isMobile ? 'text-[10px]' : 'text-xs'}`}
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
              className={`retro-pixel-text text-center animate-pulse ${isMobile ? 'text-[10px]' : 'text-xs'}`}
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
            className={`absolute -bottom-5 left-1/2 -translate-x-1/2 retro-pixel-text opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}
            style={{ color: 'hsl(0, 0%, 60%)' }}
          >
            skip tutorials
          </button>
        </div>
      </div>
    </div>
  );
};
