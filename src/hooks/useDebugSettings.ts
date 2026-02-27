import { useState, useCallback } from "react";

export interface DebugSettings {
  showDebugModeIndicator: boolean;
  showGameLoopDebug: boolean;
  showSubstepDebug: boolean;
  showCCDPerformance: boolean;
  showCollisionHistory: boolean;
  showFrameProfiler: boolean;
  showPowerUpWeights: boolean;
  showPoolStats: boolean;
  enableCollisionLogging: boolean;
  enablePowerUpLogging: boolean;
  enablePerformanceLogging: boolean;
  enableFPSLogging: boolean;
  enableDetailedFrameLogging: boolean;
  enablePaddleLogging: boolean;
  enableBossLogging: boolean;
  enableFrameProfilerLogging: boolean;
  enableScreenShakeLogging: boolean;
  enablePointerLockLogging: boolean;
  enableGCLogging: boolean;
  enableLagLogging: boolean;
  enableScreenShake: boolean;
  enableParticles: boolean;
  enableExplosions: boolean;
  enableCRTEffects: boolean;
}

const DEFAULT_SETTINGS: DebugSettings = {
  showDebugModeIndicator: true,
  showGameLoopDebug: false,
  showSubstepDebug: false,
  showCCDPerformance: false,
  showCollisionHistory: false,
  showFrameProfiler: false,
  showPowerUpWeights: false,
  showPoolStats: false,
  enableCollisionLogging: false,
  enablePowerUpLogging: false,
  enablePerformanceLogging: false, // Off by default to reduce frame overhead
  enableFPSLogging: false, // Off by default to reduce frame overhead
  enableDetailedFrameLogging: false, // Off by default (verbose)
  enablePaddleLogging: false,
  enableBossLogging: false,
  enableFrameProfilerLogging: false,
  enableScreenShakeLogging: false,
  enablePointerLockLogging: false,
  enableGCLogging: false, // Off by default to reduce frame overhead
  enableLagLogging: false, // Off by default to reduce frame overhead
  enableScreenShake: true, // Screen shake enabled by default
  enableParticles: true, // Particles enabled by default
  enableExplosions: true, // Explosions enabled by default
  enableCRTEffects: true, // CRT effects enabled by default
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
