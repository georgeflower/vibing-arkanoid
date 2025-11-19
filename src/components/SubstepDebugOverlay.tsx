import { useState, useEffect } from "react";

interface SubstepDebugInfo {
  substeps: number;
  ballSpeed: number;
  ballCount: number;
  maxSpeed: number;
}

interface SubstepDebugOverlayProps {
  getDebugInfo: () => SubstepDebugInfo;
  visible?: boolean;
}

export const SubstepDebugOverlay = ({ getDebugInfo, visible = true }: SubstepDebugOverlayProps) => {
  const [debugInfo, setDebugInfo] = useState<SubstepDebugInfo>(getDebugInfo());

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDebugInfo(getDebugInfo());
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [getDebugInfo, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-2 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50 pointer-events-none select-none">
      <div className="space-y-1">
        <div className="font-bold text-primary mb-2">Substep Debug</div>
        
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
      </div>
      
      <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
        {debugInfo.substeps > 1 && (
          <div className="text-yellow-400">⚡ Multi-substep active</div>
        )}
        Press 'M' to toggle this overlay
      </div>
    </div>
  );
};
