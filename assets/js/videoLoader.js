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
  saveAiSettings as persistAiSettings,
} from './storage.js';
import { createAiController } from './ai.js';
import { toggleVisibility } from './ui.js';
import { createTutorialController } from './tutorial.js';
import { initAddToHomeBanner } from './addToHome.js';

const setupGridOverlayListeners = (gridOverlay, handler, precisionControl, getMoveModeState) => {
  const pointerSupported = 'PointerEvent' in window;
  let centerZonePressTimer = null;
  let centerZoneActive = false;
  let initialY = null;
  let initialPrecisionValue = null;

  const showPrecisionSlider = () => {
    // Only show if move mode is active
    const isMoveModeActive = typeof getMoveModeState === 'function' ? getMoveModeState() : false;
    if (precisionControl && isMoveModeActive) {
      precisionControl.classList.add('visible');
      precisionControl.classList.remove('concealed');
    }
  };

  const hidePrecisionSlider = () => {
    if (precisionControl) {
      precisionControl.classList.remove('visible');
      if (!precisionControl.classList.contains('always-visible')) {
        precisionControl.classList.add('concealed');
      }
    }
  };

  // Track if user is interacting with the slider
  let sliderInteractionActive = false;
  
  // Allow slider to prevent hiding when being interacted with
  if (precisionControl) {
    const sliderInput = precisionControl.querySelector('input[type="range"]');
    if (sliderInput) {
      const handleSliderPress = () => {
        sliderInteractionActive = true;
      };
      const handleSliderRelease = () => {
        sliderInteractionActive = false;
        // Hide slider after a short delay to allow for smooth interaction
        setTimeout(() => {
          if (!sliderInteractionActive && centerZoneActive) {
            centerZoneActive = false;
            hidePrecisionSlider();
          }
        }, 100);
      };
      
      if (pointerSupported) {
        sliderInput.addEventListener('pointerdown', handleSliderPress);
        sliderInput.addEventListener('pointerup', handleSliderRelease);
        sliderInput.addEventListener('pointercancel', handleSliderRelease);
      } else {
        sliderInput.addEventListener('touchstart', handleSliderPress, { passive: false });
        sliderInput.addEventListener('touchend', handleSliderRelease, { passive: false });
        sliderInput.addEventListener('touchcancel', handleSliderRelease, { passive: false });
      }
    }
  }

  // Handle vertical drag to change precision value
  const handleMove = (event) => {
    if (!centerZoneActive || !precisionControl || sliderInteractionActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const sliderInput = precisionControl.querySelector('input[type="range"]');
    if (!sliderInput || initialY === null || initialPrecisionValue === null) return;
    
    // Get current Y position
    let currentY;
    if (pointerSupported) {
      currentY = event.clientY;
    } else {
      // For touch events: use touches[0] for touchmove, changedTouches[0] for touchend
      if (event.touches && event.touches.length > 0) {
        currentY = event.touches[0].clientY;
      } else if (event.changedTouches && event.changedTouches.length > 0) {
        currentY = event.changedTouches[0].clientY;
      }
    }
    
    if (currentY === undefined || currentY === null) return;
    
    // Calculate delta Y (positive deltaY = moved up = increase precision)
    const deltaY = initialY - currentY;
    const sensitivity = 9; // Pixels per precision step (lower = more sensitive)
    const precisionChange = Math.round(deltaY / sensitivity);
    
    const min = Number(sliderInput.min) || 1;
    const max = Number(sliderInput.max) || 20;
    const newValue = Math.max(min, Math.min(max, initialPrecisionValue + precisionChange));
    const currentValue = Number(sliderInput.value);
    
    // Only update if value changed
    if (newValue !== currentValue) {
      sliderInput.value = String(newValue);
      // Trigger input event to update precision
      sliderInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  // Global release handler to catch releases even if they happen over the slider
  const handleGlobalRelease = (event) => {
    // Don't hide if user is actively interacting with the slider
    if (sliderInteractionActive) {
      return;
    }
    
    if (centerZoneActive) {
      centerZoneActive = false;
      initialY = null;
      initialPrecisionValue = null;
      hidePrecisionSlider();
      // Only toggle overlay if move mode is not active (original behavior)
      const isMoveModeActive = typeof getMoveModeState === 'function' ? getMoveModeState() : false;
      if (!isMoveModeActive && centerZonePressTimer === null) {
        handler('toggle-overlay');
      }
      if (centerZonePressTimer) {
        clearTimeout(centerZonePressTimer);
        centerZonePressTimer = null;
      }
    }
  };

  gridOverlay.querySelectorAll('.grid-zone').forEach((zone) => {
    const action = zone.dataset.action;
    const isCenterZone = action === 'toggle-overlay';

    const handlePress = (event) => {
      if (isCenterZone) {
        event.preventDefault();
        centerZoneActive = true;
        
        // Store initial Y position and precision value for drag calculation
        const sliderInput = precisionControl?.querySelector('input[type="range"]');
        if (sliderInput) {
          if (pointerSupported) {
            initialY = event.clientY;
          } else {
            // For touch events: use touches[0] for touchstart
            if (event.touches && event.touches.length > 0) {
              initialY = event.touches[0].clientY;
            } else if (event.changedTouches && event.changedTouches.length > 0) {
              initialY = event.changedTouches[0].clientY;
            }
          }
          initialPrecisionValue = Number(sliderInput.value);
        }
        
        // Show precision slider immediately when center zone is pressed (if move mode is active)
        showPrecisionSlider();
      } else {
        event.preventDefault();
        handler(action);
      }
    };

    const handleRelease = (event) => {
      if (isCenterZone && centerZoneActive) {
        event.preventDefault();
        handleGlobalRelease(event);
      }
    };

    if (pointerSupported) {
      zone.addEventListener('pointerdown', handlePress);
      zone.addEventListener('pointerup', handleRelease);
      zone.addEventListener('pointercancel', handleRelease);
      zone.addEventListener('pointerleave', handleRelease);
      
      // Track pointer movement for center zone drag
      if (isCenterZone) {
        zone.addEventListener('pointermove', handleMove);
      }
      
      // For desktop: also handle click events for center zone
      if (isCenterZone) {
        zone.addEventListener('click', (event) => {
          event.preventDefault();
          // On desktop, clicking should show the slider briefly
          showPrecisionSlider();
          setTimeout(() => {
            if (!sliderInteractionActive) {
              hidePrecisionSlider();
            }
          }, 2000); // Show for 2 seconds on click
        });
      }
    } else {
      zone.addEventListener('touchstart', handlePress, { passive: false });
      zone.addEventListener('touchend', handleRelease, { passive: false });
      zone.addEventListener('touchcancel', handleRelease, { passive: false });
      
      // Track touch movement for center zone drag
      if (isCenterZone) {
        zone.addEventListener('touchmove', handleMove, { passive: false });
      }
      
      zone.addEventListener('click', (event) => {
        if (!isCenterZone) {
          event.preventDefault();
          handler(action);
        }
      });
    }
  });

  // Add global listeners to catch releases and movements even when over the slider or outside the zone
  if (pointerSupported) {
    document.addEventListener('pointerup', handleGlobalRelease);
    document.addEventListener('pointercancel', handleGlobalRelease);
    document.addEventListener('pointermove', (event) => {
      if (centerZoneActive && !sliderInteractionActive) {
        handleMove(event);
      }
    });
  } else {
    document.addEventListener('touchend', handleGlobalRelease, { passive: false });
    document.addEventListener('touchcancel', handleGlobalRelease, { passive: false });
    document.addEventListener('touchmove', (event) => {
      if (centerZoneActive && !sliderInteractionActive) {
        handleMove(event);
      }
    }, { passive: false });
  }
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

const shouldShowExportDiagnostics = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.location?.hash && window.location.hash.toLowerCase().includes('debug-export')) {
    return true;
  }
  try {
    return window.localStorage?.getItem('mapshroom:debug-export') === 'true';
  } catch (error) {
    return false;
  }
};

const showExportDiagnostics = (info) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.__mapshroomLastExportMetrics = info;

  if (!shouldShowExportDiagnostics()) {
    return;
  }

  const existing = document.getElementById('export-debug-overlay');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('aside');
  overlay.id = 'export-debug-overlay';
  overlay.className = 'export-debug-overlay';

  const title = document.createElement('h3');
  title.textContent = 'Export Diagnostics';
  overlay.appendChild(title);

  const list = document.createElement('dl');

  const appendEntry = (label, value) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = String(value);
    list.append(dt, dd);
  };

  Object.entries(info).forEach(([key, value]) => {
    appendEntry(key, value);
  });

  overlay.appendChild(list);

  const hint = document.createElement('p');
  hint.className = 'export-debug-hint';
  hint.textContent = 'Panel hides in 10s. Add #debug-export to the URL to keep showing it.';
  overlay.appendChild(hint);

  document.body.appendChild(overlay);

  window.setTimeout(() => {
    if (overlay.isConnected) {
      overlay.remove();
    }
  }, 10000);
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
  const playlistSubscribers = new Set();

  const notifyPlaylistSubscribers = () => {
    const snapshot = playlist.map((item) => ({ ...item }));
    playlistSubscribers.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.warn('Playlist subscriber failed.', error);
      }
    });
  };

  const refreshExportButtonState = () => {
    if (!timelineExportBtn) {
      return;
    }
    timelineExportBtn.disabled = exportInProgress || !playlist.length;
  };

  const addFileToPlaylist = async (file, { makeCurrent = false, autoplay = false } = {}) => {
    if (!(file instanceof File)) {
      console.warn('Attempted to add a non-file object to the playlist.');
      return null;
    }

    const now = Date.now();
    const objectUrl = URL.createObjectURL(file);
    const item = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      url: objectUrl,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      thumbnailUrl: null,
      blob: file,
    };

    playlist.push(item);
    urlRegistry.add(objectUrl);
    prepareVideoElementForItem(item);
    ensureThumbnail(item).catch(() => {});

    if (persistence && typeof persistence.storeVideo === 'function') {
      try {
        const stored = await persistence.storeVideo(item.id, file);
        if (!stored) {
          console.warn('The selected video could not be saved for future sessions.');
        }
      } catch (error) {
        console.warn('Unable to store video in IndexedDB.', error);
      }
    }

    setPlaylist([...playlist]);
    renderTimelineGrid();
    persistPlaylist();
    notifyPlaylistSubscribers();
    clearUpcomingIndexCache();
    preloadUpcomingVideo();
    rescheduleCrossfadeWatcher();

    if (makeCurrent) {
      try {
        await loadVideoAtIndex(playlist.length - 1, {
          autoplay,
          preserveTransform: true,
          waitForReady: true,
        });
      } catch (error) {
        console.warn('Unable to load newly added video.', error);
      }
    }

    return item;
  };

  const addVideoFromBlob = async ({
    blob,
    name,
    type,
    makeCurrent = true,
    autoplay = false,
  } = {}) => {
    if (!(blob instanceof Blob)) {
      throw new Error('Expected a Blob when adding a generated video.');
    }

    const inferredType = type || blob.type || 'video/mp4';
    const baseName =
      typeof name === 'string' && name.trim().length ? name.trim() : 'Runway Output';
    const hasExtension = /\.[a-z0-9]{2,}$/i.test(baseName);
    let extension = '.mp4';
    if (inferredType.includes('webm')) {
      extension = '.webm';
    } else if (inferredType.includes('quicktime') || inferredType.includes('mov')) {
      extension = '.mov';
    } else if (inferredType.includes('ogg')) {
      extension = '.ogv';
    }
    const finalName = hasExtension ? baseName : `${baseName}${extension}`;

    const file =
      blob instanceof File
        ? blob
        : new File([blob], finalName, { type: inferredType, lastModified: Date.now() });

    return addFileToPlaylist(file, { makeCurrent, autoplay });
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

  const captureVideoDimensions = (item, videoEl) => {
    if (!item || !videoEl) {
      return;
    }
    // Capture dimensions if not already stored and video has loaded metadata
    if ((!item.videoWidth || !item.videoHeight) && videoEl.readyState >= 1) {
      const width = videoEl.videoWidth;
      const height = videoEl.videoHeight;
      if (width > 0 && height > 0) {
        item.videoWidth = width;
        item.videoHeight = height;
      }
    }
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
      
      // Add listener to capture dimensions when metadata loads
      const handleLoadedMetadata = () => {
        captureVideoDimensions(item, videoEl);
        // Trigger re-render if timeline is open to update aspect ratios
        if (state.timelineOpen) {
          renderTimelineGrid();
        }
      };
      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
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

    // Try to capture dimensions if video already has metadata
    captureVideoDimensions(item, videoEl);

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

    if (playlist.length <= 1) {
      const targetIndex = state.currentIndex >= 0 ? state.currentIndex : nextIndex;
      if (targetIndex === -1) {
        return;
      }
      loadVideoAtIndex(targetIndex, {
        autoplay: autoplayHint,
        preserveTransform: true,
        waitForReady: false,
      }).catch((error) => {
        console.warn('Unable to restart video playback.', error);
      });
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
          // Store video dimensions in the item for aspect ratio calculation
          if (width > 0 && height > 0) {
            item.videoWidth = width;
            item.videoHeight = height;
          }
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
      // Recalculate grid columns after timeline becomes visible
      requestAnimationFrame(() => {
        if (playlist.length > 0) {
          const optimalColumns = calculateOptimalColumns();
          if (optimalColumns !== null && timelineGrid) {
            timelineGrid.style.gridTemplateColumns = `repeat(${optimalColumns}, minmax(0, 1fr))`;
          }
        }
      });
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
      const isActive = tileIndex === state.currentIndex;
      tile.classList.toggle('active', isActive);
      // Also update the wrapper for height fit-content
      const wrapper = tile.closest('.timeline-item-wrapper');
      if (wrapper) {
        wrapper.classList.toggle('has-active', isActive);
      }
    });
  };

  const calculateOptimalColumns = () => {
    if (!playlist.length || !timelineGrid) {
      return null;
    }

    // Get available width (accounting for padding and gap)
    const gridRect = timelineGrid.getBoundingClientRect();
    // If grid is not visible yet, use window width as fallback
    const availableWidth = gridRect.width > 0 ? gridRect.width - 16 : window.innerWidth - 32;
    const gap = 16; // 1rem gap
    const minColumnWidth = 200; // Minimum column width in pixels

    // Count landscape videos (width > height)
    const landscapeCount = playlist.filter(
      (item) => item.videoWidth && item.videoHeight && item.videoWidth > item.videoHeight
    ).length;
    const totalVideos = playlist.length;
    const landscapeRatio = totalVideos > 0 ? landscapeCount / totalVideos : 0;

    // If most videos are landscape, allow more columns
    // Adjust minimum column width based on landscape ratio
    const adjustedMinWidth = landscapeRatio > 0.5 
      ? Math.max(150, minColumnWidth * 0.75) // Smaller min width for more columns when landscape
      : minColumnWidth;

    // Calculate how many columns can fit
    let columns = Math.floor((availableWidth + gap) / (adjustedMinWidth + gap));
    columns = Math.max(1, Math.min(columns, totalVideos)); // At least 1, at most total videos

    // In portrait mode, ensure we don't have too many columns for portrait videos
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait && landscapeRatio < 0.5) {
      // For portrait videos in portrait mode, limit to 2-3 columns
      columns = Math.min(columns, 3);
    } else if (!isPortrait && landscapeRatio > 0.5) {
      // For landscape videos in landscape mode, allow more columns (at least 4-5)
      columns = Math.max(columns, 4);
    }

    return columns;
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

    // Calculate and apply optimal column count based on video content
    const optimalColumns = calculateOptimalColumns();
    if (optimalColumns !== null) {
      timelineGrid.style.gridTemplateColumns = `repeat(${optimalColumns}, minmax(0, 1fr))`;
    } else {
      // Fallback to CSS auto-fill
      timelineGrid.style.gridTemplateColumns = '';
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

      // Set aspect ratio based on video dimensions if available
      if (item.videoWidth && item.videoHeight && item.videoWidth > 0 && item.videoHeight > 0) {
        previewWrapper.style.aspectRatio = `${item.videoWidth} / ${item.videoHeight}`;
      }

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
              // Update aspect ratio if dimensions were just loaded
              if (item.videoWidth && item.videoHeight && item.videoWidth > 0 && item.videoHeight > 0) {
                previewWrapper.style.aspectRatio = `${item.videoWidth} / ${item.videoHeight}`;
              }
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
    // Only disable overlay if move mode is not active
    // When move mode is active, overlay must remain enabled for move functionality
    if (!state.moveMode) {
      controller.handleOverlayState(false, { toggleUI: false });
    }

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
    // If move mode is active, ensure overlay remains enabled after video restart
    if (state.moveMode) {
      controller.handleOverlayState(true, { toggleUI: false });
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
    notifyPlaylistSubscribers();

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

    // Capture the actual rendered dimensions of the video-wrapper as it appears on screen
    // This matches exactly what's being streamed to the projector
    const wrapperRect = videoWrapper?.getBoundingClientRect();
    if (!wrapperRect) {
      throw new Error('Unable to determine video wrapper dimensions.');
    }

    // Use the actual rendered dimensions (what's visible on screen/streamed)
    const renderedWidth = Math.max(1, Math.round(wrapperRect.width));
    const renderedHeight = Math.max(1, Math.round(wrapperRect.height));
    
    // Use device pixel ratio for high-DPI displays
    const devicePixelRatio = window.devicePixelRatio && Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const exportScale = Math.max(1, devicePixelRatio);

    // Canvas dimensions match the rendered wrapper exactly
    const canvasWidth = Math.max(1, Math.round(renderedWidth * exportScale));
    const canvasHeight = Math.max(1, Math.round(renderedHeight * exportScale));

    showExportDiagnostics({
      renderedWidth,
      renderedHeight,
      wrapperRectWidth: wrapperRect.width,
      wrapperRectHeight: wrapperRect.height,
      wrapperRectLeft: wrapperRect.left,
      wrapperRectTop: wrapperRect.top,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio,
      exportScale,
      canvasWidth,
      canvasHeight,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      widthAdjust: state.widthAdjust,
      heightAdjust: state.heightAdjust,
    });

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare drawing surface for export.');
    }

    const stream = canvas.captureStream(30);
    if (!stream) {
      throw new Error('Canvas capture stream is not supported in this browser.');
    }

    // We'll calculate the export frame dynamically for each video during export
    // This ensures we capture each video at its actual rendered position and size

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
        // Fill canvas with black background (matching video-wrapper background)
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        
        if (activeVideo && activeVideo.readyState >= 2) {
          try {
            // Get the actual rendered position and size of the video element
            const videoRect = activeVideo.getBoundingClientRect();
            
            // Calculate position relative to the wrapper (what we're capturing)
            const relativeX = (videoRect.left - wrapperRect.left) * exportScale;
            const relativeY = (videoRect.top - wrapperRect.top) * exportScale;
            const videoWidth = videoRect.width * exportScale;
            const videoHeight = videoRect.height * exportScale;
            
            // Draw the video element exactly as it appears on screen
            // This captures the video with all CSS transforms and positioning applied
            context.drawImage(
              activeVideo,
              Math.round(relativeX),
              Math.round(relativeY),
              Math.max(1, Math.round(videoWidth)),
              Math.max(1, Math.round(videoHeight)),
            );
          } catch (error) {
            // Frame not ready yet; ignore and continue drawing.
            console.debug('Frame not ready for export:', error);
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
          for (const item of playableItems) {
            let videoEl = null;
            try {
              // eslint-disable-next-line no-await-in-loop
              videoEl = await loadVideoElementForExport(item);
              activeVideo = videoEl;
              await playVideoElementForExport(videoEl);
            } finally {
              cleanupExportVideoElement(videoEl);
              activeVideo = null;
            }
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
    // On iOS, event.target.files might be empty, so we also check the fileInput directly
    const inputElement = event?.target || fileInput;
    const fileList = inputElement?.files;
    
    if (!fileList || fileList.length === 0) {
      if (inputElement) {
        inputElement.value = '';
      }
      return;
    }

    const files = Array.from(fileList).filter((file) => {
      if (!file || !(file instanceof File)) {
        console.warn('Invalid file object:', file);
        return false;
      }
      
      // Check MIME type first
      const mimeType = file.type || '';
      if (mimeType.startsWith('video/')) {
        return true;
      }
      if (mimeType.startsWith('image/')) {
        return true;
      }
      
      // On iOS, file.type might be empty, so check file extension as fallback
      const fileName = file.name || '';
      const extension = fileName.toLowerCase().split('.').pop();
      const videoExtensions = ['mp4', 'mov', 'm4v', 'avi', 'webm', 'mkv', '3gp'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
      
      if (extension && (videoExtensions.includes(extension) || imageExtensions.includes(extension))) {
        return true;
      }
      
      console.warn('Skipping unsupported file type:', mimeType || 'unknown', 'extension:', extension || 'none');
      return false;
    });

    if (!files.length) {
      if (inputElement) {
        inputElement.value = '';
      }
      return;
    }

    // Check if any files are images that need conversion
    const hasImages = files.some((file) => {
      const isImage = file.type?.startsWith('image/') || 
        (() => {
          const fileName = file.name || '';
          const extension = fileName.toLowerCase().split('.').pop();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension);
        })();
      return isImage;
    });

    // Show loading indicator if images need to be converted
    if (hasImages && elements.loadingIndicator) {
      toggleVisibility(elements.loadingIndicator, true);
    }

    const wasEmpty = playlist.length === 0;
    let addedAny = false;

    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const originalFile = files[fileIndex];
        let processedFile = originalFile;

        // Check if it's an image (by MIME type or extension)
        const isImage = originalFile.type?.startsWith('image/') || 
          (() => {
            const fileName = originalFile.name || '';
            const extension = fileName.toLowerCase().split('.').pop();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension);
          })();

        if (isImage) {
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

        // Verify it's a video after processing (check MIME type or extension)
        const isVideo = processedFile.type?.startsWith('video/') ||
          (() => {
            const fileName = processedFile.name || '';
            const extension = fileName.toLowerCase().split('.').pop();
            return ['mp4', 'mov', 'm4v', 'avi', 'webm', 'mkv', '3gp'].includes(extension);
          })();

        if (!isVideo) {
          console.warn('Skipping file because it is not a supported video type after processing.');
          // eslint-disable-next-line no-continue
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const item = await addFileToPlaylist(processedFile, {
          makeCurrent: wasEmpty && !addedAny,
          autoplay: wasEmpty && !addedAny,
        });

        if (item) {
          addedAny = true;
        }
      }
    } finally {
      // Hide loading indicator after processing is complete
      if (hasImages && elements.loadingIndicator) {
        toggleVisibility(elements.loadingIndicator, false);
      }
    }

    if (inputElement) {
      inputElement.value = '';
    }
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

  // On iOS, the 'change' event may not fire reliably, so we also listen to 'input'
  // Use a flag to prevent double-processing when both events fire
  let isProcessingFiles = false;
  const handleFileSelectionWithGuard = async (event) => {
    if (isProcessingFiles) {
      return;
    }
    isProcessingFiles = true;
    try {
      await handleFileSelection(event);
    } finally {
      // Reset flag after a short delay to allow for iOS event quirks
      setTimeout(() => {
        isProcessingFiles = false;
      }, 100);
    }
  };
  
  fileInput.addEventListener('change', handleFileSelectionWithGuard);
  fileInput.addEventListener('input', handleFileSelectionWithGuard);
  timelineBtn.addEventListener('click', handleTimelineToggle);

  // Handle window resize to recalculate grid columns
  let resizeTimeout = null;
  const handleResize = () => {
    // Debounce resize events
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      if (state.timelineOpen && playlist.length > 0) {
        // Recalculate and update grid columns
        const optimalColumns = calculateOptimalColumns();
        if (optimalColumns !== null && timelineGrid) {
          timelineGrid.style.gridTemplateColumns = `repeat(${optimalColumns}, minmax(0, 1fr))`;
        }
      }
    }, 150);
  };
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
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
  notifyPlaylistSubscribers();

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
    getPlaylistSnapshot: () => playlist.map((item) => ({ ...item })),
    addVideoFromBlob,
    ensureThumbnailForItem: (itemId) => {
      const item = playlist.find((candidate) => candidate.id === itemId);
      if (!item) {
        return Promise.resolve('');
      }
      return ensureThumbnail(item);
    },
    subscribeToPlaylist: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      playlistSubscribers.add(callback);
      try {
        callback(playlist.map((item) => ({ ...item })));
      } catch (error) {
        console.warn('Playlist subscriber failed during initial call.', error);
      }
      return () => {
        playlistSubscribers.delete(callback);
      };
    },
    cleanup,
  };
};

const createPrecisionDots = (precisionRange, dotsContainer) => {
  if (!dotsContainer) return;
  
  const min = Number(precisionRange.min) || 1;
  const max = Number(precisionRange.max) || 20;
  const totalDots = Math.min(max - min + 1, 20); // Limit to 20 dots for visual clarity
  
  dotsContainer.innerHTML = '';
  
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'precision-dot';
    dotsContainer.appendChild(dot);
  }
  
  const updateDots = () => {
    const currentValue = Number(precisionRange.value);
    const dots = dotsContainer.querySelectorAll('.precision-dot');
    
    dots.forEach((dot, index) => {
      const dotValue = min + Math.round((index / (dots.length - 1)) * (max - min));
      const distance = Math.abs(currentValue - dotValue);
      
      dot.classList.remove('active', 'near');
      
      if (distance === 0) {
        dot.classList.add('active');
      } else if (distance <= 2) {
        dot.classList.add('near');
      }
    });
  };
  
  updateDots();
  precisionRange.addEventListener('input', updateDots);
  precisionRange.addEventListener('change', updateDots);
};

const attachPrecisionControl = (precisionRange, controller) => {
  precisionRange.addEventListener('input', () => {
    const nextPrecision = Number(precisionRange.value);
    controller.handlePrecisionChange(nextPrecision);
  });
};

const attachControlButtons = (playBtn, moveBtn, rotateLockBtn, controller) => {
  playBtn.addEventListener('click', controller.handlePlay);
  moveBtn.addEventListener('click', controller.handleMoveToggle);
  rotateLockBtn.addEventListener('click', controller.handleRotationLockToggle);
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

  // Check if there are saved assets before loading
  const hasSavedAssets = (() => {
    try {
      const STORAGE_KEY = 'mapshroom-pocket:v1';
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return false;
      }
      const parsed = JSON.parse(raw);
      const playlist = parsed?.playlist;
      return Array.isArray(playlist) && playlist.length > 0;
    } catch (error) {
      return false;
    }
  })();

  // Show loading indicator if there are saved assets
  if (hasSavedAssets) {
    toggleVisibility(elements.loadingIndicator, true);
  }

  let persisted = { state: {}, playlist: [], ai: {} };
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
    saveRotationLock: (locked) => saveOptionsState({ rotationLocked: locked }),
    saveLockedOrientationAngle: (angle) => saveOptionsState({ lockedOrientationAngle: angle }),
    saveLockedViewportSize: (width, height) => saveOptionsState({ lockedViewportWidth: width, lockedViewportHeight: height }),
    storeVideo: (id, file) => persistVideoFile(id, file),
    deleteVideo: (id) => deleteVideoFile(id),
    getAiSettings: () => ({ ...(persisted.ai || {}) }),
    saveAiSettings: (partial) => {
      const next = { ...(persisted.ai || {}), ...(partial || {}) };
      persistAiSettings(partial || {});
      persisted.ai = next;
      return next;
    },
  };

  const store = createState(elements.precisionRange, persisted.state);
  const controller = createTransformController({ elements, store, persistence });

  elements.video.loop = false;

  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction, elements.precisionControl, () => store.state.moveMode);
  const playlistController = createPlaylistController({
    elements,
    controller,
    store,
    persistence,
    initialItems: persisted.playlist ?? [],
    initialIndex: persisted.state?.currentIndex ?? -1,
  });
  
  // Wait for video to load if there are saved assets, then hide loading indicator
  if (hasSavedAssets && persisted.playlist && persisted.playlist.length > 0) {
    // Wait a bit for the playlist controller to start loading the video
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Wait for video to be ready
    const waitForVideoReady = () => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // Check for up to 5 seconds (50 * 100ms)
        
        const checkVideo = () => {
          const activeVideo = playlistController.getActiveVideo();
          if (activeVideo) {
            if (activeVideo.readyState >= 2) {
              resolve();
              return;
            }
            const onLoadedData = () => {
              activeVideo.removeEventListener('loadeddata', onLoadedData);
              activeVideo.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              activeVideo.removeEventListener('loadeddata', onLoadedData);
              activeVideo.removeEventListener('error', onError);
              resolve();
            };
            activeVideo.addEventListener('loadeddata', onLoadedData, { once: true });
            activeVideo.addEventListener('error', onError, { once: true });
            // Timeout after 3 seconds to avoid hanging
            setTimeout(() => {
              activeVideo.removeEventListener('loadeddata', onLoadedData);
              activeVideo.removeEventListener('error', onError);
              resolve();
            }, 3000);
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkVideo, 100);
            } else {
              resolve();
            }
          }
        };
        checkVideo();
      });
    };
    
    await waitForVideoReady();
    // Small delay to ensure UI is ready
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  
  // Hide loading indicator
  if (hasSavedAssets) {
    toggleVisibility(elements.loadingIndicator, false);
  }
  
  createAiController({
    elements,
    controller,
    playlistController,
    persistence,
    aiSettings: persisted.ai || {},
    store,
  }).catch((error) => {
    console.warn('Unable to initialize AI controller.', error);
  });
  attachPrecisionControl(elements.precisionRange, controller);
  createPrecisionDots(elements.precisionRange, elements.precisionDots);
  attachControlButtons(elements.playBtn, elements.moveBtn, elements.rotateLockBtn, controller);
  setupVisibilityPause(() => playlistController.getActiveVideo());
  setupZoomPrevention();

  // Initialize tutorial controller
  const tutorialController = createTutorialController({ elements });
  
  // Connect settings button to tutorial
  elements.settingsBtn.addEventListener('click', () => {
    tutorialController.open();
  });
  
  // Enable settings button (it's always available for tutorial)
  elements.settingsBtn.disabled = false;
  
  // Initialize "Add to Home Screen" banner
  initAddToHomeBanner();
};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Unable to initialize application.', error);
  });
});

