import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  side: "left" | "right";
  width?: number;
  height?: number;
}

export const AudioVisualizer = ({ analyser, side, width = 60, height = 400 }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = 20; // Number of bars to display

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, width, height);

      const barWidth = width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * height;
        
        // Color based on frequency (low=red, mid=yellow, high=cyan)
        const hue = (i / barCount) * 180 + 180; // 180-360 range
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

        const x = side === "left" ? width - barWidth * (i + 1) : barWidth * i;
        const y = height - barHeight;

        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, side, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="retro-border"
      style={{
        imageRendering: "pixelated",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    />
  );
};
