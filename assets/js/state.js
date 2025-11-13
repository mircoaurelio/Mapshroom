const MIN_VISIBLE_SIZE = 80;

export const createState = (precisionRangeEl) => {
  const initialPrecision = Number(precisionRangeEl.value);
  const videoSignatures = new Set();

  const state = {
    MIN_VISIBLE_SIZE,
    offsetX: 0,
    offsetY: 0,
    widthAdjust: 0,
    heightAdjust: 0,
    precision: Number.isNaN(initialPrecision) ? 10 : initialPrecision,
    overlayActive: false,
    hasVideo: false,
    videos: [],
    activeVideoId: null,
    timelineOpen: false,
    randomEnabled: false,
    fadeEnabled: false,
    fadeDuration: 500,
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
    if (!value) {
      state.activeVideoId = null;
    }
  };

  const addVideos = (videos) => {
    const added = [];
    videos.forEach((video) => {
      const signature = video.signature;
      if (signature && videoSignatures.has(signature)) {
        return;
      }
      if (signature) {
        videoSignatures.add(signature);
      }

      state.videos.push(video);
      added.push(video);
    });
    return added;
  };

  const setActiveVideoId = (id) => {
    state.activeVideoId = id;
  };

  const setTimelineOpen = (open) => {
    state.timelineOpen = open;
  };

  const setRandomEnabled = (enabled) => {
    state.randomEnabled = enabled;
  };

  const setFadeEnabled = (enabled) => {
    state.fadeEnabled = enabled;
  };

  const setFadeDuration = (duration) => {
    state.fadeDuration = duration;
  };

  return {
    state,
    resetTransform,
    updatePrecision,
    setOverlayActive,
    setHasVideo,
    addVideos,
    setActiveVideoId,
    setTimelineOpen,
    setRandomEnabled,
    setFadeEnabled,
    setFadeDuration,
  };
};

