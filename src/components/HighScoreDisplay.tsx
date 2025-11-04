import { useEffect, useRef } from "react";
import { Button } from "./ui/button";

interface HighScoreDisplayProps {
  scores: Array<{ name: string; score: number; level: number; difficulty?: "normal" | "godlike"; beatLevel50?: boolean }>;
  onClose: () => void;
}

export const HighScoreDisplay = ({ scores, onClose }: HighScoreDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Animated starfield and geometric patterns
    const animate = () => {
      time += 0.02;

      // Clear with dark blue background
      ctx.fillStyle = "hsl(220, 25%, 8%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated grid pattern
      ctx.strokeStyle = "hsla(280, 60%, 55%, 0.15)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        const offset = (time * 50 + i * 40) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(canvas.width, offset);
        ctx.stroke();
      }

      // Moving vertical lines
      ctx.strokeStyle = "hsla(200, 70%, 50%, 0.15)";
      for (let i = 0; i < 15; i++) {
        const offset = (time * 30 + i * 60) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, canvas.height);
        ctx.stroke();
      }

      // Floating circles
      for (let i = 0; i < 5; i++) {
        const x = canvas.width / 2 + Math.sin(time + i) * 200;
        const y = canvas.height / 2 + Math.cos(time * 0.7 + i) * 150;
        const radius = 30 + Math.sin(time * 2 + i) * 10;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = i % 2 === 0 ? "hsl(330, 70%, 55%)" : "hsl(200, 70%, 50%)";
        ctx.strokeStyle = i % 2 === 0 ? "hsla(330, 70%, 55%, 0.3)" : "hsla(200, 70%, 50%, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating squares
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        const x = canvas.width / 2 + Math.cos(time * 0.5 + i * 2) * 250;
        const y = canvas.height / 2 + Math.sin(time * 0.5 + i * 2) * 150;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time + i);
        ctx.strokeStyle = "hsla(280, 60%, 55%, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -20, 40, 40);
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0"
      />
      
      <div className="relative z-10 w-full max-w-3xl px-4">
        <div className="retro-border bg-slate-900/95 rounded-lg p-12 backdrop-blur-sm">
          <h1 className="text-6xl font-bold text-center mb-8 font-mono animate-pulse">
            <span className="retro-title">HIGH SCORES</span>
          </h1>

          <div className="space-y-3 mb-8">
            {scores.map((entry, index) => (
              <div
                key={index}
                className="flex justify-between items-center font-mono text-2xl px-6 py-4 bg-slate-800/70 rounded-lg border-2 retro-row"
                style={{
                  borderColor: index === 0 ? "hsl(45, 90%, 55%)" : 
                               index === 1 ? "hsl(0, 0%, 70%)" :
                               index === 2 ? "hsl(30, 85%, 55%)" : "hsl(200, 70%, 50%)",
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="text-cyan-300 w-16 font-bold">{index + 1}.</span>
                <span className="text-pink-400 font-bold flex items-center gap-2">
                  {entry.beatLevel50 && <span className="text-yellow-400 text-3xl">👑</span>}
                  <span className="text-3xl tracking-widest">{entry.name}</span>
                  {entry.difficulty === "godlike" && (
                    <span className="text-red-500 text-sm font-bold tracking-tighter ml-2" style={{ fontFamily: 'monospace' }}>
                      GOD-MODE
                    </span>
                  )}
                </span>
                <span className="text-amber-300 flex-1 text-right font-bold">
                  {entry.score.toLocaleString()}
                </span>
                <span className="text-purple-400 w-32 text-right">
                  LEVEL {entry.level}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="px-12 py-6 text-2xl font-bold font-mono bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg transform transition-all hover:scale-105 retro-button"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};