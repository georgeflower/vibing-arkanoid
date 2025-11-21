/**
 * Frame-rate independent fixed-step game loop with accumulator pattern
 * 
 * IMPORTANT UNITS CONVENTION:
 * - onFixedUpdate receives: dtMs (milliseconds), dtSeconds (seconds), frameTick (integer)
 * - Game velocities: px/frame at 60Hz (convert to px/sec for physics: px/sec = px/frame * 60)
 * - CCD system expects: dtSeconds and px/sec velocities
 * - Timestamps: Use frameTick for cooldowns (deterministic, integer increments)
 * 
 * Features:
 * - Configurable fixed timestep (default 60Hz)
 * - Accumulator pattern with spiral-of-death protection
 * - Interpolation for smooth rendering
 * - TimeScale and pause support
 * - Debug flags and performance monitoring
 */

export interface GameLoopConfig {
  fixedStep: number; // milliseconds per update (default 16.6667ms = 60Hz)
  maxDeltaMs: number; // max frame delta to prevent spiral of death (default 250ms)
  maxUpdatesPerFrame: number; // safety limit (default 10)
  timeScale: number; // 1.0 = normal speed, 0.5 = half speed, etc.
  mode: "fixedStep" | "legacy"; // Toggle between fixed-step and legacy mode
}

export interface GameLoopState {
  accumulator: number;
  lastTime: number;
  isPaused: boolean;
  fps: number;
  updatesThisFrame: number;
  alpha: number; // Interpolation factor (0-1)
}

export interface GameLoopDebug {
  mode: "fixedStep" | "legacy";
  fixedHz: number;
  maxDeltaMs: number;
  accumulator: number;
  timeScale: number;
  fps: number;
  updatesThisFrame: number;
  alpha: number;
}

export class FixedStepGameLoop {
  private config: GameLoopConfig;
  private state: GameLoopState;
  private frameCount: number = 0;
  private frameTick: number = 0; // Deterministic frame counter
  private fpsLastTime: number = 0;
  private animationFrameId: number | null = null;
  
  private onFixedUpdate: ((dt: number) => void) | null = null;
  private onRender: ((alpha: number) => void) | null = null;

  constructor(config?: Partial<GameLoopConfig>) {
    this.config = {
      fixedStep: 16.6667, // 60Hz by default
      maxDeltaMs: 250,
      maxUpdatesPerFrame: 10,
      timeScale: 1.0,
      mode: "fixedStep",
      ...config
    };

    this.state = {
      accumulator: 0,
      lastTime: performance.now(),
      isPaused: false,
      fps: 60,
      updatesThisFrame: 0,
      alpha: 0
    };
  }

  /**
   * Set the fixed update callback (physics, collisions, game logic)
   */
  setFixedUpdateCallback(callback: (dt: number) => void) {
    this.onFixedUpdate = callback;
  }

  /**
   * Set the render callback (drawing, interpolation)
   */
  setRenderCallback(callback: (alpha: number) => void) {
    this.onRender = callback;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.animationFrameId !== null) return;
    
    this.state.lastTime = performance.now();
    this.fpsLastTime = this.state.lastTime;
    this.frameCount = 0;
    
    this.loop(this.state.lastTime);
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop
   */
  private loop = (currentTime: number) => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    // Calculate delta time
    let deltaTime = currentTime - this.state.lastTime;
    this.state.lastTime = currentTime;

    // Clamp delta to prevent spiral of death
    deltaTime = Math.min(deltaTime, this.config.maxDeltaMs);

    // Apply time scale
    deltaTime *= this.config.timeScale;

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.fpsLastTime >= 1000) {
      this.state.fps = Math.round(this.frameCount * 1000 / (currentTime - this.fpsLastTime));
      this.frameCount = 0;
      this.fpsLastTime = currentTime;
    }

    // Handle pause
    if (this.state.isPaused) {
      this.state.updatesThisFrame = 0;
      this.state.alpha = 0;
      if (this.onRender) {
        this.onRender(0);
      }
      return;
    }

    // Legacy mode: direct update without accumulator
    if (this.config.mode === "legacy") {
      this.state.updatesThisFrame = 1;
      this.state.alpha = 1;
      
      if (this.onFixedUpdate) {
        this.onFixedUpdate(deltaTime);
      }
      
      if (this.onRender) {
        this.onRender(1);
      }
      return;
    }

    // Fixed-step mode with accumulator
    this.state.accumulator += deltaTime;
    this.state.updatesThisFrame = 0;

    // Run fixed updates
    let updates = 0;
    while (this.state.accumulator >= this.config.fixedStep && updates < this.config.maxUpdatesPerFrame) {
      if (this.onFixedUpdate) {
        this.frameTick++;
        const dtSeconds = this.config.fixedStep / 1000;
        this.onFixedUpdate(this.config.fixedStep);
      }
      
      this.state.accumulator -= this.config.fixedStep;
      updates++;
    }

    this.state.updatesThisFrame = updates;

    // If we hit the max updates limit, clamp accumulator to prevent spiral
    if (updates >= this.config.maxUpdatesPerFrame) {
      this.state.accumulator = 0;
    }

    // Calculate interpolation alpha
    this.state.alpha = this.state.accumulator / this.config.fixedStep;

    // Render with interpolation
    if (this.onRender) {
      this.onRender(this.state.alpha);
    }
  };

  /**
   * Pause the game loop
   */
  pause() {
    this.state.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  resume() {
    this.state.isPaused = false;
    // Reset last time to prevent huge delta
    this.state.lastTime = performance.now();
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Set time scale (0.5 = half speed, 2.0 = double speed)
   */
  setTimeScale(scale: number) {
    this.config.timeScale = Math.max(0, scale);
  }

  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.config.timeScale;
  }

  /**
   * Set fixed timestep in Hz (e.g., 60 for 60Hz)
   */
  setFixedHz(hz: number) {
    this.config.fixedStep = 1000 / hz;
  }

  /**
   * Get current fixed Hz
   */
  getFixedHz(): number {
    return 1000 / this.config.fixedStep;
  }

  /**
   * Set mode (fixedStep or legacy)
   */
  setMode(mode: "fixedStep" | "legacy") {
    this.config.mode = mode;
    if (mode === "legacy") {
      // Reset accumulator when switching to legacy
      this.state.accumulator = 0;
    }
  }

  /**
   * Get current mode
   */
  getMode(): "fixedStep" | "legacy" {
    return this.config.mode;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Get debug info
   */
  getDebugInfo(): GameLoopDebug {
    return {
      mode: this.config.mode,
      fixedHz: Math.round(1000 / this.config.fixedStep),
      maxDeltaMs: this.config.maxDeltaMs,
      accumulator: Math.round(this.state.accumulator * 100) / 100,
      timeScale: this.config.timeScale,
      fps: this.state.fps,
      updatesThisFrame: this.state.updatesThisFrame,
      alpha: Math.round(this.state.alpha * 100) / 100
    };
  }

  /**
   * Get current state
   */
  getState(): GameLoopState {
    return { ...this.state };
  }

  /**
   * Get interpolation alpha
   */
  getAlpha(): number {
    return this.state.alpha;
  }

  /**
   * Reset accumulator (useful after loading or state changes)
   */
  resetAccumulator() {
    this.state.accumulator = 0;
  }

  /**
   * Get current frame tick (deterministic counter)
   */
  getFrameTick(): number {
    return this.frameTick;
  }
}
