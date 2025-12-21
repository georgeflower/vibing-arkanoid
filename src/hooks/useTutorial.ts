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
];

const TUTORIAL_LAST_SHOWN_KEY = 'vibing_arkanoid_tutorial_last_shown';
const COMPLETED_TUTORIALS_KEY = 'vibing_arkanoid_completed_tutorials';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Check if tutorial should be shown (once per month)
const shouldShowTutorialThisMonth = (): boolean => {
  const lastShown = localStorage.getItem(TUTORIAL_LAST_SHOWN_KEY);
  if (!lastShown) return true; // Never shown, show it
  
  const lastShownDate = parseInt(lastShown, 10);
  const now = Date.now();
  return (now - lastShownDate) >= ONE_MONTH_MS;
};

export const useTutorial = () => {
  const [tutorialEnabled, setTutorialEnabledState] = useState<boolean>(() => {
    return shouldShowTutorialThisMonth();
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

  // Persist completed tutorials and record when shown
  useEffect(() => {
    localStorage.setItem(COMPLETED_TUTORIALS_KEY, JSON.stringify([...completedSteps]));
    
    // Check if all tutorials are complete
    const allTutorialIds = TUTORIAL_STEPS.map(s => s.id);
    const allComplete = allTutorialIds.every(id => completedSteps.has(id));
    
    if (allComplete && tutorialEnabled) {
      // Record that tutorial was shown this month and disable
      localStorage.setItem(TUTORIAL_LAST_SHOWN_KEY, Date.now().toString());
      setTutorialEnabledState(false);
    }
  }, [completedSteps, tutorialEnabled]);

  // Custom setter (no longer persisted - controlled by monthly logic)
  const setTutorialEnabled = useCallback((enabled: boolean) => {
    setTutorialEnabledState(enabled);
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

  // Skip all tutorials - marks as shown this month
  const skipAllTutorials = useCallback(() => {
    setTutorialEnabledState(false);
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.setItem(TUTORIAL_LAST_SHOWN_KEY, Date.now().toString());
  }, []);

  // Reset tutorials (for testing or new players)
  const resetTutorials = useCallback(() => {
    setTutorialEnabledState(true);
    setCompletedSteps(new Set());
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.removeItem(TUTORIAL_LAST_SHOWN_KEY);
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
