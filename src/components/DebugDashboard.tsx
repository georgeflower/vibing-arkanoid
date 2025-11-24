import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DebugSettings } from "@/hooks/useDebugSettings";

interface DebugDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DebugSettings;
  onToggle: (key: keyof DebugSettings) => void;
  onReset: () => void;
}

export const DebugDashboard = ({ isOpen, onClose, settings, onToggle, onReset }: DebugDashboardProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 border-2 border-primary rounded-lg shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-primary/30">
          <h2 className="text-2xl font-bold text-primary">Debug Dashboard</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Overlays Section */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Visual Overlays</h3>
          <div className="space-y-2">
            <DebugToggle
              label="Debug Mode Indicator"
              checked={settings.showDebugModeIndicator}
              onChange={() => onToggle("showDebugModeIndicator")}
              description="Shows when ENABLE_DEBUG_FEATURES is true"
            />
            <DebugToggle
              label="Game Loop Debug"
              checked={settings.showGameLoopDebug}
              onChange={() => onToggle("showGameLoopDebug")}
            />
            <DebugToggle
              label="Substep Debug"
              checked={settings.showSubstepDebug}
              onChange={() => onToggle("showSubstepDebug")}
            />
            <DebugToggle
              label="CCD Performance"
              checked={settings.showCCDPerformance}
              onChange={() => onToggle("showCCDPerformance")}
            />
            <DebugToggle
              label="Collision History"
              checked={settings.showCollisionHistory}
              onChange={() => onToggle("showCollisionHistory")}
            />
            <DebugToggle
              label="Frame Profiler"
              checked={settings.showFrameProfiler}
              onChange={() => onToggle("showFrameProfiler")}
              description="Shows per-subsystem timing breakdown"
            />
          </div>
        </section>

        {/* Logging Section */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Console Logging</h3>
          <div className="space-y-2">
            <DebugToggle
              label="Collision Logging"
              checked={settings.enableCollisionLogging}
              onChange={() => onToggle("enableCollisionLogging")}
              description="Press C to toggle (in-game)"
            />
            <DebugToggle
              label="Power-Up Logging"
              checked={settings.enablePowerUpLogging}
              onChange={() => onToggle("enablePowerUpLogging")}
            />
            <DebugToggle
              label="Performance Logging"
              checked={settings.enablePerformanceLogging}
              onChange={() => onToggle("enablePerformanceLogging")}
            />
            <DebugToggle
              label="FPS Monitor Logging"
              checked={settings.enableFPSLogging}
              onChange={() => onToggle("enableFPSLogging")}
              description="Performance Monitor logs every second"
            />
            <DebugToggle
              label="Paddle Collision Logging"
              checked={settings.enablePaddleLogging}
              onChange={() => onToggle("enablePaddleLogging")}
              description="Paddle geometry collision details"
            />
            <DebugToggle
              label="Boss Attack Logging"
              checked={settings.enableBossLogging}
              onChange={() => onToggle("enableBossLogging")}
              description="Boss attack patterns and damage"
            />
            <DebugToggle
              label="Detailed Frame Logging"
              checked={settings.enableDetailedFrameLogging}
              onChange={() => onToggle("enableDetailedFrameLogging")}
              description="Log per-frame event counts on FPS drops"
            />
          </div>
        </section>

        {/* Debug Keys Reference */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Debug Controls</h3>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-1">
            <KeyReference keyName="§" description="Toggle Debug Dashboard" />
            <KeyReference keyName="Q" description="Cycle Quality (High → Medium → Low)" />
            <KeyReference keyName="Shift+Q" description="Toggle Auto Quality Adjust" />
            <KeyReference keyName="C" description="Toggle Collision Debug Logging" />
            <KeyReference keyName="H" description="Toggle Collision History Viewer" />
            <KeyReference keyName="F" description="Toggle Fullscreen" />
            <KeyReference keyName="0" description="Skip Level (disqualifies high score)" />
            <KeyReference keyName="+" description="Increase Ball Speed (+5%)" />
            <div className="mt-3 pt-3 border-t border-primary/20">
              <div className="text-muted-foreground mb-2">Power-Up Test Keys (1-8):</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <KeyReference keyName="1" description="Shield" compact />
                <KeyReference keyName="5" description="Multi-ball" compact />
                <KeyReference keyName="2" description="Turrets" compact />
                <KeyReference keyName="6" description="Paddle Shrink" compact />
                <KeyReference keyName="3" description="Extra Life" compact />
                <KeyReference keyName="7" description="Paddle Extend" compact />
                <KeyReference keyName="4" description="Slowdown" compact />
                <KeyReference keyName="8" description="Fireball" compact />
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-primary/30">
          <Button onClick={onReset} variant="outline" className="flex-1">
            Reset to Defaults
          </Button>
          <Button onClick={onClose} variant="default" className="flex-1">
            Close Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

interface DebugToggleProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  description?: string;
}

const DebugToggle = ({ label, checked, onChange, description }: DebugToggleProps) => {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary cursor-pointer"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
    </label>
  );
};

interface KeyReferenceProps {
  keyName: string;
  description: string;
  compact?: boolean;
}

const KeyReference = ({ keyName, description, compact }: KeyReferenceProps) => {
  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        <span className="text-primary font-semibold">{keyName}</span>: {description}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <span className="text-primary font-semibold w-16">{keyName}</span>
      <span>{description}</span>
    </div>
  );
};
