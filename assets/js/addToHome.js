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
 * Checks if the banner should be shown
 */
const shouldShowBanner = () => {
  // Don't show if already in standalone mode
  if (isStandalone()) {
    return false;
  }
  
  // Only show on iOS devices
  if (!isIOS()) {
    return false;
  }
  
  // Check if user has previously dismissed the banner
  const dismissed = localStorage.getItem('addToHomeBannerDismissed');
  if (dismissed === 'true') {
    return false;
  }
  
  return true;
};

/**
 * Initialize the "Add to Home Screen" banner
 */
export const initAddToHomeBanner = () => {
  const banner = document.getElementById('add-to-home-banner');
  const closeButton = document.getElementById('add-to-home-close');
  
  if (!banner || !closeButton) {
    return;
  }
  
  // Show banner if conditions are met
  if (shouldShowBanner()) {
    toggleVisibility(banner, true);
    
    // Hide after 30 seconds automatically
    setTimeout(() => {
      if (!banner.classList.contains('concealed')) {
        toggleVisibility(banner, false);
      }
    }, 30000);
  }
  
  // Handle close button click
  closeButton.addEventListener('click', () => {
    toggleVisibility(banner, false);
    // Remember user's dismissal for this session and next visit
    localStorage.setItem('addToHomeBannerDismissed', 'true');
  });
  
  // Re-check on page visibility change (in case user returns from adding to home screen)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isStandalone()) {
      // User added to home screen, hide banner immediately
      toggleVisibility(banner, false);
    }
  });
};

