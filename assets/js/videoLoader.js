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

const MEDIA_RECORDER_PREFERRED_TYPES = [
  'video/mp4;codecs=hvc1',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
];

const getSupportedMediaRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }

  for (const candidate of MEDIA_RECORDER_PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return null;
};

const parseCssNumber = (value) => {
  if (typeof value !== 'string') {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readSafeAreaInsets = () => {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  try {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      top: parseCssNumber(styles.getPropertyValue('--safe-area-top') || '0'),
      right: parseCssNumber(styles.getPropertyValue('--safe-area-right') || '0'),
      bottom: parseCssNumber(styles.getPropertyValue('--safe-area-bottom') || '0'),
      left: parseCssNumber(styles.getPropertyValue('--safe-area-left') || '0'),
    };
  } catch (error) {
    console.debug('Unable to read safe-area insets, defaulting to zero.', error);
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
};

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(event?.error || new Error('Unable to load image.'));
    };
    image.src = url;
  });

const sanitizeFileName = (name, nextExtension) => {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  return `${base}.${nextExtension}`;
};

const createVideoFromImage = async (file, { durationSeconds = 5, fps = 30 } = {}) => {
  const mimeType = getSupportedMediaRecorderMimeType();
  if (!mimeType) {
    throw new Error('This browser is unable to create MP4 videos.');
  }

  const image = await loadImageElement(file);
  const width = image.naturalWidth || image.width || 1280;
  const height = image.naturalHeight || image.height || 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare drawing surface for image conversion.');
  }

  const drawFrame = () => {
    context.drawImage(image, 0, 0, width, height);
  };

  drawFrame();

  if (typeof canvas.captureStream !== 'function') {
    throw new Error('Canvas streaming is not supported in this browser.');
  }

  const stream = canvas.captureStream(fps);
  if (!stream) {
    throw new Error('Unable to capture video stream from canvas.');
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  return new Promise((resolve, reject) => {
    let stopTimeoutId = null;
    let drawIntervalId = null;
    let completed = false;

    const cleanup = () => {
      if (completed) {
        return;
      }
      completed = true;
      if (stopTimeoutId !== null) {
        window.clearTimeout(stopTimeoutId);
      }
      if (drawIntervalId !== null) {
        window.clearInterval(drawIntervalId);
      }
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener('stop', () => {
      cleanup();
      if (!chunks.length) {
        reject(new Error('No video data was captured.'));
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      resolve({
        blob,
        mimeType,
        name: sanitizeFileName(file.name, 'mp4'),
      });
    });

    recorder.addEventListener('error', (event) => {
      cleanup();
      reject(event?.error || new Error('Unable to record video frames.'));
    });

    try {
      recorder.start();
    } catch (error) {
      cleanup();
      reject(error);
      return;
    }

    drawIntervalId = window.setInterval(drawFrame, Math.max(1, Math.round(1000 / fps)));
    stopTimeoutId = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationSeconds * 1000);
  });
};

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
    timelineExportBtn,
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
  let exportInProgress = false;
  const exportButtonDefaultLabel = timelineExportBtn?.textContent?.trim() || 'Export Video';

  const refreshExportButtonState = () => {
    if (!timelineExportBtn) {
      return;
    }
    timelineExportBtn.disabled = exportInProgress || !playlist.length;
  };

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
    refreshExportButtonState();
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

  const loadVideoElementForExport = (item) =>
    new Promise((resolve, reject) => {
      if (!item || !item.url) {
        reject(new Error('Missing video source for export.'));
        return;
      }

      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'auto';
      videoEl.crossOrigin = 'anonymous';
      videoEl.src = item.url;

      const handleLoadedData = () => {
        videoEl.removeEventListener('loadeddata', handleLoadedData);
        videoEl.removeEventListener('error', handleError);
        try {
          videoEl.currentTime = 0;
        } catch (error) {
          console.debug('Unable to reset export video timestamp before playback.', error);
        }
        resolve(videoEl);
      };

      const handleError = (event) => {
        videoEl.removeEventListener('loadeddata', handleLoadedData);
        videoEl.removeEventListener('error', handleError);
        reject(event?.error || new Error('Unable to load media for export.'));
      };

      videoEl.addEventListener('loadeddata', handleLoadedData, { once: true });
      videoEl.addEventListener('error', handleError, { once: true });

      try {
        videoEl.load();
      } catch (error) {
        videoEl.removeEventListener('loadeddata', handleLoadedData);
        videoEl.removeEventListener('error', handleError);
        reject(error);
      }
    });

  const playVideoElementForExport = (videoEl) =>
    new Promise((resolve, reject) => {
      if (!videoEl) {
        resolve();
        return;
      }

      let timeoutId = null;

      const cleanup = () => {
        videoEl.removeEventListener('ended', handleEnded);
        videoEl.removeEventListener('error', handleError);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const handleEnded = () => {
        cleanup();
        resolve();
      };

      const handleError = (event) => {
        cleanup();
        reject(event?.error || new Error('Unable to complete playback during export.'));
      };

      const safeDuration = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : 5;
      timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, Math.max(1000, Math.ceil(safeDuration * 1000) + 250));

      videoEl.addEventListener('ended', handleEnded, { once: true });
      videoEl.addEventListener('error', handleError, { once: true });

      try {
        videoEl.currentTime = 0;
      } catch (error) {
        console.debug('Unable to reset export video currentTime.', error);
      }

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => {
          cleanup();
          reject(error);
        });
      }
    });

  const cleanupExportVideoElement = (videoEl) => {
    if (!videoEl) {
      return;
    }
    try {
      videoEl.pause();
    } catch (error) {
      console.debug('Unable to pause export video element.', error);
    }
    videoEl.removeAttribute('src');
    try {
      videoEl.load();
    } catch (error) {
      console.debug('Unable to reset export video element.', error);
    }
  };

  const captureTimelineToBlob = async (mimeType) => {
    if (!mimeType) {
      throw new Error('Exporting video is not supported on this device.');
    }

    const playableItems = playlist.filter((entry) => entry && entry.url);
    if (!playableItems.length) {
      throw new Error('No media available to export.');
    }

    const rect =
      typeof videoWrapper?.getBoundingClientRect === 'function' ? videoWrapper.getBoundingClientRect() : null;
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const viewportWidth = Math.max(
      1,
      Number.isFinite(visualViewport?.width) && visualViewport.width > 0
        ? visualViewport.width
        : rect && Number.isFinite(rect.width) && rect.width > 0
          ? rect.width
          : window.innerWidth || 1,
    );
    const viewportHeight = Math.max(
      1,
      Number.isFinite(visualViewport?.height) && visualViewport.height > 0
        ? visualViewport.height
        : rect && Number.isFinite(rect.height) && rect.height > 0
          ? rect.height
          : window.innerHeight || 1,
    );

    const safeAreaInsets = readSafeAreaInsets();
    const safeLeft = Math.max(0, safeAreaInsets.left);
    const safeRight = Math.max(0, safeAreaInsets.right);
    const safeTop = Math.max(0, safeAreaInsets.top);
    const safeBottom = Math.max(0, safeAreaInsets.bottom);

    const baseWidth = viewportWidth;
    const baseHeight = viewportHeight;
    const baseFrameWidth = Math.max(1, baseWidth + state.widthAdjust);
    const baseFrameHeight = Math.max(1, baseHeight + state.heightAdjust);

    const preparedItems = [];
    let maxScale = 1;

    try {
      for (const item of playableItems) {
        // eslint-disable-next-line no-await-in-loop
        const videoEl = await loadVideoElementForExport(item);
        const naturalWidth =
          Number.isFinite(videoEl.videoWidth) && videoEl.videoWidth > 0 ? videoEl.videoWidth : baseFrameWidth;
        const naturalHeight =
          Number.isFinite(videoEl.videoHeight) && videoEl.videoHeight > 0 ? videoEl.videoHeight : baseFrameHeight;
        const widthScale = naturalWidth / baseFrameWidth;
        const heightScale = naturalHeight / baseFrameHeight;
        const scaleForItem = Math.min(widthScale, heightScale);
        if (Number.isFinite(scaleForItem) && scaleForItem > maxScale) {
          maxScale = scaleForItem;
        }
        preparedItems.push({ item, videoEl });
      }
    } catch (error) {
      preparedItems.forEach(({ videoEl }) => cleanupExportVideoElement(videoEl));
      throw error;
    }

    const desiredScale =
      window.devicePixelRatio && Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const exportScale = Math.max(1, Math.min(maxScale, desiredScale));

    const canvasWidth = Math.max(
      1,
      Math.round((Math.max(baseWidth, baseFrameWidth) + safeLeft + safeRight) * exportScale),
    );
    const canvasHeight = Math.max(
      1,
      Math.round((Math.max(baseHeight, baseFrameHeight) + safeTop + safeBottom) * exportScale),
    );

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      preparedItems.forEach(({ videoEl }) => cleanupExportVideoElement(videoEl));
      throw new Error('Unable to prepare drawing surface for export.');
    }

    const stream = canvas.captureStream(30);
    if (!stream) {
      preparedItems.forEach(({ videoEl }) => cleanupExportVideoElement(videoEl));
      throw new Error('Canvas capture stream is not supported in this browser.');
    }

    const exportFrame = {
      offsetX: Math.round((safeLeft + state.offsetX) * exportScale),
      offsetY: Math.round((safeTop + state.offsetY) * exportScale),
      width: Math.max(1, Math.round(baseFrameWidth * exportScale)),
      height: Math.max(1, Math.round(baseFrameHeight * exportScale)),
    };

    return new Promise((resolve, reject) => {
      let activeVideo = null;
      let rafId = null;
      let settled = false;
      const chunks = [];

      const recorder = new MediaRecorder(stream, { mimeType });

      const stopDrawing = () => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      const finalize = (error, blob) => {
        if (settled) {
          return;
        }
        settled = true;
        stopDrawing();
        cleanupExportVideoElement(activeVideo);
        preparedItems.forEach(({ videoEl }) => {
          if (videoEl !== activeVideo) {
            cleanupExportVideoElement(videoEl);
          }
        });
        preparedItems.length = 0;
        stream.getTracks().forEach((track) => track.stop());
        if (error) {
          reject(error);
        } else if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No video data captured.'));
        }
      };

      const drawFrame = () => {
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        if (activeVideo) {
          try {
            context.drawImage(
              activeVideo,
              exportFrame.offsetX,
              exportFrame.offsetY,
              exportFrame.width,
              exportFrame.height,
            );
          } catch (error) {
            // Frame not ready yet; ignore and continue drawing.
          }
        }

        if (!settled) {
          rafId = window.requestAnimationFrame(drawFrame);
        }
      };

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        if (!chunks.length) {
          finalize(new Error('No video data captured.'));
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        finalize(null, blob);
      });

      recorder.addEventListener('error', (event) => {
        finalize(event?.error || new Error('Recorder error during export.'));
      });

      try {
        recorder.start();
      } catch (error) {
        finalize(error);
        return;
      }

      drawFrame();

      (async () => {
        try {
          for (const { videoEl } of preparedItems) {
            activeVideo = videoEl;
            await playVideoElementForExport(videoEl);
            cleanupExportVideoElement(videoEl);
            activeVideo = null;
          }

          if (!settled && recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch (error) {
          cleanupExportVideoElement(activeVideo);
          activeVideo = null;
          finalize(error);
        }
      })();
    });
  };

  const handleTimelineExport = async () => {
    if (exportInProgress) {
      return;
    }

    if (!playlist.length) {
      alert('No media loaded to export.');
      return;
    }

    const mimeType = getSupportedMediaRecorderMimeType();
    if (!mimeType) {
      alert('Exporting video is not supported on this device.');
      return;
    }

    exportInProgress = true;
    if (timelineExportBtn) {
      timelineExportBtn.dataset.loading = 'true';
      timelineExportBtn.setAttribute('aria-busy', 'true');
      timelineExportBtn.textContent = 'Exporting…';
    }
    refreshExportButtonState();

    try {
      const blob = await captureTimelineToBlob(mimeType);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `timeline-export-${timestamp}.mp4`;
      const downloadUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = downloadUrl;
      tempLink.download = fileName;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 60000);
    } catch (error) {
      console.error('Unable to export timeline.', error);
      alert('Unable to export the current timeline.');
    } finally {
      exportInProgress = false;
      if (timelineExportBtn) {
        timelineExportBtn.dataset.loading = 'false';
        timelineExportBtn.removeAttribute('aria-busy');
        timelineExportBtn.textContent = exportButtonDefaultLabel;
      }
      refreshExportButtonState();
    }
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
    const files = Array.from((event.target && event.target.files) || []).filter((file) => {
      if (file.type.startsWith('video/')) {
        return true;
      }
      if (file.type.startsWith('image/')) {
        return true;
      }
      console.warn('Skipping unsupported file type:', file.type);
      return false;
    });

    if (!files.length) {
      return;
    }

    const wasEmpty = playlist.length === 0;
    const now = Date.now();

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const originalFile = files[fileIndex];
      let processedFile = originalFile;

      if (originalFile.type.startsWith('image/')) {
        try {
          const conversion = await createVideoFromImage(originalFile);
          processedFile = new File([conversion.blob], conversion.name, {
            type: conversion.mimeType,
            lastModified: Date.now(),
          });
        } catch (error) {
          console.warn('Unable to convert image to video.', error);
          alert('One of the selected images could not be converted into a video.');
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      if (!processedFile.type.startsWith('video/')) {
        console.warn('Skipping file because it is not a supported video type after processing.');
        // eslint-disable-next-line no-continue
        continue;
      }

      const url = URL.createObjectURL(processedFile);
      const item = {
        id: `${now}-${fileIndex}-${Math.random().toString(16).slice(2)}`,
        name: processedFile.name,
        url,
        type: processedFile.type,
        size: processedFile.size,
        lastModified: processedFile.lastModified,
        thumbnailUrl: null,
      };

      playlist.push(item);
      urlRegistry.add(url);
      prepareVideoElementForItem(item);
      ensureThumbnail(item).catch(() => {});

      if (persistence && typeof persistence.storeVideo === 'function') {
        // eslint-disable-next-line no-await-in-loop
        const stored = await persistence.storeVideo(item.id, processedFile);
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
  timelineExportBtn.addEventListener('click', handleTimelineExport);
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

