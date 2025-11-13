import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';
import { loadPersistedData, saveTransformState, saveOptionsState, savePlaylistMetadata, persistVideoFile } from './storage.js';

const setupGridOverlayListeners = (gridOverlay, handler) => {
  const pointerSupported = 'PointerEvent' in window;

  gridOverlay.querySelectorAll('.grid-zone').forEach((zone) => {
    const action = zone.dataset.action;

    const listener = (event) => {
      event.preventDefault();
      handler(action);
    };

    if (pointerSupported) {
      zone.addEventListener('pointerdown', listener);
    } else {
      zone.addEventListener('touchstart', listener, { passive: false });
      zone.addEventListener('click', listener);
    }
  });
};

const waitForFirstFrame = (video, url, onReady) =>
  new Promise((resolve) => {
    let resolved = false;
    let timeoutId = null;

    const finish = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();

      try {
        video.pause();
      } catch (error) {
        console.debug('Unable to pause video before showing the first frame.', error);
      }

      onReady();
      resolve();
    };

    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const trySeekToStart = () => {
      if (resolved) {
        return;
      }

      if (video.readyState >= 2) {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          finish();
        };

        try {
          video.addEventListener('seeked', onSeeked, { once: true });
          video.currentTime = 0.0001;
          return;
        } catch (error) {
          console.warn('Unable to pre-seek the first frame, continuing without it.', error);
          video.removeEventListener('seeked', onSeeked);
        }
      }

      finish();
    };

    const onLoadedData = () => {
      trySeekToStart();
    };

    const onLoadedMetadata = () => {
      trySeekToStart();
    };

    const onCanPlay = () => {
      trySeekToStart();
    };

    const onError = (error) => {
      cleanup();
      alert('Unable to load this video.');
      console.error(error);
      URL.revokeObjectURL(url);
    };

    timeoutId = window.setTimeout(() => {
      console.warn('Timed out waiting for the first frame, enabling controls anyway.');
      finish();
    }, 5000);

    video.addEventListener('loadeddata', onLoadedData, { once: true });
    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    video.addEventListener('canplay', onCanPlay, { once: true });
    video.addEventListener('error', onError, { once: true });
  });

const setToggleState = (button, active) => {
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
};

const formatDurationSeconds = (value) => `${value.toFixed(1)}s`;

const createPlaylistController = ({ elements, controller, store, persistence, initialItems = [], initialIndex = -1 }) => {
  const {
    fileInput,
    video,
    timelineBtn,
    timelinePanel,
    timelineGrid,
    timelineBackBtn,
    randomToggle,
    fadeToggle,
    fadeSlider,
    fadeValue,
  } = elements;
  const {
    state,
    resetTransform,
    setPlaylist,
    setCurrentIndex,
    setRandomPlay,
    setFadeEnabled,
    setFadeDuration,
    setTimelineOpen,
  } = store;

  const playlist = [...initialItems.map((item) => ({ thumbnailUrl: null, ...item }))];
  const urlRegistry = new Set(playlist.map((item) => item.url).filter(Boolean));
  let loadToken = 0;
  let pendingFade = false;
  let overlayWasActive = false;
  const thumbnailCache = new Map();
  const ensureThumbnail = (item) => {
    if (!item || !item.url) {
      return Promise.resolve('');
    }

    if (item.thumbnailUrl) {
      return Promise.resolve(item.thumbnailUrl);
    }

    if (thumbnailCache.has(item.id)) {
      return thumbnailCache.get(item.id);
    }

    const promise = new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.muted = true;
      tempVideo.preload = 'auto';
      tempVideo.playsInline = true;
      tempVideo.src = item.url;

      let settled = false;

      const cleanup = () => {
        tempVideo.removeEventListener('loadeddata', handleLoaded);
        tempVideo.removeEventListener('error', handleError);
        tempVideo.pause();
        tempVideo.src = '';
      };

      const finalize = (dataUrl) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (dataUrl) {
          item.thumbnailUrl = dataUrl;
        }
        resolve(dataUrl || '');
      };

      const handleLoaded = () => {
        try {
          const width = tempVideo.videoWidth || 320;
          const height = tempVideo.videoHeight || 180;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');

          if (!context) {
            finalize('');
            return;
          }

          context.drawImage(tempVideo, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          finalize(dataUrl);
        } catch (error) {
          console.warn('Unable to create video thumbnail.', error);
          finalize('');
        }
      };

      const handleError = (error) => {
        console.warn('Error loading thumbnail video preview.', error);
        finalize('');
      };

      tempVideo.addEventListener('loadeddata', handleLoaded, { once: true });
      tempVideo.addEventListener('error', handleError, { once: true });
      tempVideo.load();
    })
      .catch(() => '')
      .finally(() => {
        thumbnailCache.delete(item.id);
      });

    thumbnailCache.set(item.id, promise);
    return promise;
  };

  const updateFadeValueDisplay = () => {
    fadeValue.textContent = formatDurationSeconds(state.fadeDuration);
  };

  const syncFadeSliderState = () => {
    fadeSlider.disabled = !state.fadeEnabled;
    fadeSlider.setAttribute('aria-disabled', state.fadeEnabled ? 'false' : 'true');
    if (!state.fadeEnabled) {
      video.style.transition = '';
      video.style.opacity = 1;
    }
  };

  const applyTimelineVisibility = (open) => {
    setTimelineOpen(open);
    timelinePanel.classList.toggle('concealed', !open);
    timelinePanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    timelineBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    timelineBtn.setAttribute('aria-label', open ? 'Close timeline' : 'Open timeline');

     if (open) {
      overlayWasActive = state.overlayActive;
      controller.handleOverlayState(false, { toggleUI: false });
    } else if (overlayWasActive) {
      controller.handleOverlayState(true, { toggleUI: false });
    }

    if (open) {
      timelinePanel.focus();
    }
  };

  const updateActiveTiles = () => {
    const tiles = timelineGrid.querySelectorAll('.timeline-item');
    tiles.forEach((tile) => {
      const tileIndex = Number(tile.dataset.index);
      tile.classList.toggle('active', tileIndex === state.currentIndex);
    });
  };

  const renderTimelineGrid = () => {
    timelineGrid.innerHTML = '';

    if (!playlist.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'timeline-empty';
      emptyMessage.textContent = 'No videos loaded yet.';
      timelineGrid.appendChild(emptyMessage);
      return;
    }

    playlist.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-item';
      button.dataset.index = String(index);
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', `Play ${item.name}`);

      const preview = document.createElement('img');
      preview.className = 'timeline-thumbnail';
      preview.alt = '';
      preview.decoding = 'async';
      preview.loading = 'lazy';
      preview.draggable = false;

      if (item.thumbnailUrl) {
        preview.src = item.thumbnailUrl;
      } else {
        preview.src = '';
        ensureThumbnail(item).then((thumbnailUrl) => {
          if (!thumbnailUrl || !button.isConnected) {
            return;
          }
          preview.src = thumbnailUrl;
        });
      }

      const label = document.createElement('span');
      label.className = 'timeline-item-label';
      label.textContent = item.name;

      button.append(preview, label);
      timelineGrid.appendChild(button);
    });

    updateActiveTiles();
  };

  const persistPlaylist = () => {
    if (persistence && typeof persistence.savePlaylistMetadata === 'function') {
      persistence.savePlaylistMetadata(playlist);
    }
  };

  const persistPlaybackOptions = (partial) => {
    if (persistence && typeof persistence.savePlaybackOptions === 'function') {
      persistence.savePlaybackOptions(partial);
    }
  };

  const persistCurrentIndex = (index) => {
    if (persistence && typeof persistence.saveCurrentIndex === 'function') {
      persistence.saveCurrentIndex(index);
    }
  };

  const loadVideoAtIndex = async (index, { autoplay = false, preserveTransform = true } = {}) => {
    const item = playlist[index];
    if (!item) {
      return;
    }

    const token = ++loadToken;
    pendingFade = state.fadeEnabled;

    video.pause();
    controller.handleOverlayState(false, { toggleUI: false });

    if (!preserveTransform) {
      resetTransform();
    }

    controller.updateTransform();

    video.src = item.url;
    video.dataset.sourceId = item.id;
    video.load();

    await waitForFirstFrame(video, item.url, () => {});

    if (token !== loadToken) {
      return;
    }

    setCurrentIndex(index);
    persistCurrentIndex(index);
    updateActiveTiles();
    controller.enableControls(true);

    if (!state.fadeEnabled) {
      video.style.transition = '';
      video.style.opacity = 1;
    }

    if (autoplay) {
      try {
        await video.play();
      } catch (error) {
        console.warn('Autoplay blocked:', error);
      }
    }
  };

  const getNextIndex = () => {
    if (!playlist.length) {
      return -1;
    }

    if (state.randomPlay) {
      if (playlist.length === 1) {
        return 0;
      }

      let nextIndex = state.currentIndex;
      const maxAttempts = 10;
      let attempts = 0;

      while (nextIndex === state.currentIndex && attempts < maxAttempts) {
        nextIndex = Math.floor(Math.random() * playlist.length);
        attempts += 1;
      }

      if (nextIndex === state.currentIndex) {
        nextIndex = (state.currentIndex + 1) % playlist.length;
      }

      return nextIndex;
    }

    const current = state.currentIndex;
    if (current < 0) {
      return 0;
    }

    return (current + 1) % playlist.length;
  };

  const handleVideoEnded = () => {
    if (!playlist.length) {
      return;
    }

    const nextIndex = getNextIndex();
    if (nextIndex === -1) {
      return;
    }

    loadVideoAtIndex(nextIndex, { autoplay: true });
  };

  const handleFileSelection = async (event) => {
    const files = Array.from((event.target && event.target.files) || []).filter((file) =>
      file.type.startsWith('video/'),
    );

    if (!files.length) {
      return;
    }

    const wasEmpty = playlist.length === 0;
    const now = Date.now();

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex];
      const url = URL.createObjectURL(file);
      const item = {
        id: `${now}-${fileIndex}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        thumbnailUrl: null,
      };

      playlist.push(item);
      urlRegistry.add(url);

      if (persistence && typeof persistence.storeVideo === 'function') {
        // eslint-disable-next-line no-await-in-loop
        const stored = await persistence.storeVideo(item.id, file);
        if (!stored) {
          console.warn('The selected video could not be saved for future sessions.');
        }
      }
    }

    setPlaylist([...playlist]);
    renderTimelineGrid();
    persistPlaylist();

    if (wasEmpty) {
      await loadVideoAtIndex(0);
    }

    event.target.value = '';
  };

  const handleTimelineToggle = () => {
    const nextOpen = !state.timelineOpen;
    applyTimelineVisibility(nextOpen);
  };

  const handleRandomToggle = () => {
    const next = !state.randomPlay;
    setRandomPlay(next);
    setToggleState(randomToggle, next);
    persistPlaybackOptions({ randomPlay: state.randomPlay });
  };

  const handleFadeToggle = () => {
    const next = !state.fadeEnabled;
    setFadeEnabled(next);
    syncFadeSliderState();
    setToggleState(fadeToggle, next);

    if (!next) {
      video.style.opacity = 1;
    } else {
      pendingFade = true;
    }

    persistPlaybackOptions({ fadeEnabled: state.fadeEnabled, fadeDuration: state.fadeDuration });
  };

  const handleFadeSliderInput = () => {
    const value = Number(fadeSlider.value);
    const nextDuration = Number.isNaN(value) ? state.fadeDuration : value;
    setFadeDuration(nextDuration);
    updateFadeValueDisplay();
    persistPlaybackOptions({ fadeDuration: state.fadeDuration });
  };

  const handleTimelineGridClick = (event) => {
    const tile = event.target.closest('.timeline-item');
    if (!tile) {
      return;
    }

    const index = Number(tile.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }

    loadVideoAtIndex(index, { autoplay: true });
  };

  const handleTimelineGridKeydown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const tile = event.target.closest('.timeline-item');
    if (!tile) {
      return;
    }

    event.preventDefault();
    const index = Number(tile.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }

    loadVideoAtIndex(index, { autoplay: true });
  };

  const handleKeydownGlobal = (event) => {
    if (event.key === 'Escape' && state.timelineOpen) {
      applyTimelineVisibility(false);
    }
  };

  const handlePlayEvent = () => {
    if (!pendingFade || !state.fadeEnabled) {
      pendingFade = false;
      return;
    }

    pendingFade = false;
    video.style.transition = `opacity ${state.fadeDuration}s ease`;
    video.style.opacity = 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        video.style.opacity = 1;
      });
    });
  };

  const cleanup = () => {
    thumbnailCache.clear();
    urlRegistry.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    urlRegistry.clear();
  };

  fileInput.addEventListener('change', handleFileSelection);
  timelineBtn.addEventListener('click', handleTimelineToggle);
  randomToggle.addEventListener('click', handleRandomToggle);
  fadeToggle.addEventListener('click', handleFadeToggle);
  fadeSlider.addEventListener('input', handleFadeSliderInput);
  timelineGrid.addEventListener('click', handleTimelineGridClick);
  timelineGrid.addEventListener('keydown', handleTimelineGridKeydown);
  timelineBackBtn.addEventListener('click', () => applyTimelineVisibility(false));
  document.addEventListener('keydown', handleKeydownGlobal);
  video.addEventListener('ended', handleVideoEnded);
  video.addEventListener('play', handlePlayEvent);
  window.addEventListener('beforeunload', cleanup);

  setToggleState(randomToggle, state.randomPlay);
  setToggleState(fadeToggle, state.fadeEnabled);
  fadeSlider.value = String(state.fadeDuration);
  syncFadeSliderState();
  updateFadeValueDisplay();
  renderTimelineGrid();
  applyTimelineVisibility(false);

  if (playlist.length) {
    setPlaylist([...playlist]);
    persistPlaylist();
    const safeIndex = initialIndex >= 0 && initialIndex < playlist.length ? initialIndex : 0;
    loadVideoAtIndex(safeIndex, { preserveTransform: true }).catch((error) => {
      console.warn('Unable to restore previously selected video.', error);
    });
  }

  return {
    loadVideoAtIndex,
    renderTimelineGrid,
    cleanup,
  };
};

const attachPrecisionControl = (precisionRange, controller) => {
  precisionRange.addEventListener('input', () => {
    const nextPrecision = Number(precisionRange.value);
    controller.handlePrecisionChange(nextPrecision);
  });
};

const attachControlButtons = (playBtn, controller) => {
  playBtn.addEventListener('click', controller.handlePlay);
};

const setupVisibilityPause = (video) => {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
    }
  });
};

const setupZoomPrevention = (() => {
  let initialized = false;

  return () => {
    if (initialized) {
      return;
    }

    initialized = true;

    let lastTouchEnd = 0;

    document.addEventListener(
      'touchend',
      (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false },
    );

    document.addEventListener(
      'gesturestart',
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener(
      'gesturechange',
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener(
      'gestureend',
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
        }
      },
      { passive: false },
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }

        const zoomKeys = ['+', '-', '=', '_', '0'];
        if (zoomKeys.includes(event.key)) {
          event.preventDefault();
        }
      },
      { passive: false },
    );
  };
})();

const init = async () => {
  const elements = getDomElements();

  let persisted = { state: {}, playlist: [] };
  try {
    persisted = await loadPersistedData();
  } catch (error) {
    console.warn('Unable to load persisted data, continuing with defaults.', error);
  }

  const persistence = {
    saveTransform: (state) => saveTransformState(state),
    savePrecision: (precision) => saveOptionsState({ precision }),
    savePlaylistMetadata: (items) => savePlaylistMetadata(items),
    savePlaybackOptions: (options) => saveOptionsState(options),
    saveCurrentIndex: (index) => saveOptionsState({ currentIndex: index }),
    storeVideo: (id, file) => persistVideoFile(id, file),
  };

  const store = createState(elements.precisionRange, persisted.state);
  const controller = createTransformController({ elements, store, persistence });

  elements.video.loop = false;

  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  createPlaylistController({
    elements,
    controller,
    store,
    persistence,
    initialItems: persisted.playlist ?? [],
    initialIndex: persisted.state?.currentIndex ?? -1,
  });
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, controller);
  setupVisibilityPause(elements.video);
  setupZoomPrevention();
};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Unable to initialize application.', error);
  });
});

