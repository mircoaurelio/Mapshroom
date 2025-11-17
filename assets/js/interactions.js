import { updateTransformStyles, toggleOverlayDisplay, toggleVisibility, setControlsEnabled } from './ui.js';

const updateTransformUI = ({ state, video, rotationLocked = false, lockedWidth = null, lockedHeight = null }) => {
  updateTransformStyles(state, video, rotationLocked, lockedWidth, lockedHeight);
};

const adjustOffsets = (state, direction) => {
  switch (direction) {
    case 'move-up':
      state.offsetY -= state.precision;
      break;
    case 'move-down':
      state.offsetY += state.precision;
      break;
    case 'move-left':
      state.offsetX -= state.precision;
      break;
    case 'move-right':
      state.offsetX += state.precision;
      break;
    default:
      break;
  }
};

const adjustDimensions = (state, action, wrapper) => {
  switch (action) {
    case 'height-plus':
      state.heightAdjust += state.precision;
      break;
    case 'height-minus':
      state.heightAdjust = Math.max(state.heightAdjust - state.precision, state.MIN_VISIBLE_SIZE - wrapper.clientHeight);
      break;
    case 'width-plus':
      state.widthAdjust += state.precision;
      break;
    case 'width-minus':
      state.widthAdjust = Math.max(state.widthAdjust - state.precision, state.MIN_VISIBLE_SIZE - wrapper.clientWidth);
      break;
    default:
      break;
  }
};

export const createTransformController = ({ elements, store, persistence }) => {
  const { state, resetTransform, updatePrecision, setOverlayActive, setHasVideo, setMoveMode, setRotationLocked, setLockedOrientationAngle, setLockedViewportSize } = store;
  const {
    video: initialVideo,
    playBtn,
    moveBtn,
    aiBtn,
    timelineBtn,
    precisionControl,
    gridOverlay,
    chooseLabel,
    controls,
    videoWrapper,
    rotateLockBtn,
  } = elements;

  let currentVideo = initialVideo || null;
  let playButtonPrimed = false;
  const videoListeners = new WeakMap();

  const persistTransform = () => {
    if (persistence && typeof persistence.saveTransform === 'function') {
      persistence.saveTransform(state);
    }
  };

  const persistPrecision = () => {
    if (persistence && typeof persistence.savePrecision === 'function') {
      persistence.savePrecision(state.precision);
    }
  };

  const updateTransform = () => {
    // Pass rotation lock state and locked dimensions to update transform
    const lockedWidth = state.rotationLocked && state.lockedViewportWidth ? state.lockedViewportWidth : null;
    const lockedHeight = state.rotationLocked && state.lockedViewportHeight ? state.lockedViewportHeight : null;
    updateTransformUI({ state, video: currentVideo, rotationLocked: state.rotationLocked, lockedWidth, lockedHeight });
    persistTransform();
  };
  const playIconImg = playBtn.querySelector('img');
  const updatePlayButton = () => {
    const shouldShowPausedState = !playButtonPrimed || !currentVideo || currentVideo.paused;
    const nextLabel = shouldShowPausedState ? 'Play video' : 'Pause video';

    if (playIconImg) {
      const nextSrc = shouldShowPausedState
        ? playBtn.getAttribute('data-icon-play') || playIconImg.dataset.play || 'assets/icons/play.svg'
        : playBtn.getAttribute('data-icon-pause') || playIconImg.dataset.pause || 'assets/icons/pause.svg';
      playIconImg.src = nextSrc;
    } else {
      playBtn.textContent = shouldShowPausedState ? 'play_circle' : 'pause_circle';
    }

    playBtn.setAttribute('aria-label', nextLabel);
  };

  const updateMoveButton = () => {
    const active = state.moveMode;
    moveBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    moveBtn.disabled = !state.hasVideo;
    const nextLabel = active ? 'Disable move mode' : 'Enable move mode';
    moveBtn.setAttribute('aria-label', nextLabel);
  };

  const getCurrentOrientationAngle = () => {
    // Try to get angle from Screen Orientation API
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    
    // Fallback: determine angle from window dimensions
    const isLandscape = window.innerWidth > window.innerHeight;
    return isLandscape ? 90 : 0;
  };

  const normalizeAngle = (angle) => {
    // Normalize angle to 0, 90, 180, or 270
    angle = angle % 360;
    if (angle < 0) angle += 360;
    
    // Round to nearest 90 degrees
    const rounded = Math.round(angle / 90) * 90;
    return rounded % 360;
  };

  const isSameOrientationType = (angle1, angle2) => {
    // Check if two angles represent the same orientation type (landscape vs portrait)
    // Landscape: 90 or 270
    // Portrait: 0 or 180
    const isLandscape1 = angle1 === 90 || angle1 === 270;
    const isLandscape2 = angle2 === 90 || angle2 === 270;
    return isLandscape1 === isLandscape2;
  };

  const calculateRotationDiff = (lockedAngle, currentAngle) => {
    // Calculate the rotation needed to keep content visually the same
    // When device rotates, we need to counter-rotate the content
    
    // Calculate the raw angle difference
    let rawDiff = currentAngle - lockedAngle;
    
    // Normalize to -180 to 180 range (shortest path)
    let deviceRotation = rawDiff;
    while (deviceRotation > 180) deviceRotation -= 360;
    while (deviceRotation < -180) deviceRotation += 360;
    
    const absRotation = Math.abs(deviceRotation);
    const isSameOrientation = isSameOrientationType(lockedAngle, currentAngle);
    
    // Special case: 180-degree flip within same orientation type
    // When device flips 180° but stays in same orientation (e.g., locked at 90°, rotated to 270°):
    // The device is physically upside down, so content should appear upside down.
    // However, the user reports it appears upside down, meaning we need to fix it.
    // 
    // The issue: When we apply rotate(180deg), content still appears upside down.
    // This suggests the transform might be combining incorrectly, or we need a different approach.
    //
    // Solution: Use scaleY(-1) to flip vertically instead of rotating.
    // For a 180° flip, we can use rotate(180deg) OR scaleY(-1) scaleX(-1).
    // Let's try rotating 180deg with proper transform origin.
    if (isSameOrientation && absRotation === 180) {
      // For 180° flip: rotate 180° to compensate for device being upside down
      // This should make content appear right-side up
      return 180;
    }
    
    // For other rotations (90° or -90° portrait<->landscape), counter-rotate by opposite amount
    // If device rotated +90° clockwise, we rotate -90° counter-clockwise
    return -deviceRotation;
  };

  const applyOrientationTransform = () => {
    if (!state.rotationLocked || state.lockedOrientationAngle === null || !videoWrapper) {
      // Remove transform and fixed dimensions if not locked
      if (videoWrapper) {
        videoWrapper.style.transform = '';
        videoWrapper.style.transformOrigin = '';
        videoWrapper.style.inset = '';
        videoWrapper.style.width = '';
        videoWrapper.style.height = '';
        videoWrapper.style.left = '';
        videoWrapper.style.top = '';
        videoWrapper.style.right = '';
        videoWrapper.style.bottom = '';
        videoWrapper.style.marginLeft = '';
        videoWrapper.style.marginTop = '';
      }
      // Remove locked viewport size from CSS variables
      document.documentElement.style.setProperty('--rotation-lock-width', '');
      document.documentElement.style.setProperty('--rotation-lock-height', '');
      document.documentElement.style.setProperty('--rotation-lock-transform', '');
      return;
    }

    const currentAngle = normalizeAngle(getCurrentOrientationAngle());
    const lockedAngle = normalizeAngle(state.lockedOrientationAngle);
    
    // Calculate rotation difference with special handling for 180-degree flips
    const rotationDiff = calculateRotationDiff(lockedAngle, currentAngle);

    // Get locked dimensions (the size when rotation was locked)
    const lockedWidth = state.lockedViewportWidth || window.innerWidth;
    const lockedHeight = state.lockedViewportHeight || window.innerHeight;
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // Lock the video wrapper to the locked dimensions
    // Remove inset to allow explicit positioning
    videoWrapper.style.inset = 'auto';
    videoWrapper.style.width = `${lockedWidth}px`;
    videoWrapper.style.height = `${lockedHeight}px`;
    videoWrapper.style.position = 'fixed';
    videoWrapper.style.boxSizing = 'border-box';
    
    // Center the wrapper in the viewport
    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;
    
    // Apply counter-rotation to maintain visual orientation
    // rotationDiff is already calculated by calculateRotationDiff
    // For 180-degree flips, calculateRotationDiff returns 180, which we'll handle specially
    if (rotationDiff !== 0) {
      // Check if this is a 180-degree rotation (for 180° flips within same orientation)
      if (Math.abs(rotationDiff) === 180) {
        // For 180-degree flips: use scaleX(-1) scaleY(-1) instead of rotate(180deg)
        // This is equivalent but might work better when combined with nested transforms
        // (like the video element's translate transform)
        videoWrapper.style.transform = `scaleX(-1) scaleY(-1)`;
      } else {
        // For other rotations (90° or -90°), use rotation
        videoWrapper.style.transform = `rotate(${rotationDiff}deg)`;
      }
      videoWrapper.style.transformOrigin = 'center center';
    } else {
      videoWrapper.style.transform = '';
      videoWrapper.style.transformOrigin = '';
    }
    
    // Center the wrapper in the viewport (before rotation transform)
    videoWrapper.style.left = `${centerX - lockedWidth / 2}px`;
    videoWrapper.style.top = `${centerY - lockedHeight / 2}px`;
    videoWrapper.style.right = 'auto';
    videoWrapper.style.bottom = 'auto';
    videoWrapper.style.marginLeft = '0';
    videoWrapper.style.marginTop = '0';
    
    // Store locked dimensions and transform in CSS variables
    document.documentElement.style.setProperty('--rotation-lock-width', `${lockedWidth}px`);
    document.documentElement.style.setProperty('--rotation-lock-height', `${lockedHeight}px`);
    
    // Store the transform string for CSS variables
    let transformStr = '';
    if (rotationDiff !== 0) {
      transformStr = Math.abs(rotationDiff) === 180 
        ? 'scaleX(-1) scaleY(-1)' 
        : `rotate(${rotationDiff}deg)`;
    }
    document.documentElement.style.setProperty('--rotation-lock-transform', transformStr);
  };

  const handleOrientationChange = () => {
    if (state.rotationLocked && state.lockedOrientationAngle !== null) {
      // Small delay to ensure orientation change is complete
      setTimeout(() => {
        applyOrientationTransform();
        // Update video transform to maintain locked dimensions
        updateTransform();
      }, 100);
    }
  };

  const lockOrientation = async () => {
    // Store current orientation angle and viewport size
    const currentAngle = normalizeAngle(getCurrentOrientationAngle());
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    setLockedOrientationAngle(currentAngle);
    setLockedViewportSize(currentWidth, currentHeight);
    
    // Try native orientation lock first (works on Android and some browsers)
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        const isLandscape = currentAngle === 90 || currentAngle === 270;
        const targetOrientation = isLandscape ? 'landscape' : 'portrait';
        await screen.orientation.lock(targetOrientation);
        // If native lock succeeds, we still use CSS for iOS compatibility
      } catch (error) {
        // Native lock failed, use CSS transform approach
        console.debug('Native orientation lock not available, using CSS transform workaround');
      }
    }
    
    // Apply CSS transform immediately to lock dimensions
    applyOrientationTransform();
    
    // Update video transform to use locked dimensions
    updateTransform();
    
    // Set up orientation change listener
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Also listen to screen orientation changes if available
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    return true;
  };

  const unlockOrientation = async () => {
    // Try native unlock first
    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      try {
        await screen.orientation.unlock();
      } catch (error) {
        console.debug('Native orientation unlock failed');
      }
    }
    
    // Remove CSS transforms and fixed dimensions from video wrapper
    applyOrientationTransform(); // This will clean up when rotationLocked is false
    
    // Update video transform to use viewport units again
    updateTransform();
    
    // Remove event listeners
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', handleOrientationChange);
    }
    
    // Clear locked angle and viewport size
    setLockedOrientationAngle(null);
    setLockedViewportSize(null, null);
  };

  const updateRotationLockButton = () => {
    const locked = state.rotationLocked;
    rotateLockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    const nextLabel = locked ? 'Unlock screen rotation' : 'Lock screen rotation';
    rotateLockBtn.setAttribute('aria-label', nextLabel);
  };

  const applyRotationLock = async (locked, { persist = true } = {}) => {
    setRotationLocked(locked);
    updateRotationLockButton();

    if (locked) {
      await lockOrientation();
    } else {
      await unlockOrientation();
    }

    if (persist && persistence) {
      if (typeof persistence.saveRotationLock === 'function') {
        persistence.saveRotationLock(state.rotationLocked);
      }
      if (typeof persistence.saveLockedOrientationAngle === 'function' && state.lockedOrientationAngle !== null) {
        persistence.saveLockedOrientationAngle(state.lockedOrientationAngle);
      }
      if (typeof persistence.saveLockedViewportSize === 'function' && state.lockedViewportWidth !== null && state.lockedViewportHeight !== null) {
        persistence.saveLockedViewportSize(state.lockedViewportWidth, state.lockedViewportHeight);
      }
    }
  };

  const applyMoveMode = (active, { persist = true } = {}) => {
    setMoveMode(active);
    gridOverlay.dataset.moveMode = active ? 'active' : 'inactive';
    updateMoveButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);
    toggleVisibility(chooseLabel, !state.moveMode);
    toggleVisibility(rotateLockBtn, state.hasVideo && state.moveMode);

    if (active && state.hasVideo) {
      // When move mode is activated, ensure overlay is active (controls visible)
      // Center button is disabled (reserved for future feature)
      if (!state.overlayActive) {
        applyOverlayUI(true, { toggleUI: false });
      }
      // Always show controls when move mode is active
      toggleVisibility(controls, true);
    } else if (!active && state.hasVideo) {
      // When move mode is deactivated, restore normal overlay behavior
      // Controls visibility follows overlay state
      applyOverlayUI(state.overlayActive, { toggleUI: true });
    }

    // If move mode is disabled, unlock rotation
    if (!active && state.rotationLocked) {
      applyRotationLock(false, { persist });
    }

    if (persist && persistence && typeof persistence.saveMoveMode === 'function') {
      persistence.saveMoveMode(state.moveMode);
    }
  };

  const applyOverlayUI = (active, { toggleUI = true } = {}) => {
    setOverlayActive(active);
    toggleOverlayDisplay(gridOverlay, state.overlayActive);

    if (!toggleUI || !state.hasVideo) {
      return;
    }

    // When move mode is active, controls visibility is managed by applyMoveMode
    // When move mode is inactive, show controls only when overlay is active
    if (state.moveMode) {
      // Don't change controls visibility when move mode is active
      toggleVisibility(chooseLabel, false);
      return;
    }

    // When move mode is inactive, normal overlay behavior
    const shouldShow = active;
    toggleVisibility(chooseLabel, shouldShow);
    toggleVisibility(controls, shouldShow);
    toggleVisibility(precisionControl, false);
  };

  const enableControls = (enabled) => {
    setControlsEnabled([playBtn, moveBtn, aiBtn], enabled);
    if (timelineBtn) {
      timelineBtn.disabled = !enabled;
    }
    setHasVideo(enabled);

    const shouldShowControls = enabled;
    toggleVisibility(controls, shouldShowControls);
    toggleVisibility(precisionControl, enabled && state.moveMode);
    toggleVisibility(chooseLabel, !state.moveMode);
    toggleVisibility(rotateLockBtn, enabled && state.moveMode);

    applyOverlayUI(enabled, { toggleUI: false });

    if (!enabled) {
      resetTransform();
      updateTransform();
      gridOverlay.dataset.moveMode = 'inactive';
      playButtonPrimed = false;
      // Unlock rotation when video is disabled
      if (state.rotationLocked) {
        applyRotationLock(false, { persist: false });
      }
    }

    updatePlayButton();
    updateMoveButton();
  };

  const showPreloadUI = () => {
    toggleVisibility(chooseLabel, true);
    toggleVisibility(controls, false);
    toggleVisibility(precisionControl, false);
  };


  const handleZoneAction = (action) => {
    if (action !== 'toggle-overlay' && !state.overlayActive) {
      return;
    }

    const wrapper = currentVideo?.parentElement || initialVideo?.parentElement || videoWrapper;
    const movementActions = ['move-up', 'move-down', 'move-left', 'move-right'];
    const dimensionActions = ['height-plus', 'height-minus', 'width-plus', 'width-minus'];

    if (movementActions.includes(action) || dimensionActions.includes(action)) {
      if (!state.moveMode) {
        return;
      }
    }

    if (movementActions.includes(action)) {
      adjustOffsets(state, action);
      updateTransform();
      return;
    }

    if (dimensionActions.includes(action)) {
      adjustDimensions(state, action, wrapper);
      updateTransform();
      return;
    }

    if (action === 'toggle-overlay') {
      // Disable toggle-overlay when move mode is active (reserved for future feature)
      if (state.moveMode) {
        return;
      }
      const nextActive = !state.overlayActive;
      applyOverlayUI(nextActive);
    }
  };

  const handlePrecisionChange = (nextPrecision) => {
    updatePrecision(nextPrecision);
    persistPrecision();
  };

  const handleReset = () => {
    if (!currentVideo) {
      return;
    }

    currentVideo.pause();
    currentVideo.currentTime = 0;
    resetTransform();
    updateTransform();
    updatePlayButton();
  };

  const showGridLabelsAnimation = () => {
    if (!gridOverlay || !state.hasVideo) {
      return;
    }

    // Ensure overlay is visible (remove overlay-disabled class temporarily if needed)
    const wasDisabled = gridOverlay.classList.contains('overlay-disabled');
    if (wasDisabled) {
      gridOverlay.classList.remove('overlay-disabled');
    }

    // Add show-labels class to trigger animation
    gridOverlay.classList.add('show-labels');
    
    // Show all labels
    const labels = gridOverlay.querySelectorAll('.grid-zone-label');
    labels.forEach(label => {
      label.classList.add('show');
      label.classList.remove('hide');
    });

    // Remove show-labels class and hide labels after 2 seconds
    setTimeout(() => {
      labels.forEach(label => {
        label.classList.remove('show');
        label.classList.add('hide');
      });
      
      // Remove the class after transition completes
      setTimeout(() => {
        gridOverlay.classList.remove('show-labels');
        // Restore overlay-disabled state if it was disabled before
        if (wasDisabled && !state.overlayActive) {
          gridOverlay.classList.add('overlay-disabled');
        }
      }, 300); // Match CSS transition duration
    }, 2000);
  };

  const handleMoveToggle = () => {
    const next = !state.moveMode;
    applyMoveMode(next);
    
    // Show grid labels animation when move mode is activated
    if (next && state.hasVideo) {
      showGridLabelsAnimation();
    }
  };

  const handleRotationLockToggle = () => {
    const next = !state.rotationLocked;
    applyRotationLock(next);
  };

  const handlePlay = async () => {
    if (!currentVideo) {
      return;
    }

    playButtonPrimed = true;
    if (currentVideo.paused) {
      try {
        await currentVideo.play();
      } catch (error) {
        console.warn('Autoplay blocked:', error);
      }
    } else {
      currentVideo.pause();
    }

    updatePlayButton();
  };

  const handleOverlayState = (active, options) => {
    applyOverlayUI(active, options);
  };

  const detachVideoListeners = (videoEl) => {
    if (!videoEl) {
      return;
    }
    const listeners = videoListeners.get(videoEl);
    if (listeners) {
      videoEl.removeEventListener('play', listeners.handlePlay);
      videoEl.removeEventListener('pause', listeners.handlePause);
      videoListeners.delete(videoEl);
    }
  };

  const attachVideoListeners = (videoEl) => {
    if (!videoEl) {
      return;
    }
    if (videoListeners.has(videoEl)) {
      return;
    }

    const handlePlay = () => {
      playButtonPrimed = true;
      updatePlayButton();
    };

    const handlePause = () => {
      updatePlayButton();
    };

    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoListeners.set(videoEl, { handlePlay, handlePause });
  };

  const setVideoElement = (videoEl) => {
    if (videoEl === currentVideo) {
      // Update with rotation lock state
      const lockedWidth = state.rotationLocked && state.lockedViewportWidth ? state.lockedViewportWidth : null;
      const lockedHeight = state.rotationLocked && state.lockedViewportHeight ? state.lockedViewportHeight : null;
      updateTransformUI({ state, video: currentVideo, rotationLocked: state.rotationLocked, lockedWidth, lockedHeight });
      updatePlayButton();
      updateMoveButton();
      return;
    }

    detachVideoListeners(currentVideo);
    currentVideo = videoEl || null;
    attachVideoListeners(currentVideo);
    // Update with rotation lock state
    const lockedWidth = state.rotationLocked && state.lockedViewportWidth ? state.lockedViewportWidth : null;
    const lockedHeight = state.rotationLocked && state.lockedViewportHeight ? state.lockedViewportHeight : null;
    updateTransformUI({ state, video: currentVideo, rotationLocked: state.rotationLocked, lockedWidth, lockedHeight });
    updatePlayButton();
    updateMoveButton();
  };

  attachVideoListeners(currentVideo);

  // Restore rotation lock state if it was persisted
  requestAnimationFrame(async () => {
    gridOverlay.dataset.moveMode = state.moveMode ? 'active' : 'inactive';
    updateMoveButton();
    updateRotationLockButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);
    toggleVisibility(rotateLockBtn, state.hasVideo && state.moveMode);

    // If rotation was locked, restore the lock and apply transforms
    if (state.rotationLocked && state.hasVideo) {
      // Small delay to ensure orientation API is ready
      setTimeout(async () => {
        // Restore locked orientation angle if it was persisted
        if (state.lockedOrientationAngle !== null) {
          // Apply the transform immediately to maintain visual orientation
          applyOrientationTransform();
          // Set up orientation change listeners
          window.addEventListener('orientationchange', handleOrientationChange);
          window.addEventListener('resize', handleOrientationChange);
          if (screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
          }
        } else {
          // Lock to current orientation if no angle was persisted
          await lockOrientation();
        }
      }, 100);
    }
  });

  return {
    setVideoElement,
    updateTransform,
    enableControls,
    showPreloadUI,
    handleZoneAction,
    handlePrecisionChange,
    handleReset,
    handlePlay,
    handleOverlayState,
    handleMoveToggle,
    handleRotationLockToggle,
  };
};

