const setRootStyle = (property, value) => {
  document.documentElement.style.setProperty(property, value);
};

export const updateTransformStyles = ({ offsetX, offsetY, widthAdjust, heightAdjust }) => {
  setRootStyle('--offset-x', `${offsetX}px`);
  setRootStyle('--offset-y', `${offsetY}px`);
  setRootStyle('--width-adjust', `${widthAdjust}px`);
  setRootStyle('--height-adjust', `${heightAdjust}px`);
};

export const updatePrecisionDisplay = (precisionValueEl, precision) => {
  precisionValueEl.textContent = `${precision}px`;
};

export const toggleOverlayDisplay = (gridOverlay, active) => {
  gridOverlay.classList.toggle('overlay-disabled', !active);
};

export const toggleVisibility = (element, visible) => {
  element.classList.toggle('concealed', !visible);
  element.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

export const setControlsEnabled = (playBtn, resetBtn, enabled) => {
  playBtn.disabled = !enabled;
  resetBtn.disabled = !enabled;
};

