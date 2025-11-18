import endScreenImg from "@/assets/end-screen.png";
import { Button } from "./ui/button";

interface GameStats {
  totalBricksDestroyed: number;
  totalShots: number;
  longestCombo: number;
  accuracy: number;
  levelSkipped: boolean;
  finalScore: number;
  finalLevel: number;
  powerUpsCollected?: number;
  bricksDestroyedByTurrets?: number;
  enemiesKilled?: number;
  bossesKilled?: number;
}

interface EndScreenProps {
  onContinue: () => void;
  onReturnToMenu: () => void;
  onRetryLevel?: () => void;
  stats?: GameStats;
}

export const EndScreen = ({ onContinue, onReturnToMenu, onRetryLevel, stats }: EndScreenProps) => {
  const accuracy = stats?.accuracy ?? 0;
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: `url(${endScreenImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="text-center bg-black/70 p-8 rounded-lg border-4 border-red-500/50 max-w-2xl animate-fade-in">
        <h1 className="text-6xl font-bold text-red-500 mb-6 animate-pulse">GAME OVER</h1>
        
        {stats?.levelSkipped && (
          <div className="mb-6 p-4 bg-yellow-900/50 border-2 border-yellow-500 rounded animate-pulse">
            <p className="text-3xl font-bold text-yellow-400">LEVEL SKIPPER!</p>
            <p className="text-xl text-yellow-300">CHEATER - DISQUALIFIED FROM HIGH SCORES</p>
          </div>
        )}
        
        <div className="mb-6 space-y-3 text-left">
          <h2 className="text-3xl font-bold text-cyan-400 mb-4 text-center">STATISTICS</h2>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Final Score:</span>
            <span className="text-white font-bold">{stats?.finalScore.toString().padStart(6, '0') ?? '000000'}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Level Reached:</span>
            <span className="text-white font-bold">{stats?.finalLevel ?? 1}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Bricks Destroyed:</span>
            <span className="text-white font-bold">{stats?.totalBricksDestroyed ?? 0}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Longest Combo:</span>
            <span className="text-white font-bold">{stats?.longestCombo ?? 0}x</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Accuracy:</span>
            <span className={`font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {accuracy.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Power-ups Collected:</span>
            <span className="text-white font-bold">{stats?.powerUpsCollected ?? 0}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Turret Brick Kills:</span>
            <span className="text-white font-bold">{stats?.bricksDestroyedByTurrets ?? 0}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Enemies Killed:</span>
            <span className="text-white font-bold">{stats?.enemiesKilled ?? 0}</span>
          </div>
          
          <div className="flex justify-between text-xl">
            <span className="text-gray-300">Bosses Defeated:</span>
            <span className="text-white font-bold">{stats?.bossesKilled ?? 0}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 mt-8">
          {onRetryLevel && (
            <Button 
              onClick={onRetryLevel}
              className="w-full text-xl py-6 bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              RETRY LEVEL (Score Reset)
            </Button>
          )}
          
          <Button 
            onClick={onContinue}
            className="w-full text-xl py-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
          >
            CONTINUE
          </Button>
          
          <Button 
            onClick={onReturnToMenu}
            variant="outline"
            className="w-full text-xl py-6 border-2 border-white/30 text-white font-bold hover:bg-white/10"
          >
            MAIN MENU
          </Button>
        </div>
      </div>
    </div>
  );
};
