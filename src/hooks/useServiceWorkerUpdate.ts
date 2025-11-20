import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UseServiceWorkerUpdateOptions {
  shouldApplyUpdate?: boolean;
}

export const useServiceWorkerUpdate = (options: UseServiceWorkerUpdateOptions = {}) => {
  const { shouldApplyUpdate = false } = options;
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          console.log('Forcing SW update check...');
          
          // Force immediate update check
          await registration.update();

          // Listen for new service worker installing
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installing') {
                  setIsDownloading(true);
                  toast.info('📥 Downloading update...', { duration: 3000 });
                }
                
                if (newWorker.state === 'activated') {
                  console.log('New version activated');
                  setIsDownloading(false);
                  setUpdateAvailable(true);
                  
                  if (shouldApplyUpdate) {
                    // User is at main menu - safe to reload
                    toast.success('✅ Update ready! Refreshing...', { duration: 1500 });
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  } else {
                    // User is in game - defer reload
                    toast.info('🎮 Update ready! Will apply when you return to menu', {
                      duration: 5000,
                    });
                  }
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('SW update check failed:', error);
      }
    };

    // Force check immediately when component mounts
    checkForUpdate();

    // Also check when page becomes visible again (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldApplyUpdate]);

  return { updateAvailable, isDownloading };
};
