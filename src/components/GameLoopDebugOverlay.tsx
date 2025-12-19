import { useState, useEffect } from "react";
import type { GameLoopDebug } from "@/utils/gameLoop";

interface GameLoopDebugOverlayProps {
  getDebugInfo: () => GameLoopDebug;
  visible?: boolean;
}

export const GameLoopDebugOverlay = ({ getDebugInfo, visible = true }: GameLoopDebugOverlayProps) => {
  const [debugInfo, setDebugInfo] = useState<GameLoopDebug>(getDebugInfo());

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDebugInfo(getDebugInfo());
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [getDebugInfo, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-2 left-2 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50 pointer-events-none select-none">
      <div className="space-y-1">
        <div className="font-bold text-primary mb-2">Game Loop Debug</div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">FPS:</span>
          <span className={debugInfo.fps >= 55 ? "text-green-400" : debugInfo.fps >= 30 ? "text-yellow-400" : "text-red-400"}>
            {debugInfo.fps}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Frame Tick:</span>
          <span>{debugInfo.frameTick}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Time Scale:</span>
          <span>{debugInfo.timeScale}x</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Max Delta:</span>
          <span>{debugInfo.maxDeltaMs}ms</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
        Press 'L' to toggle this overlay
      </div>
    </div>
  );
};
