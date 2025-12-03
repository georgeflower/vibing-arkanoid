import { useState, useCallback, useEffect } from "react";

export interface TutorialStep {
  id: string;
  trigger: 'level_start' | 'power_up_drop' | 'boss_spawn' | 'first_brick_hit' | 'boss_power_up_drop' | 'turret_collected' | 'minion_spawn' | 'bonus_letter_drop';
  level?: number; // Optional: only trigger on specific level
  bossLevelOnly?: boolean; // Only trigger on boss levels (5, 10, 15, 20)
  message: string;
  title: string;
  highlight?: { type: 'power_up' | 'boss' | 'enemy' | 'bonus_letter' };
  pauseGame: boolean;
  slowMotion: boolean; // 0.25x speed
  floatingText?: boolean; // Special floating text that follows target
}

const BOSS_LEVELS = [5, 10, 15, 20];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'controls_intro',
    trigger: 'level_start',
    level: 1,
    title: 'WELCOME!',
    message: 'MOUSE to move paddle\nCLICK to launch ball\nDestroy bricks to clear level\nThe 1st boss awaits on level 5!',
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
    message: 'Use ball or turret to kill boss\nAvoid its attacks!',
    highlight: { type: 'boss' },
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'minion_intro',
    trigger: 'minion_spawn',
    bossLevelOnly: true,
    title: 'MINION!',
    message: 'Kill minions to get\nspecial boss power-ups!',
    highlight: { type: 'enemy' },
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
  {
    id: 'bonus_letter_intro',
    trigger: 'bonus_letter_drop',
    title: '',
    message: 'Catch all letters for megabonus!',
    highlight: { type: 'bonus_letter' },
    pauseGame: false,
    slowMotion: false,
    floatingText: true,
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
    
    const step = TUTORIAL_STEPS.find(s => {
      if (s.trigger !== trigger) return false;
      if (completedSteps.has(s.id)) return false;
      if (s.level !== undefined && s.level !== level) return false;
      if (s.bossLevelOnly && !BOSS_LEVELS.includes(level)) return false;
      return true;
    });
    
    return step || null;
  }, [tutorialEnabled, completedSteps]);

  // Trigger a tutorial step
  const triggerTutorial = useCallback((
    trigger: TutorialStep['trigger'],
    level: number
  ): { shouldPause: boolean; shouldSlowMotion: boolean } => {
    const step = checkTrigger(trigger, level);
    
    if (step) {
      // For floatingText tutorials, don't show overlay - just mark as completed
      if (step.floatingText) {
        setCompletedSteps(prev => new Set([...prev, step.id]));
        return { shouldPause: false, shouldSlowMotion: false };
      }
      
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
