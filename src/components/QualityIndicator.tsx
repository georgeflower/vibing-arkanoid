import { Settings } from "lucide-react";
import type { QualityLevel } from "@/hooks/useAdaptiveQuality";

interface QualityIndicatorProps {
  quality: QualityLevel;
  autoAdjustEnabled: boolean;
  fps?: number;
}

export const QualityIndicator = ({ quality, autoAdjustEnabled, fps }: QualityIndicatorProps) => {
  const getQualityColor = (level: QualityLevel) => {
    switch (level) {
      case 'high':
        return 'hsl(120, 60%, 50%)';
      case 'medium':
        return 'hsl(50, 90%, 55%)';
      case 'low':
        return 'hsl(0, 70%, 55%)';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none select-none">
      <div className="flex flex-col gap-1 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/20">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Quality:</span>
            <span 
              className="text-xs font-bold uppercase font-mono"
              style={{ color: getQualityColor(quality) }}
            >
              {quality}
            </span>
            {autoAdjustEnabled && (
              <span className="text-[10px] text-muted-foreground/70 font-mono ml-1">
                (AUTO)
              </span>
            )}
          </div>
        </div>
        {fps !== undefined && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-muted-foreground">FPS:</span>
            <span 
              className="font-bold"
              style={{ color: fps >= 55 ? 'hsl(120, 60%, 50%)' : fps >= 35 ? 'hsl(50, 90%, 55%)' : 'hsl(0, 70%, 55%)' }}
            >
              {Math.round(fps)}
            </span>
          </div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground/50 mt-1 text-center font-mono">
        Press Q to cycle • Shift+Q to toggle auto
      </div>
    </div>
  );
};
