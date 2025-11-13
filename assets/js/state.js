import { loadSettings, saveSettings } from './storage.js';

const MIN_VISIBLE_SIZE = 80;

const buildInitialState = (precisionRangeEl) => {
  const persisted = loadSettings();
  const initialPrecisionAttr = Number(precisionRangeEl.value);

  const fallbackPrecision = Number.isNaN(initialPrecisionAttr) ? 10 : initialPrecisionAttr;
  const precision = typeof persisted.precision === 'number' && persisted.precision > 0 ? persisted.precision : fallbackPrecision;

  return {
    MIN_VISIBLE_SIZE,
    offsetX: persisted.offsetX,
    offsetY: persisted.offsetY,
    widthAdjust: persisted.widthAdjust,
    heightAdjust: persisted.heightAdjust,
    precision,
    overlayActive: persisted.overlayActive,
    hasVideo: false,
    timelineOpen: false,
    playlist: persisted.playlist,
    currentIndex: persisted.currentIndex,
    randomPlay: persisted.randomPlay,
    fadeEnabled: persisted.fadeEnabled,
    fadeDuration: persisted.fadeDuration,
  };
};

const persistStateSnapshot = (state) => {
  saveSettings({
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    widthAdjust: state.widthAdjust,
    heightAdjust: state.heightAdjust,
    precision: state.precision,
    overlayActive: state.overlayActive,
    randomPlay: state.randomPlay,
    fadeEnabled: state.fadeEnabled,
    fadeDuration: state.fadeDuration,
    currentIndex: state.currentIndex,
    playlist: state.playlist,
  });
};

const sanitizePlaylistItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const id = typeof item.id === 'string' ? item.id : null;
      if (!id) {
        return null;
      }

      const name = typeof item.name === 'string' ? item.name : '';
      const type = typeof item.type === 'string' && item.type ? item.type : undefined;

      return type ? { id, name, type } : { id, name };
    })
    .filter(Boolean);
};

export const createState = (precisionRangeEl) => {
  const state = buildInitialState(precisionRangeEl);

  const resetTransform = () => {
    state.offsetX = 0;
    state.offsetY = 0;
    state.widthAdjust = 0;
    state.heightAdjust = 0;
    persistStateSnapshot(state);
  };

  const updatePrecision = (nextPrecision) => {
    state.precision = nextPrecision;
    persistStateSnapshot(state);
  };

  const setOverlayActive = (active) => {
    state.overlayActive = active;
    persistStateSnapshot(state);
  };

  const setHasVideo = (value) => {
    state.hasVideo = value;
  };

  const setTimelineOpen = (open) => {
    state.timelineOpen = open;
  };

  const setPlaylist = (items) => {
    state.playlist = sanitizePlaylistItems(items);
    persistStateSnapshot(state);
  };

  const setCurrentIndex = (index) => {
    state.currentIndex = index;
    persistStateSnapshot(state);
  };

  const setRandomPlay = (value) => {
    state.randomPlay = value;
    persistStateSnapshot(state);
  };

  const setFadeEnabled = (value) => {
    state.fadeEnabled = value;
    persistStateSnapshot(state);
  };

  const setFadeDuration = (value) => {
    state.fadeDuration = value;
    persistStateSnapshot(state);
  };

  const persistState = () => {
    persistStateSnapshot(state);
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
    persistState,
  };
};

