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
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onError);
    };

    const ensureFrame = () => {
      video.pause();
      onReady();
      resolve();
    };

    const onLoadedData = () => {
      cleanup();
      video.currentTime = 0;

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        ensureFrame();
      };

      if (video.readyState >= 2) {
        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = 0.0001;
      } else {
        ensureFrame();
      }
    };

    const onError = (error) => {
      cleanup();
      alert('Unable to load this video.');
      console.error(error);
      URL.revokeObjectURL(url);
    };

    video.addEventListener('loadeddata', onLoadedData, { once: true });
    video.addEventListener('error', onError, { once: true });
  });

const attachFilePicker = (fileInput, video, controller) => {
  fileInput.addEventListener('change', async (event) => {
    const files = event.target && event.target.files;
    const file = files && files[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    video.src = url;
    video.pause();
    controller.enableControls(false);
    controller.handleOverlayState(false);
    controller.updateTransform();

    await waitForFirstFrame(video, url, () => {
      controller.enableControls(true);
    });
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

  elements.video.loop = true;

  controller.enableControls(false);
  controller.handlePrecisionChange(store.state.precision);
  controller.updateTransform();
  controller.showPreloadUI();

  setupGridOverlayListeners(elements.gridOverlay, controller.handleZoneAction);
  attachFilePicker(elements.fileInput, elements.video, controller);
  attachPrecisionControl(elements.precisionRange, controller);
  attachControlButtons(elements.playBtn, elements.resetBtn, controller);
  setupVisibilityPause(elements.video);
};

document.addEventListener('DOMContentLoaded', init);

