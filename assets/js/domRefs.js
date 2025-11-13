export const getDomElements = () => {
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('video');
  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');
  const gridOverlay = document.getElementById('grid-overlay');
  const precisionControl = document.getElementById('precision-control');
  const precisionRange = document.getElementById('precisionRange');
  const precisionValue = document.getElementById('precisionValue');
  const chooseLabel = document.querySelector('label.picker');
  const controls = document.querySelector('.controls');
  const timelineBtn = document.getElementById('timelineBtn');
  const timelinePanel = document.getElementById('timeline-panel');
  const closeTimelineBtn = document.getElementById('closeTimelineBtn');
  const randomToggleBtn = document.getElementById('randomToggleBtn');
  const fadeToggleBtn = document.getElementById('fadeToggleBtn');
  const fadeSlider = document.getElementById('fadeSlider');
  const fadeSliderValue = document.getElementById('fadeSliderValue');
  const timelineGrid = document.getElementById('timeline-grid');

  if (
    !fileInput ||
    !video ||
    !playBtn ||
    !resetBtn ||
    !gridOverlay ||
    !precisionControl ||
    !precisionRange ||
    !precisionValue ||
    !chooseLabel ||
    !controls ||
    !timelineBtn ||
    !timelinePanel ||
    !closeTimelineBtn ||
    !randomToggleBtn ||
    !fadeToggleBtn ||
    !fadeSlider ||
    !fadeSliderValue ||
    !timelineGrid
  ) {
    throw new Error('Missing expected DOM elements.');
  }

  return {
    fileInput,
    video,
    playBtn,
    resetBtn,
    gridOverlay,
    precisionControl,
    precisionRange,
    precisionValue,
    chooseLabel,
    controls,
    timelineBtn,
    timelinePanel,
    closeTimelineBtn,
    randomToggleBtn,
    fadeToggleBtn,
    fadeSlider,
    fadeSliderValue,
    timelineGrid,
  };
};

