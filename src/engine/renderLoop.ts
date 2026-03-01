/**
 * engine/renderLoop.ts — Standalone requestAnimationFrame loop.
 *
 * Completely independent of React. Reads from `world` and `renderState`
 * every frame and calls `renderFrame()` to draw to the canvas.
 *
 * Returns a stop function for cleanup.
 */

import { world } from "@/engine/state";
import { renderState, type AssetRefs } from "@/engine/renderState";
import { renderFrame } from "@/engine/canvasRenderer";

/**
 * Start the render loop. Calls renderFrame every animation frame.
 * @returns A cleanup function that stops the loop.
 */
// Adaptive render cap — 100 FPS target for high-end, scales down for low quality
// This prevents GPU exhaustion on 120Hz+ displays with integrated graphics
// while allowing smoother rendering on capable hardware.
const TARGET_FPS_HIGH = 100;
const TARGET_FPS_LOW = 60;
let currentTargetFps = TARGET_FPS_HIGH;
let minFrameInterval = 1000 / (currentTargetFps + 2); // slight margin to avoid drift

/** Update the render target FPS based on quality level */
export function setRenderTargetFps(qualityLevel: 'low' | 'medium' | 'high'): void {
  const newTarget = qualityLevel === 'low' ? TARGET_FPS_LOW : TARGET_FPS_HIGH;
  if (newTarget !== currentTargetFps) {
    currentTargetFps = newTarget;
    minFrameInterval = 1000 / (currentTargetFps + 2);
  }
}

export function startRenderLoop(
  canvas: HTMLCanvasElement,
  assets: AssetRefs,
): () => void {
  const ctx = canvas.getContext("2d", {
    // alpha: false eliminates per-pixel alpha compositing when painting the
    // canvas to the page — a significant GPU bandwidth win on integrated GPUs.
    alpha: false,
    // desynchronized: true lets the compositor present frames without waiting
    // for the page event loop, reducing latency on integrated graphics.
    desynchronized: true,
  });
  if (!ctx) {
    console.error("[RenderLoop] Failed to get 2D context");
    return () => {};
  }

  // Disable bilinear filtering — not needed for pixel-art assets and saves
  // GPU fill-rate on every drawImage call.
  ctx.imageSmoothingEnabled = false;

  let rafId: number | null = null;
  let running = true;
  let lastFrameTime = 0;

  const loop = (timestamp: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    // Skip frame if not enough time has elapsed (adaptive cap)
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < minFrameInterval) return;
    lastFrameTime = timestamp - (elapsed % minFrameInterval);

    const now = Date.now();
    renderFrame(ctx, world, renderState, assets, now);
  };

  // Kick off
  rafId = requestAnimationFrame(loop);

  // Return stop function
  return () => {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
