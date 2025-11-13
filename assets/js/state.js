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
    timelineOpen: false,
    playlist: [],
    currentIndex: -1,
    randomPlay: false,
    fadeEnabled: false,
    fadeDuration: 1.5,
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
  };
};

