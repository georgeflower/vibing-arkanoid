import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface DebugModeIndicatorProps {
  activeFeatureCount: number;
  onToggle: () => void;
}

export const DebugModeIndicator = ({ activeFeatureCount, onToggle }: DebugModeIndicatorProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed top-4 right-4 z-[9998] animate-fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-black/80 backdrop-blur-sm border-2 border-yellow-500/60 rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg">
        {/* Warning Icon with Pulse Animation */}
        <AlertTriangle className="h-5 w-5 text-yellow-500 animate-pulse" />

        {/* Debug Mode Text */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-500 font-bold text-sm tracking-wider uppercase font-mono">
            Debug Mode Active
          </span>
          <span className="text-cyan-400 font-mono text-xs bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
            {activeFeatureCount} ON
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onToggle}
          className="ml-2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-white/10"
          title={isHovered ? "Click to hide (can re-enable in Debug Dashboard)" : "Hide indicator"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tooltip on Hover */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-sm border border-primary/30 rounded px-3 py-2 text-xs text-muted-foreground whitespace-nowrap animate-fade-in">
          Press § to open Debug Dashboard
        </div>
      )}
    </div>
  );
};
