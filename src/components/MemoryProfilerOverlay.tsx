import { useEffect, useRef, useState } from "react";

interface MemoryProfilerOverlayProps {
  visible?: boolean;
  sampleIntervalMs?: number;
  maxSamples?: number;
}

interface MemorySample {
  usedHeap: number;
  totalHeap: number;
  timestamp: number;
}

interface MemoryStats {
  currentHeapMB: number;
  peakHeapMB: number;
  totalHeapMB: number;
  allocationRateMBps: number;
  gcEvents: number;
  lastGCDropMB: number;
}

export const MemoryProfilerOverlay = ({ 
  visible = true, 
  sampleIntervalMs = 100,
  maxSamples = 100
}: MemoryProfilerOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<MemorySample[]>([]);
  const peakHeapRef = useRef<number>(0);
  const gcEventsRef = useRef<number>(0);
  const lastGCDropRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [stats, setStats] = useState<MemoryStats>({
    currentHeapMB: 0,
    peakHeapMB: 0,
    totalHeapMB: 0,
    allocationRateMBps: 0,
    gcEvents: 0,
    lastGCDropMB: 0
  });
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!visible) return;

    // Check if memory API is available
    if (!(performance as any).memory) {
      setSupported(false);
      return;
    }

    const sampleMemory = () => {
      const memory = (performance as any).memory;
      const usedHeap = memory.usedJSHeapSize;
      const totalHeap = memory.totalJSHeapSize;
      const timestamp = performance.now();

      // Detect GC events (heap drop > 1MB)
      const lastSample = samplesRef.current[samplesRef.current.length - 1];
      if (lastSample) {
        const heapDrop = lastSample.usedHeap - usedHeap;
        if (heapDrop > 1_000_000) {
          gcEventsRef.current++;
          lastGCDropRef.current = heapDrop / 1_000_000;
        }
      }

      // Track peak
      if (usedHeap > peakHeapRef.current) {
        peakHeapRef.current = usedHeap;
      }

      // Add sample
      samplesRef.current.push({ usedHeap, totalHeap, timestamp });
      if (samplesRef.current.length > maxSamples) {
        samplesRef.current.shift();
      }

      // Calculate allocation rate (MB/s over last 10 samples)
      let allocationRate = 0;
      const samples = samplesRef.current;
      if (samples.length >= 10) {
        const recent = samples.slice(-10);
        const startSample = recent[0];
        const endSample = recent[recent.length - 1];
        const heapGrowth = endSample.usedHeap - startSample.usedHeap;
        const timeDiff = (endSample.timestamp - startSample.timestamp) / 1000;
        if (timeDiff > 0) {
          allocationRate = Math.max(0, heapGrowth / timeDiff / 1_000_000);
        }
      }

      setStats({
        currentHeapMB: usedHeap / 1_000_000,
        peakHeapMB: peakHeapRef.current / 1_000_000,
        totalHeapMB: totalHeap / 1_000_000,
        allocationRateMBps: allocationRate,
        gcEvents: gcEventsRef.current,
        lastGCDropMB: lastGCDropRef.current
      });

      // Draw graph
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const maxHeap = Math.max(...samples.map(s => s.usedHeap), 100_000_000);

          // Clear
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(0, 0, width, height);

          // Draw total heap limit line
          ctx.strokeStyle = "rgba(255, 100, 100, 0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          const limitY = height - (totalHeap / maxHeap) * height * 0.9;
          ctx.beginPath();
          ctx.moveTo(0, limitY);
          ctx.lineTo(width, limitY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw heap usage line
          ctx.strokeStyle = "rgba(100, 200, 255, 0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          samples.forEach((sample, i) => {
            const x = (i / maxSamples) * width;
            const y = height - (sample.usedHeap / maxHeap) * height * 0.9;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();

          // Fill area under line
          ctx.lineTo((samples.length - 1) / maxSamples * width, height);
          ctx.lineTo(0, height);
          ctx.fillStyle = "rgba(100, 200, 255, 0.2)";
          ctx.fill();

          // Draw GC drop indicators
          let prevHeap = 0;
          samples.forEach((sample, i) => {
            const heapDrop = prevHeap - sample.usedHeap;
            if (heapDrop > 1_000_000) {
              const x = (i / maxSamples) * width;
              ctx.fillStyle = "rgba(255, 255, 0, 0.6)";
              ctx.fillRect(x - 1, 0, 2, height);
            }
            prevHeap = sample.usedHeap;
          });

          // Draw labels
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.font = "9px monospace";
          ctx.fillText(`${(maxHeap / 1_000_000).toFixed(0)}MB`, 2, 10);
        }
      }
    };

    intervalRef.current = setInterval(sampleMemory, sampleIntervalMs);
    sampleMemory(); // Initial sample

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, sampleIntervalMs, maxSamples]);

  if (!visible) return null;

  if (!supported) {
    return (
      <div 
        className="fixed top-44 right-4 z-[9999] pointer-events-none"
        style={{ fontFamily: "monospace" }}
      >
        <div className="bg-black/90 rounded-lg p-2 border border-white/20">
          <div className="text-white/80 text-xs mb-1 font-bold">Memory</div>
          <div className="text-yellow-400 text-[10px]">
            Memory API not supported<br/>
            (Chrome/Edge only)
          </div>
        </div>
      </div>
    );
  }

  // Allocation rate color
  const rateColor = stats.allocationRateMBps < 1 
    ? "text-green-400" 
    : stats.allocationRateMBps < 5 
      ? "text-yellow-400" 
      : "text-red-400";

  return (
    <div 
      className="fixed top-44 right-4 z-[9999] pointer-events-none"
      style={{ fontFamily: "monospace" }}
    >
      <div className="bg-black/90 rounded-lg p-2 border border-white/20">
        <div className="text-white/80 text-xs mb-1 font-bold">Memory</div>
        <canvas 
          ref={canvasRef} 
          width={180} 
          height={50} 
          className="rounded"
        />
        <div className="grid grid-cols-2 gap-x-2 text-[10px] text-white/70 mt-1">
          <span>Heap: {stats.currentHeapMB.toFixed(1)}MB</span>
          <span>Peak: {stats.peakHeapMB.toFixed(1)}MB</span>
          <span className={rateColor}>
            Rate: {stats.allocationRateMBps.toFixed(2)}MB/s
          </span>
          <span className="text-yellow-400">
            GC: {stats.gcEvents}x
          </span>
        </div>
        {stats.lastGCDropMB > 0 && (
          <div className="text-[9px] text-yellow-400/80 mt-0.5">
            Last GC: -{stats.lastGCDropMB.toFixed(1)}MB
          </div>
        )}
      </div>
    </div>
  );
};
