// Debug-aware toast wrapper - only shows toasts when debug mode is enabled
import { toast as sonnerToast, ExternalToast } from "sonner";
import { ENABLE_DEBUG_FEATURES } from "@/constants/game";

// Create a callable function that also has methods
const createDebugToast = () => {
  // Base callable function for direct toast() calls
  const baseToast = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast(message, options);
    }
  };

  // Add method variants
  baseToast.success = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast.success(message, options);
    }
  };

  baseToast.error = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast.error(message, options);
    }
  };

  baseToast.warning = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast.warning(message, options);
    }
  };

  baseToast.info = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast.info(message, options);
    }
  };

  baseToast.message = (message: string, options?: ExternalToast) => {
    if (ENABLE_DEBUG_FEATURES) {
      return sonnerToast.message(message, options);
    }
  };

  return baseToast;
};

export const debugToast = createDebugToast();

// Re-export original toast for cases that should always show (like clipboard in LevelEditor)
export { sonnerToast as alwaysToast };
