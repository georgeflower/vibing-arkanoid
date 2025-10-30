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
    <div className="bg-slate-900/90 rounded-lg p-8 border-2 border-amber-500/50 w-full max-w-md text-center">
      <h2 className="text-4xl font-bold text-amber-400 mb-2 font-mono">
        HIGH SCORE!
      </h2>
      <div className="text-2xl text-cyan-300 mb-6 font-mono">
        {score.toLocaleString()} points
      </div>
      <div className="text-lg text-purple-400 mb-6 font-mono">
        Level {level}
      </div>
      
      <div className="mb-6">
        <label className="block text-pink-400 mb-3 font-mono text-lg">
          Enter Your Initials:
        </label>
        <input
          type="text"
          value={name}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          maxLength={3}
          placeholder="ABC"
          autoFocus
          className="w-40 text-center text-4xl font-bold font-mono bg-slate-800 text-cyan-300 border-2 border-cyan-500/50 rounded px-4 py-3 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 uppercase"
        />
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={name.length !== 3}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg font-mono text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        SUBMIT
      </Button>
    </div>
  );
};
