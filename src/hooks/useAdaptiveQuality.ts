import { useState, useEffect, useRef, useCallback } from 'react';
import { debugToast as toast } from '@/utils/debugToast';

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
  enableLogging?: boolean; // Toggle for FPS performance logs
}

// Reduced particle counts for better mobile performance
const QUALITY_PRESETS: Record<QualityLevel, Omit<QualitySettings, 'level' | 'autoAdjust'>> = {
  low: {
    particleMultiplier: 0.25,
    shadowsEnabled: false,
    glowEnabled: false,
    screenShakeMultiplier: 0.5,
    explosionParticles: 5, // Reduced from 8
    backgroundEffects: false
  },
  medium: {
    particleMultiplier: 0.5,
    shadowsEnabled: true,
    glowEnabled: false,
    screenShakeMultiplier: 0.75,
    explosionParticles: 10, // Reduced from 15
    backgroundEffects: true
  },
  high: {
    particleMultiplier: 1.0,
    shadowsEnabled: true,
    glowEnabled: true,
    screenShakeMultiplier: 1.0,
    explosionParticles: 15, // Reduced from 20
    backgroundEffects: true
  }
};

export { QUALITY_PRESETS };

interface PerformanceLogEntry {
  timestamp: number;
  fps: number;
  quality: QualityLevel;
}

export const useAdaptiveQuality = (options: AdaptiveQualityOptions = {}) => {
  const {
    initialQuality = 'high',
    autoAdjust = true,
    lowFpsThreshold = 45,
    mediumFpsThreshold = 52,
    highFpsThreshold = 58,
    sampleWindow = 2,
    enableLogging = true
  } = options;

  const [quality, setQuality] = useState<QualityLevel>(initialQuality);
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(autoAdjust);
  const [lockedToLow, setLockedToLow] = useState(false);
  
  const fpsHistoryRef = useRef<number[]>([]);
  const lastAdjustmentTimeRef = useRef<number>(0);
  const adjustmentCooldownMs = 2000; // 2 seconds between adjustments
  const notificationCooldownRef = useRef<number>(0);
  const performanceLogRef = useRef<PerformanceLogEntry[]>([]);
  const lastPerformanceLogMs = useRef<number>(0);
  const lowQualityDropCountRef = useRef<number>(0); // Track how many times we dropped to low
  const qualityStartTimeRef = useRef<Record<QualityLevel, number>>({
    low: 0,
    medium: 0,
    high: 0
  });
  const qualityStatsRef = useRef<Record<QualityLevel, { min: number; max: number; samples: number; sum: number }>>({
    low: { min: Infinity, max: 0, samples: 0, sum: 0 },
    medium: { min: Infinity, max: 0, samples: 0, sum: 0 },
    high: { min: Infinity, max: 0, samples: 0, sum: 0 }
  });
  const warningThresholdRef = useRef<number>(0);

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
    const now = performance.now();
    
    // Update quality stats
    const stats = qualityStatsRef.current[quality];
    stats.min = Math.min(stats.min, fps);
    stats.max = Math.max(stats.max, fps);
    stats.samples++;
    stats.sum += fps;
    
    // Performance logging every 5 seconds (reduced for mobile performance)
    if (now - lastPerformanceLogMs.current >= 5000) {
      performanceLogRef.current.push({ timestamp: now, fps, quality });
      
      // Keep only last 60 seconds of logs
      if (performanceLogRef.current.length > 12) {
        performanceLogRef.current.shift();
      }
      
      
      lastPerformanceLogMs.current = now;
    }

    if (!autoAdjustEnabled) return;

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
      // If locked to low, don't upgrade to medium
      targetQuality = lockedToLow ? 'low' : 'medium';
    } else if (avgFps >= highFpsThreshold) {
      // If locked to low, don't upgrade to high
      targetQuality = lockedToLow ? 'low' : 'high';
    }

    // Only adjust if quality level changes
    if (targetQuality !== quality) {
      const isDowngrade = 
        (quality === 'high' && (targetQuality === 'medium' || targetQuality === 'low')) ||
        (quality === 'medium' && targetQuality === 'low');

      // Track drops to low quality
      if (targetQuality === 'low' && isDowngrade) {
        lowQualityDropCountRef.current++;
        
        // Lock to low if we've dropped twice
        if (lowQualityDropCountRef.current >= 2 && !lockedToLow) {
          setLockedToLow(true);
          toast.info('Quality locked to LOW for this game session', { duration: 4000 });
        }
      }

      setQuality(targetQuality);
      lastAdjustmentTimeRef.current = now;
      fpsHistoryRef.current = []; // Clear history after adjustment
      
      // Reset stats for new quality level
      qualityStatsRef.current[targetQuality] = { min: Infinity, max: 0, samples: 0, sum: 0 };

      // Show notification (with cooldown to avoid spam)
      if (now - notificationCooldownRef.current > 10000) {
        const message = isDowngrade
          ? `Quality adjusted to ${targetQuality} for better performance`
          : `Quality upgraded to ${targetQuality}`;
        toast.info(message, { duration: 3000 });
        notificationCooldownRef.current = now;
      }
    }
  }, [quality, autoAdjustEnabled, lowFpsThreshold, mediumFpsThreshold, highFpsThreshold, sampleWindow, lockedToLow]);

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

  // Reset quality lockout for new game session
  const resetQualityLockout = useCallback(() => {
    lowQualityDropCountRef.current = 0;
    setLockedToLow(false);
    setQuality(initialQuality);
    fpsHistoryRef.current = [];
  }, [initialQuality]);

  // Get performance log for analysis
  const getPerformanceLog = useCallback(() => {
    return {
      log: performanceLogRef.current,
      stats: qualityStatsRef.current,
      currentQuality: quality
    };
  }, [quality]);

  return {
    quality,
    qualitySettings: getQualitySettings(),
    updateFps,
    setQuality: setManualQuality,
    autoAdjustEnabled,
    toggleAutoAdjust,
    getPerformanceLog,
    resetQualityLockout,
    lockedToLow
  };
};
