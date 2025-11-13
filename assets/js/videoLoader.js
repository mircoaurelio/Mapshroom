import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';

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
  let loadToken = 0;
  let pendingFade = false;

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

  const loadVideoAtIndex = async (index, { autoplay = false } = {}) => {
    const item = playlist[index];
    if (!item) {
      return;
    }

    const token = ++loadToken;
    pendingFade = state.fadeEnabled;

    video.pause();
    controller.handleOverlayState(false, { toggleUI: false });
    resetTransform();
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

    files.forEach((file, fileIndex) => {
      const url = URL.createObjectURL(file);
      const item = {
        id: `${now}-${fileIndex}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        url,
      };

      playlist.push(item);
      urlRegistry.add(url);
    });

    setPlaylist([...playlist]);
    renderTimelineGrid();

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

    loadVideoAtIndex(index, { autoplay: true }).then(() => {
      applyTimelineVisibility(false);
    });
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

    loadVideoAtIndex(index, { autoplay: true }).then(() => {
      applyTimelineVisibility(false);
    });
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
      'wheel',
      (event) => {
        if (event.ctrlKey) {
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

