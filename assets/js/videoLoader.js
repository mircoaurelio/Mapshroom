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

const attachFilePicker = (fileInput, controller) => {
  fileInput.addEventListener('change', async (event) => {
    const fileList = (event.target && event.target.files) || [];
    const files = Array.from(fileList);

    if (!files.length) {
      return;
    }

    try {
      await controller.handleFileSelection(files);
    } finally {
      fileInput.value = '';
    }
  });
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

const attachTimelineControls = (elements, controller) => {
  const { timelineBtn, timelinePanel, randomToggle, fadeToggle, fadeRange } = elements;

  timelineBtn.addEventListener('click', () => controller.handleTimelineToggle());
  randomToggle.addEventListener('click', controller.handleRandomToggle);
  fadeToggle.addEventListener('click', controller.handleFadeToggle);
  fadeRange.addEventListener('input', () => controller.handleFadeDurationChange(Number(fadeRange.value)));

  timelinePanel.addEventListener('click', (event) => {
    if (event.target === timelinePanel) {
      controller.handleTimelineToggle(false);
    }
  });
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
  const controller = createTransformController({ elements, store, waitForFirstFrame });

  elements.video.loop = true;

  controller.enableControls(false);
  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  attachFilePicker(elements.fileInput, controller);
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, elements.resetBtn, controller);
  attachTimelineControls(elements, controller);
  setupVisibilityPause(elements.video);
  setupZoomPrevention();
};

document.addEventListener('DOMContentLoaded', init);

