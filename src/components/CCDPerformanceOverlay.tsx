import { useState, useEffect } from "react";

export interface CCDPerformanceData {
  bossFirstSweepMs: number;
  ccdCoreMs: number;
  postProcessingMs: number;
  totalMs: number;
  substepsUsed: number;
  collisionCount: number;
  toiIterationsUsed: number;
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

  const getColorClass = (value: number, lowThreshold: number, highThreshold: number) => {
    if (value >= highThreshold) return "text-red-400";
    if (value >= lowThreshold) return "text-yellow-400";
    return "text-green-400";
  };

  const totalColorClass = getColorClass(perfData.totalMs, 3, 5);
  const bossColorClass = getColorClass(perfData.bossFirstSweepMs, 1, 2);
  const ccdColorClass = getColorClass(perfData.ccdCoreMs, 2, 4);
  const postColorClass = getColorClass(perfData.postProcessingMs, 0.5, 1);

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg font-mono text-xs z-50 border border-cyan-500/50 shadow-lg">
      <div className="font-bold text-cyan-400 mb-3 text-sm border-b border-cyan-500/30 pb-2">
        ⚡ CCD PERFORMANCE PROFILER
      </div>

      <div className="space-y-2">
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Boss-First Sweep:</span>
          <span className={`font-bold ${bossColorClass}`}>
            {perfData.bossFirstSweepMs.toFixed(3)}ms
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-gray-400">CCD Core:</span>
          <span className={`font-bold ${ccdColorClass}`}>
            {perfData.ccdCoreMs.toFixed(3)}ms
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Post-Processing:</span>
          <span className={`font-bold ${postColorClass}`}>
            {perfData.postProcessingMs.toFixed(3)}ms
          </span>
        </div>

        <div className="border-t border-cyan-500/30 pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-gray-400 font-bold">Total CCD Time:</span>
            <span className={`font-bold ${totalColorClass}`}>
              {perfData.totalMs.toFixed(3)}ms
            </span>
          </div>
        </div>

        <div className="border-t border-gray-500/30 pt-2 mt-2 space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Substeps:</span>
            <span className={`${perfData.substepsUsed > 15 ? "text-yellow-400" : "text-gray-300"}`}>
              {perfData.substepsUsed}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">Collisions:</span>
            <span className={`${perfData.collisionCount > 10 ? "text-yellow-400" : "text-gray-300"}`}>
              {perfData.collisionCount}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">TOI Iterations:</span>
            <span className={`${perfData.toiIterationsUsed > 5 ? "text-yellow-400" : "text-gray-300"}`}>
              {perfData.toiIterationsUsed}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-cyan-500/30 text-gray-500 text-[10px]">
        {perfData.totalMs >= 5 && "⚠️ HIGH CCD LOAD"}
        {perfData.totalMs < 5 && perfData.totalMs >= 3 && "⚡ MODERATE LOAD"}
        {perfData.totalMs < 3 && "✓ OPTIMAL"}
        <div className="mt-1">Press 'V' to toggle this overlay</div>
      </div>
    </div>
  );
};
