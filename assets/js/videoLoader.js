import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';
import { saveVideoBlob, readVideoBlob, pruneVideoStore, canPersistVideos } from './storage.js';

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

const createPlaylistController = ({ elements, controller, store }) => {
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

  const playlist = [];
  const urlRegistry = new Set();
  const persistedIds = new Set(
    Array.isArray(state.playlist)
      ? state.playlist
          .map((item) => (item && typeof item.id === 'string' ? item.id : null))
          .filter((id) => id)
      : [],
  );
  const syncStoredPlaylistMetadata = () => {
    const metadata = playlist
      .filter((item) => persistedIds.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
      }));

    setPlaylist(metadata);

    if (!metadata.length && state.currentIndex !== -1) {
      setCurrentIndex(-1);
    } else if (metadata.length && (state.currentIndex < -1 || state.currentIndex >= metadata.length)) {
      setCurrentIndex(Math.max(0, metadata.length - 1));
    }
  };
  let loadToken = 0;
  let pendingFade = false;
  let overlayWasActive = false;

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

  const restorePlaylistFromStorage = async () => {
    const metadata = Array.isArray(state.playlist) ? state.playlist : [];

    if (!metadata.length) {
      return;
    }

    if (!canPersistVideos()) {
      console.warn('Video persistence is not available; clearing stored playlist metadata.');
      setPlaylist([]);
      setCurrentIndex(-1);
      persistedIds.clear();
      return;
    }

    const restoredItems = [];

    for (const entry of metadata) {
      if (!entry || typeof entry.id !== 'string') {
        continue;
      }

      try {
        const record = await readVideoBlob(entry.id);
        if (!record || !record.blob) {
          console.warn(`No stored data found for video "${entry.name || entry.id}".`);
          persistedIds.delete(entry.id);
          continue;
        }

        const objectUrl = URL.createObjectURL(record.blob);
        urlRegistry.add(objectUrl);

        restoredItems.push({
          id: entry.id,
          name: entry.name || record.name || 'Video',
          type: entry.type || record.type,
          url: objectUrl,
        });

        persistedIds.add(entry.id);
      } catch (error) {
        console.warn(`Unable to restore video "${entry.name || entry.id}" from persistence.`, error);
        persistedIds.delete(entry.id);
      }
    }

    if (!restoredItems.length) {
      setPlaylist([]);
      setCurrentIndex(-1);
      persistedIds.clear();
      return;
    }

    playlist.splice(0, playlist.length, ...restoredItems);
    syncStoredPlaylistMetadata();
    renderTimelineGrid();

    try {
      await pruneVideoStore(persistedIds);
    } catch (error) {
      console.warn('Unable to prune stale videos from persistence.', error);
    }

    const indexToLoad =
      state.currentIndex >= 0 && state.currentIndex < playlist.length ? state.currentIndex : 0;

    try {
      await loadVideoAtIndex(indexToLoad, { preserveTransform: true, preserveOverlay: true });
      controller.handleOverlayState(state.overlayActive, { toggleUI: true });
      controller.updateTransform();
    } catch (error) {
      console.warn('Failed to load persisted video after restoration.', error);
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

      const preview = document.createElement('video');
      preview.src = item.url;
      preview.muted = true;
      preview.loop = true;
      preview.playsInline = true;
      preview.preload = 'metadata';

      preview.addEventListener(
        'loadeddata',
        () => {
          preview.currentTime = 0;
          preview.pause();
        },
        { once: true },
      );

      preview.play().catch(() => {});

      const label = document.createElement('span');
      label.className = 'timeline-item-label';
      label.textContent = item.name;

      button.append(preview, label);
      timelineGrid.appendChild(button);
    });

    updateActiveTiles();
  };

  const loadVideoAtIndex = async (
    index,
    { autoplay = false, preserveTransform = false, preserveOverlay = false } = {},
  ) => {
    const item = playlist[index];
    if (!item) {
      return;
    }

    const token = ++loadToken;
    pendingFade = state.fadeEnabled;

    video.pause();
    if (!preserveOverlay) {
      controller.handleOverlayState(false, { toggleUI: false });
    }
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
    const canStoreVideos = canPersistVideos();

    for (const [indexOffset, file] of files.entries()) {
      const url = URL.createObjectURL(file);
      const id = `${now}-${indexOffset}-${Math.random().toString(16).slice(2)}`;
      const item = {
        id,
        name: file.name,
        url,
        type: file.type,
      };

      playlist.push(item);
      urlRegistry.add(url);

      if (canStoreVideos) {
        try {
          await saveVideoBlob(id, file);
          persistedIds.add(id);
        } catch (error) {
          console.warn(`Unable to persist "${file.name}" for future sessions.`, error);
          alert(
            `"${file.name}" will remain available for this session only because it could not be saved locally.`,
          );
        }
      }
    }

    syncStoredPlaylistMetadata();
    renderTimelineGrid();

    if (canStoreVideos && persistedIds.size) {
      try {
        await pruneVideoStore(persistedIds);
      } catch (error) {
        console.warn('Unable to remove unused persisted videos.', error);
      }
    }

    if (wasEmpty && playlist.length) {
      await loadVideoAtIndex(0);
    } else if (state.currentIndex === -1 && playlist.length) {
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
  };

  const handleFadeSliderInput = () => {
    const value = Number(fadeSlider.value);
    const nextDuration = Number.isNaN(value) ? state.fadeDuration : value;
    setFadeDuration(nextDuration);
    updateFadeValueDisplay();
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

  restorePlaylistFromStorage().catch((error) => {
    console.warn('Failed to restore playlist from persistence.', error);
  });

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

const attachControlButtons = (playBtn, resetBtn, controller) => {
  playBtn.addEventListener('click', controller.handlePlay);
  resetBtn.addEventListener('click', controller.handleReset);
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

const init = () => {
  const elements = getDomElements();
  const store = createState(elements.precisionRange);
  const controller = createTransformController({ elements, store });

  elements.video.loop = false;

  elements.precisionRange.value = String(store.state.precision);
  controller.enableControls(false);
  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  createPlaylistController({ elements, controller, store });
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, elements.resetBtn, controller);
  setupVisibilityPause(elements.video);
  setupZoomPrevention();
};

document.addEventListener('DOMContentLoaded', init);

