
# Debug System Extraction Plan

## Overview
Extract the debug system from `Game.tsx` (~600+ lines of debug-related code) into a dedicated hook and component, reducing Game.tsx complexity while maintaining all debug functionality.

## Current State Analysis

### Debug-Related Code Locations in Game.tsx:
1. **Imports** (lines 27-44): 14 debug-related imports
2. **Debug State** (lines 507-534): 
   - `ccdPerformanceRef`, `ccdPerformanceTrackerRef`, `frameCountRef`
   - `currentFps`, `showDebugDashboard`, `debugDashboardPausedGame`
   - `useDebugSettings()` hook integration
   - `calculateActiveDebugFeatures()` helper function
3. **Debug Effects** (lines 538-565):
   - Frame profiler enable/disable based on settings
   - Pause/resume game when debug dashboard opens/closes
4. **Debug Logger Initialization** (lines 811-819)
5. **Debug Keyboard Controls** (lines 2541-2712): ~170 lines of keyboard shortcuts
6. **Debug Info Callback** (lines 2767-2793): `getSubstepDebugInfo()` function
7. **Debug Overlays in JSX** (lines 8970-8998): GameLoopDebugOverlay, PowerUpWeightsOverlay
8. **Debug UI Components** (lines 9371-9454): ~85 lines of overlay rendering

### Dependencies Required by Debug System:
- `gameLoopRef` (for debug info)
- `gameState` (for pause/resume)
- `balls`, `speedMultiplier` (for substep debug info)
- `paddle` (for debug power-up drops)
- `level`, `settings.difficulty` (for power-up weights overlay)
- `extraLifeUsedLevels`, `powerUpDropCounts` (for overlay data)
- `ccdPerformanceRef`, `ccdPerformanceTrackerRef` (for CCD overlay)
- Various setters: `setGameState`, `setPowerUps`, `setLevelSkipped`, etc.

---

## Proposed Architecture

### New Files to Create:

```text
src/hooks/useGameDebug.ts          (~200 lines) - Debug state & keyboard logic
src/components/GameDebugOverlays.tsx (~150 lines) - All debug overlay rendering
```

---

## File 1: `src/hooks/useGameDebug.ts`

### Purpose
Centralize all debug state management and keyboard shortcut handling.

### Interface
```typescript
interface UseGameDebugProps {
  // Game state dependencies
  gameState: GameState;
  setGameState: (state: GameState) => void;
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  
  // Ball/physics data for debug overlays
  balls: Ball[];
  speedMultiplier: number;
  scaledBrickWidth: number;
  scaledBrickHeight: number;
  
  // Paddle for debug power-up drops
  paddle: Paddle | null;
  setPowerUps: React.Dispatch<React.SetStateAction<PowerUp[]>>;
  setBonusLetters: React.Dispatch<React.SetStateAction<BonusLetter[]>>;
  setLevelSkipped: (skipped: boolean) => void;
  
  // Quality controls
  quality: QualityLevel;
  setQuality: (quality: QualityLevel) => void;
  toggleAutoAdjust: () => void;
  
  // Level controls
  nextLevel: () => void;
  setSpeedMultiplier: React.Dispatch<React.SetStateAction<number>>;
  
  // CCD performance tracking
  ccdPerformanceRef: React.RefObject<CCDPerformanceData | null>;
  ccdPerformanceTrackerRef: React.RefObject<CCDPerformanceTracker>;
}

interface UseGameDebugReturn {
  // Debug settings (from useDebugSettings)
  debugSettings: DebugSettings;
  toggleDebugSetting: (key: keyof DebugSettings) => void;
  resetDebugSettings: () => void;
  
  // Dashboard state
  showDebugDashboard: boolean;
  setShowDebugDashboard: (show: boolean) => void;
  debugDashboardPausedGame: boolean;
  
  // Debug info callbacks
  getSubstepDebugInfo: () => SubstepDebugInfo;
  getCCDPerformanceData: () => CCDPerformanceDataExtended | null;
  
  // Computed values
  activeDebugFeatureCount: number;
  currentFps: number;
}
```

### Implementation Details

1. **State Management**: Wrap `useDebugSettings()` and add dashboard state
2. **Keyboard Handler**: Create a `useEffect` that registers debug keyboard shortcuts (Tab, L, W, C, H, X, Z, §, V, 0, +, 1-9, R, E, U, [, ])
3. **Dashboard Pause Logic**: Handle auto-pause when dashboard opens
4. **Debug Info Callbacks**: `getSubstepDebugInfo()` and `getCCDPerformanceData()`
5. **Frame Profiler Toggle**: Effect to enable/disable frame profiler

---

## File 2: `src/components/GameDebugOverlays.tsx`

### Purpose
Render all debug overlays in a single component, simplifying Game.tsx JSX.

### Props Interface
```typescript
interface GameDebugOverlaysProps {
  // From useGameDebug
  debugSettings: DebugSettings;
  toggleDebugSetting: (key: keyof DebugSettings) => void;
  resetDebugSettings: () => void;
  showDebugDashboard: boolean;
  setShowDebugDashboard: (show: boolean) => void;
  activeDebugFeatureCount: number;
  getSubstepDebugInfo: () => SubstepDebugInfo;
  getCCDPerformanceData: () => CCDPerformanceDataExtended | null;
  
  // Game state for overlays
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  powerUpDropCounts: Partial<Record<PowerUpType, number>>;
  difficulty: string;
  currentLevel: number;
  extraLifeUsedLevels: Set<number>;
  
  // Quality info
  quality: QualityLevel;
  autoAdjustEnabled: boolean;
  currentFps: number;
  
  // Device type
  isMobileDevice: boolean;
}
```

### Structure
```tsx
export const GameDebugOverlays = (props: GameDebugOverlaysProps) => {
  if (!ENABLE_DEBUG_FEATURES) return null;
  
  return (
    <>
      {/* Debug Mode Indicator */}
      {props.debugSettings.showDebugModeIndicator && (
        <DebugModeIndicator ... />
      )}
      
      {/* Debug Dashboard */}
      <DebugDashboard ... />
      
      {/* Mobile Debug Button */}
      {props.isMobileDevice && !props.showDebugDashboard && (
        <button ... />
      )}
      
      {/* Quality Indicator */}
      <QualityIndicator ... />
      
      {/* Substep Debug Overlay */}
      <SubstepDebugOverlay ... />
      
      {/* Frame Profiler Overlay */}
      <FrameProfilerOverlay ... />
      
      {/* Collision History Viewer */}
      {props.debugSettings.showCollisionHistory && (
        <CollisionHistoryViewer ... />
      )}
      
      {/* CCD Performance Profiler */}
      <CCDPerformanceOverlay ... />
    </>
  );
};
```

---

## Changes to Game.tsx

### 1. Update Imports
**Remove:**
```typescript
import { GameLoopDebugOverlay } from "./GameLoopDebugOverlay";
import { SubstepDebugOverlay } from "./SubstepDebugOverlay";
import { PowerUpWeightsOverlay } from "./PowerUpWeightsOverlay";
import { CollisionHistoryViewer } from "./CollisionHistoryViewer";
import { CCDPerformanceOverlay, CCDPerformanceData } from "./CCDPerformanceOverlay";
import { collisionHistory } from "@/utils/collisionHistory";
import { DebugDashboard } from "./DebugDashboard";
import { DebugModeIndicator } from "./DebugModeIndicator";
import { useDebugSettings } from "@/hooks/useDebugSettings";
import { FrameProfilerOverlay } from "./FrameProfilerOverlay";
import { CCDPerformanceTracker } from "@/utils/rollingStats";
import { debugLogger } from "@/utils/debugLogger";
```

**Add:**
```typescript
import { useGameDebug } from "@/hooks/useGameDebug";
import { GameDebugOverlays } from "./GameDebugOverlays";
import type { CCDPerformanceData } from "./CCDPerformanceOverlay";
import { CCDPerformanceTracker } from "@/utils/rollingStats";
```

### 2. Replace Debug State Block (lines 507-534)
**Remove:** ~30 lines of debug state
**Add:**
```typescript
const ccdPerformanceRef = useRef<CCDPerformanceData | null>(null);
const ccdPerformanceTrackerRef = useRef<CCDPerformanceTracker>(new CCDPerformanceTracker());

const {
  debugSettings,
  toggleDebugSetting,
  resetDebugSettings,
  showDebugDashboard,
  setShowDebugDashboard,
  debugDashboardPausedGame,
  getSubstepDebugInfo,
  getCCDPerformanceData,
  activeDebugFeatureCount,
  currentFps,
} = useGameDebug({
  gameState,
  setGameState,
  gameLoopRef,
  balls,
  speedMultiplier,
  scaledBrickWidth: SCALED_BRICK_WIDTH,
  scaledBrickHeight: SCALED_BRICK_HEIGHT,
  paddle,
  setPowerUps,
  setBonusLetters,
  setLevelSkipped,
  quality,
  setQuality,
  toggleAutoAdjust,
  nextLevel,
  setSpeedMultiplier,
  ccdPerformanceRef,
  ccdPerformanceTrackerRef,
});
```

### 3. Remove Debug Effects (lines 538-565, 811-819)
These will be handled inside `useGameDebug`.

### 4. Remove Debug Keyboard Block (lines 2541-2712)
Move to `useGameDebug` hook. Keep only non-debug keyboard handlers.

### 5. Remove getSubstepDebugInfo (lines 2767-2793)
This callback will be provided by `useGameDebug`.

### 6. Replace Debug JSX Blocks
**Remove:** Lines 8970-8998 and 9371-9454 (~100 lines)
**Add:**
```tsx
{/* Debug Overlays - All debug UI in one component */}
<GameDebugOverlays
  debugSettings={debugSettings}
  toggleDebugSetting={toggleDebugSetting}
  resetDebugSettings={resetDebugSettings}
  showDebugDashboard={showDebugDashboard}
  setShowDebugDashboard={setShowDebugDashboard}
  activeDebugFeatureCount={activeDebugFeatureCount}
  getSubstepDebugInfo={getSubstepDebugInfo}
  getCCDPerformanceData={getCCDPerformanceData}
  gameLoopRef={gameLoopRef}
  powerUpDropCounts={powerUpDropCounts}
  difficulty={settings.difficulty}
  currentLevel={level}
  extraLifeUsedLevels={extraLifeUsedLevels}
  quality={quality}
  autoAdjustEnabled={autoAdjustEnabled}
  currentFps={currentFps}
  isMobileDevice={isMobileDevice}
/>
```

---

## Estimated Line Reduction

| Section | Lines Removed |
|---------|---------------|
| Debug imports | ~15 |
| Debug state | ~30 |
| Debug effects | ~30 |
| Debug keyboard block | ~170 |
| getSubstepDebugInfo | ~30 |
| Debug overlay JSX (inline) | ~30 |
| Debug UI JSX (end) | ~85 |
| **Total** | **~390 lines** |

---

## Implementation Order

1. Create `src/hooks/useGameDebug.ts` with all debug state and keyboard handling
2. Create `src/components/GameDebugOverlays.tsx` with all overlay rendering
3. Update `Game.tsx` imports
4. Replace debug state with `useGameDebug()` hook call
5. Remove migrated effects and keyboard handlers
6. Replace JSX debug blocks with `<GameDebugOverlays />`
7. Test all debug features work correctly

---

## Testing Checklist

- [ ] § key opens/closes debug dashboard
- [ ] Dashboard auto-pauses game when opened
- [ ] Tab toggles substep debug overlay
- [ ] L toggles game loop debug overlay
- [ ] W toggles power-up weights overlay
- [ ] H toggles collision history viewer
- [ ] V toggles CCD performance profiler
- [ ] C toggles collision logging
- [ ] X exports collision history to JSON
- [ ] Z downloads debug logs
- [ ] [ and ] adjust time scale
- [ ] Q cycles quality levels, Shift+Q toggles auto-adjust
- [ ] 0 skips level (disqualifies from high scores)
- [ ] 1-9, R, E, U drop test power-ups
- [ ] Debug mode indicator shows/hides correctly
- [ ] Mobile debug button works on touch devices
- [ ] All overlays render with correct data
