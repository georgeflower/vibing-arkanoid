

# Mobile/Touch Input Extraction Plan

## Overview
Extract mobile-specific logic and UI from `Game.tsx` (~450+ lines) into a dedicated hook and component, improving maintainability while preserving all mobile functionality.

## Current State Analysis

### Mobile-Related Code Locations in Game.tsx:

| Section | Lines | Description |
|---------|-------|-------------|
| Device Detection | 328-339 | `isMobileDevice`, `isIOSDevice` detection |
| Mobile Ball Glow | 499-503, 711-744 | Get Ready glow animation for mobile |
| Swipe Gesture Integration | 1410-1425 | `useSwipeGesture` for pause |
| Touch Handlers | 2208-2410 | `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` (~200 lines) |
| Touch Event Registration | 2736-2752 | Canvas touch event listeners |
| Pointer Lock Skip | 2724-2728 | Skip pointer lock check on mobile |
| Fullscreen Logic | 8422-8564 | `toggleFullscreen`, fullscreen events, iOS gesture prevention (~140 lines) |
| Fullscreen Prompt | 8662-8697 | `handleFullscreenPromptClick`, mobile prompt overlay |
| Mobile Pause Button | 9305-9331 | Floating pause button for mobile |
| Mobile Music Toggle | 9333-9369 | Floating music on/off button |
| Mobile Debug Button | 9393-9411 | Debug dashboard trigger for touch |
| Mobile Power-Up Timers | 9558-9612 | Timer display outside scaled container |
| Mobile Bonus Text | 9614-9653 | Bonus letter tutorial for mobile |
| Layout Adaptation | 8566-8661 | Frame/header visibility based on mobile/fullscreen |

### Dependencies Required:
- `gameContainerRef`, `canvasRef`, `fullscreenContainerRef` (DOM refs)
- `paddle`, `setPaddle`, `paddleXRef` (paddle control)
- `balls`, `setBalls` (ball launch detection)
- `gameState`, `setGameState` (pause/play)
- `gameLoopRef` (pause/resume loop)
- `launchAngle`, `setLaunchAngle` (launch control)
- `fireBullets` (turret firing)
- `SCALED_CANVAS_WIDTH`, `SCALED_CANVAS_HEIGHT` (scaled dimensions)
- `bricks`, `nextLevel` (ready state launch)
- `tutorialActive` (skip input during tutorial)
- Power-up end times for timer display
- `musicEnabled`, `setMusicEnabled`, `soundManager` (music toggle)

---

## Proposed Architecture

### New Files to Create:

```text
src/hooks/useGameTouchInput.ts       (~250 lines) - Touch handling & device detection
src/components/MobileGameControls.tsx (~200 lines) - Mobile-specific UI components
```

---

## File 1: `src/hooks/useGameTouchInput.ts`

### Purpose
Centralize all touch input handling, device detection, and mobile-specific gestures.

### Interface
```typescript
interface UseGameTouchInputProps {
  // Refs
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameContainerRef: React.RefObject<HTMLDivElement>;
  fullscreenContainerRef: React.RefObject<HTMLDivElement>;
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  paddleXRef: React.MutableRefObject<number>;
  
  // Game state
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // Paddle
  paddle: Paddle | null;
  setPaddle: React.Dispatch<React.SetStateAction<Paddle | null>>;
  
  // Balls
  balls: Ball[];
  launchAngle: number;
  setLaunchAngle: (angle: number) => void;
  launchBallAtCurrentAngle: () => void;
  
  // Turrets
  fireBullets: (paddle: Paddle) => void;
  
  // Scaling
  scaledCanvasWidth: number;
  scaledCanvasHeight: number;
  
  // Level transitions
  bricks: Brick[];
  nextLevel: () => void;
  
  // Boss Rush
  isBossRush: boolean;
  bossRushStartTime: number | null;
  setBossRushStartTime: (time: number) => void;
  
  // Tutorial
  tutorialActive: boolean;
}

interface UseGameTouchInputReturn {
  // Device info
  isMobileDevice: boolean;
  isIOSDevice: boolean;
  
  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  showFullscreenPrompt: boolean;
  handleFullscreenPromptClick: () => Promise<void>;
  
  // Touch handlers (for manual attachment if needed)
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent) => void;
  
  // Mobile glow state
  getReadyGlow: { opacity: number } | null;
  setGetReadyGlow: React.Dispatch<React.SetStateAction<{ opacity: number } | null>>;
  getReadyGlowStartTimeRef: React.RefObject<number | null>;
  
  // Layout state
  headerVisible: boolean;
  framesVisible: boolean;
  titleVisible: boolean;
  gameScale: number;
}
```

### Implementation Sections

1. **Device Detection** (~15 lines)
   - `isMobileDevice` and `isIOSDevice` detection
   - User agent parsing

2. **Touch Refs** (~10 lines)
   - `activeTouchRef`, `secondTouchRef` for multi-touch tracking

3. **Touch Handlers** (~120 lines)
   - `handleTouchStart`: Game start, paddle position, launch angle, turret fire
   - `handleTouchMove`: Paddle control with zone mapping, launch angle adjustment
   - `handleTouchEnd`: Clear touch tracking

4. **Touch Event Registration Effect** (~20 lines)
   - Attach/detach touch listeners to canvas

5. **Fullscreen Management** (~80 lines)
   - `toggleFullscreen()` with iOS CSS fallback
   - Fullscreen change event listeners
   - Auto-fullscreen on game start
   - `handleFullscreenPromptClick()` for resume

6. **iOS Gesture Prevention Effect** (~15 lines)
   - Document-level gesturestart/gesturechange prevention

7. **Swipe Gesture Integration** (~15 lines)
   - `useSwipeGesture` for swipe-to-pause

8. **Mobile Ball Glow Animation Effect** (~40 lines)
   - `getReadyGlow` state and animation loop

9. **Layout Adaptation Effect** (~60 lines)
   - Header/frame visibility based on viewport and fullscreen

---

## File 2: `src/components/MobileGameControls.tsx`

### Purpose
Render all mobile-specific UI controls in a single component.

### Props Interface
```typescript
interface MobileGameControlsProps {
  // Device info
  isMobileDevice: boolean;
  isIOSDevice: boolean;
  
  // Game state
  gameState: GameState;
  setGameState: (state: GameState) => void;
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  
  // Music control
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  
  // Fullscreen
  isFullscreen: boolean;
  showFullscreenPrompt: boolean;
  onFullscreenPromptClick: () => void;
  
  // Power-up timers
  bossStunnerEndTime: number | null;
  reflectShieldEndTime: number | null;
  homingBallEndTime: number | null;
  fireballEndTime: number | null;
  paddle: Paddle | null;
  
  // Bonus letter tutorial
  bonusLetterFloatingText: { active: boolean; startTime: number } | null;
  setBonusLetterFloatingText: (text: { active: boolean; startTime: number } | null) => void;
  bonusLettersLength: number;
  
  // Debug (optional)
  showDebugDashboard?: boolean;
  setShowDebugDashboard?: (show: boolean) => void;
  enableDebugFeatures?: boolean;
}
```

### Structure
```tsx
export const MobileGameControls = (props: MobileGameControlsProps) => {
  if (!props.isMobileDevice) return null;
  
  return (
    <>
      {/* Fullscreen Prompt Overlay */}
      {props.showFullscreenPrompt && (
        <div className="fixed inset-0 z-50 ...">
          ...
        </div>
      )}
      
      {/* Pause Button */}
      {props.gameState === "playing" && (
        <button className="fixed left-4 top-[116px] ...">
          <Pause ... />
        </button>
      )}
      
      {/* Music Toggle Button */}
      {props.gameState === "playing" && (
        <button className="fixed right-4 top-[116px] ...">
          {props.musicEnabled ? <Volume2 /> : <VolumeX />}
        </button>
      )}
      
      {/* Power-Up Timers */}
      {(props.bossStunnerEndTime || ...) && (
        <div className="flex justify-center ...">
          {/* STUN, REFLECT, MAGNET, FIREBALL timers */}
        </div>
      )}
      
      {/* Bonus Letter Tutorial */}
      {props.bonusLetterFloatingText?.active && ...}
      
      {/* Mobile Debug Button (conditional) */}
      {props.enableDebugFeatures && !props.showDebugDashboard && (
        <button className="fixed right-4 top-1/2 ...">🐛</button>
      )}
    </>
  );
};
```

---

## Changes to Game.tsx

### 1. Update Imports
**Remove:**
```typescript
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
// (internal touch handler definitions removed)
```

**Add:**
```typescript
import { useGameTouchInput } from "@/hooks/useGameTouchInput";
import { MobileGameControls } from "./MobileGameControls";
```

### 2. Replace Device Detection & Touch State (~30 lines removed)
**Remove:**
```typescript
const [isMobileDevice] = useState(() => { ... });
const [isIOSDevice] = useState(() => { ... });
const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
const [isFullscreen, setIsFullscreen] = useState(false);
const [headerVisible, setHeaderVisible] = useState(true);
const [framesVisible, setFramesVisible] = useState(true);
const [titleVisible, setTitleVisible] = useState(true);
const [gameScale, setGameScale] = useState(1);
const [getReadyGlow, setGetReadyGlow] = useState<{ opacity: number } | null>(null);
const getReadyGlowStartTimeRef = useRef<number | null>(null);
const activeTouchRef = useRef<number | null>(null);
const secondTouchRef = useRef<number | null>(null);
```

**Add:**
```typescript
const {
  isMobileDevice,
  isIOSDevice,
  isFullscreen,
  toggleFullscreen,
  showFullscreenPrompt,
  handleFullscreenPromptClick,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  getReadyGlow,
  setGetReadyGlow,
  getReadyGlowStartTimeRef,
  headerVisible,
  framesVisible,
  titleVisible,
  gameScale,
} = useGameTouchInput({
  canvasRef,
  gameContainerRef,
  fullscreenContainerRef,
  gameLoopRef,
  paddleXRef,
  gameState,
  setGameState,
  paddle,
  setPaddle,
  balls,
  launchAngle,
  setLaunchAngle,
  launchBallAtCurrentAngle,
  fireBullets,
  scaledCanvasWidth: SCALED_CANVAS_WIDTH,
  scaledCanvasHeight: SCALED_CANVAS_HEIGHT,
  bricks,
  nextLevel,
  isBossRush,
  bossRushStartTime,
  setBossRushStartTime,
  tutorialActive,
});
```

### 3. Remove Touch Handler Definitions (lines 2210-2410)
Move `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` to hook (~200 lines).

### 4. Remove Effects
- Mobile ball glow animation effect (lines 711-744)
- Swipe gesture integration (lines 1410-1425)
- Fullscreen change listener (lines 8487-8513)
- Auto-fullscreen effect (lines 8515-8533)
- iOS gesture prevention (lines 8547-8564)
- Layout adaptation effect (lines 8566-8661)
- `toggleFullscreen` function (lines 8422-8485)
- `handleFullscreenPromptClick` (lines 8662-8670)

### 5. Replace Mobile UI JSX Blocks
**Remove:** Lines 9305-9369 (pause button, music toggle), 9393-9411 (debug button), 8686-8697 (fullscreen prompt), 9558-9653 (power-up timers, bonus text)

**Add:**
```tsx
{/* Mobile Controls - All mobile UI in one component */}
<MobileGameControls
  isMobileDevice={isMobileDevice}
  isIOSDevice={isIOSDevice}
  gameState={gameState}
  setGameState={setGameState}
  gameLoopRef={gameLoopRef}
  musicEnabled={musicEnabled}
  setMusicEnabled={setMusicEnabled}
  isFullscreen={isFullscreen}
  showFullscreenPrompt={showFullscreenPrompt}
  onFullscreenPromptClick={handleFullscreenPromptClick}
  bossStunnerEndTime={bossStunnerEndTime}
  reflectShieldEndTime={reflectShieldEndTime}
  homingBallEndTime={homingBallEndTime}
  fireballEndTime={fireballEndTime}
  paddle={paddle}
  bonusLetterFloatingText={bonusLetterFloatingText}
  setBonusLetterFloatingText={setBonusLetterFloatingText}
  bonusLettersLength={bonusLetters.length}
  showDebugDashboard={showDebugDashboard}
  setShowDebugDashboard={setShowDebugDashboard}
  enableDebugFeatures={ENABLE_DEBUG_FEATURES}
/>
```

---

## Estimated Line Reduction

| Section | Lines Removed |
|---------|---------------|
| Device detection state | ~15 |
| Touch handler definitions | ~200 |
| Touch event registration | ~20 |
| Fullscreen logic & effects | ~140 |
| iOS gesture prevention | ~20 |
| Layout adaptation effect | ~100 |
| Mobile UI JSX (pause, music, timers) | ~150 |
| Mobile glow animation | ~35 |
| Swipe gesture integration | ~15 |
| **Total** | **~695 lines** |

---

## Implementation Order

1. Create `src/hooks/useGameTouchInput.ts` with all touch handling and device detection
2. Create `src/components/MobileGameControls.tsx` with all mobile UI
3. Update `Game.tsx` imports
4. Replace state declarations with `useGameTouchInput()` hook call
5. Remove migrated touch handlers and effects
6. Replace mobile UI JSX with `<MobileGameControls />`
7. Test all mobile functionality

---

## Testing Checklist

### Touch Input
- [ ] Single tap starts game from "ready" state
- [ ] Single tap launches ball when waiting
- [ ] Touch movement controls paddle position
- [ ] Touch zone mapping (15%-85%) works correctly
- [ ] Two-finger touch adjusts launch angle
- [ ] Two-finger tap fires turrets (when equipped)
- [ ] Touch controls disabled during tutorial

### Fullscreen
- [ ] Auto-enters fullscreen on game start (non-iOS)
- [ ] iOS uses CSS-based fullscreen fallback
- [ ] Exiting fullscreen pauses game and shows prompt
- [ ] Tapping prompt resumes fullscreen and game
- [ ] F key still toggles fullscreen on desktop

### Mobile UI
- [ ] Pause button visible and functional during gameplay
- [ ] Music toggle button works correctly
- [ ] Power-up timers display with correct colors/animations
- [ ] Bonus letter tutorial appears on mobile
- [ ] Debug button appears (when debug features enabled)

### Swipe Gesture
- [ ] Swipe right from left edge pauses game
- [ ] Swipe gesture blocked on iOS Safari (prevents back navigation)

### Layout
- [ ] Frames hide in mobile fullscreen mode
- [ ] Header/title adapt to available space
- [ ] Game scales appropriately on different screen sizes

