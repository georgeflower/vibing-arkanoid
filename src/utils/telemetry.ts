/**
 * Production Telemetry Collector
 * Silently samples performance + collision metrics and batches them to the backend.
 * Gated by ENABLE_TELEMETRY constant.
 */

export const ENABLE_TELEMETRY = true;

const FLUSH_THRESHOLD = 10; // auto-flush after 10 snapshots
const EDGE_FUNCTION_PATH = "submit-telemetry";

export interface TelemetrySnapshot {
  session_id: string;
  snapshot_type: "periodic" | "summary";
  level?: number;
  difficulty?: string;
  game_mode?: string;
  avg_fps?: number;
  min_fps?: number;
  quality_level?: string;
  ball_count?: number;
  brick_count?: number;
  enemy_count?: number;
  particle_count?: number;
  explosion_count?: number;
  ccd_total_ms?: number;
  ccd_substeps?: number;
  ccd_collisions?: number;
  toi_iterations?: number;
  wall_collisions?: number;
  brick_collisions?: number;
  paddle_collisions?: number;
  boss_collisions?: number;
  boss_active?: boolean;
  boss_type?: string;
  duration_seconds?: number;
  final_score?: number;
  total_quality_changes?: number;
  user_agent?: string;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

class TelemetryCollector {
  private sessionId: string = "";
  private difficulty: string = "";
  private gameMode: string = "";
  private buffer: TelemetrySnapshot[] = [];
  private sessionStart: number = 0;
  private active: boolean = false;
  private flushing: boolean = false;

  // Collision counters (incremented in-place, reset on snapshot)
  private wallCollisions = 0;
  private brickCollisions = 0;
  private paddleCollisions = 0;
  private bossCollisions = 0;

  // Track quality changes
  private lastQuality: string = "";
  private qualityChanges = 0;

  // Track min FPS across session
  private sessionMinFps = 999;

  private endpoint: string = "";

  constructor() {
    // Build endpoint URL from env
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (projectId) {
      this.endpoint = `https://${projectId}.supabase.co/functions/v1/${EDGE_FUNCTION_PATH}`;
    }

    // Flush on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && this.active) {
          this.flush(true);
        }
      });
    }
  }

  startSession(difficulty: string, gameMode: string) {
    if (!ENABLE_TELEMETRY || !this.endpoint || this.active) return;
    this.sessionId = generateUUID();
    this.difficulty = difficulty;
    this.gameMode = gameMode;
    this.sessionStart = performance.now();
    this.active = true;
    this.buffer = [];
    this.wallCollisions = 0;
    this.brickCollisions = 0;
    this.paddleCollisions = 0;
    this.bossCollisions = 0;
    this.qualityChanges = 0;
    this.lastQuality = "";
    this.sessionMinFps = 999;
  }

  recordSnapshot(metrics: {
    level: number;
    avgFps: number;
    minFps: number;
    qualityLevel: string;
    ballCount: number;
    brickCount: number;
    enemyCount: number;
    particleCount: number;
    explosionCount: number;
    ccdTotalMs: number;
    ccdSubsteps: number;
    ccdCollisions: number;
    toiIterations: number;
    bossActive: boolean;
    bossType: string | null;
  }) {
    if (!this.active) return;

    // Track quality changes
    if (this.lastQuality && metrics.qualityLevel !== this.lastQuality) {
      this.qualityChanges++;
    }
    this.lastQuality = metrics.qualityLevel;

    // Track session min FPS
    if (metrics.minFps < this.sessionMinFps) {
      this.sessionMinFps = metrics.minFps;
    }

    this.buffer.push({
      session_id: this.sessionId,
      snapshot_type: "periodic",
      level: metrics.level,
      difficulty: this.difficulty,
      game_mode: this.gameMode,
      avg_fps: metrics.avgFps,
      min_fps: metrics.minFps,
      quality_level: metrics.qualityLevel,
      ball_count: metrics.ballCount,
      brick_count: metrics.brickCount,
      enemy_count: metrics.enemyCount,
      particle_count: metrics.particleCount,
      explosion_count: metrics.explosionCount,
      ccd_total_ms: metrics.ccdTotalMs,
      ccd_substeps: metrics.ccdSubsteps,
      ccd_collisions: metrics.ccdCollisions,
      toi_iterations: metrics.toiIterations,
      wall_collisions: this.wallCollisions,
      brick_collisions: this.brickCollisions,
      paddle_collisions: this.paddleCollisions,
      boss_collisions: this.bossCollisions,
      boss_active: metrics.bossActive,
      boss_type: metrics.bossType || undefined,
    });

    // Reset collision counters after snapshot
    this.wallCollisions = 0;
    this.brickCollisions = 0;
    this.paddleCollisions = 0;
    this.bossCollisions = 0;

    if (this.buffer.length >= FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  recordCollision(type: "wall" | "brick" | "paddle" | "boss" | "enemy") {
    if (!this.active) return;
    switch (type) {
      case "wall": this.wallCollisions++; break;
      case "brick": this.brickCollisions++; break;
      case "paddle": this.paddleCollisions++; break;
      case "boss":
      case "enemy": this.bossCollisions++; break;
    }
  }

  endSession(finalScore: number, finalLevel: number) {
    if (!this.active) return;

    const duration = (performance.now() - this.sessionStart) / 1000;

    this.buffer.push({
      session_id: this.sessionId,
      snapshot_type: "summary",
      level: finalLevel,
      difficulty: this.difficulty,
      game_mode: this.gameMode,
      min_fps: this.sessionMinFps < 999 ? this.sessionMinFps : undefined,
      duration_seconds: duration,
      final_score: finalScore,
      total_quality_changes: this.qualityChanges,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });

    this.active = false;
    this.flush();
  }

  private async flush(useBeacon = false) {
    if (this.buffer.length === 0 || this.flushing) return;

    const batch = this.buffer.splice(0);
    const payload = JSON.stringify({ snapshots: batch });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, payload);
      return;
    }

    this.flushing = true;
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    } catch {
      // Silent failure — telemetry is best-effort
    } finally {
      this.flushing = false;
    }
  }
}

// Singleton
export const telemetryCollector = new TelemetryCollector();
