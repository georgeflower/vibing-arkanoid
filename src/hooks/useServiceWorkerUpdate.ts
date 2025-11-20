import { useEffect, useState } from 'react';

export const useServiceWorkerUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

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
                if (newWorker.state === 'activated') {
                  console.log('New version activated, reloading...');
                  setUpdateAvailable(true);
                  
                  // Wait a moment for caches to clear, then reload
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
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
  }, []);

  return { updateAvailable };
};
