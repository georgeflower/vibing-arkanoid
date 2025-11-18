import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualitySettings {
  level: QualityLevel;
  particleMultiplier: number;
  shadowsEnabled: boolean;
  glowEnabled: boolean;
  screenShakeMultiplier: number;
  explosionParticles: number;
  backgroundEffects: boolean;
  autoAdjust: boolean;
}

interface AdaptiveQualityOptions {
  initialQuality?: QualityLevel;
  autoAdjust?: boolean;
  lowFpsThreshold?: number;
  mediumFpsThreshold?: number;
  highFpsThreshold?: number;
  sampleWindow?: number; // seconds to average FPS
}

const QUALITY_PRESETS: Record<QualityLevel, Omit<QualitySettings, 'level' | 'autoAdjust'>> = {
  low: {
    particleMultiplier: 0.3,
    shadowsEnabled: false,
    glowEnabled: false,
    screenShakeMultiplier: 0.5,
    explosionParticles: 8,
    backgroundEffects: false
  },
  medium: {
    particleMultiplier: 0.6,
    shadowsEnabled: true,
    glowEnabled: false,
    screenShakeMultiplier: 0.75,
    explosionParticles: 15,
    backgroundEffects: true
  },
  high: {
    particleMultiplier: 1.0,
    shadowsEnabled: true,
    glowEnabled: true,
    screenShakeMultiplier: 1.0,
    explosionParticles: 20,
    backgroundEffects: true
  }
};

export const useAdaptiveQuality = (options: AdaptiveQualityOptions = {}) => {
  const {
    initialQuality = 'high',
    autoAdjust = true,
    lowFpsThreshold = 30,
    mediumFpsThreshold = 45,
    highFpsThreshold = 55,
    sampleWindow = 3
  } = options;

  const [quality, setQuality] = useState<QualityLevel>(initialQuality);
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(autoAdjust);
  
  const fpsHistoryRef = useRef<number[]>([]);
  const lastAdjustmentTimeRef = useRef<number>(0);
  const adjustmentCooldownMs = 5000; // 5 seconds between adjustments
  const notificationCooldownRef = useRef<number>(0);

  // Get current quality settings
  const getQualitySettings = useCallback((): QualitySettings => {
    return {
      level: quality,
      autoAdjust: autoAdjustEnabled,
      ...QUALITY_PRESETS[quality]
    };
  }, [quality, autoAdjustEnabled]);

  // Update FPS sample
  const updateFps = useCallback((fps: number) => {
    if (!autoAdjustEnabled) return;

    const now = performance.now();
    fpsHistoryRef.current.push(fps);

    // Keep only recent samples (based on sample window)
    const maxSamples = sampleWindow * 10; // Assuming 10 samples per second
    if (fpsHistoryRef.current.length > maxSamples) {
      fpsHistoryRef.current.shift();
    }

    // Only adjust if enough samples and cooldown has passed
    if (fpsHistoryRef.current.length < 30 || now - lastAdjustmentTimeRef.current < adjustmentCooldownMs) {
      return;
    }

    // Calculate average FPS
    const avgFps = fpsHistoryRef.current.reduce((sum, f) => sum + f, 0) / fpsHistoryRef.current.length;

    // Determine appropriate quality level
    let targetQuality: QualityLevel = quality;

    if (avgFps < lowFpsThreshold) {
      targetQuality = 'low';
    } else if (avgFps < mediumFpsThreshold) {
      targetQuality = 'medium';
    } else if (avgFps >= highFpsThreshold) {
      targetQuality = 'high';
    }

    // Only adjust if quality level changes
    if (targetQuality !== quality) {
      const isDowngrade = 
        (quality === 'high' && (targetQuality === 'medium' || targetQuality === 'low')) ||
        (quality === 'medium' && targetQuality === 'low');

      setQuality(targetQuality);
      lastAdjustmentTimeRef.current = now;
      fpsHistoryRef.current = []; // Clear history after adjustment

      // Show notification (with cooldown to avoid spam)
      if (now - notificationCooldownRef.current > 10000) {
        const message = isDowngrade
          ? `Quality adjusted to ${targetQuality} for better performance`
          : `Quality upgraded to ${targetQuality}`;
        toast.info(message, { duration: 3000 });
        notificationCooldownRef.current = now;
      }
    }
  }, [quality, autoAdjustEnabled, lowFpsThreshold, mediumFpsThreshold, highFpsThreshold, sampleWindow]);

  // Manual quality change
  const setManualQuality = useCallback((newQuality: QualityLevel) => {
    setQuality(newQuality);
    fpsHistoryRef.current = [];
    lastAdjustmentTimeRef.current = performance.now();
    toast.success(`Quality set to ${newQuality}`);
  }, []);

  // Toggle auto-adjust
  const toggleAutoAdjust = useCallback(() => {
    setAutoAdjustEnabled(prev => {
      const newValue = !prev;
      toast.success(newValue ? 'Auto quality adjustment enabled' : 'Auto quality adjustment disabled');
      return newValue;
    });
  }, []);

  return {
    quality,
    qualitySettings: getQualitySettings(),
    updateFps,
    setQuality: setManualQuality,
    autoAdjustEnabled,
    toggleAutoAdjust
  };
};
