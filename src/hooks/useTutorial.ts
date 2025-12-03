import { useState, useCallback, useEffect } from "react";

export interface TutorialStep {
  id: string;
  trigger: 'level_start' | 'power_up_drop' | 'boss_spawn' | 'first_brick_hit' | 'boss_power_up_drop' | 'turret_collected';
  level?: number; // Optional: only trigger on specific level
  message: string;
  title: string;
  highlight?: { type: 'power_up' | 'boss' | 'enemy' };
  pauseGame: boolean;
  slowMotion: boolean; // 0.25x speed
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'controls_intro',
    trigger: 'level_start',
    level: 1,
    title: 'WELCOME!',
    message: 'MOUSE to move paddle\nCLICK to launch ball',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'keyboard_controls',
    trigger: 'first_brick_hit',
    level: 1,
    title: 'GREAT HIT!',
    message: 'F = fullscreen\nP/ESC = pause',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'power_up_intro',
    trigger: 'power_up_drop',
    title: 'POWER-UP!',
    message: 'Catch it for special abilities!',
    highlight: { type: 'power_up' },
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'turret_collected',
    trigger: 'turret_collected',
    title: 'TURRETS!',
    message: '30 bullets - click to fire!\nCollect again for SUPER TURRETS',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'boss_intro',
    trigger: 'boss_spawn',
    level: 5,
    title: 'BOSS BATTLE!',
    message: 'Hit the boss with your ball\nAvoid its attacks!',
    highlight: { type: 'boss' },
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'boss_power_ups',
    trigger: 'boss_power_up_drop',
    title: 'BOSS POWER-UP!',
    message: '⚡STUNNER 🔄REFLECT 🎯HOMING',
    highlight: { type: 'power_up' },
    pauseGame: true,
    slowMotion: false,
  },
];

const TUTORIAL_STORAGE_KEY = 'vibing_arkanoid_tutorial_enabled';
const COMPLETED_TUTORIALS_KEY = 'vibing_arkanoid_completed_tutorials';

export const useTutorial = () => {
  const [tutorialEnabled, setTutorialEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return stored !== 'false'; // Tutorial enabled by default
  });
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    // Load completed tutorials from localStorage
    const stored = localStorage.getItem(COMPLETED_TUTORIALS_KEY);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [tutorialActive, setTutorialActive] = useState(false);

  // Persist completed tutorials and auto-disable when all are done
  useEffect(() => {
    localStorage.setItem(COMPLETED_TUTORIALS_KEY, JSON.stringify([...completedSteps]));
    
    // Check if all tutorials are complete
    const allTutorialIds = TUTORIAL_STEPS.map(s => s.id);
    const allComplete = allTutorialIds.every(id => completedSteps.has(id));
    
    if (allComplete && tutorialEnabled) {
      // Auto-disable tutorials when all have been seen
      setTutorialEnabledState(false);
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'false');
    }
  }, [completedSteps, tutorialEnabled]);

  // Custom setter that persists to localStorage
  const setTutorialEnabled = useCallback((enabled: boolean) => {
    setTutorialEnabledState(enabled);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  // Check if a tutorial step should trigger
  const checkTrigger = useCallback((
    trigger: TutorialStep['trigger'],
    level: number
  ): TutorialStep | null => {
    if (!tutorialEnabled) return null;
    
    const step = TUTORIAL_STEPS.find(s => 
      s.trigger === trigger && 
      !completedSteps.has(s.id) &&
      (s.level === undefined || s.level === level)
    );
    
    return step || null;
  }, [tutorialEnabled, completedSteps]);

  // Trigger a tutorial step
  const triggerTutorial = useCallback((
    trigger: TutorialStep['trigger'],
    level: number
  ): { shouldPause: boolean; shouldSlowMotion: boolean } => {
    const step = checkTrigger(trigger, level);
    
    if (step) {
      setCurrentStep(step);
      setTutorialActive(true);
      return { 
        shouldPause: step.pauseGame, 
        shouldSlowMotion: step.slowMotion 
      };
    }
    
    return { shouldPause: false, shouldSlowMotion: false };
  }, [checkTrigger]);

  // Dismiss current tutorial step
  const dismissTutorial = useCallback(() => {
    if (currentStep) {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
    }
    setCurrentStep(null);
    setTutorialActive(false);
  }, [currentStep]);

  // Skip all tutorials - persists the setting
  const skipAllTutorials = useCallback(() => {
    setTutorialEnabledState(false);
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'false');
  }, []);

  // Reset tutorials (for testing or new players)
  const resetTutorials = useCallback(() => {
    setTutorialEnabledState(true);
    setCompletedSteps(new Set());
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    localStorage.removeItem(COMPLETED_TUTORIALS_KEY);
  }, []);

  return {
    tutorialEnabled,
    currentStep,
    tutorialActive,
    triggerTutorial,
    dismissTutorial,
    skipAllTutorials,
    resetTutorials,
    setTutorialEnabled,
  };
};
