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
  enableLogging?: boolean; // Toggle for FPS performance logs
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
    lowFpsThreshold = 50,
    mediumFpsThreshold = 55,
    highFpsThreshold = 55,
    sampleWindow = 3,
    enableLogging = true
  } = options;

  const [quality, setQuality] = useState<QualityLevel>(initialQuality);
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(autoAdjust);
  
  const fpsHistoryRef = useRef<number[]>([]);
  const lastAdjustmentTimeRef = useRef<number>(0);
  const adjustmentCooldownMs = 3000; // 3 seconds between adjustments
  const notificationCooldownRef = useRef<number>(0);
  const performanceLogRef = useRef<PerformanceLogEntry[]>([]);
  const lastPerformanceLogMs = useRef<number>(0);
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
    
    // Performance logging every second
    if (now - lastPerformanceLogMs.current >= 1000) {
      performanceLogRef.current.push({ timestamp: now, fps, quality });
      
      // Keep only last 60 seconds of logs
      if (performanceLogRef.current.length > 60) {
        performanceLogRef.current.shift();
      }
      
      // Console log current performance
      if (enableLogging) {
        const avgFps = stats.samples > 0 ? (stats.sum / stats.samples).toFixed(1) : '0.0';
        console.log(
          `[Performance Monitor] FPS: ${fps.toFixed(1)} | Quality: ${quality.toUpperCase()} | ` +
          `Avg: ${avgFps} | Min: ${stats.min.toFixed(0)} | Max: ${stats.max.toFixed(0)}`
        );
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
      // Early warning system
      if (fpsHistoryRef.current.length >= 10) {
        const recentAvg = fpsHistoryRef.current.slice(-10).reduce((sum, f) => sum + f, 0) / 10;
        const threshold = quality === 'high' ? mediumFpsThreshold : lowFpsThreshold;
        
        if (recentAvg < threshold && now - warningThresholdRef.current > 5000) {
          const timeToDowngrade = ((adjustmentCooldownMs - (now - lastAdjustmentTimeRef.current)) / 1000).toFixed(1);
          console.warn(
            `[Performance Warning] FPS dropped to ${recentAvg.toFixed(1)} (threshold: ${threshold}) - ` +
            `will downgrade in ${timeToDowngrade}s if sustained`
          );
          warningThresholdRef.current = now;
        }
      }
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

      // Log quality change
      const timeSinceStart = (now / 1000).toFixed(1);
      console.log(
        `[Performance] Quality: ${quality.toUpperCase()} → ${targetQuality.toUpperCase()} | ` +
        `Avg FPS: ${avgFps.toFixed(1)} | Time: ${timeSinceStart}s`
      );

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
    getPerformanceLog
  };
};
