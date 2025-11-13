export const getDomElements = () => {
  const videoWrapper = document.getElementById('video-wrapper');
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('video');
  const playBtn = document.getElementById('playBtn');
  const moveBtn = document.getElementById('moveBtn');
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

  if (
    !videoWrapper ||
    !fileInput ||
    !video ||
    !playBtn ||
    !moveBtn ||
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
    !controls
  ) {
    throw new Error('Missing expected DOM elements.');
  }

  return {
    videoWrapper,
    fileInput,
    video,
    playBtn,
    moveBtn,
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
  };
};

