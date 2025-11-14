import { updateTransformStyles, toggleOverlayDisplay, toggleVisibility, setControlsEnabled } from './ui.js';

const updateTransformUI = ({ state, video }) => {
  updateTransformStyles(state, video);
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
    updateTransformUI({ state, video: currentVideo });
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

  const applyOrientationTransform = () => {
    if (!state.rotationLocked || state.lockedOrientationAngle === null || !videoWrapper) {
      // Remove transform if not locked
      if (videoWrapper) {
        videoWrapper.style.transform = '';
        videoWrapper.style.transformOrigin = '';
      }
      document.documentElement.style.setProperty('--rotation-lock-transform', '');
      return;
    }

    const currentAngle = normalizeAngle(getCurrentOrientationAngle());
    const lockedAngle = normalizeAngle(state.lockedOrientationAngle);
    const rotationDiff = lockedAngle - currentAngle;

    // Only apply transform if there's a rotation difference
    if (rotationDiff === 0) {
      videoWrapper.style.transform = '';
      videoWrapper.style.transformOrigin = '';
      document.documentElement.style.setProperty('--rotation-lock-transform', '');
      return;
    }

    // Use locked viewport dimensions if available, otherwise use current dimensions
    const lockedWidth = state.lockedViewportWidth || window.innerWidth;
    const lockedHeight = state.lockedViewportHeight || window.innerHeight;
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    // Calculate scale to maintain full coverage after rotation
    // When rotating 90/270 degrees, we need to ensure the rotated content covers the entire viewport
    const isRotated = Math.abs(rotationDiff) === 90 || Math.abs(rotationDiff) === 270;
    let scale = 1;
    
    if (isRotated) {
      // Calculate the diagonal of the locked viewport
      const lockedDiagonal = Math.sqrt(lockedWidth * lockedWidth + lockedHeight * lockedHeight);
      // Calculate the minimum dimension of the current viewport (after rotation)
      const currentMin = Math.min(currentWidth, currentHeight);
      // Scale needed to cover the rotated viewport
      scale = lockedDiagonal / currentMin;
      // Ensure we have enough coverage, add a small buffer
      scale = Math.max(scale, Math.max(currentWidth, currentHeight) / Math.min(currentWidth, currentHeight));
    }
    
    // Apply counter-rotation transform to video wrapper
    // Use transform with both rotation and scale to maintain full coverage
    videoWrapper.style.transform = `rotate(${-rotationDiff}deg) scale(${scale})`;
    videoWrapper.style.transformOrigin = 'center center';
    
    // Store transform in CSS variable for potential use elsewhere
    document.documentElement.style.setProperty('--rotation-lock-transform', `rotate(${-rotationDiff}deg) scale(${scale})`);
  };

  const handleOrientationChange = () => {
    if (state.rotationLocked && state.lockedOrientationAngle !== null) {
      // Small delay to ensure orientation change is complete
      setTimeout(() => {
        applyOrientationTransform();
      }, 50);
    }
  };

  const lockOrientation = async () => {
    // Store current orientation angle and viewport size
    const currentAngle = normalizeAngle(getCurrentOrientationAngle());
    setLockedOrientationAngle(currentAngle);
    setLockedViewportSize(window.innerWidth, window.innerHeight);
    
    // Try native orientation lock first (works on Android and some browsers)
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        const isLandscape = currentAngle === 90 || currentAngle === 270;
        const targetOrientation = isLandscape ? 'landscape' : 'portrait';
        await screen.orientation.lock(targetOrientation);
        // If native lock succeeds, we don't need CSS transforms
        return true;
      } catch (error) {
        // Native lock failed, fall back to CSS transform approach
        console.debug('Native orientation lock not available, using CSS transform workaround');
      }
    }
    
    // Apply CSS transform immediately
    applyOrientationTransform();
    
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
    
    // Remove CSS transforms from video wrapper
    if (videoWrapper) {
      videoWrapper.style.transform = '';
      videoWrapper.style.transformOrigin = '';
    }
    document.documentElement.style.setProperty('--rotation-lock-transform', '');
    
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

  const handleMoveToggle = () => {
    const next = !state.moveMode;
    applyMoveMode(next);
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
      updateTransformUI({ state, video: currentVideo });
      updatePlayButton();
      updateMoveButton();
      return;
    }

    detachVideoListeners(currentVideo);
    currentVideo = videoEl || null;
    attachVideoListeners(currentVideo);
    updateTransformUI({ state, video: currentVideo });
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

