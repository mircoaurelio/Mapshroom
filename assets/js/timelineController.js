const formatSeconds = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`;

const createPlaylistEntries = (files) =>
  files.map((file, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    type: file.type,
  }));

export const createTimelineController = ({ elements, store, controller, waitForFirstFrame }) => {
  const {
    video,
    fileInput,
    timelineBtn,
    timelinePanel,
    closeTimelineBtn,
    timelineGrid,
    randomToggleBtn,
    fadeToggleBtn,
    fadeSlider,
    fadeSliderValue,
  } = elements;

  const { state, addToPlaylist, setCurrentIndex, setRandomPlayback, setFadeInEnabled, setFadeInDuration } = store;

  const setRootFadeDuration = () => {
    document.documentElement.style.setProperty(
      '--timeline-fade-duration',
      state.fadeInEnabled ? `${state.fadeInDuration}ms` : '0ms'
    );
  };

  const updateFadeIndicator = () => {
    fadeSliderValue.textContent = formatSeconds(state.fadeInDuration);
  };

  const updateRandomButton = () => {
    randomToggleBtn.classList.toggle('active', state.randomPlayback);
    randomToggleBtn.setAttribute('aria-pressed', String(state.randomPlayback));
  };

  const updateFadeButton = () => {
    fadeToggleBtn.classList.toggle('active', state.fadeInEnabled);
    fadeToggleBtn.setAttribute('aria-pressed', String(state.fadeInEnabled));
    fadeSlider.disabled = !state.fadeInEnabled;
  };

  const openPanel = () => {
    timelinePanel.classList.remove('concealed');
    timelinePanel.setAttribute('aria-hidden', 'false');
    timelineBtn.setAttribute('aria-expanded', 'true');
  };

  const closePanel = () => {
    timelinePanel.classList.add('concealed');
    timelinePanel.setAttribute('aria-hidden', 'true');
    timelineBtn.setAttribute('aria-expanded', 'false');
  };

  const togglePanel = () => {
    if (timelinePanel.classList.contains('concealed')) {
      openPanel();
    } else {
      closePanel();
    }
  };

  const clearGrid = () => {
    timelineGrid.innerHTML = '';
  };

  const renderEmptyState = () => {
    clearGrid();
    const emptyEl = document.createElement('p');
    emptyEl.className = 'timeline-empty';
    emptyEl.textContent = 'No videos yet. Add some to build your timeline.';
    timelineGrid.appendChild(emptyEl);
  };

  const renderPlaylist = () => {
    const { playlist, currentIndex } = state;

    if (!playlist.length) {
      renderEmptyState();
      return;
    }

    clearGrid();

    playlist.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'timeline-grid-item';
      card.dataset.index = String(index);
      card.setAttribute('aria-pressed', String(index === currentIndex));
      card.setAttribute('title', `Play ${item.name}`);

      if (index === currentIndex) {
        card.classList.add('active');
      }

      if (item.type && item.type.startsWith('video/')) {
        const preview = document.createElement('video');
        preview.src = item.url;
        preview.muted = true;
        preview.playsInline = true;
        preview.preload = 'metadata';
        preview.loop = true;
        preview.autoplay = true;
        card.appendChild(preview);
      }

      const title = document.createElement('p');
      title.className = 'timeline-grid-item-title';
      title.textContent = item.name;
      card.appendChild(title);

      timelineGrid.appendChild(card);
    });
  };

  const highlightActiveItem = () => {
    const { currentIndex } = state;
    timelineGrid.querySelectorAll('.timeline-grid-item').forEach((item) => {
      const index = Number(item.dataset.index);
      const isActive = index === currentIndex;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
  };

  const applyFadeIn = () => {
    if (!state.fadeInEnabled) {
      video.style.opacity = '1';
      return;
    }

    video.style.opacity = '0';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        video.style.opacity = '1';
      });
    });
  };

  const loadVideoAtIndex = async (index, { autoplay = true } = {}) => {
    const { playlist, currentIndex } = state;
    if (!playlist.length || index < 0 || index >= playlist.length) {
      return;
    }

    if (index === currentIndex && video.src) {
      if (autoplay) {
        try {
          await video.play();
        } catch (error) {
          console.warn('Unable to autoplay video:', error);
        }
      }
      return;
    }

    const entry = playlist[index];

    controller.setControlsAvailability?.(false);
    video.pause();
    video.src = entry.url;
    if (video.getAttribute('src') !== entry.url) {
      video.setAttribute('src', entry.url);
    }
    if (typeof video.load === 'function') {
      video.load();
    }
    setCurrentIndex(index);
    highlightActiveItem();

    await waitForFirstFrame(video, entry.url, async () => {
      controller.enableControls(true);
      controller.setControlsAvailability?.(true);
      setRootFadeDuration();
      applyFadeIn();

      if (autoplay) {
        try {
          await video.play();
        } catch (error) {
          console.warn('Unable to autoplay video:', error);
        }
      }
    });
  };

  const playNext = () => {
    const { playlist, currentIndex, randomPlayback } = state;
    if (!playlist.length) {
      return;
    }

    if (randomPlayback && playlist.length > 1) {
      let nextIndex = currentIndex;
      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
      loadVideoAtIndex(nextIndex);
      return;
    }

    const nextIndex = (currentIndex + 1) % playlist.length;
    loadVideoAtIndex(nextIndex);
  };

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('video/'));
    if (!files.length) {
      return;
    }

    const isFirstAddition = state.playlist.length === 0;
    const newEntries = createPlaylistEntries(files);
    addToPlaylist(newEntries);
    renderPlaylist();

    if (isFirstAddition) {
      await loadVideoAtIndex(0);
    }

    event.target.value = '';
  };

  const handleGridClick = (event) => {
    const target = event.target.closest('.timeline-grid-item');
    if (!target) {
      return;
    }

    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }

    loadVideoAtIndex(index);
  };

  const handleRandomToggle = () => {
    setRandomPlayback(!state.randomPlayback);
    updateRandomButton();
  };

  const handleFadeToggle = () => {
    setFadeInEnabled(!state.fadeInEnabled);
    setRootFadeDuration();
    updateFadeButton();
  };

  const handleFadeSlider = () => {
    const nextValue = Number(fadeSlider.value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    setFadeInDuration(nextValue);
    setRootFadeDuration();
    updateFadeIndicator();
  };

  const setupEventListeners = () => {
    fileInput.addEventListener('change', handleFilesSelected);
    timelineBtn.addEventListener('click', togglePanel);
    closeTimelineBtn.addEventListener('click', closePanel);
    timelineGrid.addEventListener('click', handleGridClick);
    randomToggleBtn.addEventListener('click', handleRandomToggle);
    fadeToggleBtn.addEventListener('click', handleFadeToggle);
    fadeSlider.addEventListener('input', handleFadeSlider);
    video.addEventListener('ended', playNext);
  };

  const init = () => {
    setRootFadeDuration();
    updateRandomButton();
    updateFadeButton();
    updateFadeIndicator();
    renderEmptyState();
    setupEventListeners();
  };

  init();

  return {
    handleFilesSelected,
    openPanel,
    closePanel,
    togglePanel,
    loadVideoAtIndex,
    playNext,
    renderPlaylist,
  };
};


