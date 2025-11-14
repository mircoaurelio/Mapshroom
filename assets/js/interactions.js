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
  const { state, resetTransform, updatePrecision, setOverlayActive, setHasVideo, setMoveMode, setOrientationLock } = store;
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
    orientationLockBtn,
  } = elements;

  let currentVideo = initialVideo || null;
  let playButtonPrimed = false;
  const videoListeners = new WeakMap();
  const orientationApi = typeof window !== 'undefined' ? window.screen?.orientation || null : null;
  const orientationLockSupported = Boolean(orientationApi && typeof orientationApi.lock === 'function');
  const orientationLockIcon = orientationLockBtn?.querySelector('img') || null;
  let orientationWarningShown = false;

  const ORIENTATION_PORTRAIT = 'portrait';
  const ORIENTATION_LANDSCAPE = 'landscape';

  const getCurrentOrientation = () => {
    if (typeof window === 'undefined') {
      return ORIENTATION_PORTRAIT;
    }

    const type = window.screen?.orientation?.type;
    if (typeof type === 'string') {
      if (type.startsWith(ORIENTATION_LANDSCAPE)) {
        return ORIENTATION_LANDSCAPE;
      }
      if (type.startsWith(ORIENTATION_PORTRAIT)) {
        return ORIENTATION_PORTRAIT;
      }
    }

    if (typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(orientation: portrait)').matches) {
          return ORIENTATION_PORTRAIT;
        }
        if (window.matchMedia('(orientation: landscape)').matches) {
          return ORIENTATION_LANDSCAPE;
        }
      } catch (error) {
        console.debug('Unable to evaluate orientation via matchMedia.', error);
      }
    }

    if (typeof window.innerWidth === 'number' && typeof window.innerHeight === 'number') {
      return window.innerWidth >= window.innerHeight ? ORIENTATION_LANDSCAPE : ORIENTATION_PORTRAIT;
    }

    return ORIENTATION_PORTRAIT;
  };

  let lastKnownOrientation = getCurrentOrientation();

  const getOrientationLabel = (value) => (value === ORIENTATION_LANDSCAPE ? 'landscape' : 'portrait');

  const updateOrientationLockButton = () => {
    if (!orientationLockBtn) {
      return;
    }
    const locked = Boolean(state.orientationLock);
    const effectiveOrientation = locked ? state.orientationLock : lastKnownOrientation;
    orientationLockBtn.disabled = !state.hasVideo || !orientationLockSupported;
    orientationLockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');

    const lockIcon = orientationLockBtn.dataset.iconLock || '';
    const unlockIcon = orientationLockBtn.dataset.iconUnlock || lockIcon;
    if (orientationLockIcon) {
      const nextSrc = locked ? unlockIcon || lockIcon : lockIcon || orientationLockIcon.src;
      if (nextSrc && orientationLockIcon.src !== nextSrc) {
        orientationLockIcon.src = nextSrc;
      }
    }

    const labelOrientation = getOrientationLabel(effectiveOrientation);
    const label = locked ? `Unlock orientation (${labelOrientation})` : `Lock current orientation (${labelOrientation})`;
    orientationLockBtn.setAttribute('aria-label', label);
  };

  const setOrientationLockState = (nextValue, { persist = true } = {}) => {
    const normalized =
      nextValue === ORIENTATION_LANDSCAPE || nextValue === ORIENTATION_PORTRAIT ? nextValue : '';
    setOrientationLock(normalized);
    updateOrientationLockButton();
    if (persist && persistence && typeof persistence.saveOrientationLock === 'function') {
      persistence.saveOrientationLock(state.orientationLock);
    }
  };

  const releaseOrientationLock = ({ persist = true } = {}) => {
    if (orientationLockSupported && orientationApi && typeof orientationApi.unlock === 'function') {
      try {
        orientationApi.unlock();
      } catch (error) {
        console.debug('Unable to unlock orientation.', error);
      }
    }
    setOrientationLockState('', { persist });
  };

  const attemptOrientationLock = async (target) => {
    if (!orientationLockSupported || !orientationApi || typeof orientationApi.lock !== 'function') {
      return false;
    }

    const candidates =
      target === ORIENTATION_LANDSCAPE
        ? ['landscape-primary', 'landscape-secondary', 'landscape']
        : ['portrait-primary', 'portrait-secondary', 'portrait'];

    for (const candidate of candidates) {
      try {
        await orientationApi.lock(candidate);
        return true;
      } catch (error) {
        if (candidate === candidates[candidates.length - 1]) {
          console.debug(`Orientation lock failed for ${candidate}.`, error);
        }
      }
    }

    return false;
  };

  const handleOrientationChange = () => {
    lastKnownOrientation = getCurrentOrientation();
    if (state.orientationLock && state.orientationLock !== lastKnownOrientation) {
      releaseOrientationLock({ persist: true });
    } else {
      updateOrientationLockButton();
    }
  };

  if (orientationApi && typeof orientationApi.addEventListener === 'function') {
    orientationApi.addEventListener('change', handleOrientationChange);
  } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('orientationchange', handleOrientationChange);
  }

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

  const applyMoveMode = (active, { persist = true } = {}) => {
    setMoveMode(active);
    gridOverlay.dataset.moveMode = active ? 'active' : 'inactive';
    updateMoveButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);
    toggleVisibility(chooseLabel, !state.moveMode);
    toggleVisibility(orientationLockBtn, state.hasVideo && state.moveMode && orientationLockSupported);

    if (!state.moveMode && state.orientationLock) {
      releaseOrientationLock({ persist: true });
    }

    updateOrientationLockButton();

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

    const shouldShow = active && !state.moveMode;
    toggleVisibility(chooseLabel, shouldShow);
    toggleVisibility(controls, shouldShow);
    toggleVisibility(precisionControl, shouldShow && state.moveMode);
  };

  const enableControls = (enabled) => {
    setControlsEnabled([playBtn, moveBtn, aiBtn, orientationLockBtn], enabled);
    if (timelineBtn) {
      timelineBtn.disabled = !enabled;
    }
    setHasVideo(enabled);

    const shouldShowControls = enabled;
    toggleVisibility(controls, shouldShowControls);
    toggleVisibility(precisionControl, enabled && state.moveMode);
    toggleVisibility(chooseLabel, !state.moveMode);
    toggleVisibility(orientationLockBtn, enabled && state.moveMode && orientationLockSupported);

    applyOverlayUI(enabled, { toggleUI: false });

    if (!enabled) {
      resetTransform();
      updateTransform();
      gridOverlay.dataset.moveMode = 'inactive';
      playButtonPrimed = false;
      if (state.orientationLock) {
        releaseOrientationLock({ persist: true });
      } else {
        updateOrientationLockButton();
      }
    }

    updatePlayButton();
    updateMoveButton();
    updateOrientationLockButton();
  };

  const showPreloadUI = () => {
    toggleVisibility(chooseLabel, true);
    toggleVisibility(controls, false);
    toggleVisibility(precisionControl, false);
    toggleVisibility(orientationLockBtn, false);
    updateOrientationLockButton();
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

  const handleOrientationLockToggle = async () => {
    if (!state.hasVideo) {
      return;
    }

    if (!orientationLockSupported) {
      if (!orientationWarningShown) {
        alert('Orientation lock is not supported on this device.');
        orientationWarningShown = true;
      }
      return;
    }

    if (state.orientationLock) {
      releaseOrientationLock({ persist: true });
      return;
    }

    const currentOrientation = getCurrentOrientation();
    lastKnownOrientation = currentOrientation;
    const success = await attemptOrientationLock(currentOrientation);
    if (success) {
      setOrientationLockState(currentOrientation, { persist: true });
    } else {
      if (!orientationWarningShown) {
        alert('Unable to lock orientation on this device.');
        orientationWarningShown = true;
      }
      setOrientationLockState('', { persist: true });
    }
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
      updateOrientationLockButton();
      return;
    }

    detachVideoListeners(currentVideo);
    currentVideo = videoEl || null;
    attachVideoListeners(currentVideo);
    updateTransformUI({ state, video: currentVideo });
    updatePlayButton();
    updateMoveButton();
    updateOrientationLockButton();
  };

  attachVideoListeners(currentVideo);

  requestAnimationFrame(() => {
    gridOverlay.dataset.moveMode = state.moveMode ? 'active' : 'inactive';
    updateMoveButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);
    toggleVisibility(orientationLockBtn, state.hasVideo && state.moveMode && orientationLockSupported);
    updateOrientationLockButton();
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
    handleOrientationLockToggle,
  };
};

