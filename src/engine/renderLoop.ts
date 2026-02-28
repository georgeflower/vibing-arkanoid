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
// 60 fps cap — prevents GPU exhaustion on 120Hz+ displays with integrated graphics
const MIN_FRAME_INTERVAL = 1000 / 62; // ~16.1ms (slightly above 60Hz to avoid drift)

export function startRenderLoop(
  canvas: HTMLCanvasElement,
  assets: AssetRefs,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("[RenderLoop] Failed to get 2D context");
    return () => {};
  }

  let rafId: number | null = null;
  let running = true;
  let lastFrameTime = 0;

  const loop = (timestamp: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    // Skip frame if not enough time has elapsed
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < MIN_FRAME_INTERVAL) return;
    lastFrameTime = timestamp - (elapsed % MIN_FRAME_INTERVAL);

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
