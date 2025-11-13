import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';
import { createTimelineController } from './timelineController.js';

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
    let fallbackTimer;

    const cleanup = () => {
      ['loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough'].forEach((eventName) =>
        video.removeEventListener(eventName, handleReady)
      );
      video.removeEventListener('error', handleError);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };

    const finalize = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();

      try {
        video.pause();
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.currentTime !== 0) {
          video.currentTime = 0;
        }
      } catch (seekError) {
        console.warn('Unable to reset video to start:', seekError);
      }

      onReady();
      resolve();
    };

    const handleReady = () => {
      finalize();
    };

    const handleError = (error) => {
      cleanup();
      alert('Unable to load this video.');
      console.error(error);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };

    ['loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough'].forEach((eventName) =>
      video.addEventListener(eventName, handleReady, { once: true })
    );
    video.addEventListener('error', handleError, { once: true });

    fallbackTimer = setTimeout(() => {
      console.warn('Timed out waiting for first frame; proceeding regardless.');
      finalize();
    }, 4000);
  });

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

const ensureIOSInlineSupport = (video) => {
  if (!video) {
    return;
  }

  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  if ('playsInline' in video) {
    video.playsInline = true;
  }
};

const setupVisibilityPause = (video) => {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
    }
  });
};

const init = () => {
  const elements = getDomElements();
  const store = createState(elements.precisionRange);
  const controller = createTransformController({ elements, store });
  createTimelineController({
    elements,
    store,
    controller,
    waitForFirstFrame,
  });

  elements.video.loop = false;
  ensureIOSInlineSupport(elements.video);

  controller.enableControls(false);
  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, elements.resetBtn, controller);
  setupVisibilityPause(elements.video);
};

document.addEventListener('DOMContentLoaded', init);

