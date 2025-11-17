import { toggleVisibility } from './ui.js';

/**
 * Detects if the device is iOS
 */
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detects if the app is running in standalone mode (added to home screen)
 */
const isStandalone = () => {
  return window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    document.referrer.includes('android-app://');
};

/**
 * Checks if the landing page should be shown
 */
const shouldShowLanding = () => {
  // Don't show if already in standalone mode
  if (isStandalone()) {
    return false;
  }
  
  // Only show on iOS devices
  if (!isIOS()) {
    return false;
  }
  
  return true;
};

/**
 * Update visibility of landing page and app content
 */
const updateVisibility = () => {
  const landingPage = document.getElementById('add-to-home-landing');
  const appHeader = document.getElementById('app-header');
  const appContent = document.getElementById('app-content');
  const appFooter = document.getElementById('app-footer');
  
  if (!landingPage || !appHeader || !appContent || !appFooter) {
    return;
  }
  
  const showLanding = shouldShowLanding();
  
  // Show/hide landing page
  toggleVisibility(landingPage, showLanding);
  
  // Show/hide app content (opposite of landing page)
  toggleVisibility(appHeader, !showLanding);
  toggleVisibility(appContent, !showLanding);
  toggleVisibility(appFooter, !showLanding);
};

/**
 * Initialize the "Add to Home Screen" landing page
 */
export const initAddToHomeBanner = () => {
  // Initial visibility update
  updateVisibility();
  
  // Re-check on page visibility change (in case user returns from adding to home screen)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Re-check if standalone mode changed
      updateVisibility();
    }
  });
  
  // Also check on focus (when user switches tabs and comes back)
  window.addEventListener('focus', () => {
    updateVisibility();
  });
};

