import { Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameUIProps {
  score: number;
  lives: number;
  level: number;
  timer: number;
  speed: number;
  isPlaying: boolean;
  currentTrack: string;
  isFullscreen: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleFullscreen: () => void;
}

export const GameUI = ({ 
  score, 
  lives, 
  level, 
  timer, 
  speed,
  isPlaying,
  currentTrack,
  isFullscreen,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleFullscreen
}: GameUIProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Game Stats */}
      <div className="flex flex-row gap-4 flex-wrap justify-center">
        {/* Score */}
        <div className="amiga-box px-4 py-3 min-w-[140px]">
          <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(0, 0%, 60%)' }}>
            SCORE
          </div>
          <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
            {score.toString().padStart(6, "0")}
          </div>
        </div>

        {/* Level */}
        <div className="amiga-box px-4 py-3 min-w-[140px]">
          <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(30, 75%, 55%)' }}>
            LEVEL
          </div>
          <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
            {level.toString().padStart(2, "0")}
          </div>
        </div>

        {/* Lives */}
        <div className="amiga-box px-4 py-3 min-w-[140px]">
          <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(0, 70%, 55%)' }}>
            LIVES
          </div>
          <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
            {lives}
          </div>
        </div>

        {/* Timer */}
        <div className="amiga-box px-4 py-3 min-w-[140px]">
          <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(210, 60%, 55%)' }}>
            TIMER
          </div>
          <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
            {timer}s
          </div>
        </div>

        {/* Speed */}
        <div className="amiga-box px-4 py-3 min-w-[140px]">
          <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(120, 50%, 50%)' }}>
            SPEED
          </div>
          <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
            {Math.round(speed * 100)}%
          </div>
        </div>
      </div>

      {/* Music Controls */}
      <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
        <div className="amiga-box px-3 py-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="h-8 w-8 retro-button"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            className="h-8 w-8 retro-button"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="h-8 w-8 retro-button"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="text-xs retro-pixel-text ml-2" style={{ color: 'hsl(180, 60%, 55%)' }}>
            {currentTrack}
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-10 w-10 retro-button amiga-box"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};
