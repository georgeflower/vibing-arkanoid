import { useState, useEffect } from "react";

interface SubstepDebugInfo {
  substeps: number;
  ballSpeed: number;
  ballCount: number;
  maxSpeed: number;
  collisionsPerFrame: number;
  toiIterations: number;
  gravityActive?: boolean;
  gravityTimeLeft?: number;
  ballDy?: number;
  totalSpeed?: number;
}

interface SubstepDebugOverlayProps {
  getDebugInfo: () => SubstepDebugInfo;
  visible?: boolean;
}

export const SubstepDebugOverlay = ({ getDebugInfo, visible = true }: SubstepDebugOverlayProps) => {
  const [debugInfo, setDebugInfo] = useState<SubstepDebugInfo>({
    substeps: 0,
    ballSpeed: 0,
    ballCount: 0,
    maxSpeed: 0,
    collisionsPerFrame: 0,
    toiIterations: 0,
    gravityActive: false,
    gravityTimeLeft: 0,
    ballDy: 0,
    totalSpeed: 0,
  });

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDebugInfo(getDebugInfo());
    }, 200);

    return () => clearInterval(interval);
  }, [getDebugInfo, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-2 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50 pointer-events-none select-none">
      <div className="space-y-1">
        <div className="font-bold text-primary mb-2">CCD Physics Debug</div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Substeps:</span>
          <span className={debugInfo.substeps > 3 ? "text-yellow-400" : debugInfo.substeps > 1 ? "text-green-400" : "text-gray-400"}>
            {debugInfo.substeps}x
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Ball Speed:</span>
          <span className={debugInfo.ballSpeed > 7 ? "text-red-400" : debugInfo.ballSpeed > 5 ? "text-yellow-400" : "text-green-400"}>
            {debugInfo.ballSpeed.toFixed(2)} px/frame
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Max Speed:</span>
          <span>{debugInfo.maxSpeed.toFixed(2)} px/frame</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Ball Count:</span>
          <span>{debugInfo.ballCount}</span>
        </div>

        <div className="pt-1 mt-1 border-t border-border/20">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Collisions/Frame:</span>
            <span className={debugInfo.collisionsPerFrame > 2 ? "text-yellow-400" : "text-green-400"}>
              {debugInfo.collisionsPerFrame}
            </span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">TOI Iterations:</span>
            <span className={debugInfo.toiIterations > 2 ? "text-yellow-400" : "text-green-400"}>
              {debugInfo.toiIterations}
            </span>
          </div>
        </div>

        {/* Gravity section */}
        <div className="pt-1 mt-1 border-t border-border/20">
          <div className="font-bold text-cyan-400 mb-1">Gravity</div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status:</span>
            <span className={debugInfo.gravityActive ? "text-red-400" : "text-green-400"}>
              {debugInfo.gravityActive ? "ACTIVE" : "OFF"}
            </span>
          </div>
          {!debugInfo.gravityActive && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Activates in:</span>
              <span className="text-yellow-400">{(debugInfo.gravityTimeLeft ?? 0).toFixed(1)}s</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ball dy:</span>
            <span className={Math.abs(debugInfo.ballDy ?? 0) > 3 ? "text-red-400" : "text-green-400"}>
              {(debugInfo.ballDy ?? 0).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total Speed:</span>
            <span className={(debugInfo.totalSpeed ?? 0) > 8 ? "text-red-400" : (debugInfo.totalSpeed ?? 0) > 5 ? "text-yellow-400" : "text-green-400"}>
              {(debugInfo.totalSpeed ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
        {debugInfo.substeps > 1 && (
          <div className="text-yellow-400">⚡ Multi-substep CCD active</div>
        )}
        {debugInfo.gravityActive && (
          <div className="text-red-400">🌍 Gravity pulling ball down</div>
        )}
        Press 'TAB' to toggle this overlay
      </div>
    </div>
  );
};
