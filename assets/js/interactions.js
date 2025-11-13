import {
  updateTransformStyles,
  updatePrecisionDisplay,
  toggleOverlayDisplay,
  toggleVisibility,
  setControlsEnabled,
  toggleTimelinePanel,
  setToggleState,
  setFadeSliderEnabled,
  updateFadeDurationDisplay,
  renderTimelineGrid,
} from './ui.js';

const updateTransformUI = ({ state, precisionValue }) => {
  updateTransformStyles(state);
  updatePrecisionDisplay(precisionValue, state.precision);
};

const adjustOffsets = (state, direction) => {
  switch (direction) {
    case 'move-up':
      state.offsetY -= state.precision;
      break;
    case 'move-down':
      state.offsetY += state.precision;
      break;
    case 'move-left':
      state.offsetX -= state.precision;
      break;
    case 'move-right':
      state.offsetX += state.precision;
      break;
    default:
      break;
  }
};

const adjustDimensions = (state, action, wrapper) => {
  switch (action) {
    case 'height-plus':
      state.heightAdjust += state.precision;
      break;
    case 'height-minus':
      state.heightAdjust = Math.max(state.heightAdjust - state.precision, state.MIN_VISIBLE_SIZE - wrapper.clientHeight);
      break;
    case 'width-plus':
      state.widthAdjust += state.precision;
      break;
    case 'width-minus':
      state.widthAdjust = Math.max(state.widthAdjust - state.precision, state.MIN_VISIBLE_SIZE - wrapper.clientWidth);
      break;
    default:
      break;
  }
};

export const createTransformController = ({ elements, store, waitForFirstFrame }) => {
  const {
    state,
    resetTransform,
    updatePrecision,
    setOverlayActive,
    setHasVideo,
    addVideos,
    setActiveVideoId,
    setTimelineOpen,
    setRandomEnabled,
    setFadeEnabled,
    setFadeDuration,
  } = store;
  const {
    video,
    playBtn,
    resetBtn,
    precisionControl,
    precisionValue,
    gridOverlay,
    chooseLabel,
    controls,
    timelineBtn,
    timelinePanel,
    timelineGrid,
    randomToggle,
    fadeToggle,
    fadeRange,
    fadeValue,
  } = elements;

  const updateTransform = () => updateTransformUI({ state, precisionValue });
  const playIconImg = playBtn.querySelector('img');
  const updatePlayButton = () => {
    const isPaused = video.paused;
    const nextLabel = isPaused ? 'Play video' : 'Pause video';

    if (playIconImg) {
      const nextSrc = isPaused ? playBtn.getAttribute('data-icon-play') || playIconImg.dataset.play || 'assets/icons/play.svg'
        : playBtn.getAttribute('data-icon-pause') || playIconImg.dataset.pause || 'assets/icons/pause.svg';
      playIconImg.src = nextSrc;
    } else {
      playBtn.textContent = isPaused ? 'play_circle' : 'pause_circle';
    }

    playBtn.setAttribute('aria-label', nextLabel);
  };

  const updateTimelinePanelUI = () => {
    toggleTimelinePanel(timelinePanel, state.timelineOpen);
    timelineBtn.setAttribute('aria-expanded', state.timelineOpen ? 'true' : 'false');
  };

  const updateTimelineButtonState = () => {
    const hasTimelineItems = state.videos.length > 0;
    const canAccessTimeline = hasTimelineItems && state.hasVideo;
    timelineBtn.disabled = !canAccessTimeline;
    timelineBtn.setAttribute('aria-disabled', timelineBtn.disabled ? 'true' : 'false');
    timelineBtn.setAttribute('aria-controls', 'timeline-panel');
  };

  const updateRandomToggleUI = () => {
    setToggleState(randomToggle, state.randomEnabled);
    randomToggle.setAttribute('aria-label', state.randomEnabled ? 'Disable random order' : 'Enable random order');
  };

  const updateFadeUI = () => {
    setToggleState(fadeToggle, state.fadeEnabled);
    setFadeSliderEnabled(fadeRange, state.fadeEnabled);
    fadeRange.value = String(state.fadeDuration);
    updateFadeDurationDisplay(fadeValue, state.fadeDuration);
    fadeToggle.setAttribute('aria-label', state.fadeEnabled ? 'Disable fade in' : 'Enable fade in');

    if (!state.fadeEnabled) {
      video.style.transition = '';
      video.style.opacity = '';
    }
  };

  const applyOverlayUI = (active, { toggleUI = true } = {}) => {
    setOverlayActive(active);
    toggleOverlayDisplay(gridOverlay, state.overlayActive);

    if (!toggleUI || !state.hasVideo) {
      return;
    }

    const shouldShow = active;
    toggleVisibility(chooseLabel, shouldShow);
    toggleVisibility(controls, shouldShow);
    toggleVisibility(precisionControl, shouldShow);
  };

  const enableControls = (enabled) => {
    setControlsEnabled(playBtn, resetBtn, enabled);
    setHasVideo(enabled);

    const shouldShowControls = enabled;
    toggleVisibility(controls, shouldShowControls);
    toggleVisibility(precisionControl, shouldShowControls);
    toggleVisibility(chooseLabel, true);

    applyOverlayUI(enabled, { toggleUI: false });

    if (!enabled) {
      resetTransform();
      updateTransform();
    }

    updatePlayButton();
    updateTimelineButtonState();
  };

  const showPreloadUI = () => {
    toggleVisibility(chooseLabel, true);
    toggleVisibility(controls, false);
    toggleVisibility(precisionControl, false);
    updateTimelineButtonState();
  };

  const handleZoneAction = (action) => {
    if (action !== 'toggle-overlay' && !state.overlayActive) {
      return;
    }

    const wrapper = video.parentElement;

    if (['move-up', 'move-down', 'move-left', 'move-right'].includes(action)) {
      adjustOffsets(state, action);
      updateTransform();
      return;
    }

    if (['height-plus', 'height-minus', 'width-plus', 'width-minus'].includes(action)) {
      adjustDimensions(state, action, wrapper);
      updateTransform();
      return;
    }

    if (action === 'toggle-overlay') {
      const nextActive = !state.overlayActive;
      applyOverlayUI(nextActive);
    }
  };

  const handlePrecisionChange = (nextPrecision) => {
    updatePrecision(nextPrecision);
    updatePrecisionDisplay(precisionValue, state.precision);
  };

  const handleReset = () => {
    video.pause();
    video.currentTime = 0;
    resetTransform();
    updateTransform();
    updatePlayButton();
  };

  const handlePlay = async () => {
    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.warn('Autoplay blocked:', error);
      }
    } else {
      video.pause();
    }

    updatePlayButton();
  };

  const handleOverlayState = (active, options) => {
    applyOverlayUI(active, options);
  };

  function handleTimelineItemSelect(videoId) {
    loadVideoById(videoId, { preservePlaybackState: true });
    if (state.timelineOpen) {
      setTimelineOpen(false);
      updateTimelinePanelUI();
    }
  }

  function refreshTimelineGrid() {
    renderTimelineGrid(timelineGrid, state.videos, state.activeVideoId, handleTimelineItemSelect);
  }

  const refreshTimelineUI = () => {
    updateTimelineButtonState();
    updateTimelinePanelUI();
    updateRandomToggleUI();
    updateFadeUI();
    refreshTimelineGrid();
  };

  const formatDisplayName = (name) => {
    if (!name) {
      return 'Untitled video';
    }

    const dotIndex = name.lastIndexOf('.');
    if (dotIndex > 0) {
      return name.slice(0, dotIndex);
    }
    return name;
  };

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '';
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = bytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const decimals = size >= 100 ? 0 : 1;
    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
  };

  const selectTargetVideoId = (addedVideos) => {
    if (!addedVideos.length) {
      return state.activeVideoId;
    }

    if (state.randomEnabled && state.videos.length > 1) {
      const pool = state.videos.filter((entry) => entry.id !== state.activeVideoId);
      if (pool.length) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex].id;
      }
    }

    return addedVideos[0].id;
  };

  const primeFadeEffect = () => {
    if (!state.fadeEnabled) {
      return;
    }

    video.style.transition = 'none';
    video.style.opacity = '0';
  };

  const playFadeEffect = () => {
    if (!state.fadeEnabled) {
      video.style.transition = '';
      video.style.opacity = '';
      return;
    }

    const duration = Math.max(0, state.fadeDuration);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        video.style.transition = `opacity ${duration}ms ease`;
        video.style.opacity = '1';
      });
    });
  };

  async function loadVideoById(videoId, { preservePlaybackState = false } = {}) {
    const entry = state.videos.find((item) => item.id === videoId);
    if (!entry) {
      return;
    }

    const shouldResume = preservePlaybackState && !video.paused && !video.ended;
    const previousPlaybackRate = video.playbackRate;

    setActiveVideoId(videoId);
    refreshTimelineGrid();

    setControlsEnabled(playBtn, resetBtn, false);
    timelineBtn.disabled = true;
    timelineBtn.setAttribute('aria-disabled', 'true');

    primeFadeEffect();

    try {
      video.pause();
      video.src = entry.url;
      video.load();

      await waitForFirstFrame(video, entry.url, () => {
        playFadeEffect();
        enableControls(true);
        setControlsEnabled(playBtn, resetBtn, true);
        updateTimelineButtonState();
        updatePlayButton();
      });

      if (shouldResume) {
        try {
          await video.play();
        } catch (error) {
          console.warn('Unable to resume playback automatically.', error);
        }
      }

      video.playbackRate = previousPlaybackRate;
    } catch (error) {
      console.error('Error loading selected video.', error);
    } finally {
      setControlsEnabled(playBtn, resetBtn, true);
      updateTimelineButtonState();
      updatePlayButton();
    }
  }

  const handleFileSelection = async (files) => {
    if (!files.length) {
      return;
    }

    const additions = files.map((file) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `video-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const url = URL.createObjectURL(file);

      return {
        id,
        url,
        name: file.name,
        displayName: formatDisplayName(file.name),
        secondaryLabel: formatFileSize(file.size),
        signature: `${file.name}:${file.size}:${file.lastModified}`,
        revoke: () => URL.revokeObjectURL(url),
      };
    });

    const addedVideos = addVideos(additions);
    const addedIds = new Set(addedVideos.map((entry) => entry.id));

    additions.forEach((entry) => {
      if (!addedIds.has(entry.id) && typeof entry.revoke === 'function') {
        entry.revoke();
      }
    });

    refreshTimelineUI();

    if (!addedVideos.length) {
      return;
    }

    const wasEmpty = !state.hasVideo;

    if (wasEmpty) {
      enableControls(false);
    }

    const targetId = selectTargetVideoId(addedVideos);
    await loadVideoById(targetId, { preservePlaybackState: !wasEmpty });
    refreshTimelineUI();
  };

  const handleTimelineToggle = (nextState) => {
    if (!state.videos.length) {
      return;
    }

    const nextOpen = typeof nextState === 'boolean' ? nextState : !state.timelineOpen;
    setTimelineOpen(nextOpen);
    updateTimelinePanelUI();
    updateTimelineButtonState();

    if (nextOpen) {
      timelinePanel.focus({ preventScroll: true });
    }
  };

  const handleRandomToggle = () => {
    const next = !state.randomEnabled;
    setRandomEnabled(next);
    updateRandomToggleUI();
  };

  const handleFadeToggle = () => {
    const next = !state.fadeEnabled;
    setFadeEnabled(next);
    updateFadeUI();
  };

  const handleFadeDurationChange = (duration) => {
    const clamped = Math.max(0, Math.min(3000, Number(duration)));
    setFadeDuration(clamped);
    fadeRange.value = String(clamped);
    updateFadeDurationDisplay(fadeValue, clamped);
  };

  const releaseResources = () => {
    state.videos.forEach((entry) => {
      if (typeof entry.revoke === 'function') {
        entry.revoke();
        entry.revoke = null;
      }
    });
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape' && state.timelineOpen) {
      handleTimelineToggle(false);
    }
  };

  video.addEventListener('play', updatePlayButton);
  video.addEventListener('pause', updatePlayButton);
  window.addEventListener('beforeunload', releaseResources);
  document.addEventListener('keydown', handleKeydown);

  refreshTimelineUI();

  return {
    updateTransform,
    enableControls,
    showPreloadUI,
    handleZoneAction,
    handlePrecisionChange,
    handleReset,
    handlePlay,
    handleOverlayState,
    handleFileSelection,
    handleTimelineToggle,
    handleRandomToggle,
    handleFadeToggle,
    handleFadeDurationChange,
    loadVideoById,
  };
};

