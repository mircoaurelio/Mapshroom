const MIN_VISIBLE_SIZE = 80;

export const createState = (precisionRangeEl) => {
  const initialPrecision = Number(precisionRangeEl.value);

  const state = {
    MIN_VISIBLE_SIZE,
    offsetX: 0,
    offsetY: 0,
    widthAdjust: 0,
    heightAdjust: 0,
    precision: Number.isNaN(initialPrecision) ? 10 : initialPrecision,
    overlayActive: false,
    hasVideo: false,
    playlist: [],
    currentIndex: -1,
    randomPlayback: false,
    fadeInEnabled: false,
    fadeInDuration: 800,
  };

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

  const addToPlaylist = (entries) => {
    state.playlist = [...state.playlist, ...entries];
  };

  const clearPlaylist = () => {
    state.playlist = [];
    state.currentIndex = -1;
  };

  const setCurrentIndex = (index) => {
    state.currentIndex = index;
  };

  const setRandomPlayback = (value) => {
    state.randomPlayback = value;
  };

  const setFadeInEnabled = (value) => {
    state.fadeInEnabled = value;
  };

  const setFadeInDuration = (value) => {
    state.fadeInDuration = value;
  };

  return {
    state,
    resetTransform,
    updatePrecision,
    setOverlayActive,
    setHasVideo,
    addToPlaylist,
    clearPlaylist,
    setCurrentIndex,
    setRandomPlayback,
    setFadeInEnabled,
    setFadeInDuration,
  };
};

