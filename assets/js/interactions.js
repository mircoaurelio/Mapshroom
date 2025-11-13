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
  const { state, resetTransform, updatePrecision, setOverlayActive, setHasVideo, setMoveMode } = store;
  const {
    video: initialVideo,
    playBtn,
    moveBtn,
    timelineBtn,
    precisionControl,
    gridOverlay,
    chooseLabel,
    controls,
    videoWrapper,
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

  const applyMoveMode = (active, { persist = true } = {}) => {
    setMoveMode(active);
    gridOverlay.dataset.moveMode = active ? 'active' : 'inactive';
    updateMoveButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);

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

    const shouldShow = active;
    toggleVisibility(chooseLabel, shouldShow);
    toggleVisibility(controls, shouldShow);
    toggleVisibility(precisionControl, shouldShow && state.moveMode);
  };

  const enableControls = (enabled) => {
    setControlsEnabled(playBtn, moveBtn, enabled);
    if (timelineBtn) {
      timelineBtn.disabled = !enabled;
    }
    setHasVideo(enabled);

    const shouldShowControls = enabled;
    toggleVisibility(controls, shouldShowControls);
    toggleVisibility(precisionControl, enabled && state.moveMode);
    toggleVisibility(chooseLabel, true);

    applyOverlayUI(enabled, { toggleUI: false });

    if (!enabled) {
      resetTransform();
      updateTransform();
      gridOverlay.dataset.moveMode = 'inactive';
      playButtonPrimed = false;
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

  requestAnimationFrame(() => {
    gridOverlay.dataset.moveMode = state.moveMode ? 'active' : 'inactive';
    updateMoveButton();
    toggleVisibility(precisionControl, state.hasVideo && state.moveMode);
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
  };
};

