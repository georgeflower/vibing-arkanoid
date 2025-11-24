import { useState, useEffect } from 'react';
import { frameProfiler, type FrameProfilerStats } from '@/utils/frameProfiler';

interface FrameProfilerOverlayProps {
  visible?: boolean;
}

export const FrameProfilerOverlay = ({ visible = true }: FrameProfilerOverlayProps) => {
  const [stats, setStats] = useState<FrameProfilerStats | null>(null);

  useEffect(() => {
    if (!visible || !frameProfiler.isEnabled()) return;

    const interval = setInterval(() => {
      setStats(frameProfiler.getStats());
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !stats) return null;

  const getTimingColor = (ms: number) => {
    if (ms > 5) return 'text-red-400';
    if (ms > 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getFpsColor = (fps: number) => {
    if (fps < 40) return 'text-red-400';
    if (fps < 55) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed top-20 left-4 z-[9999] font-mono text-xs bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded p-3 w-80">
      <div className="text-cyan-400 font-bold mb-2 border-b border-cyan-500/30 pb-1">
        ⚡ Frame Profiler
      </div>

      {/* FPS and Frame Time */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <span className="text-gray-400">FPS:</span>{' '}
          <span className={`font-bold ${getFpsColor(stats.fps)}`}>
            {stats.fps}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Frame:</span>{' '}
          <span className={`font-bold ${getTimingColor(stats.frameTime)}`}>
            {stats.frameTime.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* Subsystem Timings */}
      <div className="border-t border-cyan-500/30 pt-2 mb-2">
        <div className="text-gray-400 text-[10px] mb-1">SUBSYSTEM TIMINGS</div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(stats.timings)
            .filter(([key]) => key !== 'total')
            .map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400 capitalize">{key}:</span>
                <span className={getTimingColor(value)}>{value.toFixed(2)}ms</span>
              </div>
            ))}
        </div>
      </div>

      {/* Event Counters */}
      <div className="border-t border-cyan-500/30 pt-2">
        <div className="text-gray-400 text-[10px] mb-1">EVENT COUNTERS</div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(stats.counters).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400 capitalize">{key}:</span>
              <span className="text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[9px] text-gray-500 mt-2 pt-2 border-t border-cyan-500/30">
        § to toggle dashboard | Timings: &gt;5ms red, 2-5ms yellow, &lt;2ms green
      </div>
    </div>
  );
};
