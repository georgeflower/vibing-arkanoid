import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker after app loads (non-blocking)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('SW registered:', registration);
        
        // Force immediate update check on registration
        registration.update();
        
        // Check for updates more frequently (every 5 minutes)
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
        
        // Handle waiting service worker (if one exists before we checked)
        if (registration.waiting) {
          console.log('SW update ready, activating...');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
  
  // Listen for controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('New SW controller, reloading...');
    window.location.reload();
  });
}
