import { persistGeneratedVideo, readGeneratedVideo } from './storage.js';

const RUNWAY_API_VERSION = '2024-11-06';

const resolveProxyBase = () => {
  const metaValue = document.querySelector('meta[name="runway-proxy-base"]')?.content?.trim();
  if (metaValue) {
    return metaValue.endsWith('/') ? metaValue.slice(0, -1) : metaValue;
  }
  return '/proxy';
};

const RUNWAY_PROXY_BASE = resolveProxyBase();
const RUNWAY_API_BASE = RUNWAY_PROXY_BASE + '/v1';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 60;
const DATA_URI_LIMIT_BYTES = 16 * 1024 * 1024;
const BASE64_OVERHEAD_FACTOR = 4 / 3;
const MAX_OUTPUT_HISTORY = 100;

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

const makeRunwayHeaders = (apiKey, { contentType = 'application/json' } = {}) => {
  const headers = {
    'X-Runway-Api-Key': apiKey,
    'X-Runway-Version': RUNWAY_API_VERSION,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
};

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

const pollRunwayTask = async (taskId, apiKey, { onProgress } = {}) => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (typeof onProgress === 'function') {
      const percent = Math.min((attempt / MAX_POLL_ATTEMPTS) * 100, 99);
      onProgress(percent);
    }

    await delay(POLL_INTERVAL_MS);

    const task = await fetchJson(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      method: 'GET',
      headers: makeRunwayHeaders(apiKey, { contentType: null }),
    });

    const status = (task?.status || '').toUpperCase();

    if (status === 'SUCCEEDED') {
      if (typeof onProgress === 'function') {
        onProgress(100);
      }
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

export const createAiController = async ({
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
    aiSelectedThumbnail,
    aiSelectedPlaceholder,
    aiGenerateBtn,
    aiStatus,
    aiOutputList,
    aiApiKeyInput,
    aiSaveKeyBtn,
    aiClearKeyBtn,
    aiApiKeyContainer,
    aiApiKeyToggle,
    aiApiKeyFieldset,
    aiNoVideosMessage,
    aiResultsToggle,
    aiResultsBody,
    aiKeywordsList,
  } = elements;

  // Load persisted outputs
  const persistedOutputs = Array.isArray(aiSettings.outputs) ? aiSettings.outputs : [];
  
  // Load stored video blobs for each output
  const loadStoredOutputs = async () => {
    const loadedOutputs = [];
    for (const output of persistedOutputs) {
      const outputWithBlobs = { ...output, storedBlobIds: [] };
      // Try to load stored blobs for each URL
      if (Array.isArray(output.urls)) {
        for (let i = 0; i < output.urls.length; i++) {
          const blobId = `${output.id}-${i}`;
          const storedBlob = await readGeneratedVideo(blobId);
          if (storedBlob) {
            outputWithBlobs.storedBlobIds[i] = blobId;
            // Create object URL for the stored blob
            if (!outputWithBlobs.storedUrls) {
              outputWithBlobs.storedUrls = [];
            }
            outputWithBlobs.storedUrls[i] = URL.createObjectURL(storedBlob);
          }
        }
      }
      loadedOutputs.push(outputWithBlobs);
    }
    return loadedOutputs;
  };

  const state = {
    open: false,
    apiKey: aiSettings.runwayApiKey || '',
    playlist: [],
    selectedVideoId: '',
    preferredModel: aiSettings.preferredModel || 'gen4_aleph',
    preferredRatio: aiSettings.preferredRatio || '1280:720',
    seed:
      typeof aiSettings.seed === 'number' && Number.isFinite(aiSettings.seed)
        ? aiSettings.seed
        : null,
    generating: false,
    outputs: await loadStoredOutputs(),
    overlayWasActive: false,
    resultsExpanded: false,
  };

  let progressBarEl = null;
  let progressLabelEl = null;

  const persistAiSettings = (partial) => {
    if (!persistence || typeof persistence.saveAiSettings !== 'function') {
      return;
    }
    const next = persistence.saveAiSettings(partial);
    Object.assign(state, {
      preferredModel: next.preferredModel ?? state.preferredModel,
      preferredRatio: next.preferredRatio ?? state.preferredRatio,
      seed:
        typeof next.seed === 'number' && Number.isFinite(next.seed) ? next.seed : state.seed,
      apiKey: next.runwayApiKey ?? state.apiKey,
    });
  };

  const resetProgressUi = () => {
    progressBarEl = null;
    progressLabelEl = null;
  };

  const setStatus = (message, { tone = 'info', progress } = {}) => {
    if (!aiStatus) {
      return;
    }

    if (!message) {
      aiStatus.textContent = '';
      aiStatus.removeAttribute('data-tone');
      aiStatus.removeAttribute('role');
      resetProgressUi();
      aiStatus.innerHTML = '';
      return;
    }

    aiStatus.dataset.tone = tone;
    aiStatus.setAttribute('role', tone === 'error' ? 'alert' : 'status');

    if (typeof progress === 'number' && Number.isFinite(progress)) {
      const clamped = Math.max(0, Math.min(progress, 100));
      if (!progressBarEl || !progressLabelEl) {
        aiStatus.innerHTML = '';
        const label = document.createElement('p');
        label.className = 'ai-progress-label';
        const track = document.createElement('div');
        track.className = 'ai-progress';
        const bar = document.createElement('div');
        bar.className = 'ai-progress-bar';
        track.appendChild(bar);
        aiStatus.append(label, track);
        progressLabelEl = label;
        progressBarEl = bar;
      }

      progressLabelEl.textContent = message;
      progressBarEl.style.setProperty('--ai-progress', `${clamped}%`);
      return;
    }

    aiStatus.textContent = message;
    resetProgressUi();
  };

  const clearStatus = () => setStatus('');

  const loadKeywords = async () => {
    try {
      const response = await fetch('assets/data/keywords.txt');
      if (!response.ok) {
        console.warn('Unable to load keywords file.');
        return [];
      }
      const text = await response.text();
      const keywords = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return keywords;
    } catch (error) {
      console.warn('Error loading keywords:', error);
      return [];
    }
  };

  const renderKeywords = async () => {
    if (!aiKeywordsList) {
      return;
    }

    const keywords = await loadKeywords();
    aiKeywordsList.innerHTML = '';

    if (keywords.length === 0) {
      return;
    }

    keywords.forEach((keyword) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-keyword-button';
      button.textContent = keyword;
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', `Add "${keyword}" to prompt`);
      
      button.addEventListener('click', () => {
        const currentValue = aiPromptInput.value.trim();
        const separator = currentValue ? ', ' : '';
        aiPromptInput.value = currentValue + separator + keyword;
        aiPromptInput.focus();
        // Trigger input event to ensure any listeners are notified
        aiPromptInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      aiKeywordsList.appendChild(button);
    });
  };

  const updateResultsToggleLabel = ({ toggleEl, expanded, count }) => {
  if (!toggleEl) {
    return;
  }
  const toggleText = toggleEl.querySelector('.ai-results-toggle-text');
  if (!toggleText) {
    return;
  }
  const countLabel = count ? ` (${count})` : '';
  if (expanded) {
    toggleText.textContent = `Hide Recent Generations${countLabel}`;
  } else {
    toggleText.textContent = `Show Recent Generations${countLabel}`;
  }
};

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

      // Use stored URLs for preview if available, otherwise use original URLs
      const previewUrls = entry.storedUrls && entry.storedUrls.length > 0 ? entry.storedUrls : entry.urls;
      previewUrls.forEach((url) => {
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
      // Use stored URLs if available, otherwise fall back to original URLs
      const downloadUrls = entry.storedUrls && entry.storedUrls.length > 0 ? entry.storedUrls : entry.urls;
      downloadUrls.forEach((url, index) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entry.videoName || 'generated-video'}-${index + 1}.mp4`;
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

  updateResultsToggleLabel({
    toggleEl: aiResultsToggle,
    expanded: state.resultsExpanded,
    count: state.outputs.length,
  });
  };

  const updateSelectedPreview = (selected) => {
    if (!aiSelectedThumbnail || !aiSelectedPlaceholder) {
      return;
    }

    if (selected && selected.thumbnailUrl) {
      aiSelectedThumbnail.src = selected.thumbnailUrl;
      aiSelectedThumbnail.alt = selected.name ? `Thumbnail for ${selected.name}` : 'Selected video thumbnail';
      aiSelectedThumbnail.hidden = false;
      aiSelectedPlaceholder.hidden = true;
      return;
    }

    aiSelectedThumbnail.hidden = true;
    aiSelectedThumbnail.removeAttribute('src');
    aiSelectedThumbnail.alt = 'Selected video thumbnail placeholder';
    aiSelectedPlaceholder.hidden = false;
  };

  const applySelectionState = () => {
    const selected = state.playlist.find((item) => item.id === state.selectedVideoId) || null;

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

    updateSelectedPreview(selected);
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
      const itemName = item.name || 'Video';
      button.title = `Use ${itemName} as the source video`;
      button.setAttribute('aria-label', itemName);

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
        placeholder.textContent = 'Loading preview…';
        button.appendChild(placeholder);

        if (playlistController && typeof playlistController.ensureThumbnailForItem === 'function') {
          playlistController
            .ensureThumbnailForItem(item.id)
            .then((thumbnailUrl) => {
              if (!button.isConnected || item.thumbnailUrl) {
                return;
              }
              if (thumbnailUrl) {
                const thumb = document.createElement('img');
                thumb.src = thumbnailUrl;
                thumb.alt = '';
                thumb.className = 'ai-item-thumb';
                thumb.loading = 'lazy';
                placeholder.replaceWith(thumb);
                item.thumbnailUrl = thumbnailUrl;
              } else {
                placeholder.textContent = 'Preview unavailable';
              }
            })
            .catch(() => {
              if (placeholder.isConnected) {
                placeholder.textContent = 'Preview unavailable';
              }
            });
        }
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

    if (!state.playlist.length) {
      state.selectedVideoId = '';
      renderPlaylist();
      return;
    }

    const selectedStillExists = state.playlist.some(
      (item) => item.id === state.selectedVideoId,
    );

    if (!selectedStillExists) {
      state.selectedVideoId = state.playlist[0].id;
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

    setStatus('Enter your API key to generate videos.', { tone: 'warning' });
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
      setStatus('Add a prompt to generate the video.', { tone: 'warning' });
      aiPromptInput.focus();
      return;
    }

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

    const estimatedSize = estimateDataUriSize(blob);
    if (estimatedSize > DATA_URI_LIMIT_BYTES) {
      setStatus(
        `The selected video is ${formatBytes(
          blob.size,
        )} which exceeds the supported upload size. Trim or compress the video before generating.`,
        { tone: 'warning' },
      );
      return;
    }

    setGenerating(true);

    persistAiSettings({
      preferredModel: model,
      preferredRatio: ratio,
      seed,
    });

    let videoUri;
    try {
      setStatus('Encoding video as data URI…', { tone: 'info' });
      videoUri = await convertBlobToDataUri(blob);
    } catch (error) {
      setGenerating(false);
      setStatus(error.message, { tone: 'error' });
      console.error(error);
      return;
    }

    try {
      setStatus('Starting generation…', { tone: 'info' });
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

      setStatus('Generation in progress…', { tone: 'info', progress: 0 });
      const task = await pollRunwayTask(creation.id, state.apiKey, {
        onProgress: (percent) => {
          setStatus('Generation in progress…', { tone: 'info', progress: percent });
        },
      });

      const urls = Array.isArray(task?.output) ? task.output.filter(Boolean) : [];
      let downloadResults = null;
      
      if (!urls.length) {
        setStatus('Generation finished but returned no files.', { tone: 'warning' });
      } else if (
        playlistController &&
        typeof playlistController.addVideoFromBlob === 'function' &&
        typeof fetch === 'function'
      ) {
        setStatus('Downloading generated video…', { tone: 'info' });
        try {
          downloadResults = await Promise.all(
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
                  ? `Generated Output ${timestamp} (${result.index + 1})`
                  : `Generated Output ${timestamp}`,
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

      // Store video blobs in IndexedDB for permanent access
      const storedBlobIds = [];
      const storedUrls = [];
      
      // If we have downloadResults, store them
      if (downloadResults && downloadResults.length > 0) {
        for (let i = 0; i < downloadResults.length; i++) {
          const result = downloadResults[i];
          const blobId = `${task.id}-${i}`;
          try {
            await persistGeneratedVideo(blobId, result.blob);
            storedBlobIds[i] = blobId;
            // Create object URL for stored blob
            storedUrls[i] = URL.createObjectURL(result.blob);
          } catch (error) {
            console.warn('Unable to store generated video blob:', error);
            // Fallback to original URL if storage fails
            storedUrls[i] = urls[i] || '';
          }
        }
      } else {
        // If download failed, try to download and store from URLs
        try {
          setStatus('Downloading and saving generated videos…', { tone: 'info' });
          for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
              const response = await fetch(url, { mode: 'cors' });
              if (response.ok) {
                const blob = await response.blob();
                const blobId = `${task.id}-${i}`;
                await persistGeneratedVideo(blobId, blob);
                storedBlobIds[i] = blobId;
                storedUrls[i] = URL.createObjectURL(blob);
              } else {
                storedUrls[i] = url; // Fallback to original URL
              }
            } catch (error) {
              console.warn(`Unable to download and store video ${i + 1}:`, error);
              storedUrls[i] = url; // Fallback to original URL
            }
          }
        } catch (error) {
          console.warn('Unable to download generated videos for storage:', error);
          // Use original URLs as fallback
          urls.forEach((url, i) => {
            storedUrls[i] = url;
          });
        }
      }

      const newOutput = {
        id: task.id,
        urls, // Keep original URLs as fallback
        storedUrls, // Use stored blob URLs for downloads
        storedBlobIds, // Track which blobs are stored
        createdAt: task?.createdAt || new Date().toISOString(),
        promptText,
        videoName: selected.name,
      };

      state.outputs.unshift(newOutput);
      // Optional trimming to avoid unbounded growth; increase limit generously
      if (state.outputs.length > MAX_OUTPUT_HISTORY) {
        // Remove oldest beyond the cap
        const excess = state.outputs.splice(MAX_OUTPUT_HISTORY);
        excess.forEach((removed) => {
          if (removed?.storedUrls) {
            removed.storedUrls.forEach((url) => {
              if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
              }
            });
          }
        });
      }
      
      // Persist outputs list
      persistAiSettings({ outputs: state.outputs.map(({ storedUrls, storedBlobIds, ...rest }) => rest) });
      
      renderOutputs();
    } catch (error) {
      if (error?.status === 413) {
        const sizeText = blob ? formatBytes(blob.size) : 'the selected video';
        setStatus(
          `The API rejected the request because the payload was too large. The selected video is ${sizeText}. Trim or compress the video and try again.`,
          { tone: 'error' },
        );
      } else if (error instanceof TypeError) {
        setStatus(
          'Unable to reach the API from this site. Cross-origin requests are blocked, so run locally or use a server-side proxy.',
          { tone: 'error' },
        );
      } else {
        setStatus(error.message || 'Generation failed.', { tone: 'error' });
      }
      console.error(error);
    } finally {
      setGenerating(false);
    }
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

  const updateResultsVisibility = (expanded) => {
    const nextExpanded = typeof expanded === 'boolean' ? expanded : !state.resultsExpanded;
    state.resultsExpanded = nextExpanded;

    if (aiResultsToggle) {
      aiResultsToggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    }
    if (aiResultsBody) {
      aiResultsBody.hidden = !nextExpanded;
    }

    updateResultsToggleLabel({
      toggleEl: aiResultsToggle,
      expanded: state.resultsExpanded,
      count: state.outputs.length,
    });
  };

  const handleResultsToggleClick = () => {
    updateResultsVisibility(!state.resultsExpanded);
  };

  const updateApiKeyVisibility = () => {
    const hasKey = Boolean(state.apiKey && state.apiKey.trim());
    // Always collapsed by default, but allow toggling
    if (hasKey) {
      // Move to bottom when key is present
      aiApiKeyContainer.classList.add('ai-api-key-has-key');
    } else {
      aiApiKeyContainer.classList.remove('ai-api-key-has-key');
    }
    // Always start collapsed
    aiApiKeyFieldset.hidden = true;
    aiApiKeyToggle.setAttribute('aria-expanded', 'false');
  };

  const handleApiKeyToggle = () => {
    const isExpanded = aiApiKeyToggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !isExpanded;
    aiApiKeyToggle.setAttribute('aria-expanded', String(nextExpanded));
    aiApiKeyFieldset.hidden = !nextExpanded;
  };

  const handleSaveKey = () => {
    const key = aiApiKeyInput.value.trim();
    if (!key) {
      setStatus('Enter a valid API key before saving.', { tone: 'warning' });
      aiApiKeyInput.focus();
      return;
    }

    state.apiKey = key;
    persistAiSettings({ runwayApiKey: key });
    setStatus('API key saved locally.', { tone: 'success' });
    updateApiKeyVisibility();
  };

  const handleClearKey = () => {
    aiApiKeyInput.value = '';
    state.apiKey = '';
    persistAiSettings({ runwayApiKey: '' });
    setStatus('API key cleared. Add it again before generating.', { tone: 'info' });
    updateApiKeyVisibility();
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
  aiGenerationForm.addEventListener('submit', handleGenerate);
  aiModelSelect.addEventListener('change', handleModelChange);
  aiRatioSelect.addEventListener('change', handleRatioChange);
  aiSeedInput.addEventListener('change', handleSeedChange);
  aiSaveKeyBtn.addEventListener('click', handleSaveKey);
  aiClearKeyBtn.addEventListener('click', handleClearKey);
  aiApiKeyToggle.addEventListener('click', handleApiKeyToggle);
  document.addEventListener('keydown', handleGlobalKeydown);

  if (aiResultsToggle) {
    aiResultsToggle.addEventListener('click', handleResultsToggleClick);
  }

  aiApiKeyInput.value = state.apiKey;
  aiModelSelect.value = normalizeModel(aiModelSelect, state.preferredModel);
  aiRatioSelect.value = normalizeRatio(aiRatioSelect, state.preferredRatio);
  aiSeedInput.value = state.seed !== null ? String(state.seed) : '';
  aiGenerateBtn.disabled = true;
  aiPanel.classList.add('concealed');
  aiPanel.setAttribute('aria-hidden', 'true');
  aiBtn.setAttribute('aria-expanded', 'false');
  updateResultsVisibility(false);
  updateApiKeyVisibility();
  renderOutputs();
  renderKeywords();

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
      updateSelectedPreview(null);
      aiBtn.removeEventListener('click', handleAiButtonClick);
      aiBackBtn.removeEventListener('click', closePanel);
      aiGrid.removeEventListener('click', handlePlaylistClick);
      aiGenerationForm.removeEventListener('submit', handleGenerate);
      aiModelSelect.removeEventListener('change', handleModelChange);
      aiRatioSelect.removeEventListener('change', handleRatioChange);
      aiSeedInput.removeEventListener('change', handleSeedChange);
      aiSaveKeyBtn.removeEventListener('click', handleSaveKey);
      aiClearKeyBtn.removeEventListener('click', handleClearKey);
      aiApiKeyToggle.removeEventListener('click', handleApiKeyToggle);
      document.removeEventListener('keydown', handleGlobalKeydown);
      if (aiResultsToggle) {
        aiResultsToggle.removeEventListener('click', handleResultsToggleClick);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    },
  };
};



