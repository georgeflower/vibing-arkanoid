import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Music, Settings } from "lucide-react";
import { soundManager } from "@/utils/sounds";
import type { GameState } from "@/types/game";

interface MusicSettingsProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const MusicSettings = ({ gameState, setGameState }: MusicSettingsProps) => {
  const [musicEnabled, setMusicEnabled] = useState(soundManager.getMusicEnabled());
  const [currentTrack, setCurrentTrack] = useState(soundManager.getCurrentTrackIndex());
  const [open, setOpen] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const trackNames = soundManager.getTrackNames();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (isOpen) {
      // Opening dialog - pause if playing
      if (gameState === "playing") {
        setWasPlaying(true);
        setGameState("paused");
      }
    } else {
      // Closing dialog - resume if was playing
      if (wasPlaying) {
        setGameState("playing");
        setWasPlaying(false);
      }
    }
  };

  const handleMusicToggle = (enabled: boolean) => {
    setMusicEnabled(enabled);
    soundManager.setMusicEnabled(enabled);
  };

  const handleTrackChange = (value: string) => {
    const trackIndex = parseInt(value);
    setCurrentTrack(trackIndex);
    soundManager.setCurrentTrack(trackIndex);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 amiga-box hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-5 w-5" style={{ color: 'hsl(0, 0%, 85%)' }} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md amiga-box">
        <DialogHeader>
          <DialogTitle className="retro-pixel-text text-sm flex items-center gap-2" style={{ color: 'hsl(0, 0%, 85%)' }}>
            <Music className="h-4 w-4" />
            Music Settings
          </DialogTitle>
          <DialogDescription className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 60%)' }}>
            Control your game music
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Music On/Off Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="music-toggle" className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 85%)' }}>
              Music
            </Label>
            <Switch
              id="music-toggle"
              checked={musicEnabled}
              onCheckedChange={handleMusicToggle}
            />
          </div>

          {/* Song Selection */}
          <div className="space-y-3">
            <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 85%)' }}>Select Song</Label>
            <RadioGroup
              value={currentTrack.toString()}
              onValueChange={handleTrackChange}
              disabled={!musicEnabled}
              className="space-y-2"
            >
              {trackNames.map((name, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={index.toString()}
                    id={`track-${index}`}
                  />
                  <Label
                    htmlFor={`track-${index}`}
                    className={`cursor-pointer retro-pixel-text text-xs ${
                      !musicEnabled ? "opacity-50" : ""
                    }`}
                    style={{ color: 'hsl(0, 0%, 85%)' }}
                  >
                    {name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
