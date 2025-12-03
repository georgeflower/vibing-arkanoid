import { useState, useCallback, useEffect } from "react";

export interface TutorialStep {
  id: string;
  trigger: 'level_start' | 'power_up_drop' | 'boss_spawn' | 'first_brick_hit' | 'boss_power_up_drop' | 'turret_collected';
  level?: number; // Optional: only trigger on specific level
  message: string;
  title: string;
  highlight?: { description: string };
  pauseGame: boolean;
  slowMotion: boolean; // 0.25x speed
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'controls_intro',
    trigger: 'level_start',
    level: 1,
    title: 'WELCOME TO VIBING ARKANOID!',
    message: 'Use your MOUSE to move the paddle left and right.\nCLICK to launch the ball and destroy all bricks!',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'keyboard_controls',
    trigger: 'first_brick_hit',
    level: 1,
    title: 'GREAT HIT!',
    message: 'You can also press F for fullscreen and P or ESC to pause.\nDestroy all bricks to advance to the next level!',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'power_up_intro',
    trigger: 'power_up_drop',
    title: 'POWER-UP DROPPED!',
    message: 'Catch power-ups to gain special abilities!\n🔥 Fireball - passes through bricks\n⚡ Multi-ball - creates extra balls\n🛡️ Shield - protects from losing a life\n🔫 Turrets - fire bullets at bricks!',
    highlight: { description: 'power_up' },
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'turret_collected',
    trigger: 'turret_collected',
    title: 'TURRETS ACTIVATED!',
    message: 'You collected turrets with 30 bullets!\nClick or tap to fire at bricks.\n\n💡 TIP: Collect another turret while active\nto get SUPER TURRETS that destroy metal bricks!',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'boss_intro',
    trigger: 'boss_spawn',
    level: 5,
    title: 'BOSS BATTLE!',
    message: 'A powerful boss has appeared!\nHit the boss with your ball to damage it.\nAvoid its attacks - they will destroy your shield or cost you a life!',
    pauseGame: true,
    slowMotion: false,
  },
  {
    id: 'boss_power_ups',
    trigger: 'boss_power_up_drop',
    title: 'BOSS POWER-UP!',
    message: 'Special boss power-ups help defeat the boss!\n⚡ STUNNER - Freezes the boss for 5 seconds\n🔄 REFLECT - Reflects boss attacks back\n🎯 HOMING - Ball seeks the boss!',
    pauseGame: true,
    slowMotion: false,
  },
];

const TUTORIAL_STORAGE_KEY = 'vibing_arkanoid_tutorial_completed';
const COMPLETED_STEPS_KEY = 'vibing_arkanoid_tutorial_steps';

export const useTutorial = () => {
  const [tutorialEnabled, setTutorialEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return stored !== 'true'; // Tutorial enabled if NOT completed
  });
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(COMPLETED_STEPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [tutorialActive, setTutorialActive] = useState(false);

  // Persist completed steps to localStorage
  useEffect(() => {
    if (completedSteps.size > 0) {
      localStorage.setItem(COMPLETED_STEPS_KEY, JSON.stringify([...completedSteps]));
    }
  }, [completedSteps]);

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

  // Skip all tutorials
  const skipAllTutorials = useCallback(() => {
    setTutorialEnabled(false);
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  }, []);

  // Reset tutorials (for testing or new players)
  const resetTutorials = useCallback(() => {
    setTutorialEnabled(true);
    setCompletedSteps(new Set());
    setCurrentStep(null);
    setTutorialActive(false);
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(COMPLETED_STEPS_KEY);
  }, []);

  // Mark tutorial as complete when all steps are done
  useEffect(() => {
    if (completedSteps.size >= TUTORIAL_STEPS.length) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
  }, [completedSteps]);

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
