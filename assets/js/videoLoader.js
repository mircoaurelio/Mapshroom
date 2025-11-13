import { getDomElements } from './domRefs.js';
import { createState } from './state.js';
import { createTransformController } from './interactions.js';
import { createTimelineController } from './timelineController.js';
import { createLogger } from './logger.js';

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

const createWaitForFirstFrame = (logger) => (video, url, onReady) =>
  new Promise((resolve) => {
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onError);
    };

    const ensureFrame = () => {
      video.pause();
      logger?.log('First frame ready');
      onReady();
      resolve();
    };

    const onLoadedData = () => {
      logger?.log(`loadeddata fired for ${video.currentSrc || url}`);
      cleanup();
      video.currentTime = 0;

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        logger?.log('Initial frame seeked');
        ensureFrame();
      };

      if (video.readyState >= 2) {
        logger?.log('readyState >= 2, seeking tiny offset');
        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = 0.0001;
      } else {
        ensureFrame();
      }
    };

    const onError = (error) => {
      cleanup();
      logger?.log(`Video error: ${error?.message || 'unknown error'}`);
      alert('Unable to load this video.');
      console.error(error);
      URL.revokeObjectURL(url);
    };

    video.addEventListener('loadeddata', onLoadedData, { once: true });
    video.addEventListener('error', onError, { once: true });
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

const setupVisibilityPause = (video) => {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
    }
  });
};

const setupViewportSize = () => {
  const updateViewportVars = () => {
    const { innerWidth, innerHeight } = window;
    document.documentElement.style.setProperty('--app-width', `${innerWidth}px`);
    document.documentElement.style.setProperty('--app-height', `${innerHeight}px`);
  };

  updateViewportVars();
  window.addEventListener('resize', updateViewportVars, { passive: true });
  window.addEventListener('orientationchange', updateViewportVars);
};

const init = () => {
  setupViewportSize();
  const elements = getDomElements();
  const store = createState(elements.precisionRange);
  const controller = createTransformController({ elements, store });
  const logger = createLogger();
  const waitForFirstFrame = createWaitForFirstFrame(logger);
  createTimelineController({
    elements,
    store,
    controller,
    waitForFirstFrame,
    logger,
  });

  elements.video.loop = false;

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

