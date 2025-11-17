import { toggleVisibility } from './ui.js';

/**
 * Detects if the device is iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detects if the app is running in standalone mode (added to home screen)
 */
export const isStandalone = () => {
  return window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    document.referrer.includes('android-app://');
};

/**
 * Initialize the landing page and app content visibility
 * Shows landing page when NOT in standalone mode
 * Shows app content ONLY when in standalone mode
 */
export const initAddToHomeBanner = () => {
  const landingPage = document.getElementById('landing-page');
  const appContent = document.getElementById('app-content');
  
  if (!landingPage || !appContent) {
    return;
  }
  
  const standalone = isStandalone();
  
  // If in standalone mode, show app and hide landing page
  // Otherwise, show landing page and hide app
  if (standalone) {
    toggleVisibility(landingPage, false);
    toggleVisibility(appContent, true);
  } else {
    toggleVisibility(landingPage, true);
    toggleVisibility(appContent, false);
  }
  
  // Re-check on page visibility change (in case user returns from adding to home screen)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const newStandalone = isStandalone();
      if (newStandalone && !standalone) {
        // User just added to home screen, switch to app
        toggleVisibility(landingPage, false);
        toggleVisibility(appContent, true);
        // Reload to ensure app initializes properly
        window.location.reload();
      }
    }
  });
};

