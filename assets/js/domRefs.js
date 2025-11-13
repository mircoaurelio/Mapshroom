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
    !controls
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
  };
};

