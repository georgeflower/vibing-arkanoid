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

export const MusicSettings = () => {
  const [musicEnabled, setMusicEnabled] = useState(soundManager.getMusicEnabled());
  const [currentTrack, setCurrentTrack] = useState(soundManager.getCurrentTrackIndex());
  const trackNames = soundManager.getTrackNames();

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
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border-neon-purple/50 hover:bg-neon-purple/20"
        >
          <Settings className="h-5 w-5 text-neon-purple" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border-neon-purple/50">
        <DialogHeader>
          <DialogTitle className="text-neon-cyan flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Control your game music preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Music On/Off Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="music-toggle" className="text-foreground font-semibold">
              Background Music
            </Label>
            <Switch
              id="music-toggle"
              checked={musicEnabled}
              onCheckedChange={handleMusicToggle}
            />
          </div>

          {/* Song Selection */}
          <div className="space-y-3">
            <Label className="text-foreground font-semibold">Select Song</Label>
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
                    className="border-neon-purple data-[state=checked]:bg-neon-purple"
                  />
                  <Label
                    htmlFor={`track-${index}`}
                    className={`cursor-pointer ${
                      !musicEnabled ? "opacity-50" : ""
                    }`}
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
