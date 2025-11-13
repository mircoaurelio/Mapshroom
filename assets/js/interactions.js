import { updateTransformStyles, updatePrecisionDisplay, toggleOverlayDisplay, toggleVisibility, setControlsEnabled } from './ui.js';

const updateTransformUI = ({ state, precisionValue, video }) => {
  updateTransformStyles(state, video);
  updatePrecisionDisplay(precisionValue, state.precision);
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
    video,
    playBtn,
    moveBtn,
    timelineBtn,
    precisionControl,
    precisionValue,
    gridOverlay,
    chooseLabel,
    controls,
  } = elements;

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
    updateTransformUI({ state, precisionValue, video });
    persistTransform();
  };
  const playIconImg = playBtn.querySelector('img');
  const updatePlayButton = () => {
    const isPaused = video.paused;
    const nextLabel = isPaused ? 'Play video' : 'Pause video';

    if (playIconImg) {
      const nextSrc = isPaused ? playBtn.getAttribute('data-icon-play') || playIconImg.dataset.play || 'assets/icons/play.svg'
        : playBtn.getAttribute('data-icon-pause') || playIconImg.dataset.pause || 'assets/icons/pause.svg';
      playIconImg.src = nextSrc;
    } else {
      playBtn.textContent = isPaused ? 'play_circle' : 'pause_circle';
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
    toggleVisibility(precisionControl, shouldShow);
  };

  const enableControls = (enabled) => {
    setControlsEnabled(playBtn, moveBtn, enabled);
    if (timelineBtn) {
      timelineBtn.disabled = !enabled;
    }
    setHasVideo(enabled);

    const shouldShowControls = enabled;
    toggleVisibility(controls, shouldShowControls);
    toggleVisibility(precisionControl, shouldShowControls);
    toggleVisibility(chooseLabel, true);

    applyOverlayUI(enabled, { toggleUI: false });

    if (!enabled) {
      resetTransform();
      updateTransform();
      gridOverlay.dataset.moveMode = 'inactive';
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

    const wrapper = video.parentElement;
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
    updatePrecisionDisplay(precisionValue, state.precision);
    persistPrecision();
  };

  const handleReset = () => {
    video.pause();
    video.currentTime = 0;
    resetTransform();
    updateTransform();
    updatePlayButton();
  };

  const handleMoveToggle = () => {
    const next = !state.moveMode;
    applyMoveMode(next);
  };

  const handlePlay = async () => {
    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.warn('Autoplay blocked:', error);
      }
    } else {
      video.pause();
    }

    updatePlayButton();
  };

  const handleOverlayState = (active, options) => {
    applyOverlayUI(active, options);
  };

  video.addEventListener('play', updatePlayButton);
  video.addEventListener('pause', updatePlayButton);

  requestAnimationFrame(() => {
    gridOverlay.dataset.moveMode = state.moveMode ? 'active' : 'inactive';
    updateMoveButton();
  });

  return {
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

