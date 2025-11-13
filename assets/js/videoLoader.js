import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';
import {
  loadPersistedData,
  saveTransformState,
  saveOptionsState,
  savePlaylistMetadata,
  persistVideoFile,
  deleteVideoFile,
} from './storage.js';

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
    videoWrapper,
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
    gridOverlay,
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
  let overlayWasActive = false;
  const thumbnailCache = new Map();
  const videoElements = new Map();
  const videoReadyPromises = new Map();
  let activeVideoElement = null;
  let crossfadeWatcherVideo = null;
  let crossfadeMonitorId = null;
  let upcomingIndexCache = null;

  const ensureVideoIsAttached = (videoEl) => {
    if (!videoEl || !videoWrapper) {
      return;
    }

    if (videoEl.parentElement !== videoWrapper) {
      videoWrapper.insertBefore(videoEl, gridOverlay);
    }
  };

  const configureVideoElement = (videoEl) => {
    if (!videoEl) {
      return;
    }

    videoEl.classList.add('main-video');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('muted', '');
    videoEl.playsInline = true;
    videoEl.preload = 'metadata';
    videoEl.loop = false;
    videoEl.controls = false;
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.volume = 0;
    videoEl.dataset.active = 'false';
    videoEl.style.opacity = '0';
    videoEl.style.transition = '';
  };

  configureVideoElement(video);
  ensureVideoIsAttached(video);

  const ensureVideoReady = (item, videoEl, { eager = false } = {}) => {
    if (!videoEl || !item?.url) {
      return Promise.resolve();
    }

    if (videoEl.readyState >= 2) {
      return Promise.resolve();
    }

    const cacheKey = item?.id || item?.url;
    const existing = videoReadyPromises.get(cacheKey);
    if (existing) {
      return existing;
    }

    if (eager && videoEl.preload !== 'auto') {
      videoEl.preload = 'auto';
      try {
        videoEl.load();
      } catch (error) {
        console.debug('Unable to trigger eager load for video.', error);
      }
    }

    const promise = waitForFirstFrame(videoEl, item.url, () => {})
      .catch((error) => {
        console.debug('Failed to prepare first frame for video.', error);
      })
      .finally(() => {
        videoReadyPromises.delete(cacheKey);
      });

    videoReadyPromises.set(cacheKey, promise);
    return promise;
  };


  const pauseAndResetVideo = (videoEl) => {
    if (!videoEl) {
      return;
    }
    try {
      videoEl.pause();
    } catch (error) {
      console.debug('Unable to pause video element during reset.', error);
    }
    try {
      videoEl.currentTime = 0;
    } catch (error) {
      console.debug('Unable to reset currentTime during pause.', error);
    }
    videoEl.dataset.active = 'false';
    videoEl.style.opacity = '0';
    videoEl.style.pointerEvents = 'none';
    videoEl.style.zIndex = '1';
  };

  const detachCrossfadeWatcher = () => {
    if (crossfadeMonitorId !== null) {
      window.cancelAnimationFrame(crossfadeMonitorId);
      crossfadeMonitorId = null;
    }
    crossfadeWatcherVideo = null;
  };

  const detachVideoElement = (videoEl) => {
    if (!videoEl) {
      return;
    }
    videoEl.removeAttribute('src');
    try {
      videoEl.load();
    } catch (error) {
      console.debug('Unable to reload video element during detach.', error);
    }
    videoEl.remove();
    delete videoEl.dataset.sourceId;
    delete videoEl.dataset.objectUrl;
    videoEl.dataset.active = 'false';
  };

  const prepareVideoElementForItem = (item, { eager = false } = {}) => {
    if (!item) {
      return null;
    }

    let videoEl = videoElements.get(item.id) || null;

    if (!videoEl) {
      if (!videoElements.size && (!video.dataset.sourceId || video.dataset.sourceId === item.id)) {
        videoEl = video;
      } else {
        videoEl = document.createElement('video');
      }
      configureVideoElement(videoEl);
      ensureVideoIsAttached(videoEl);
      videoElements.set(item.id, videoEl);
      videoEl.addEventListener('ended', handleVideoEnded);
    }

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.setAttribute('muted', '');
    videoEl.volume = 0;

    if (videoEl.dataset.sourceId !== item.id) {
      videoEl.dataset.sourceId = item.id;
    }

    if (videoEl.dataset.objectUrl !== item.url) {
      videoEl.dataset.objectUrl = item.url;
      videoEl.src = item.url;
      videoEl.preload = eager ? 'auto' : 'metadata';
      if (eager) {
        try {
          videoEl.load();
        } catch (error) {
          console.warn('Unable to load video source.', error);
        }
      }
    } else if (eager && videoEl.readyState === 0) {
      try {
        videoEl.preload = 'auto';
        videoEl.load();
      } catch (error) {
        console.warn('Unable to prepare video element for playback.', error);
      }
    }

    if (eager) {
      ensureVideoReady(item, videoEl, { eager: true }).catch(() => {});
    }

    return videoEl;
  };

  playlist.forEach((item) => {
    if (item?.url) {
      prepareVideoElementForItem(item);
    }
  });

  function advanceToNextVideo({ autoplayHint = true, previousThreshold = null } = {}) {
    const nextIndex = getNextIndex({ reuseCached: true });
    if (nextIndex === -1) {
      return;
    }
    if (nextIndex === state.currentIndex && playlist.length <= 1) {
      return;
    }

    loadVideoAtIndex(nextIndex, {
      autoplay: autoplayHint,
      preserveTransform: true,
      waitForReady: false,
    }).catch((error) => {
      console.warn('Unable to cross-fade to next video.', error);
    });
  }

  function attachCrossfadeWatcher(videoEl) {
    if (!state.fadeEnabled || !videoEl || playlist.length <= 1) {
      return;
    }

    crossfadeWatcherVideo = videoEl;
    let lastThreshold = null;

    const tick = () => {
      if (!state.fadeEnabled || crossfadeWatcherVideo !== videoEl || videoEl !== activeVideoElement) {
        detachCrossfadeWatcher();
        return;
      }

      const duration = videoEl.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        crossfadeMonitorId = window.requestAnimationFrame(tick);
        return;
      }

      const availableLead = Math.max(duration - 0.1, 0);
      const leadTime = Math.min(state.fadeDuration, availableLead);
      const threshold = Math.max(0, duration - leadTime);
      lastThreshold = threshold;

      if (videoEl.currentTime >= threshold) {
        const shouldAutoplay = !videoEl.paused && !videoEl.ended;
        detachCrossfadeWatcher();
        advanceToNextVideo({ autoplayHint: shouldAutoplay, previousThreshold: threshold });
        return;
      }

      crossfadeMonitorId = window.requestAnimationFrame(tick);
    };

    crossfadeMonitorId = window.requestAnimationFrame(tick);
  }

  function rescheduleCrossfadeWatcher() {
    detachCrossfadeWatcher();
    if (!state.fadeEnabled || playlist.length <= 1 || !activeVideoElement) {
      return;
    }
    attachCrossfadeWatcher(activeVideoElement);
  }

  const preloadUpcomingVideo = () => {
    if (!playlist.length) {
      clearUpcomingIndexCache();
      return;
    }

    const upcomingIndex = getNextIndex();
    if (upcomingIndex === -1 || upcomingIndex === state.currentIndex) {
      return;
    }

    const upcomingItem = playlist[upcomingIndex];
    if (upcomingItem) {
      const videoEl = prepareVideoElementForItem(upcomingItem, { eager: true });
      ensureVideoReady(upcomingItem, videoEl, { eager: true }).catch(() => {});
    }
  };

  const applyVideoActivation = (nextVideo, previousVideo) => {
    if (previousVideo && previousVideo !== nextVideo) {
      previousVideo.dataset.active = 'false';
      previousVideo.style.pointerEvents = 'none';
      previousVideo.style.zIndex = '1';
      previousVideo.style.transition = state.fadeEnabled ? `opacity ${state.fadeDuration}s ease` : '';
      previousVideo.style.opacity = '0';
      if (state.fadeEnabled && previousVideo.paused) {
        previousVideo.play().catch(() => {});
      }
    }

    if (!nextVideo) {
      return;
    }

    nextVideo.style.zIndex = '2';
    nextVideo.style.pointerEvents = 'auto';
    nextVideo.dataset.active = 'true';

    if (!state.fadeEnabled) {
      nextVideo.style.transition = '';
      nextVideo.style.opacity = '1';
      return;
    }

    nextVideo.style.transition = '';
    nextVideo.style.opacity = '0';
    requestAnimationFrame(() => {
      nextVideo.style.transition = `opacity ${state.fadeDuration}s ease`;
      nextVideo.style.opacity = '1';
    });
  };
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
      videoElements.forEach((videoEl) => {
        videoEl.style.transition = '';
        videoEl.style.opacity = videoEl.dataset.active === 'true' ? '1' : '0';
      });
    }
    rescheduleCrossfadeWatcher();
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
      const wrapper = document.createElement('div');
      wrapper.className = 'timeline-item-wrapper';
      wrapper.setAttribute('role', 'listitem');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-item';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Play ${item.name}`);

      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'timeline-thumbnail-wrapper';

      const preview = document.createElement('img');
      preview.className = 'timeline-thumbnail';
      preview.alt = '';
      preview.decoding = 'async';
      preview.loading = 'lazy';
      preview.draggable = false;

      if (item.thumbnailUrl) {
        preview.src = item.thumbnailUrl;
        preview.removeAttribute('data-state');
        previewWrapper.removeAttribute('data-loading');
      } else {
        preview.removeAttribute('src');
        preview.dataset.state = 'loading';
        previewWrapper.dataset.loading = 'true';
        ensureThumbnail(item)
          .then((thumbnailUrl) => {
            if (!wrapper.isConnected) {
              return;
            }
            if (thumbnailUrl) {
              preview.src = thumbnailUrl;
            }
          })
          .finally(() => {
            preview.removeAttribute('data-state');
            previewWrapper.removeAttribute('data-loading');
          });
      }

      const label = document.createElement('span');
      label.className = 'timeline-item-label';
      label.textContent = item.name;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'timeline-delete';
      deleteBtn.setAttribute('aria-label', `Remove ${item.name}`);
      deleteBtn.title = 'Remove from playlist';
      deleteBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
      deleteBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeItemById(item.id);
      });

      previewWrapper.appendChild(preview);
      button.append(previewWrapper, label);
      wrapper.append(button, deleteBtn);
      timelineGrid.appendChild(wrapper);
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

  async function loadVideoAtIndex(index, { autoplay = false, preserveTransform = true, waitForReady = true } = {}) {
    const item = playlist[index];
    if (!item) {
      return;
    }

    const token = ++loadToken;
    detachCrossfadeWatcher();
    const previousVideo = activeVideoElement;
    controller.handleOverlayState(false, { toggleUI: false });

    if (!preserveTransform) {
      resetTransform();
    }

    const nextVideo = prepareVideoElementForItem(item, { eager: true });
    if (!nextVideo) {
      return;
    }

    if (waitForReady) {
      await ensureVideoReady(item, nextVideo, { eager: true });
    } else {
      ensureVideoReady(item, nextVideo, { eager: true }).catch(() => {});
    }

    try {
      nextVideo.currentTime = 0;
    } catch (error) {
      console.debug('Unable to reset currentTime after preparation.', error);
    }
    ensureThumbnail(item).catch(() => {});

    if (token !== loadToken) {
      return;
    }

    activeVideoElement = nextVideo;
    setCurrentIndex(index);
    persistCurrentIndex(index);
    updateActiveTiles();
    controller.setVideoElement(nextVideo);
    controller.updateTransform();
    if (!state.hasVideo) {
      controller.enableControls(true);
    }
    clearUpcomingIndexCache();

    applyVideoActivation(nextVideo, previousVideo);
    preloadUpcomingVideo();

    if (previousVideo && previousVideo !== nextVideo) {
      let timeoutId = null;
      const onTransitionEnd = (event) => {
        if (event && event.target !== previousVideo) {
          return;
        }
        previousVideo.removeEventListener('transitionend', onTransitionEnd);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        pauseAndResetVideo(previousVideo);
      };

      if (state.fadeEnabled) {
        timeoutId = window.setTimeout(() => {
          onTransitionEnd(null);
        }, Math.max(state.fadeDuration * 1000 + 50, 150));
        previousVideo.addEventListener('transitionend', onTransitionEnd);
      } else {
        pauseAndResetVideo(previousVideo);
      }
    }

    rescheduleCrossfadeWatcher();

    if (autoplay) {
      nextVideo.play().catch((error) => {
        console.warn('Autoplay blocked:', error);
      });
    }

    if (state.fadeEnabled && previousVideo && previousVideo !== nextVideo && previousVideo.paused) {
      previousVideo.play().catch(() => {});
    }
  }

  async function removeItemById(itemId) {
    const removeIndex = playlist.findIndex((entry) => entry.id === itemId);
    if (removeIndex === -1) {
      return;
    }

    const [removed] = playlist.splice(removeIndex, 1);

    if (removed?.url) {
      if (urlRegistry.has(removed.url)) {
        urlRegistry.delete(removed.url);
      }
      URL.revokeObjectURL(removed.url);
    }

    let removedVideoEl = null;
    if (removed?.id) {
      thumbnailCache.delete(removed.id);
      removedVideoEl = videoElements.get(removed.id) || null;
      if (removedVideoEl) {
        removedVideoEl.removeEventListener('ended', handleVideoEnded);
        videoElements.delete(removed.id);
      }
      videoReadyPromises.delete(removed.id);
    }
    if (removed?.url) {
      videoReadyPromises.delete(removed.url);
    }

    if (persistence && typeof persistence.deleteVideo === 'function' && removed?.id) {
      persistence
        .deleteVideo(removed.id)
        .catch((error) => console.warn('Unable to delete persisted video.', error));
    }

    const previousIndex = state.currentIndex;

    setPlaylist([...playlist]);
    persistPlaylist();
    clearUpcomingIndexCache();

    if (removedVideoEl) {
      const wasActive = removedVideoEl === activeVideoElement;
      if (wasActive) {
        activeVideoElement = null;
        controller.setVideoElement(null);
        detachCrossfadeWatcher();
      }
      pauseAndResetVideo(removedVideoEl);
      detachVideoElement(removedVideoEl);
      if (wasActive) {
        controller.enableControls(false);
      }
    }

    if (!playlist.length) {
      setCurrentIndex(-1);
      persistCurrentIndex(-1);
      controller.setVideoElement(null);
      controller.enableControls(false);
      renderTimelineGrid();
      detachCrossfadeWatcher();
      return;
    }

    if (removeIndex === previousIndex) {
      setCurrentIndex(-1);
      persistCurrentIndex(-1);
      renderTimelineGrid();
      const nextIndex = Math.min(removeIndex, playlist.length - 1);
      try {
        await loadVideoAtIndex(nextIndex, { autoplay: false, preserveTransform: false });
      } catch (error) {
        console.warn('Unable to load next video after deletion.', error);
      }
      return;
    }

    if (removeIndex < previousIndex) {
      const nextIndex = previousIndex - 1;
      setCurrentIndex(nextIndex);
      persistCurrentIndex(nextIndex);
    }

    renderTimelineGrid();
    updateActiveTiles();
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();
  }

  const computeNextIndexInternal = () => {
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

  const getNextIndex = ({ reuseCached = false } = {}) => {
    if (reuseCached && upcomingIndexCache !== null) {
      return upcomingIndexCache;
    }
    const nextIndex = computeNextIndexInternal();
    upcomingIndexCache = nextIndex;
    return nextIndex;
  };

  const clearUpcomingIndexCache = () => {
    upcomingIndexCache = null;
  };

  function handleVideoEnded(event) {
    if (event && event.target && event.target !== activeVideoElement) {
      return;
    }

    if (!playlist.length) {
      return;
    }

    advanceToNextVideo({ autoplayHint: true });
  }

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
      prepareVideoElementForItem(item);
      ensureThumbnail(item).catch(() => {});

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

    clearUpcomingIndexCache();
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();
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
    clearUpcomingIndexCache();
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();
  };

  const handleFadeToggle = () => {
    const next = !state.fadeEnabled;
    setFadeEnabled(next);
    syncFadeSliderState();
    setToggleState(fadeToggle, next);

    if (!next) {
      videoElements.forEach((videoEl) => {
        videoEl.style.transition = '';
        videoEl.style.opacity = videoEl.dataset.active === 'true' ? '1' : '0';
      });
    } else if (activeVideoElement) {
      activeVideoElement.style.transition = '';
      activeVideoElement.style.opacity = '0';
      requestAnimationFrame(() => {
        activeVideoElement.style.transition = `opacity ${state.fadeDuration}s ease`;
        activeVideoElement.style.opacity = '1';
      });
    }

    persistPlaybackOptions({ fadeEnabled: state.fadeEnabled, fadeDuration: state.fadeDuration });
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();
  };

  const handleFadeSliderInput = () => {
    const value = Number(fadeSlider.value);
    const nextDuration = Number.isNaN(value) ? state.fadeDuration : value;
    setFadeDuration(nextDuration);
    updateFadeValueDisplay();
    persistPlaybackOptions({ fadeDuration: state.fadeDuration });
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();
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

  const cleanup = () => {
    detachCrossfadeWatcher();
    clearUpcomingIndexCache();
    videoElements.forEach((videoEl) => {
      videoEl.removeEventListener('ended', handleVideoEnded);
      pauseAndResetVideo(videoEl);
      if (videoEl !== video && videoEl.isConnected) {
        detachVideoElement(videoEl);
      }
    });
    videoElements.clear();
    activeVideoElement = null;
    upcomingIndexCache = null;
    delete video.dataset.sourceId;
    delete video.dataset.objectUrl;
    video.dataset.active = 'false';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '1';
    videoReadyPromises.clear();
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
    getActiveVideo: () => activeVideoElement,
    cleanup,
  };
};

const attachPrecisionControl = (precisionRange, controller) => {
  precisionRange.addEventListener('input', () => {
    const nextPrecision = Number(precisionRange.value);
    controller.handlePrecisionChange(nextPrecision);
  });
};

const attachControlButtons = (playBtn, moveBtn, controller) => {
  playBtn.addEventListener('click', controller.handlePlay);
  moveBtn.addEventListener('click', controller.handleMoveToggle);
};

const setupVisibilityPause = (getActiveVideo) => {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      return;
    }

    const activeVideo = typeof getActiveVideo === 'function' ? getActiveVideo() : getActiveVideo;
    if (activeVideo && !activeVideo.paused) {
      try {
        activeVideo.pause();
      } catch (error) {
        console.debug('Unable to pause active video on visibility change.', error);
      }
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
    saveMoveMode: (active) => saveOptionsState({ moveMode: active }),
    storeVideo: (id, file) => persistVideoFile(id, file),
    deleteVideo: (id) => deleteVideoFile(id),
  };

  const store = createState(elements.precisionRange, persisted.state);
  const controller = createTransformController({ elements, store, persistence });

  elements.video.loop = false;

  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  const playlistController = createPlaylistController({
    elements,
    controller,
    store,
    persistence,
    initialItems: persisted.playlist ?? [],
    initialIndex: persisted.state?.currentIndex ?? -1,
  });
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, elements.moveBtn, controller);
  setupVisibilityPause(() => playlistController.getActiveVideo());
  setupZoomPrevention();
};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Unable to initialize application.', error);
  });
});

