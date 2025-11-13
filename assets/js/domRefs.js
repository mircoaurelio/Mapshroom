export const getDomElements = () => {
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('video');
  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');
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
  const precisionValue = document.getElementById('precisionValue');
  const chooseLabel = document.querySelector('label.picker');
  const controls = document.querySelector('.controls');

  if (
    !fileInput ||
    !video ||
    !playBtn ||
    !resetBtn ||
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
    !precisionValue ||
    !chooseLabel ||
    !controls
  ) {
    throw new Error('Missing expected DOM elements.');
  }

  return {
    fileInput,
    video,
    playBtn,
    resetBtn,
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
    precisionValue,
    chooseLabel,
    controls,
  };
};

