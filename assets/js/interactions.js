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
  const { state, resetTransform, updatePrecision, setOverlayActive, setHasVideo, setMoveMode, setRotationLocked } = store;
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

  const lockOrientation = async () => {
    if (!screen.orientation || typeof screen.orientation.lock !== 'function') {
      console.warn('Screen Orientation API is not supported.');
      return false;
    }

    try {
      // Get current orientation
      let currentAngle = screen.orientation.angle;
      if (typeof currentAngle !== 'number') {
        // Fallback: check window dimensions
        currentAngle = window.innerWidth > window.innerHeight ? 90 : 0;
      }

      // Determine target orientation based on angle
      // 0 or 180 = portrait, 90 or -90 = landscape
      let targetOrientation;
      if (currentAngle === 90 || currentAngle === -90 || currentAngle === 270) {
        targetOrientation = 'landscape';
      } else {
        targetOrientation = 'portrait';
      }

      await screen.orientation.lock(targetOrientation);
      return true;
    } catch (error) {
      console.warn('Unable to lock orientation:', error);
      // On iOS, the Screen Orientation API may not be fully supported
      // Try to use a more permissive approach
      try {
        // Try any orientation that works
        await screen.orientation.lock('any');
        return true;
      } catch (fallbackError) {
        console.warn('Fallback orientation lock also failed:', fallbackError);
        return false;
      }
    }
  };

  const unlockOrientation = async () => {
    if (!screen.orientation || typeof screen.orientation.unlock !== 'function') {
      return;
    }

    try {
      await screen.orientation.unlock();
    } catch (error) {
      console.warn('Unable to unlock orientation:', error);
    }
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
      const success = await lockOrientation();
      if (!success) {
        // If locking fails, revert state
        setRotationLocked(false);
        updateRotationLockButton();
        return;
      }
    } else {
      await unlockOrientation();
    }

    if (persist && persistence && typeof persistence.saveRotationLock === 'function') {
      persistence.saveRotationLock(state.rotationLocked);
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

    // If rotation was locked and move mode is active, restore the lock
    if (state.rotationLocked && state.moveMode && state.hasVideo) {
      // Small delay to ensure orientation API is ready
      setTimeout(async () => {
        const success = await lockOrientation();
        if (!success) {
          // If locking fails, reset state
          setRotationLocked(false);
          updateRotationLockButton();
          if (persistence && typeof persistence.saveRotationLock === 'function') {
            persistence.saveRotationLock(false);
          }
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

