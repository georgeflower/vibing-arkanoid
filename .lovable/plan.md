

# Debug System Extraction Plan

## Overview
Extract the debug system from `Game.tsx` (~400+ lines of debug-related code) into a dedicated hook (`useGameDebug`) and component (`GameDebugOverlays`), reducing Game.tsx complexity while maintaining all debug functionality.

## Current State Analysis

### Debug-Related Code in Game.tsx

| Location | Lines | Description |
|----------|-------|-------------|
| Imports | 28-45 | 14 debug-related imports |
| State | 512-540 | `ccdPerformanceRef`, `frameCountRef`, `currentFps`, `showDebugDashboard`, `debugDashboardPausedGame`, `useDebugSettings()`, `calculateActiveDebugFeatures()` |
| Effects | 544-571 | Frame profiler toggle effect, dashboard pause/resume effect |
| Logger Init | 816-825 | `debugLogger.intercept()` initialization |
| Keyboard | 2547-2718 | ~170 lines of debug keyboard shortcuts (Tab, L, W, C, H, X, Z, §, V, Q, 0, +, 1-9, R, E, U, [, ]) |
| Callback | 2773-2799 | `getSubstepDebugInfo()` function (~25 lines) |
| JSX Inline | 8976-9005 | `GameLoopDebugOverlay`, `PowerUpWeightsOverlay` inside scaled container |
| JSX Block | 9325-9391 | `DebugModeIndicator`, `DebugDashboard`, `QualityIndicator`, `SubstepDebugOverlay`, `FrameProfilerOverlay`, `CollisionHistoryViewer`, `CCDPerformanceOverlay` |

### Dependencies Required by Debug System
- `gameLoopRef` - for debug info and time scale
- `gameState` / `setGameState` - for pause/resume
- `balls`, `speedMultiplier` - for substep debug info
- `paddle`, `setPowerUps`, `setBonusLetters` - for test power-up drops
- `setLevelSkipped`, `nextLevel` - for level skip
- `quality`, `setQuality`, `toggleAutoAdjust` - for quality controls
- `ccdPerformanceRef`, `ccdPerformanceTrackerRef` - for CCD overlay
- `SCALED_BRICK_WIDTH`, `SCALED_BRICK_HEIGHT` - for substep calculations
- `powerUpDropCounts`, `extraLifeUsedLevels`, `settings.difficulty`, `level` - for power-up weights overlay

---

## Architecture

### New Files

```text
src/hooks/useGameDebug.ts           (~220 lines) - Debug state, keyboard handling, callbacks
src/components/GameDebugOverlays.tsx (~180 lines) - All debug overlay rendering
```

---

## File 1: `src/hooks/useGameDebug.ts`

### Purpose
Centralize debug state management, keyboard shortcuts, and debug info callbacks.

### Interface

```typescript
interface UseGameDebugProps {
  // Refs
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  ccdPerformanceRef: React.MutableRefObject<CCDPerformanceData | null>;
  ccdPerformanceTrackerRef: React.MutableRefObject<CCDPerformanceTracker>;
  
  // Game state
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // Ball/physics data for debug overlays
  balls: Ball[];
  speedMultiplier: number;
  setSpeedMultiplier: React.Dispatch<React.SetStateAction<number>>;
  scaledBrickWidth: number;
  scaledBrickHeight: number;
  
  // Paddle for debug power-up drops
  paddle: Paddle | null;
  setPowerUps: React.Dispatch<React.SetStateAction<PowerUp[]>>;
  setBonusLetters: React.Dispatch<React.SetStateAction<BonusLetter[]>>;
  
  // Level controls
  setLevelSkipped: (skipped: boolean) => void;
  nextLevel: () => void;
  
  // Quality controls
  quality: QualityLevel;
  setQuality: (quality: QualityLevel) => void;
  toggleAutoAdjust: () => void;
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
  
  // Keyboard handler (to be registered externally)
  handleDebugKeyPress: (e: KeyboardEvent) => boolean; // returns true if handled
}
```

### Implementation Sections

1. **State Management** (~20 lines)
   - Wrap `useDebugSettings()` hook
   - `showDebugDashboard`, `debugDashboardPausedGame` state
   - `currentFps` state

2. **Active Feature Counter** (~15 lines)
   - `calculateActiveDebugFeatures()` helper function

3. **Dashboard Pause/Resume Effect** (~20 lines)
   - Auto-pause when dashboard opens
   - Auto-resume when dashboard closes

4. **Frame Profiler Toggle Effect** (~10 lines)
   - Enable/disable `frameProfiler` based on settings

5. **Debug Logger Initialization Effect** (~15 lines)
   - `debugLogger.intercept()` on mount

6. **getSubstepDebugInfo Callback** (~25 lines)
   - Calculate substeps, ball speed, collision info

7. **getCCDPerformanceData Callback** (~30 lines)
   - Build extended performance data with rolling averages and peaks

8. **handleDebugKeyPress Handler** (~80 lines)
   - All debug keyboard shortcuts (Tab, L, W, C, H, X, Z, §, V, Q, [, ], 0, +, 1-9, R, E, U)
   - Returns `true` if key was handled (to prevent event bubbling in Game.tsx)

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
  
  // Game loop ref for GameLoopDebugOverlay
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  
  // Power-up weights overlay data
  powerUpDropCounts: Partial<Record<PowerUpType, number>>;
  difficulty: string;
  currentLevel: number;
  extraLifeUsedLevels: Set<number>;
  
  // Quality indicator
  quality: QualityLevel;
  autoAdjustEnabled: boolean;
  currentFps: number;
  
  // Device type (for mobile debug button position)
  isMobileDevice: boolean;
}
```

### Structure

```tsx
export const GameDebugOverlays = (props: GameDebugOverlaysProps) => {
  if (!ENABLE_DEBUG_FEATURES) return null;
  
  return (
    <>
      {/* Debug Mode Indicator - top right */}
      {props.debugSettings.showDebugModeIndicator && (
        <DebugModeIndicator
          activeFeatureCount={props.activeDebugFeatureCount}
          onToggle={() => props.toggleDebugSetting("showDebugModeIndicator")}
        />
      )}
      
      {/* Debug Dashboard Modal */}
      <DebugDashboard
        isOpen={props.showDebugDashboard}
        onClose={() => props.setShowDebugDashboard(false)}
        settings={props.debugSettings}
        onToggle={props.toggleDebugSetting}
        onReset={props.resetDebugSettings}
      />
      
      {/* Quality Indicator - always visible in debug mode */}
      <QualityIndicator
        quality={props.quality}
        autoAdjustEnabled={props.autoAdjustEnabled}
        fps={props.currentFps}
      />
      
      {/* Substep Debug Overlay */}
      <SubstepDebugOverlay
        getDebugInfo={props.getSubstepDebugInfo}
        visible={props.debugSettings.showSubstepDebug}
      />
      
      {/* Frame Profiler Overlay */}
      <FrameProfilerOverlay visible={props.debugSettings.showFrameProfiler} />
      
      {/* Collision History Viewer */}
      {props.debugSettings.showCollisionHistory && (
        <CollisionHistoryViewer onClose={() => props.toggleDebugSetting("showCollisionHistory")} />
      )}
      
      {/* CCD Performance Profiler */}
      <CCDPerformanceOverlay
        getPerformanceData={props.getCCDPerformanceData}
        visible={props.debugSettings.showCCDPerformance}
      />
    </>
  );
};
```

### Additional Inline Overlays Component

A separate component for overlays that must render **inside** the scaled game container:

```typescript
interface GameDebugInlineOverlaysProps {
  debugSettings: DebugSettings;
  gameLoopRef: React.RefObject<FixedStepGameLoop | null>;
  powerUpDropCounts: Partial<Record<PowerUpType, number>>;
  difficulty: string;
  currentLevel: number;
  extraLifeUsedLevels: Set<number>;
}

export const GameDebugInlineOverlays = (props: GameDebugInlineOverlaysProps) => {
  if (!ENABLE_DEBUG_FEATURES) return null;
  
  return (
    <>
      {/* Game Loop Debug - inside scaled container */}
      {props.debugSettings.showGameLoopDebug && props.gameLoopRef.current && (
        <GameLoopDebugOverlay
          getDebugInfo={() => props.gameLoopRef.current?.getDebugInfo() ?? {...}}
          visible={props.debugSettings.showGameLoopDebug}
        />
      )}
      
      {/* Power-Up Weights - inside scaled container */}
      {props.debugSettings.showPowerUpWeights && (
        <PowerUpWeightsOverlay
          dropCounts={props.powerUpDropCounts}
          difficulty={props.difficulty}
          currentLevel={props.currentLevel}
          extraLifeUsedLevels={props.extraLifeUsedLevels}
          visible={props.debugSettings.showPowerUpWeights}
        />
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
import { debugLogger } from "@/utils/debugLogger";
```

**Add:**
```typescript
import { useGameDebug } from "@/hooks/useGameDebug";
import { GameDebugOverlays, GameDebugInlineOverlays } from "./GameDebugOverlays";
import type { CCDPerformanceData } from "./CCDPerformanceOverlay";
```

### 2. Replace Debug State Block (lines 510-541)

**Remove:** ~30 lines of debug state declarations

**Add:**
```typescript
// CCD performance tracking refs (needed by Game.tsx for physics)
const ccdPerformanceRef = useRef<CCDPerformanceData | null>(null);
const ccdPerformanceTrackerRef = useRef<CCDPerformanceTracker>(new CCDPerformanceTracker());

// Debug system hook
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
  handleDebugKeyPress,
} = useGameDebug({
  gameLoopRef,
  ccdPerformanceRef,
  ccdPerformanceTrackerRef,
  gameState,
  setGameState,
  balls,
  speedMultiplier,
  setSpeedMultiplier,
  scaledBrickWidth: SCALED_BRICK_WIDTH,
  scaledBrickHeight: SCALED_BRICK_HEIGHT,
  paddle,
  setPowerUps,
  setBonusLetters,
  setLevelSkipped,
  nextLevel,
  quality,
  setQuality,
  toggleAutoAdjust,
});
```

### 3. Remove Effects (lines 544-571, 816-825)

Move to `useGameDebug` hook:
- Frame profiler enable/disable effect
- Dashboard pause/resume effect
- Debug logger initialization effect

### 4. Simplify Keyboard Handler (lines 2547-2718)

**Replace** the debug keyboard block with:
```typescript
if (ENABLE_DEBUG_FEATURES) {
  // Delegate to debug hook - returns true if handled
  if (handleDebugKeyPress(e)) {
    return; // Don't process further if debug handled it
  }
}
```

### 5. Remove getSubstepDebugInfo (lines 2773-2799)

This callback is now provided by `useGameDebug`.

### 6. Replace Inline Debug JSX (lines 8976-9005)

**Replace with:**
```tsx
{/* Debug Inline Overlays - Inside scaled container */}
<GameDebugInlineOverlays
  debugSettings={debugSettings}
  gameLoopRef={gameLoopRef}
  powerUpDropCounts={powerUpDropCounts}
  difficulty={settings.difficulty}
  currentLevel={level}
  extraLifeUsedLevels={extraLifeUsedLevels}
/>
```

### 7. Replace Debug UI JSX Block (lines 9325-9391)

**Replace with:**
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

## Technical Details

### Keyboard Handler Architecture

The `handleDebugKeyPress` function returns a boolean:
- `true` = key was handled by debug system, stop propagation
- `false` = key not handled, let Game.tsx process it

This allows clean separation while maintaining existing behavior.

### Effect Dependencies

The hook internally manages its own effects:
- Dashboard pause/resume watches `showDebugDashboard`, `gameState`, `debugDashboardPausedGame`
- Frame profiler watches `debugSettings.showFrameProfiler`
- Debug logger runs once on mount

### Performance Considerations

- All debug code paths gated by `ENABLE_DEBUG_FEATURES`
- Callbacks wrapped in `useCallback` for stable references
- Effects properly cleaned up on unmount

---

## Estimated Line Reduction

| Section | Lines Removed |
|---------|---------------|
| Debug imports | ~12 |
| Debug state declarations | ~30 |
| Debug effects | ~35 |
| Debug keyboard block | ~170 |
| getSubstepDebugInfo | ~25 |
| Debug inline JSX | ~30 |
| Debug UI JSX block | ~65 |
| **Total** | **~367 lines** |

---

## Implementation Order

1. Create `src/hooks/useGameDebug.ts` with all debug state, effects, and keyboard handling
2. Create `src/components/GameDebugOverlays.tsx` with all overlay rendering
3. Update `Game.tsx` imports
4. Replace debug state with `useGameDebug()` hook call
5. Integrate `handleDebugKeyPress` into existing keyboard handler
6. Remove migrated effects and callbacks
7. Replace JSX debug blocks with new components
8. Test all debug features work correctly

---

## Testing Checklist

### Dashboard & Indicator
- [ ] § key opens/closes debug dashboard
- [ ] Dashboard auto-pauses game when opened
- [ ] Dashboard auto-resumes game when closed (if it paused it)
- [ ] Debug mode indicator shows with active feature count
- [ ] X button on indicator hides it

### Keyboard Shortcuts
- [ ] Tab toggles substep debug overlay
- [ ] L toggles game loop debug overlay
- [ ] W toggles power-up weights overlay
- [ ] H toggles collision history viewer
- [ ] V toggles CCD performance profiler
- [ ] C toggles collision logging
- [ ] X exports collision history to JSON
- [ ] Z downloads debug logs
- [ ] [ and ] adjust time scale
- [ ] Q cycles quality levels
- [ ] Shift+Q toggles auto-adjust
- [ ] 0 skips level (disqualifies from high scores)
- [ ] + increases ball speed
- [ ] 1-8 drop regular power-ups
- [ ] 9, R, E drop boss power-ups
- [ ] U drops random bonus letter

### Overlays
- [ ] All overlays render in correct positions
- [ ] Inline overlays (GameLoopDebug, PowerUpWeights) inside scaled container
- [ ] Fixed overlays (Dashboard, Indicator, etc.) positioned correctly

### Edge Cases
- [ ] Debug features fully disabled when `ENABLE_DEBUG_FEATURES = false`
- [ ] No console errors during gameplay
- [ ] Debug keyboard shortcuts don't interfere with game controls

