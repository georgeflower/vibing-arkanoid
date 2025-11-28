# Mobile Platform Support

Complete documentation of mobile-specific features, touch controls, gestures, and platform compatibility.

---

## Overview

Vibing Arkanoid is optimized for mobile devices with touch controls, swipe gestures, fullscreen support, and iOS Safari compatibility. The game automatically detects mobile devices and adjusts UI and input accordingly.

---

## Device Detection

### User Agent Sniffing

```typescript
const isMobile = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};
```

### Feature Detection

```typescript
const hasTouchSupport = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
```

---

## Touch Controls

### Paddle Movement

**Zone-Based Mapping** (not 1:1 pixel mapping):

```typescript
const CONTROL_ZONE_START = 0.15; // 15% of screen width
const CONTROL_ZONE_END = 0.85;   // 85% of screen width

const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault(); // Prevent scrolling
  
  const touch = e.touches[0];
  const normalizedX = touch.clientX / window.innerWidth;
  
  // Clamp to control zone
  const clampedX = Math.max(CONTROL_ZONE_START, Math.min(CONTROL_ZONE_END, normalizedX));
  
  // Map control zone to full paddle range
  const paddleX = mapRange(
    clampedX,
    CONTROL_ZONE_START, CONTROL_ZONE_END,
    PADDLE_MIN_X, PADDLE_MAX_X
  );
  
  setPaddle(prev => ({ ...prev, x: paddleX }));
};
```

**Why zone-based?**  
Allows reaching paddle extremes without dragging finger to screen edges, improving comfort and playability.

### Ball Launch

Single tap anywhere on canvas when ball is attached:

```typescript
const handleTouchStart = (e: TouchEvent) => {
  if (gameState === 'ready' && ball.attached) {
    launchBall();
  }
};
```

### Turret Firing

**Multi-touch support**: Additional finger press fires turrets:

```typescript
const handleTouchStart = (e: TouchEvent) => {
  // First touch: paddle control
  if (e.touches.length === 1) {
    handlePaddleControl(e.touches[0]);
  }
  
  // Second touch: fire turret
  if (e.touches.length === 2 && turretsActive) {
    fireBullet(paddle.x, paddle.y);
  }
};
```

---

## Swipe Gestures

**Hook**: `src/hooks/useSwipeGesture.ts`

### Swipe-to-Pause

Swipe right from left edge (< 15% screen width) to pause game:

```typescript
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  const edgeZoneWidth = window.innerWidth * 0.15;
  
  // Only track swipes starting from left edge
  if (touch.clientX <= edgeZoneWidth) {
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    
    // Prevent iOS Safari back navigation
    e.preventDefault();
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!touchStart) return;
  
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.time;
  
  // Swipe right detection
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  const isRightSwipe = dx > 50; // Min 50px movement
  const isFastEnough = dt < 300; // Max 300ms duration
  
  if (isHorizontal && isRightSwipe && isFastEnough) {
    pauseGame();
  }
  
  setTouchStart(null);
};
```

### Swipe-to-Navigate (Menus)

Swipe right on menu pages (high scores, changelog, instructions) to go back:

```typescript
// In menu components
useSwipeGesture({
  onSwipeRight: () => {
    if (currentPage !== 'main') {
      navigateBack();
    }
  },
  enabled: true
});
```

---

## iOS Safari Specifics

### Gesture Prevention

iOS Safari has built-in gestures (back navigation, pinch-to-zoom) that conflict with gameplay:

```typescript
// Touch-action CSS (applied to game canvas)
.game-canvas {
  touch-action: pan-y !important; // Allow vertical scroll only
  -webkit-touch-callout: none;    // Disable callout menu
  -webkit-user-select: none;      // Disable text selection
}

// Fullscreen mode: disable all gestures
.game-canvas.fullscreen {
  touch-action: none !important;
}

// JavaScript gesture handlers
const handleGestureStart = (e: Event) => {
  e.preventDefault(); // Block iOS pinch-to-zoom
};

const handleGestureChange = (e: Event) => {
  e.preventDefault(); // Block iOS multi-touch gestures
};

useEffect(() => {
  if (isIOS()) {
    document.addEventListener('gesturestart', handleGestureStart);
    document.addEventListener('gesturechange', handleGestureChange);
    
    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureChange);
    };
  }
}, []);
```

### Fullscreen Simulation

iOS Safari doesn't support native Fullscreen API. Use viewport-based simulation:

```typescript
const enterFullscreenIOS = () => {
  // Hide address bar by scrolling
  window.scrollTo(0, 1);
  
  // Set viewport to device dimensions
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute('content', 
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );
  }
  
  // Add fullscreen class
  document.body.classList.add('ios-fullscreen');
};

const exitFullscreenIOS = () => {
  document.body.classList.remove('ios-fullscreen');
  
  // Restore normal viewport
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute('content', 
      'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes'
    );
  }
};
```

**CSS**:
```css
.ios-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height */
  overflow: hidden;
  z-index: 9999;
}
```

### Audio Unlock

iOS requires user gesture to enable audio:

```typescript
let audioUnlocked = false;

const unlockAudio = () => {
  if (audioUnlocked) return;
  
  // Play silent audio to unlock
  const silentAudio = new Audio();
  silentAudio.play().then(() => {
    audioUnlocked = true;
    console.log('Audio unlocked on iOS');
  }).catch(err => {
    console.warn('Audio unlock failed:', err);
  });
};

// Trigger on first user interaction
useEffect(() => {
  if (isIOS() && !audioUnlocked) {
    const handler = () => {
      unlockAudio();
      document.removeEventListener('touchstart', handler);
    };
    
    document.addEventListener('touchstart', handler, { once: true });
  }
}, []);
```

---

## Android Chrome Specifics

### Native Fullscreen API

Android Chrome supports standard Fullscreen API:

```typescript
const enterFullscreenAndroid = () => {
  const elem = document.documentElement;
  
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { // Safari
    elem.webkitRequestFullscreen();
  } else if (elem.mozRequestFullScreen) { // Firefox
    elem.mozRequestFullScreen();
  } else if (elem.msRequestFullscreen) { // IE/Edge
    elem.msRequestFullscreen();
  }
};

const exitFullscreenAndroid = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};
```

### Fullscreen Detection

```typescript
const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
  if (isFullscreen()) {
    console.log('Entered fullscreen');
    setFullscreenActive(true);
  } else {
    console.log('Exited fullscreen');
    setFullscreenActive(false);
    pauseGame(); // Auto-pause on exit
  }
});
```

---

## Orientation Handling

### Auto-Pause on Orientation Change

```typescript
const [currentOrientation, setCurrentOrientation] = useState(window.orientation);

useEffect(() => {
  const handleOrientationChange = () => {
    const newOrientation = window.orientation;
    
    if (newOrientation !== currentOrientation) {
      // Show "Adjusting display..." overlay
      setOrientationReflowing(true);
      
      // Pause game immediately
      pauseGame();
      pauseMusic();
      
      // Wait for layout to stabilize
      setTimeout(() => {
        setCurrentOrientation(newOrientation);
        setOrientationReflowing(false);
        
        // Resume game
        resumeGame();
        resumeMusic();
      }, 300); // 300ms adaptive delay
    }
  };
  
  window.addEventListener('orientationchange', handleOrientationChange);
  
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
  };
}, [currentOrientation]);
```

### Landscape-Specific UI Adjustments

When mobile device is in landscape + fullscreen:

**Hide Frames**:
```typescript
useEffect(() => {
  if (isMobile() && isFullscreen() && isLandscape()) {
    document.querySelector('.metal-frame-top')?.classList.add('hidden');
    document.querySelector('.metal-frame-bottom')?.classList.add('hidden');
    document.querySelector('.metal-frame-left')?.classList.add('hidden');
    document.querySelector('.metal-frame-right')?.classList.add('hidden');
  } else {
    // Restore frames
    document.querySelectorAll('.metal-frame').forEach(frame => {
      frame.classList.remove('hidden');
    });
  }
}, [fullscreenActive, orientation]);
```

**Relocate HUD**:
```typescript
// In landscape, move HUD to left side of playable area
<div className={cn(
  "hud",
  isMobile() && isLandscape() && "hud-mobile-landscape"
)}>
  {/* HUD elements */}
</div>

// CSS
.hud-mobile-landscape {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
```

---

## Mobile Performance Optimizations

### Disable Logging

```typescript
useEffect(() => {
  if (isMobile()) {
    console.log = () => {}; // Disable console.log
    console.warn = () => {};
  }
}, []);
```

### Reduce Visual Effects

```typescript
useEffect(() => {
  if (isMobile() && quality === 'low') {
    // Disable CRT effects
    setCRTEnabled(false);
    
    // Reduce particle counts
    setParticleLimit(20);
    
    // Simplify boss rendering
    setBossDetailLevel('minimal');
  }
}, [quality]);
```

### Touch Optimizations

```typescript
// Use passive: true for scroll listeners (improves scroll performance)
element.addEventListener('touchmove', handler, { passive: true });

// Use passive: false for preventDefault (blocks scroll)
element.addEventListener('touchstart', handler, { passive: false });
```

---

## Responsive Layout

### Canvas Scaling

Auto-scale canvas to fit mobile viewport while maintaining aspect ratio:

```typescript
const scaleCanvas = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  const scaleX = containerWidth / CANVAS_WIDTH;
  const scaleY = containerHeight / CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';
};

useEffect(() => {
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  
  return () => window.removeEventListener('resize', scaleCanvas);
}, []);
```

### UI Element Sizing

Use responsive Tailwind classes:

```typescript
<div className="text-base md:text-lg lg:text-xl">
  Score: {score}
</div>

<button className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base">
  Start Game
</button>
```

---

## Mobile-Specific UI Components

### Close Button (X)

On mobile, add X button to overlays:

```typescript
{isMobile() && (
  <button 
    className="mobile-close-button"
    onClick={onClose}
    aria-label="Close"
  >
    ×
  </button>
)}

// CSS
.mobile-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  font-size: 32px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Touch Feedback

Visual feedback for touch interactions:

```typescript
const [touchActive, setTouchActive] = useState(false);

const handleTouchStart = () => {
  setTouchActive(true);
};

const handleTouchEnd = () => {
  setTouchActive(false);
};

<button 
  className={cn("button", touchActive && "button-active")}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  Start
</button>

// CSS
.button-active {
  transform: scale(0.95);
  background-color: var(--button-active-color);
}
```

---

## Testing Mobile Functionality

### Desktop Browser DevTools

1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device preset (iPhone, iPad, Pixel, etc.)
4. Test touch events, orientation, viewport

### Real Device Testing

**iOS** (Safari):
- Connect iPhone/iPad via USB
- Enable Web Inspector in Safari settings
- Open Safari → Develop → [Device Name] → [Page]

**Android** (Chrome):
- Enable USB debugging in Developer Options
- Connect device via USB
- Open `chrome://inspect` on desktop
- Inspect device page

---

## Known Mobile Issues

### Issue 1: iOS Safari Back Swipe
**Problem**: Right swipe triggers browser back navigation  
**Solution**: `touch-action: pan-y`, `preventDefault()` on touchstart, gesturestart/gesturechange handlers

### Issue 2: Android Chrome Address Bar
**Problem**: Address bar appears/disappears, changing viewport height  
**Solution**: Use `100dvh` (dynamic viewport height) instead of `100vh`

### Issue 3: Touch Event Lag
**Problem**: Touch events feel delayed on low-end devices  
**Solution**: Optimize paddle update logic, reduce logging, adaptive quality

---

## Future Mobile Features

### 1. Haptic Feedback

```typescript
const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// On brick hit
vibrate(50); // 50ms pulse

// On boss hit
vibrate([100, 50, 100]); // 100ms, pause 50ms, 100ms
```

### 2. Screen Wake Lock

Prevent screen from sleeping during gameplay:

```typescript
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired');
    }
  } catch (err) {
    console.error('Wake lock failed:', err);
  }
};

const releaseWakeLock = () => {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
};

// Request on game start
useEffect(() => {
  if (gameState === 'playing') {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
}, [gameState]);
```

### 3. Install Prompt (PWA)

```typescript
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  setShowInstallButton(true);
});

const handleInstallClick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
    deferredPrompt = null;
  }
};
```

---

## Related Files

- `src/hooks/useSwipeGesture.ts` - Swipe gesture detection
- `src/components/Game.tsx` - Touch input handling
- `src/index.css` - Mobile-specific CSS
- `src/hooks/useAdaptiveQuality.ts` - Performance optimization

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
