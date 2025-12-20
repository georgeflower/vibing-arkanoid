import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

interface UseServiceWorkerUpdateOptions {
  shouldApplyUpdate?: boolean;
  isMainMenu?: boolean;
  isStartingGame?: boolean;
}

export const useServiceWorkerUpdate = (options: UseServiceWorkerUpdateOptions = {}) => {
  const { shouldApplyUpdate = false, isMainMenu = false, isStartingGame = false } = options;
  const hasCheckedOnGameStart = useRef(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        console.log('Forcing SW update check...');
        await registration.update();

        // Check if there's a waiting worker
        if (registration.waiting) {
          setUpdateAvailable(true);
          if (shouldApplyUpdate) {
            toast.success('✅ Update ready! Refreshing...', { duration: 1500 });
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installing') {
                setIsDownloading(true);
                toast.info('📥 Downloading update...', { duration: 3000 });
              }
              
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsDownloading(false);
                setUpdateAvailable(true);
                
                if (shouldApplyUpdate) {
                  toast.success('✅ Update ready! Refreshing...', { duration: 1500 });
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  toast.info('🎮 Update ready! Will apply when you return to menu', {
                    duration: 5000,
                  });
                }
              }
            });
          }
        });
      } catch (error) {
        console.error('SW update check failed:', error);
      }
    };

    // Check on main menu or when starting a new game (but only once per game start)
    if (isMainMenu) {
      hasCheckedOnGameStart.current = false;
      checkForUpdate();
    } else if (isStartingGame && !hasCheckedOnGameStart.current) {
      hasCheckedOnGameStart.current = true;
      checkForUpdate();
    }

    // Listen for controller change (new SW activated)
    const handleControllerChange = () => {
      console.log('New SW controller, reloading...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Also check when page becomes visible again (tab switching) - only on main menu
    const handleVisibilityChange = () => {
      if (!document.hidden && isMainMenu) {
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldApplyUpdate, isMainMenu, isStartingGame]);

  return { updateAvailable, isDownloading };
};
