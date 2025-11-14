const MIN_VISIBLE_SIZE = 80;

export const createState = (precisionRangeEl, initialState = {}) => {
  const initialPrecisionValue = Number(precisionRangeEl.value);
  const persistedPrecision = typeof initialState.precision === 'number' ? initialState.precision : null;
  const derivedPrecision = Number.isNaN(initialPrecisionValue) ? 10 : initialPrecisionValue;

  const state = {
    MIN_VISIBLE_SIZE,
    offsetX: typeof initialState.offsetX === 'number' ? initialState.offsetX : 0,
    offsetY: typeof initialState.offsetY === 'number' ? initialState.offsetY : 0,
    widthAdjust: typeof initialState.widthAdjust === 'number' ? initialState.widthAdjust : 0,
    heightAdjust: typeof initialState.heightAdjust === 'number' ? initialState.heightAdjust : 0,
    precision: persistedPrecision ?? derivedPrecision,
    overlayActive: false,
    hasVideo: false,
    timelineOpen: false,
    playlist: Array.isArray(initialState.playlist) ? initialState.playlist : [],
    currentIndex: typeof initialState.currentIndex === 'number' ? initialState.currentIndex : -1,
    randomPlay: Boolean(initialState.randomPlay),
    fadeEnabled: Boolean(initialState.fadeEnabled),
    fadeDuration: typeof initialState.fadeDuration === 'number' ? initialState.fadeDuration : 1.5,
    moveMode: Boolean(initialState.moveMode),
    orientationLock: typeof initialState.orientationLock === 'string' ? initialState.orientationLock : '',
  };

  if (persistedPrecision !== null) {
    precisionRangeEl.value = String(persistedPrecision);
  }

  const resetTransform = () => {
    state.offsetX = 0;
    state.offsetY = 0;
    state.widthAdjust = 0;
    state.heightAdjust = 0;
  };

  const updatePrecision = (nextPrecision) => {
    state.precision = nextPrecision;
  };

  const setOverlayActive = (active) => {
    state.overlayActive = active;
  };

  const setHasVideo = (value) => {
    state.hasVideo = value;
  };

  const setTimelineOpen = (open) => {
    state.timelineOpen = open;
  };

  const setPlaylist = (items) => {
    state.playlist = items;
  };

  const setCurrentIndex = (index) => {
    state.currentIndex = index;
  };

  const setRandomPlay = (value) => {
    state.randomPlay = value;
  };

  const setFadeEnabled = (value) => {
    state.fadeEnabled = value;
  };

  const setFadeDuration = (value) => {
    state.fadeDuration = value;
  };

  const setMoveMode = (value) => {
    state.moveMode = value;
  };

  const setOrientationLock = (value) => {
    state.orientationLock = typeof value === 'string' ? value : '';
  };

  return {
    state,
    resetTransform,
    updatePrecision,
    setOverlayActive,
    setHasVideo,
    setTimelineOpen,
    setPlaylist,
    setCurrentIndex,
    setRandomPlay,
    setFadeEnabled,
    setFadeDuration,
    setMoveMode,
    setOrientationLock,
  };
};

