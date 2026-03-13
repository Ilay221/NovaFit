/**
 * Utility functions for device haptic feedback using the Vibration API.
 * This will gracefully fail on unsupported devices (e.g. iOS Safari without special configurations, or desktop browsers).
 */

// Check if vibrations are supported by the browser/device
const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

export const haptics = {
  /**
   * Very light haptic tap. Good for minor interactions like selecting an item.
   */
  light: () => {
    if (!isSupported) return;
    try {
      navigator.vibrate(10);
    } catch (e) {
      // Ignore errors (e.g., if user hasn't interacted with page yet)
    }
  },

  /**
   * Medium tap. Good for confirming an action (like adding a meal).
   */
  medium: () => {
    if (!isSupported) return;
    try {
      navigator.vibrate(25);
    } catch (e) {}
  },

  /**
   * Heavy tap. Used for destructive or very significant actions.
   */
  heavy: () => {
    if (!isSupported) return;
    try {
      navigator.vibrate(50);
    } catch (e) {}
  },

  /**
   * "Success" pattern (two quick affirming taps).
   */
  success: () => {
    if (!isSupported) return;
    try {
      navigator.vibrate([15, 60, 20]);
    } catch (e) {}
  },

  /**
   * "Warning" or "Error" pattern (three rapid taps).
   */
  error: () => {
    if (!isSupported) return;
    try {
      navigator.vibrate([20, 40, 20, 40, 20]);
    } catch (e) {}
  }
};
