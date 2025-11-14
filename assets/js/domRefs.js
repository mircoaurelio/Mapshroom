export const getDomElements = () => {
  const videoWrapper = document.getElementById('video-wrapper');
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('video');
  const playBtn = document.getElementById('playBtn');
  const moveBtn = document.getElementById('moveBtn');
  const aiBtn = document.getElementById('aiBtn');
  const timelineBtn = document.getElementById('timelineBtn');
  const timelinePanel = document.getElementById('timeline-panel');
  const timelineGrid = document.getElementById('timelineGrid');
  const timelineBackBtn = document.getElementById('timelineBackBtn');
  const randomToggle = document.getElementById('randomToggle');
  const fadeToggle = document.getElementById('fadeToggle');
  const fadeSlider = document.getElementById('fadeSlider');
  const fadeValue = document.getElementById('fadeValue');
  const gridOverlay = document.getElementById('grid-overlay');
  const precisionControl = document.getElementById('precision-control');
  const precisionRange = document.getElementById('precisionRange');
  const chooseLabel = document.querySelector('label.picker');
  const controls = document.querySelector('.controls');
  const timelineExportBtn = document.getElementById('timelineExportBtn');
  const aiPanel = document.getElementById('ai-panel');
  const aiBackBtn = document.getElementById('aiBackBtn');
  const aiGrid = document.getElementById('aiGrid');
  const aiGenerationForm = document.getElementById('aiGenerationForm');
  const aiGenerationFieldset = document.getElementById('aiGenerationFieldset');
  const aiPromptInput = document.getElementById('aiPromptInput');
  const aiModelSelect = document.getElementById('aiModelSelect');
  const aiRatioSelect = document.getElementById('aiRatioSelect');
  const aiSeedInput = document.getElementById('aiSeedInput');
  const aiSelectedThumbnail = document.getElementById('aiSelectedThumbnail');
  const aiSelectedPlaceholder = document.getElementById('aiSelectedPlaceholder');
  const aiGenerateBtn = document.getElementById('aiGenerateBtn');
  const aiStatus = document.getElementById('aiStatus');
  const aiOutputList = document.getElementById('aiOutputList');
  const aiApiKeyInput = document.getElementById('aiApiKeyInput');
  const aiSaveKeyBtn = document.getElementById('aiSaveKeyBtn');
  const aiClearKeyBtn = document.getElementById('aiClearKeyBtn');
  const aiNoVideosMessage = document.getElementById('aiNoVideosMessage');
  const aiResultsToggle = document.getElementById('aiResultsToggle');
  const aiResultsBody = document.getElementById('aiResultsBody');
  const rotateLockBtn = document.getElementById('rotateLockBtn');

  if (
    !videoWrapper ||
    !fileInput ||
    !video ||
    !playBtn ||
    !moveBtn ||
    !aiBtn ||
    !timelineBtn ||
    !timelinePanel ||
    !timelineGrid ||
    !timelineBackBtn ||
    !randomToggle ||
    !fadeToggle ||
    !fadeSlider ||
    !fadeValue ||
    !gridOverlay ||
    !precisionControl ||
    !precisionRange ||
    !chooseLabel ||
    !controls ||
    !timelineExportBtn ||
    !aiPanel ||
    !aiBackBtn ||
    !aiGrid ||
    !aiGenerationForm ||
    !aiGenerationFieldset ||
    !aiPromptInput ||
    !aiModelSelect ||
    !aiRatioSelect ||
    !aiSeedInput ||
    !aiSelectedThumbnail ||
    !aiSelectedPlaceholder ||
    !aiGenerateBtn ||
    !aiStatus ||
    !aiOutputList ||
    !aiApiKeyInput ||
    !aiSaveKeyBtn ||
    !aiClearKeyBtn ||
    !aiNoVideosMessage ||
    !aiResultsToggle ||
    !aiResultsBody ||
    !rotateLockBtn
  ) {
    throw new Error('Missing expected DOM elements.');
  }

  return {
    videoWrapper,
    fileInput,
    video,
    playBtn,
    moveBtn,
    aiBtn,
    timelineBtn,
    timelinePanel,
    timelineGrid,
    timelineBackBtn,
    randomToggle,
    fadeToggle,
    fadeSlider,
    fadeValue,
    gridOverlay,
    precisionControl,
    precisionRange,
    chooseLabel,
    controls,
    timelineExportBtn,
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
    aiNoVideosMessage,
    aiResultsToggle,
    aiResultsBody,
    rotateLockBtn,
  };
};

