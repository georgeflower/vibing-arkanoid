// src/hooks/useCanvasResize.ts
import { useEffect, useRef, useCallback, useState } from "react";

interface CanvasResizeOptions {
  enabled: boolean;
  containerRef: React.RefObject<HTMLDivElement>; // .metal-game-area
  gameGlowRef: React.RefObject<HTMLDivElement>; // inner wrapper
  canvasRef?: React.RefObject<HTMLCanvasElement>; // optional: set buffer + style
  logicalWidth: number; // SCALED_CANVAS_WIDTH
  logicalHeight: number; // SCALED_CANVAS_HEIGHT
  hiDpi?: boolean; // set true for DPR scaling
}

interface CanvasSize {
  displayWidth: number;
  displayHeight: number;
  scale: number; // display / logical
}

export function useCanvasResize({
  enabled,
  containerRef,
  gameGlowRef,
  canvasRef,
  logicalWidth,
  logicalHeight,
  hiDpi = true,
}: CanvasResizeOptions): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({
    displayWidth: logicalWidth,
    displayHeight: logicalHeight,
    scale: 1,
  });

  const rafRef = useRef<number | null>(null);

  const calculateSize = useCallback(() => {
    if (!containerRef.current || !gameGlowRef.current) return;

    const container = containerRef.current;
    // Read *actual* paddings from computed styles
    const cs = getComputedStyle(container);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

    // clientWidth/Height include padding, exclude borders
    const availableWidth = Math.max(0, container.clientWidth - padX);
    const availableHeight = Math.max(0, container.clientHeight - padY);

    const aspect = logicalWidth / logicalHeight;
    let dw: number, dh: number;

    if (availableWidth / availableHeight > aspect) {
      // Height-constrained
      dh = availableHeight;
      dw = dh * aspect;
    } else {
      // Width-constrained
      dw = availableWidth;
      dh = dw / aspect;
    }

    dw = Math.floor(dw);
    dh = Math.floor(dh);
    const scale = dw / logicalWidth;

    // Size the wrapper
    const glow = gameGlowRef.current;
    glow.style.width = `${dw}px`;
    glow.style.height = `${dh}px`;

    // (Optional) size the canvas style and buffer for crispness
    if (canvasRef?.current) {
      const dpr = hiDpi ? Math.min(window.devicePixelRatio || 1, 3) : 1;
      const canvas = canvasRef.current;
      // CSS pixels for layout
      canvas.style.width = `${dw}px`;
      canvas.style.height = `${dh}px`;
      // Backing store in device pixels
      const bw = Math.max(1, Math.floor(dw * dpr));
      const bh = Math.max(1, Math.floor(dh * dpr));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
    }

    setSize({ displayWidth: dw, displayHeight: dh, scale });
  }, [containerRef, gameGlowRef, canvasRef, logicalWidth, logicalHeight, hiDpi]);

  const debounced = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(calculateSize);
  }, [calculateSize]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const ro = new ResizeObserver(debounced);
    ro.observe(containerRef.current);
    calculateSize();
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, containerRef, debounced, calculateSize]);

  return size;
}
