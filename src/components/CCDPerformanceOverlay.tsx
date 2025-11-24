import { useState, useEffect } from "react";

export interface CCDPerformanceData {
  bossFirstSweepUs: number;
  ccdCoreUs: number;
  postProcessingUs: number;
  totalUs: number;
  substepsUsed: number;
  collisionCount: number;
  toiIterationsUsed: number;
  // Rolling averages (over last 60 frames)
  rollingAvg?: {
    bossFirstUs: number;
    ccdCoreUs: number;
    postProcessingUs: number;
    totalUs: number;
    substeps: number;
    collisions: number;
    toiIterations: number;
  };
  // Peak values
  peaks?: {
    bossFirstUs: number;
    ccdCoreUs: number;
    postProcessingUs: number;
    totalUs: number;
  };
}

interface CCDPerformanceOverlayProps {
  getPerformanceData: () => CCDPerformanceData | null;
  visible?: boolean;
}

export const CCDPerformanceOverlay = ({
  getPerformanceData,
  visible = true,
}: CCDPerformanceOverlayProps) => {
  const [perfData, setPerfData] = useState<CCDPerformanceData | null>(null);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const data = getPerformanceData();
      if (data) {
        setPerfData(data);
      }
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [getPerformanceData, visible]);

  if (!visible || !perfData) return null;

  // Format microseconds with appropriate unit
  const formatTime = (us: number): string => {
    if (us < 100) {
      return `${us.toFixed(1)}μs`;
    } else if (us < 1000) {
      return `${us.toFixed(0)}μs`;
    } else {
      return `${(us / 1000).toFixed(2)}ms`;
    }
  };

  const getColorClass = (us: number, lowThreshold: number, highThreshold: number) => {
    if (us >= highThreshold) return "text-red-400";
    if (us >= lowThreshold) return "text-yellow-400";
    return "text-green-400";
  };

  // Thresholds in microseconds
  const totalColorClass = getColorClass(perfData.totalUs, 3000, 5000);
  const bossColorClass = getColorClass(perfData.bossFirstSweepUs, 1000, 2000);
  const ccdColorClass = getColorClass(perfData.ccdCoreUs, 2000, 4000);
  const postColorClass = getColorClass(perfData.postProcessingUs, 500, 1000);

  // Frame budget (16.6ms = 16600μs for 60 FPS)
  const frameBudget = 16600; // microseconds
  const budgetUsage = (perfData.totalUs / frameBudget) * 100;

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg font-mono text-xs z-50 border border-cyan-500/50 shadow-lg max-w-md">
      <div className="font-bold text-cyan-400 mb-3 text-sm border-b border-cyan-500/30 pb-2">
        ⚡ CCD PERFORMANCE PROFILER
      </div>

      {/* Current Frame Timings */}
      <div className="space-y-2 mb-3">
        <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Current Frame</div>
        
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Boss-First Sweep:</span>
          <span className={`font-bold ${bossColorClass}`}>
            {formatTime(perfData.bossFirstSweepUs)}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-gray-400">CCD Core:</span>
          <span className={`font-bold ${ccdColorClass}`}>
            {formatTime(perfData.ccdCoreUs)}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Post-Processing:</span>
          <span className={`font-bold ${postColorClass}`}>
            {formatTime(perfData.postProcessingUs)}
          </span>
        </div>

        <div className="border-t border-cyan-500/30 pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-gray-400 font-bold">Total CCD Time:</span>
            <span className={`font-bold ${totalColorClass}`}>
              {formatTime(perfData.totalUs)}
            </span>
          </div>
        </div>
      </div>

      {/* Rolling Averages (60 frames) */}
      {perfData.rollingAvg && (
        <div className="border-t border-gray-500/30 pt-2 mt-2 space-y-1">
          <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">
            60-Frame Averages
          </div>
          
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Boss-First:</span>
            <span className="text-gray-300">{formatTime(perfData.rollingAvg.bossFirstUs)}</span>
          </div>
          
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">CCD Core:</span>
            <span className="text-gray-300">{formatTime(perfData.rollingAvg.ccdCoreUs)}</span>
          </div>
          
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Post-Proc:</span>
            <span className="text-gray-300">{formatTime(perfData.rollingAvg.postProcessingUs)}</span>
          </div>
          
          <div className="flex justify-between gap-6">
            <span className="text-gray-500 font-bold">Total Avg:</span>
            <span className="text-gray-300 font-bold">{formatTime(perfData.rollingAvg.totalUs)}</span>
          </div>
        </div>
      )}

      {/* Peak Values */}
      {perfData.peaks && (
        <div className="border-t border-gray-500/30 pt-2 mt-2 space-y-1">
          <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">
            Peak (Last 60 Frames)
          </div>
          
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Max Total:</span>
            <span className="text-orange-400 font-bold">{formatTime(perfData.peaks.totalUs)}</span>
          </div>
        </div>
      )}

      {/* Counters */}
      <div className="border-t border-gray-500/30 pt-2 mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Substeps:</span>
          <span className={`${perfData.substepsUsed > 15 ? "text-yellow-400" : "text-gray-300"}`}>
            {perfData.substepsUsed}
            {perfData.rollingAvg && (
              <span className="text-gray-500 ml-1">
                (avg: {perfData.rollingAvg.substeps.toFixed(1)})
              </span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Collisions:</span>
          <span className={`${perfData.collisionCount > 10 ? "text-yellow-400" : "text-gray-300"}`}>
            {perfData.collisionCount}
            {perfData.rollingAvg && (
              <span className="text-gray-500 ml-1">
                (avg: {perfData.rollingAvg.collisions.toFixed(1)})
              </span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">TOI Iterations:</span>
          <span className={`${perfData.toiIterationsUsed > 5 ? "text-yellow-400" : "text-gray-300"}`}>
            {perfData.toiIterationsUsed}
            {perfData.rollingAvg && (
              <span className="text-gray-500 ml-1">
                (avg: {perfData.rollingAvg.toiIterations.toFixed(1)})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Frame Budget */}
      <div className="border-t border-cyan-500/30 pt-2 mt-2">
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-gray-400 text-[10px] uppercase tracking-wide">Frame Budget (60 FPS)</span>
          <span className={`text-[10px] font-bold ${
            budgetUsage > 30 ? "text-red-400" : budgetUsage > 15 ? "text-yellow-400" : "text-green-400"
          }`}>
            {budgetUsage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              budgetUsage > 30 ? "bg-red-500" : budgetUsage > 15 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 pt-2 border-t border-cyan-500/30 text-gray-500 text-[10px]">
        {perfData.totalUs >= 5000 && "⚠️ HIGH CCD LOAD"}
        {perfData.totalUs < 5000 && perfData.totalUs >= 3000 && "⚡ MODERATE LOAD"}
        {perfData.totalUs < 3000 && "✓ OPTIMAL"}
        <div className="mt-1">Press 'V' to toggle this overlay</div>
      </div>
    </div>
  );
};
