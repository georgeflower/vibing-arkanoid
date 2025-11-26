import { useEffect, RefObject } from "react";

interface UseSwipeGestureOptions {
  minSwipeDistance?: number;
  enabled?: boolean;
  leftEdgeThreshold?: number; // Percentage of screen width from left edge
}

/**
 * Custom hook to detect left-to-right swipe gestures
 * @param elementRef - Reference to the element to attach swipe listeners to
 * @param onSwipeRight - Callback function to execute on swipe-right detection
 * @param options - Configuration options for swipe detection
 */
export const useSwipeGesture = (
  elementRef: RefObject<HTMLElement>,
  onSwipeRight: () => void,
  options: UseSwipeGestureOptions = {}
) => {
  const {
    minSwipeDistance = 50,
    enabled = true,
    leftEdgeThreshold = 0.15, // Default: swipe must start in left 15% of screen
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Check if this is a horizontal swipe (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 30) {
        // Check if swipe started from left edge
        const screenWidth = window.innerWidth;
        if (startX <= screenWidth * leftEdgeThreshold) {
          // Prevent default to stop iOS Safari back gesture
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const duration = Date.now() - startTime;

      // Check if swipe started from left edge
      const screenWidth = window.innerWidth;
      if (startX > screenWidth * leftEdgeThreshold) {
        return; // Ignore swipes not starting from left edge
      }

      // Check if horizontal movement is greater than vertical (not a scroll)
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        return; // More vertical than horizontal, likely a scroll
      }

      // Check if swipe distance meets minimum threshold
      if (deltaX >= minSwipeDistance) {
        // Check if swipe was reasonably fast (not a slow drag)
        if (duration < 500) {
          onSwipeRight();
        }
      }
    };

    // Add listeners with appropriate passive flags
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false }); // passive: false to allow preventDefault
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, onSwipeRight, minSwipeDistance, enabled, leftEdgeThreshold]);
};
