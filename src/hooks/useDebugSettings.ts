import { useState, useCallback } from "react";

export interface DebugSettings {
  showDebugModeIndicator: boolean;
  showGameLoopDebug: boolean;
  showSubstepDebug: boolean;
  showCCDPerformance: boolean;
  showCollisionHistory: boolean;
  enableCollisionLogging: boolean;
  enablePowerUpLogging: boolean;
  enablePerformanceLogging: boolean;
  enableFPSLogging: boolean;
  enableDetailedFrameLogging: boolean;
  enablePaddleLogging: boolean;
  enableBossLogging: boolean;
}

const DEFAULT_SETTINGS: DebugSettings = {
  showDebugModeIndicator: true,
  showGameLoopDebug: false,
  showSubstepDebug: false,
  showCCDPerformance: false,
  showCollisionHistory: false,
  enableCollisionLogging: false,
  enablePowerUpLogging: false,
  enablePerformanceLogging: true,
  enableFPSLogging: true, // FPS logging enabled by default
  enableDetailedFrameLogging: false, // Off by default (verbose)
  enablePaddleLogging: false,
  enableBossLogging: false,
};

export const useDebugSettings = () => {
  const [settings, setSettings] = useState<DebugSettings>(DEFAULT_SETTINGS);

  const toggleSetting = useCallback((key: keyof DebugSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    toggleSetting,
    resetSettings,
  };
};
