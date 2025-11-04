import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { soundManager } from "@/utils/sounds";

interface PauseMenuProps {
  onResume: () => void;
  onReturnToMenu: () => void;
}

export const PauseMenu = ({ onResume, onReturnToMenu }: PauseMenuProps) => {
  const musicEnabled = soundManager.getMusicEnabled();
  const sfxEnabled = soundManager.getSfxEnabled();

  const handleMusicToggle = (checked: boolean) => {
    soundManager.playUIToggle();
    soundManager.setMusicEnabled(checked);
    if (checked) {
      soundManager.playBackgroundMusic();
    } else {
      soundManager.stopBackgroundMusic();
    }
  };

  const handleSfxToggle = (checked: boolean) => {
    soundManager.playUIToggle();
    soundManager.setSfxEnabled(checked);
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="max-w-md w-full p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
        <h2 className="text-4xl font-bold mb-8 text-center text-[hsl(200,70%,50%)]" style={{ fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.3em' }}>
          P A U S E D
        </h2>

        {/* Settings */}
        <div className="space-y-6 mb-8">
          {/* Music Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="pause-music" className="text-white text-lg">Music</Label>
            <Switch
              id="pause-music"
              checked={musicEnabled}
              onCheckedChange={handleMusicToggle}
            />
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="pause-sfx" className="text-white text-lg">Sound Effects</Label>
            <Switch
              id="pause-sfx"
              checked={sfxEnabled}
              onCheckedChange={handleSfxToggle}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => {
              soundManager.playUIClick();
              onResume();
            }}
            className="w-full bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-lg py-6"
          >
            Resume Game
          </Button>
          
          <Button
            onClick={() => {
              soundManager.playUIClick();
              onReturnToMenu();
            }}
            variant="outline"
            className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
          >
            Return to Main Menu
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-white/60">
          Press P to resume
        </div>
      </Card>
    </div>
  );
};
