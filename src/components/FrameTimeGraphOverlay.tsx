import { useEffect, useRef, useState } from "react";

interface FrameTimeGraphOverlayProps {
  visible?: boolean;
  maxSamples?: number;
}

interface FrameTimeSample {
  frameTime: number;
  timestamp: number;
}

export const FrameTimeGraphOverlay = ({ 
  visible = true, 
  maxSamples = 120 
}: FrameTimeGraphOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<FrameTimeSample[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const [stats, setStats] = useState({ avg: 0, min: 0, max: 0, jitter: 0 });

  useEffect(() => {
    if (!visible) return;

    const updateGraph = (timestamp: number) => {
      const frameTime = lastFrameTimeRef.current > 0 
        ? timestamp - lastFrameTimeRef.current 
        : 16.67;
      lastFrameTimeRef.current = timestamp;

      // Add sample
      samplesRef.current.push({ frameTime, timestamp });
      if (samplesRef.current.length > maxSamples) {
        samplesRef.current.shift();
      }

      // Calculate stats
      const samples = samplesRef.current;
      if (samples.length > 1) {
        const times = samples.map(s => s.frameTime);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        // Calculate jitter (standard deviation)
        const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
        const jitter = Math.sqrt(variance);

        setStats({ avg, min, max, jitter });
      }

      // Draw graph
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const targetFrameTime = 16.67; // 60 FPS target
          const maxFrameTime = 50; // Scale max to 50ms

          // Clear
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(0, 0, width, height);

          // Draw target line (60 FPS = 16.67ms)
          ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          const targetY = height - (targetFrameTime / maxFrameTime) * height;
          ctx.beginPath();
          ctx.moveTo(0, targetY);
          ctx.lineTo(width, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw 30 FPS line (33.33ms)
          ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
          const fps30Y = height - (33.33 / maxFrameTime) * height;
          ctx.beginPath();
          ctx.moveTo(0, fps30Y);
          ctx.lineTo(width, fps30Y);
          ctx.stroke();

          // Draw frame time bars
          const barWidth = width / maxSamples;
          samples.forEach((sample, i) => {
            const x = i * barWidth;
            const barHeight = (sample.frameTime / maxFrameTime) * height;
            const y = height - barHeight;

            // Color based on frame time
            if (sample.frameTime < 17) {
              ctx.fillStyle = "rgba(0, 255, 100, 0.8)"; // Good (60+ FPS)
            } else if (sample.frameTime < 25) {
              ctx.fillStyle = "rgba(255, 255, 0, 0.8)"; // OK (40-60 FPS)
            } else if (sample.frameTime < 33) {
              ctx.fillStyle = "rgba(255, 165, 0, 0.8)"; // Slow (30-40 FPS)
            } else {
              ctx.fillStyle = "rgba(255, 50, 50, 0.9)"; // Bad (<30 FPS)
            }

            ctx.fillRect(x, y, barWidth - 1, barHeight);
          });

          // Draw labels
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.font = "9px monospace";
          ctx.fillText("60fps", 2, targetY - 2);
          ctx.fillText("30fps", 2, fps30Y - 2);
          ctx.fillText("50ms", 2, 10);
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateGraph);
    };

    animationFrameRef.current = requestAnimationFrame(updateGraph);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visible, maxSamples]);

  if (!visible) return null;

  return (
    <div 
      className="fixed top-20 right-4 z-[9999] pointer-events-none"
      style={{ fontFamily: "monospace" }}
    >
      <div className="bg-black/90 rounded-lg p-2 border border-white/20">
        <div className="text-white/80 text-xs mb-1 font-bold">Frame Time</div>
        <canvas 
          ref={canvasRef} 
          width={180} 
          height={60} 
          className="rounded"
        />
        <div className="flex justify-between text-[10px] text-white/70 mt-1">
          <span>Avg: {stats.avg.toFixed(1)}ms</span>
          <span>Max: {stats.max.toFixed(1)}ms</span>
          <span>Jitter: ±{stats.jitter.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
