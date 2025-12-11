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
  bonusLetterPosition?: { x: number; y: number } | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const TutorialOverlay = ({
  step,
  onDismiss,
  onSkipAll,
  isPaused,
  isSlowMotion,
  highlightPosition,
  canvasRect,
  bonusLetterPosition,
  canvasWidth = 850,
  canvasHeight = 650,
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

  // Target zoom scale - normal size (no zoom)
  const targetZoomScale = 1;

  // Sway animation for the popup
  const [sway, setSway] = useState(0);

  // Animate zoom in on mount
  useEffect(() => {
    const timer = setTimeout(() => setZoomScale(targetZoomScale), 50);
    return () => clearTimeout(timer);
  }, [targetZoomScale]);

  // Sway animation effect for popup
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const time = Date.now() * 0.001;
      setSway(Math.sin(time * 1.5) * 10); // Sway ±10px horizontally
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
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

  // Use viewport dimensions for fixed positioning - track as state for mobile updates
  const [viewportDimensions, setViewportDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // Update viewport dimensions on resize/orientation change for mobile accuracy
  useEffect(() => {
    const updateDimensions = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    
    // Also update after a short delay to catch any layout shifts
    const initialTimeout = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      clearTimeout(initialTimeout);
    };
  }, []);

  const viewportWidth = viewportDimensions.width;
  const viewportHeight = viewportDimensions.height;

  // Calculate spotlight position relative to overlay with clamping
  const hasHighlight = (step.highlight?.type === 'power_up' || step.highlight?.type === 'boss' || step.highlight?.type === 'enemy') && highlightPosition && canvasRect;
  
  // Calculate scale ratios for game coords -> screen coords
  const scaleX = canvasRect ? canvasRect.width / canvasWidth : 1;
  const scaleY = canvasRect ? canvasRect.height / canvasHeight : 1;
  
  // Calculate base spotlight radius - smaller circle that tightly wraps the powerup (scaled)
  const baseSpotlightRadius = hasHighlight ? Math.max(highlightPosition.width, highlightPosition.height) * 0.8 * Math.min(scaleX, scaleY) : 0;
  const spotlightRadius = baseSpotlightRadius * zoomScale;
  
  // Calculate spotlight position - convert game coords to screen coords with proper scaling
  const spotlightX = hasHighlight 
    ? canvasRect.left + (highlightPosition.x + highlightPosition.width / 2) * scaleX
    : 0;
  const spotlightY = hasHighlight 
    ? canvasRect.top + (highlightPosition.y + highlightPosition.height / 2) * scaleY
    : 0;


  // Calculate popup position to avoid overlapping with highlight
  const calculatePopupPosition = () => {
    if (!hasHighlight || !highlightPosition || !canvasRect) {
      // No highlight - center the popup vertically on mobile
      return { top: isMobile ? viewportHeight * 0.4 : 100, bottom: 'auto' };
    }
    
    const highlightBottom = spotlightY + spotlightRadius;
    const highlightTop = spotlightY - spotlightRadius;
    
    // Popup approximate height
    const popupHeight = isMobile ? 120 : 150;
    
    // If highlight is in top half of viewport, put popup below
    if (spotlightY < viewportHeight * 0.45) {
      const topPos = Math.min(highlightBottom + 40, viewportHeight - popupHeight - 50);
      return { top: Math.max(topPos, viewportHeight * 0.5), bottom: 'auto' };
    } else {
      // Highlight is in bottom half - put popup at top
      const topPos = Math.min(highlightTop - popupHeight - 40, viewportHeight * 0.25);
      return { top: Math.max(80, topPos), bottom: 'auto' };
    }
  };
  
  const popupPosition = calculatePopupPosition();

  return (
    <div 
      className="fixed inset-0 z-[200] pointer-events-auto"
      style={{
        opacity: isDismissing ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* SVG mask for flashlight effect - uses viewport dimensions */}
      {hasHighlight ? (
        <svg 
          width={viewportWidth}
          height={viewportHeight}
          className="fixed inset-0"
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
          {/* No dimming - removed for better visibility */}
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
          {/* Connecting line from TOP of highlight circle to popup frame bottom */}
          <line
            x1={spotlightX + wobble.x * 0.5}
            y1={spotlightY - spotlightRadius + wobble.y * 0.5}
            x2={viewportWidth / 2 + sway}
            y2={typeof popupPosition.top === 'number' ? popupPosition.top + 100 : viewportHeight * 0.4 + 100}
            stroke="rgba(0, 255, 255, 0.6)"
            strokeWidth="2"
            strokeDasharray="6,4"
            style={{
              transition: 'opacity 0.3s',
              opacity: isDismissing ? 0 : 0.8,
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

      {/* Tutorial popup box - dynamically positioned with sway */}
      <div 
        className="absolute left-1/2 flex items-start justify-center px-2"
        style={{
          top: typeof popupPosition.top === 'number' ? popupPosition.top : popupPosition.top,
          opacity: isDismissing ? 0 : 1,
          transform: `translateX(calc(-50% + ${sway}px)) scale(${isDismissing ? 0.9 : 1})`,
          transition: 'opacity 0.3s ease-out',
          maxWidth: '100%',
        }}
      >
        <div 
          className={`relative mx-2 rounded-lg border-2 ${isMobile ? 'max-w-[320px] px-4 py-2' : 'max-w-sm px-4 py-3'}`}
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
