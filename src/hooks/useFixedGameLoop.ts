import { useRef, useCallback, useEffect } from "react";
import { FixedStepGameLoop } from "@/utils/gameLoop";
import type { Ball, Paddle, Brick, Enemy, Bomb, PowerUp, Bullet, BonusLetter } from "@/types/game";

/**
 * Simulation state stored in refs for immediate physics updates
 * React state is only updated for UI rendering
 */
export interface SimulationState {
  balls: Ball[];
  paddle: Paddle | null;
  bricks: Brick[];
  enemies: Enemy[];
  bombs: Bomb[];
  powerUps: PowerUp[];
  bullets: Bullet[];
  bonusLetters: BonusLetter[];
  timer: number;
  backgroundPhase: number;
}

export interface FixedGameLoopCallbacks {
  onFixedUpdate: (dt: number, simState: SimulationState) => void;
  onRender: (alpha: number, simState: SimulationState) => void;
}

/**
 * Hook that manages the fixed-step game loop
 * Separates physics simulation (60Hz) from rendering (variable FPS)
 */
export function useFixedGameLoop(speedMultiplier: number = 1) {
  const gameLoopRef = useRef<FixedStepGameLoop | null>(null);
  const simStateRef = useRef<SimulationState>({
    balls: [],
    paddle: null,
    bricks: [],
    enemies: [],
    bombs: [],
    powerUps: [],
    bullets: [],
    bonusLetters: [],
    timer: 0,
    backgroundPhase: 0,
  });

  // Initialize game loop
  useEffect(() => {
    const loop = new FixedStepGameLoop({
      fixedStep: 16.6667, // 60Hz
      maxDeltaMs: 250,
      maxUpdatesPerFrame: 10,
      timeScale: speedMultiplier,
      mode: "fixedStep"
    });

    gameLoopRef.current = loop;

    return () => {
      loop.stop();
    };
  }, []);

  // Update time scale when speed multiplier changes
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setTimeScale(speedMultiplier);
    }
  }, [speedMultiplier]);

  const setCallbacks = useCallback((callbacks: FixedGameLoopCallbacks) => {
    if (!gameLoopRef.current) return;

    gameLoopRef.current.setFixedUpdateCallback((dt: number) => {
      callbacks.onFixedUpdate(dt, simStateRef.current);
    });

    gameLoopRef.current.setRenderCallback((alpha: number) => {
      callbacks.onRender(alpha, simStateRef.current);
    });
  }, []);

  const start = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.start();
    }
  }, []);

  const stop = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }
  }, []);

  const pause = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.resume();
    }
  }, []);

  const getDebugInfo = useCallback(() => {
    return gameLoopRef.current?.getDebugInfo() || {
      mode: "fixedStep" as const,
      fixedHz: 60,
      maxDeltaMs: 250,
      accumulator: 0,
      timeScale: 1,
      fps: 0,
      updatesThisFrame: 0,
      alpha: 0
    };
  }, []);

  const updateSimulationState = useCallback((updates: Partial<SimulationState>) => {
    simStateRef.current = { ...simStateRef.current, ...updates };
  }, []);

  const getSimulationState = useCallback(() => {
    return simStateRef.current;
  }, []);

  return {
    setCallbacks,
    start,
    stop,
    pause,
    resume,
    getDebugInfo,
    updateSimulationState,
    getSimulationState,
    gameLoop: gameLoopRef.current
  };
}
