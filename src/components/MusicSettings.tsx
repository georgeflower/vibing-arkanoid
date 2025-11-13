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
import { Slider } from "@/components/ui/slider";
import { Music, Settings, Volume2, Radio, Repeat } from "lucide-react";
import { musicManager } from "@/utils/musicManager";
import type { GameState } from "@/types/game";
import type { MusicSource, RepeatMode } from "@/utils/musicManager";

interface MusicSettingsProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const MusicSettings = ({ gameState, setGameState }: MusicSettingsProps) => {
  const [musicEnabled, setMusicEnabled] = useState(musicManager.getMusicEnabled());
  const [musicSource, setMusicSource] = useState<MusicSource>(musicManager.getMusicSource());
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(musicManager.getRepeatMode());
  const [currentTrack, setCurrentTrack] = useState(musicManager.getCurrentTrackIndex());
  const [open, setOpen] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [volumeMusic, setVolumeMusic] = useState(musicManager.getGroupGain("music") * 100);
  const [volumePowerUps, setVolumePowerUps] = useState(musicManager.getGroupGain("powerUps") * 100);
  const [volumeBricks, setVolumeBricks] = useState(musicManager.getGroupGain("bricks") * 100);
  const [volumeExplosions, setVolumeExplosions] = useState(musicManager.getGroupGain("explosions") * 100);
  const trackNames = musicManager.getTrackNames();

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
    musicManager.setMusicEnabled(enabled);
  };

  const handleMusicSourceChange = (value: string) => {
    const source = value as MusicSource;
    setMusicSource(source);
    musicManager.setMusicSource(source);
    setCurrentTrack(musicManager.getCurrentTrackIndex());
  };

  const handleRepeatModeChange = (value: string) => {
    const mode = value as RepeatMode;
    setRepeatMode(mode);
    musicManager.setRepeatMode(mode);
  };

  const handleTrackChange = (value: string) => {
    const trackIndex = parseInt(value);
    setCurrentTrack(trackIndex);
    const playlist = musicManager.getCurrentPlaylist();
    if (musicManager.isMusicPlaying()) {
      musicManager.play(playlist[trackIndex].key);
    }
  };

  const handleVolumeChange = (group: "music" | "powerUps" | "bricks" | "explosions", value: number[]) => {
    const newVolume = value[0];
    musicManager.setGroupGain(group, newVolume / 100);
    
    switch(group) {
      case "music": setVolumeMusic(newVolume); break;
      case "powerUps": setVolumePowerUps(newVolume); break;
      case "bricks": setVolumeBricks(newVolume); break;
      case "explosions": setVolumeExplosions(newVolume); break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="amiga-box hover:bg-muted/50 transition-colors"
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
        
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Music On/Off Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="music-toggle" className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 85%)' }}>
              Music Enabled
            </Label>
            <Switch
              id="music-toggle"
              checked={musicEnabled}
              onCheckedChange={handleMusicToggle}
            />
          </div>

          {/* Music Source Selection */}
          <div className="space-y-3">
            <Label className="retro-pixel-text text-xs flex items-center gap-2" style={{ color: 'hsl(0, 0%, 85%)' }}>
              <Radio className="h-3 w-3" />
              Music Source
            </Label>
            <RadioGroup
              value={musicSource}
              onValueChange={handleMusicSourceChange}
              disabled={!musicEnabled}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tracker" id="source-tracker" />
                <Label
                  htmlFor="source-tracker"
                  className={`cursor-pointer retro-pixel-text text-xs ${!musicEnabled ? "opacity-50" : ""}`}
                  style={{ color: 'hsl(0, 0%, 85%)' }}
                >
                  Tracker (.xm)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mp3" id="source-mp3" />
                <Label
                  htmlFor="source-mp3"
                  className={`cursor-pointer retro-pixel-text text-xs ${!musicEnabled ? "opacity-50" : ""}`}
                  style={{ color: 'hsl(0, 0%, 85%)' }}
                >
                  MP3
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Repeat Mode */}
          <div className="space-y-3">
            <Label className="retro-pixel-text text-xs flex items-center gap-2" style={{ color: 'hsl(0, 0%, 85%)' }}>
              <Repeat className="h-3 w-3" />
              Repeat Mode
            </Label>
            <RadioGroup
              value={repeatMode}
              onValueChange={handleRepeatModeChange}
              disabled={!musicEnabled}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off" id="repeat-off" />
                <Label
                  htmlFor="repeat-off"
                  className={`cursor-pointer retro-pixel-text text-xs ${!musicEnabled ? "opacity-50" : ""}`}
                  style={{ color: 'hsl(0, 0%, 85%)' }}
                >
                  Off
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="repeatTrack" id="repeat-track" />
                <Label
                  htmlFor="repeat-track"
                  className={`cursor-pointer retro-pixel-text text-xs ${!musicEnabled ? "opacity-50" : ""}`}
                  style={{ color: 'hsl(0, 0%, 85%)' }}
                >
                  Repeat Track
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="repeatList" id="repeat-list" />
                <Label
                  htmlFor="repeat-list"
                  className={`cursor-pointer retro-pixel-text text-xs ${!musicEnabled ? "opacity-50" : ""}`}
                  style={{ color: 'hsl(0, 0%, 85%)' }}
                >
                  Repeat List
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Volume Groups */}
          <div className="space-y-4 pt-2 border-t border-border/20">
            <Label className="retro-pixel-text text-xs flex items-center gap-2" style={{ color: 'hsl(0, 0%, 85%)' }}>
              <Volume2 className="h-3 w-3" />
              Volume Groups
            </Label>
            
            {/* Music Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 75%)' }}>
                  Music
                </Label>
                <span className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 60%)' }}>
                  {Math.round(volumeMusic)}%
                </span>
              </div>
              <Slider
                value={[volumeMusic]}
                onValueChange={(v) => handleVolumeChange("music", v)}
                max={100}
                step={1}
                disabled={!musicEnabled}
              />
            </div>

            {/* Power-Ups Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 75%)' }}>
                  Power-Ups
                </Label>
                <span className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 60%)' }}>
                  {Math.round(volumePowerUps)}%
                </span>
              </div>
              <Slider
                value={[volumePowerUps]}
                onValueChange={(v) => handleVolumeChange("powerUps", v)}
                max={100}
                step={1}
                disabled={!musicEnabled}
              />
            </div>

            {/* Bricks Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 75%)' }}>
                  Bricks
                </Label>
                <span className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 60%)' }}>
                  {Math.round(volumeBricks)}%
                </span>
              </div>
              <Slider
                value={[volumeBricks]}
                onValueChange={(v) => handleVolumeChange("bricks", v)}
                max={100}
                step={1}
                disabled={!musicEnabled}
              />
            </div>

            {/* Explosions Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 75%)' }}>
                  Explosions
                </Label>
                <span className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 60%)' }}>
                  {Math.round(volumeExplosions)}%
                </span>
              </div>
              <Slider
                value={[volumeExplosions]}
                onValueChange={(v) => handleVolumeChange("explosions", v)}
                max={100}
                step={1}
                disabled={!musicEnabled}
              />
            </div>
          </div>

          {/* Song Selection */}
          <div className="space-y-3 pt-2 border-t border-border/20">
            <Label className="retro-pixel-text text-xs" style={{ color: 'hsl(0, 0%, 85%)' }}>
              Select Track ({musicSource === "tracker" ? "Tracker" : "MP3"})
            </Label>
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
