import { useState } from "react";
import { Button } from "./ui/button";

interface HighScoreEntryProps {
  score: number;
  level: number;
  onSubmit: (name: string) => void;
}

export const HighScoreEntry = ({ score, level, onSubmit }: HighScoreEntryProps) => {
  const [name, setName] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 3);
    setName(value);
  };

  const handleSubmit = () => {
    if (name.length === 3) {
      onSubmit(name);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.length === 3) {
      handleSubmit();
    }
  };

  return (
    <div className="retro-border bg-slate-900/95 rounded-lg p-12 w-full max-w-2xl text-center animate-scale-in">
      <h2 className="text-6xl font-bold mb-4 font-mono">
        <span className="retro-title">HIGH SCORE!</span>
      </h2>
      <div className="text-4xl text-cyan-300 mb-4 font-mono font-bold animate-pulse">
        {score.toLocaleString()} POINTS
      </div>
      <div className="text-2xl text-purple-400 mb-8 font-mono">
        LEVEL {level}
      </div>
      
      <div className="mb-8">
        <label className="block text-pink-400 mb-4 font-mono text-2xl tracking-wider">
          ENTER YOUR INITIALS:
        </label>
        <input
          type="text"
          value={name}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          maxLength={3}
          placeholder="___"
          autoFocus
          className="w-64 text-center text-6xl font-bold font-mono bg-slate-800 text-cyan-300 border-4 border-cyan-500 rounded-lg px-6 py-4 focus:outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/50 uppercase tracking-widest animate-pulse"
        />
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={name.length !== 3}
        className="px-12 py-6 text-2xl font-bold font-mono bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed retro-button"
      >
        SUBMIT SCORE
      </Button>
    </div>
  );
};
