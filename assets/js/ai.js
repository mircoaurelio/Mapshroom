const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 60;
const DATA_URI_LIMIT_BYTES = 16 * 1024 * 1024;
const BASE64_OVERHEAD_FACTOR = 4 / 3;
const MAX_OUTPUT_HISTORY = 5;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const normalizeRatio = (selectEl, fallback) => {
  const options = Array.from(selectEl.options).map((option) => option.value);
  return options.includes(fallback) ? fallback : options[0];
};

const normalizeModel = (selectEl, fallback) => {
  const options = Array.from(selectEl.options).map((option) => option.value);
  return options.includes(fallback) ? fallback : options[0];
};

const makeRunwayHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'X-Runway-Version': RUNWAY_API_VERSION,
  'Content-Type': 'application/json',
});

const fetchJson = async (url, { headers = {}, ...options } = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    let errorBody = null;
    try {
      errorBody = await response.json();
      errorDetail = typeof errorBody?.error === 'string' ? ` ${errorBody.error}` : '';
    } catch (error) {
      // Ignore parse errors, fall back to status text.
    }
    const fallback = response.statusText ? ` ${response.statusText}` : '';
    const message = `Runway request failed (${response.status}).${errorDetail || fallback}`;
    const error = new Error(message.trim());
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const ensureBlobFromItem = async (item) => {
  if (item?.blob instanceof Blob) {
    return item.blob;
  }

  if (item?.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error('Unable to access the selected video blob.');
    }
    return response.blob();
  }

  throw new Error('No video data available for the selected item.');
};

const estimateDataUriSize = (blob) => blob.size * BASE64_OVERHEAD_FACTOR;

const convertBlobToDataUri = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to convert video to data URI.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Unable to convert video to data URI.'));
    };
    reader.readAsDataURL(blob);
  });

const uploadEphemeralToRunway = async (blob, item, apiKey) => {
  const headers = makeRunwayHeaders(apiKey);
  const requestPayload = {
    filename: item?.name || 'video.mp4',
    type: 'ephemeral',
  };

  const uploadDetails = await fetchJson(`${RUNWAY_API_BASE}/uploads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestPayload),
  });

  if (!uploadDetails?.uploadUrl || !uploadDetails?.fields || !uploadDetails?.runwayUri) {
    throw new Error('Runway did not return upload instructions.');
  }

  const formData = new FormData();
  Object.entries(uploadDetails.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', blob, item?.name || 'video.mp4');

  const uploadResponse = await fetch(uploadDetails.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    if (uploadResponse.status === 413) {
      throw new Error(
        `Runway rejected the upload because the file (${formatBytes(
          blob.size,
        )}) exceeds their ephemeral upload limit (200MB).`,
      );
    }
    throw new Error('Runway ephemeral upload failed.');
  }

  return uploadDetails.runwayUri;
};

const pollRunwayTask = async (taskId, apiKey, setStatus) => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (typeof setStatus === 'function') {
      setStatus(`Generation in progress… (${attempt + 1}/${MAX_POLL_ATTEMPTS})`, { tone: 'info' });
    }

    await delay(POLL_INTERVAL_MS);

    const task = await fetchJson(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      method: 'GET',
      headers: makeRunwayHeaders(apiKey),
    });

    const status = (task?.status || '').toUpperCase();

    if (status === 'SUCCEEDED') {
      return task;
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      const failureMessage =
        task?.failureReason ||
        task?.error ||
        (status === 'FAILED' ? 'Runway task failed.' : 'Runway task was cancelled.');
      throw new Error(failureMessage);
    }
  }

  throw new Error('Timed out while waiting for the Runway task to finish.');
};

export const createAiController = ({
  elements,
  controller,
  playlistController,
  persistence,
  aiSettings = {},
  store,
}) => {
  const {
    aiBtn,
    aiPanel,
    aiBackBtn,
    aiGrid,
    aiGenerationForm,
    aiGenerationFieldset,
    aiPromptInput,
    aiModelSelect,
    aiRatioSelect,
    aiSeedInput,
    aiEphemeralCheckbox,
    aiPrimaryCheckbox,
    aiGenerateBtn,
    aiPreviewVideo,
    aiStatus,
    aiOutputList,
    aiApiKeyInput,
    aiSaveKeyBtn,
    aiClearKeyBtn,
    aiSelectedVideoName,
    aiNoVideosMessage,
  } = elements;

  const state = {
    open: false,
    apiKey: aiSettings.runwayApiKey || '',
    playlist: [],
    selectedVideoId: '',
    primaryVideoId: aiSettings.primaryVideoId || '',
    preferredModel: aiSettings.preferredModel || 'gen4_aleph',
    preferredRatio: aiSettings.preferredRatio || '1280:720',
    useEphemeralUploads:
      typeof aiSettings.useEphemeralUploads === 'boolean' ? aiSettings.useEphemeralUploads : true,
    seed:
      typeof aiSettings.seed === 'number' && Number.isFinite(aiSettings.seed)
        ? aiSettings.seed
        : null,
    generating: false,
    outputs: [],
    overlayWasActive: false,
  };

  const persistAiSettings = (partial) => {
    if (!persistence || typeof persistence.saveAiSettings !== 'function') {
      return;
    }
    const next = persistence.saveAiSettings(partial);
    Object.assign(state, {
      primaryVideoId: next.primaryVideoId ?? state.primaryVideoId,
      preferredModel: next.preferredModel ?? state.preferredModel,
      preferredRatio: next.preferredRatio ?? state.preferredRatio,
      useEphemeralUploads:
        typeof next.useEphemeralUploads === 'boolean'
          ? next.useEphemeralUploads
          : state.useEphemeralUploads,
      seed:
        typeof next.seed === 'number' && Number.isFinite(next.seed) ? next.seed : state.seed,
      apiKey: next.runwayApiKey ?? state.apiKey,
    });
  };

  const setStatus = (message, { tone = 'info' } = {}) => {
    if (!aiStatus) {
      return;
    }

    if (!message) {
      aiStatus.textContent = '';
      aiStatus.removeAttribute('data-tone');
      aiStatus.removeAttribute('role');
      return;
    }

    aiStatus.textContent = message;
    aiStatus.dataset.tone = tone;
    aiStatus.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  };

  const clearStatus = () => setStatus('');

  const renderOutputs = () => {
    if (!aiOutputList) {
      return;
    }

    aiOutputList.innerHTML = '';

    if (!state.outputs.length) {
      const empty = document.createElement('li');
      empty.className = 'ai-output-empty';
      empty.textContent = 'Generations will appear here.';
      aiOutputList.appendChild(empty);
      return;
    }

    state.outputs.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'ai-output-item';

      const header = document.createElement('div');
      header.className = 'ai-output-meta';

      const title = document.createElement('strong');
      title.textContent = entry.videoName || 'Generated video';

      const timestamp = document.createElement('time');
      timestamp.dateTime = entry.createdAt;
      timestamp.textContent = new Date(entry.createdAt).toLocaleString();

      header.append(title, timestamp);

      const preview = document.createElement('div');
      preview.className = 'ai-output-preview';

      entry.urls.forEach((url) => {
        const videoEl = document.createElement('video');
        videoEl.src = url;
        videoEl.controls = true;
        videoEl.muted = true;
        videoEl.preload = 'metadata';
        videoEl.loop = true;
        preview.appendChild(videoEl);
      });

      const links = document.createElement('div');
      links.className = 'ai-output-links';
      entry.urls.forEach((url, index) => {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = entry.urls.length > 1 ? `Download ${index + 1}` : 'Download';
        links.appendChild(link);
      });

      if (entry.promptText) {
        const prompt = document.createElement('p');
        prompt.className = 'ai-output-prompt';
        prompt.textContent = entry.promptText;
        item.append(header, preview, links, prompt);
      } else {
        item.append(header, preview, links);
      }

      aiOutputList.appendChild(item);
    });
  };

  const updatePreview = (selected) => {
    if (!aiPreviewVideo) {
      return;
    }

    if (!selected || !selected.url) {
      try {
        aiPreviewVideo.pause();
      } catch (error) {
        // ignore pause issues
      }
      aiPreviewVideo.removeAttribute('src');
      if (typeof aiPreviewVideo.load === 'function') {
        try {
          aiPreviewVideo.load();
        } catch (error) {
          // ignore load reset issues
        }
      }
      aiPreviewVideo.hidden = true;
      aiPreviewVideo.removeAttribute('data-visible');
      aiPreviewVideo.removeAttribute('data-error');
      return;
    }

    if (aiPreviewVideo.src !== selected.url) {
      aiPreviewVideo.src = selected.url;
      try {
        aiPreviewVideo.currentTime = 0;
      } catch (error) {
        // ignore
      }
      if (typeof aiPreviewVideo.load === 'function') {
        try {
          aiPreviewVideo.load();
        } catch (error) {
          // ignore
        }
      }
    }

    aiPreviewVideo.hidden = false;
    aiPreviewVideo.dataset.visible = 'true';
    aiPreviewVideo.removeAttribute('data-error');
  };

  const applySelectionState = () => {
    const selected = state.playlist.find((item) => item.id === state.selectedVideoId) || null;

    aiSelectedVideoName.textContent = selected ? selected.name : 'None';
    aiPrimaryCheckbox.disabled = !selected;
    aiPrimaryCheckbox.checked = Boolean(
      selected && state.primaryVideoId && selected.id === state.primaryVideoId,
    );

    aiGenerateBtn.disabled = state.generating || !selected;

    if (aiNoVideosMessage) {
      aiNoVideosMessage.hidden = state.playlist.length > 0;
    }

    aiGrid
      .querySelectorAll('.ai-item')
      .forEach((tile) => {
        const isActive = tile.dataset.id === state.selectedVideoId;
        tile.classList.toggle('active', isActive);
        tile.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

    updatePreview(selected);
  };

  const renderPlaylist = () => {
    aiGrid.innerHTML = '';

    if (!state.playlist.length) {
      applySelectionState();
      return;
    }

    const fragment = document.createDocumentFragment();

    state.playlist.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-item';
      button.dataset.id = item.id;
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-pressed', state.selectedVideoId === item.id ? 'true' : 'false');
      button.title = `Use ${item.name} as the source video`;

      if (item.thumbnailUrl) {
        const thumb = document.createElement('img');
        thumb.src = item.thumbnailUrl;
        thumb.alt = '';
        thumb.className = 'ai-item-thumb';
        thumb.loading = 'lazy';
        button.appendChild(thumb);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'ai-item-thumb placeholder';
        placeholder.textContent = 'No thumbnail';
        button.appendChild(placeholder);
      }

      const label = document.createElement('span');
      label.className = 'ai-item-label';
      label.textContent = item.name;
      button.appendChild(label);

      if (state.primaryVideoId && state.primaryVideoId === item.id) {
        button.dataset.primary = 'true';
      }

      if (state.selectedVideoId === item.id) {
        button.classList.add('active');
      }

      fragment.appendChild(button);
    });

    aiGrid.appendChild(fragment);
    applySelectionState();
  };

  const handlePlaylistUpdate = (snapshot) => {
    state.playlist = Array.isArray(snapshot) ? snapshot : [];

    // Remove stale primary reference if it no longer exists.
    if (
      state.primaryVideoId &&
      !state.playlist.some((item) => item.id === state.primaryVideoId)
    ) {
      state.primaryVideoId = '';
      persistAiSettings({ primaryVideoId: '' });
    }

    if (!state.playlist.length) {
      state.selectedVideoId = '';
      renderPlaylist();
      return;
    }

    const selectedStillExists = state.playlist.some(
      (item) => item.id === state.selectedVideoId,
    );

    if (!selectedStillExists) {
      if (state.primaryVideoId) {
        const primaryExists = state.playlist.some((item) => item.id === state.primaryVideoId);
        if (primaryExists) {
          state.selectedVideoId = state.primaryVideoId;
        } else {
          state.selectedVideoId = state.playlist[0].id;
        }
      } else {
        state.selectedVideoId = state.playlist[0].id;
      }
    }

    renderPlaylist();
  };

  const selectVideo = (videoId, { userInitiated = false } = {}) => {
    if (!videoId || !state.playlist.some((item) => item.id === videoId)) {
      return;
    }

    state.selectedVideoId = videoId;
    renderPlaylist();

    if (userInitiated) {
      clearStatus();
    }
  };

  const ensureApiKey = () => {
    if (state.apiKey) {
      return true;
    }

    setStatus('Enter your Runway API key to generate videos.', { tone: 'warning' });
    if (aiApiKeyInput) {
      aiApiKeyInput.focus();
    }
    return false;
  };

  const setGenerating = (generating) => {
    state.generating = generating;
    aiGenerationForm.dataset.loading = generating ? 'true' : 'false';
    aiGenerationForm.setAttribute('aria-busy', generating ? 'true' : 'false');
    aiGenerateBtn.disabled = generating || !state.selectedVideoId;
    if (aiGenerationFieldset) {
      aiGenerationFieldset.disabled = generating;
    }
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (state.generating) {
      return;
    }

    if (!ensureApiKey()) {
      return;
    }

    const selected = state.playlist.find((item) => item.id === state.selectedVideoId);
    if (!selected) {
      setStatus('Select a video from the playlist first.', { tone: 'warning' });
      return;
    }

    const promptText = aiPromptInput.value.trim();
    if (!promptText) {
      setStatus('Add a prompt so Runway knows what to create.', { tone: 'warning' });
      aiPromptInput.focus();
      return;
    }

    const useEphemeral = aiEphemeralCheckbox.checked;
    const ratio = aiRatioSelect.value;
    const model = aiModelSelect.value;
    let seed = null;
    if (aiSeedInput.value.trim() !== '') {
      const parsed = Number.parseInt(aiSeedInput.value, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 4294967295) {
        setStatus('Seed must be a number between 0 and 4294967295.', { tone: 'warning' });
        aiSeedInput.focus();
        return;
      }
      seed = parsed;
    }

    let blob;
    try {
      blob = await ensureBlobFromItem(selected);
    } catch (error) {
      setStatus(error.message, { tone: 'error' });
      console.error(error);
      return;
    }

    if (!useEphemeral) {
      const estimatedSize = estimateDataUriSize(blob);
      if (estimatedSize > DATA_URI_LIMIT_BYTES) {
        setStatus(
          `The selected video is ${formatBytes(blob.size)} which exceeds the data URI limit. Enable ephemeral upload instead.`,
          { tone: 'warning' },
        );
        return;
      }
    }

    setGenerating(true);

    persistAiSettings({
      preferredModel: model,
      preferredRatio: ratio,
      useEphemeralUploads: useEphemeral,
      seed,
    });

    let videoUri;
    try {
      if (useEphemeral) {
        setStatus('Uploading video to Runway…', { tone: 'info' });
        videoUri = await uploadEphemeralToRunway(blob, selected, state.apiKey);
      } else {
        setStatus('Encoding video as data URI…', { tone: 'info' });
        videoUri = await convertBlobToDataUri(blob);
      }
    } catch (error) {
      setGenerating(false);
      setStatus(error.message, { tone: 'error' });
      console.error(error);
      return;
    }

    try {
      setStatus('Starting Runway generation…', { tone: 'info' });
      const requestBody = {
        model,
        videoUri,
        promptText,
        ratio,
      };

      if (seed !== null) {
        requestBody.seed = seed;
      }

      const creation = await fetchJson(`${RUNWAY_API_BASE}/video_to_video`, {
        method: 'POST',
        headers: makeRunwayHeaders(state.apiKey),
        body: JSON.stringify(requestBody),
      });

      if (!creation?.id) {
        throw new Error('Runway did not return a task id.');
      }

      const task = await pollRunwayTask(creation.id, state.apiKey, (message, options) => {
        setStatus(message, options);
      });

      const urls = Array.isArray(task?.output) ? task.output.filter(Boolean) : [];
      if (!urls.length) {
        setStatus('Runway finished but returned no files.', { tone: 'warning' });
      } else if (
        playlistController &&
        typeof playlistController.addVideoFromBlob === 'function' &&
        typeof fetch === 'function'
      ) {
        setStatus('Downloading generated video…', { tone: 'info' });
        try {
          const downloadResults = await Promise.all(
            urls.map(async (url, index) => {
              const response = await fetch(url, { mode: 'cors' });
              if (!response.ok) {
                throw new Error(`Unable to download generated video (file ${index + 1}).`);
              }
              const contentType = response.headers.get('content-type') || 'video/mp4';
              const blob = await response.blob();
              const typedBlob =
                blob.type && blob.type.trim().length
                  ? blob
                  : new Blob([blob], { type: contentType || 'video/mp4' });
              return { index, blob: typedBlob, url, contentType };
            }),
          );
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const addedItems = [];

          for (const result of downloadResults) {
            // eslint-disable-next-line no-await-in-loop
            const added = await playlistController.addVideoFromBlob({
              blob: result.blob,
              name:
                downloadResults.length > 1
                  ? `Runway Output ${timestamp} (${result.index + 1})`
                  : `Runway Output ${timestamp}`,
              type: result.blob.type || result.contentType || 'video/mp4',
              makeCurrent: result.index === 0,
              autoplay: false,
            });
            if (added) {
              addedItems.push(added);
            }
          }

          setStatus('Generation complete and added to your playlist!', { tone: 'success' });
        } catch (downloadError) {
          console.error('Unable to add generated video to playlist.', downloadError);
          setStatus(
            'Generation complete. Download link is ready, but automatic import failed.',
            { tone: 'warning' },
          );
        }
      } else {
        setStatus('Generation complete! Remember: links expire in 24 hours.', { tone: 'success' });
      }

      state.outputs.unshift({
        id: task.id,
        urls,
        createdAt: task?.createdAt || new Date().toISOString(),
        promptText,
        videoName: selected.name,
      });
      if (state.outputs.length > MAX_OUTPUT_HISTORY) {
        state.outputs.length = MAX_OUTPUT_HISTORY;
      }
      renderOutputs();
    } catch (error) {
      if (error?.status === 413) {
        const sizeText = blob ? formatBytes(blob.size) : 'the selected video';
        const message = useEphemeral
          ? `Runway rejected the request because the uploaded file (${sizeText}) exceeds their limit (200MB for ephemeral uploads). Try trimming or compressing the video.`
          : `Runway rejected the request because the payload was too large. The selected video is ${sizeText}. Enable ephemeral upload or compress the video before sending.`;
        setStatus(message, { tone: 'error' });
      } else {
        setStatus(error.message || 'Runway generation failed.', { tone: 'error' });
      }
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleEphemeralChange = () => {
    persistAiSettings({ useEphemeralUploads: aiEphemeralCheckbox.checked });
    clearStatus();
  };

  const handleModelChange = () => {
    persistAiSettings({ preferredModel: aiModelSelect.value });
  };

  const handleRatioChange = () => {
    persistAiSettings({ preferredRatio: aiRatioSelect.value });
  };

  const handleSeedChange = () => {
    const value = aiSeedInput.value.trim();
    if (value === '') {
      persistAiSettings({ seed: null });
      return;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 4294967295) {
      persistAiSettings({ seed: parsed });
    }
  };

  const handlePrimaryToggle = () => {
    if (!state.selectedVideoId) {
      aiPrimaryCheckbox.checked = false;
      return;
    }

    const nextValue = aiPrimaryCheckbox.checked ? state.selectedVideoId : '';
    state.primaryVideoId = nextValue;
    persistAiSettings({ primaryVideoId: nextValue });
    renderPlaylist();
  };

  const handlePlaylistClick = (event) => {
    const button = event.target.closest('.ai-item');
    if (!button) {
      return;
    }
    const { id } = button.dataset;
    if (id) {
      selectVideo(id, { userInitiated: true });
    }
  };

  const handleSaveKey = () => {
    const key = aiApiKeyInput.value.trim();
    if (!key) {
      setStatus('Enter a valid Runway API key before saving.', { tone: 'warning' });
      aiApiKeyInput.focus();
      return;
    }

    state.apiKey = key;
    persistAiSettings({ runwayApiKey: key });
    setStatus('API key saved locally.', { tone: 'success' });
  };

  const handleClearKey = () => {
    aiApiKeyInput.value = '';
    state.apiKey = '';
    persistAiSettings({ runwayApiKey: '' });
    setStatus('API key cleared. Add it again before generating.', { tone: 'info' });
  };

  const applyPanelVisibility = (open) => {
    if (state.open === open) {
      return;
    }

    state.open = open;

    aiPanel.classList.toggle('concealed', !open);
    aiPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    aiBtn.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      state.overlayWasActive = Boolean(store?.state?.overlayActive);
      if (typeof controller?.handleOverlayState === 'function') {
        controller.handleOverlayState(false, { toggleUI: false });
      }
      aiPanel.focus();
      return;
    }

    if (state.overlayWasActive && typeof controller?.handleOverlayState === 'function') {
      controller.handleOverlayState(true, { toggleUI: false });
    }
    state.overlayWasActive = false;

    if (aiPreviewVideo) {
      try {
        aiPreviewVideo.pause();
      } catch (error) {
        // ignore pause errors
      }
    }
    aiBtn.focus();
  };

  const openPanel = () => {
    applyPanelVisibility(true);
  };

  const closePanel = () => {
    applyPanelVisibility(false);
  };

  const handleAiButtonClick = () => {
    if (state.open) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const handleGlobalKeydown = (event) => {
    if (!state.open) {
      return;
    }
    if (event.key === 'Escape') {
      closePanel();
    }
  };

  aiBtn.addEventListener('click', handleAiButtonClick);
  aiBackBtn.addEventListener('click', closePanel);
  aiGrid.addEventListener('click', handlePlaylistClick);
  const handlePreviewError = () => {
    if (!aiPreviewVideo) {
      return;
    }
    aiPreviewVideo.dataset.error = 'true';
    setStatus(
      'Safari could not load the preview. Use the playlist or download links to view the video.',
      { tone: 'warning' },
    );
  };

  const handlePreviewLoaded = () => {
    if (!aiPreviewVideo) {
      return;
    }
    aiPreviewVideo.removeAttribute('data-error');
  };

  aiGenerationForm.addEventListener('submit', handleGenerate);
  aiEphemeralCheckbox.addEventListener('change', handleEphemeralChange);
  aiModelSelect.addEventListener('change', handleModelChange);
  aiRatioSelect.addEventListener('change', handleRatioChange);
  aiSeedInput.addEventListener('change', handleSeedChange);
  aiPrimaryCheckbox.addEventListener('change', handlePrimaryToggle);
  aiSaveKeyBtn.addEventListener('click', handleSaveKey);
  aiClearKeyBtn.addEventListener('click', handleClearKey);
  document.addEventListener('keydown', handleGlobalKeydown);
  if (aiPreviewVideo) {
    aiPreviewVideo.addEventListener('error', handlePreviewError);
    aiPreviewVideo.addEventListener('loadeddata', handlePreviewLoaded);
  }

  aiApiKeyInput.value = state.apiKey;
  aiEphemeralCheckbox.checked = state.useEphemeralUploads;
  aiModelSelect.value = normalizeModel(aiModelSelect, state.preferredModel);
  aiRatioSelect.value = normalizeRatio(aiRatioSelect, state.preferredRatio);
  aiSeedInput.value = state.seed !== null ? String(state.seed) : '';
  aiGenerateBtn.disabled = true;
  aiPanel.classList.add('concealed');
  aiPanel.setAttribute('aria-hidden', 'true');
  aiBtn.setAttribute('aria-expanded', 'false');
  renderOutputs();

  let unsubscribe = null;
  if (playlistController && typeof playlistController.subscribeToPlaylist === 'function') {
    unsubscribe = playlistController.subscribeToPlaylist(handlePlaylistUpdate);
  } else if (playlistController && typeof playlistController.getPlaylistSnapshot === 'function') {
    handlePlaylistUpdate(playlistController.getPlaylistSnapshot());
  }

  return {
    open: openPanel,
    close: closePanel,
    destroy: () => {
      closePanel();
      updatePreview(null);
      aiBtn.removeEventListener('click', handleAiButtonClick);
      aiBackBtn.removeEventListener('click', closePanel);
      aiGrid.removeEventListener('click', handlePlaylistClick);
      aiGenerationForm.removeEventListener('submit', handleGenerate);
      aiEphemeralCheckbox.removeEventListener('change', handleEphemeralChange);
      aiModelSelect.removeEventListener('change', handleModelChange);
      aiRatioSelect.removeEventListener('change', handleRatioChange);
      aiSeedInput.removeEventListener('change', handleSeedChange);
      aiPrimaryCheckbox.removeEventListener('change', handlePrimaryToggle);
      aiSaveKeyBtn.removeEventListener('click', handleSaveKey);
      aiClearKeyBtn.removeEventListener('click', handleClearKey);
      document.removeEventListener('keydown', handleGlobalKeydown);
      if (aiPreviewVideo) {
        aiPreviewVideo.removeEventListener('error', handlePreviewError);
        aiPreviewVideo.removeEventListener('loadeddata', handlePreviewLoaded);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    },
  };
};


