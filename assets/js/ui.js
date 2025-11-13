const setRootStyle = (property, value) => {
  document.documentElement.style.setProperty(property, value);
  document.body?.style.setProperty(property, value);
};

const applyInlineTransform = (video, { offsetX, offsetY, widthAdjust, heightAdjust }) => {
  if (!video) {
    return;
  }

  video.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  video.style.width = `calc(100vw + ${widthAdjust}px)`;
  video.style.height = `calc(100vh + ${heightAdjust}px)`;
};

export const updateTransformStyles = ({ offsetX, offsetY, widthAdjust, heightAdjust }, video) => {
  setRootStyle('--offset-x', `${offsetX}px`);
  setRootStyle('--offset-y', `${offsetY}px`);
  setRootStyle('--width-adjust', `${widthAdjust}px`);
  setRootStyle('--height-adjust', `${heightAdjust}px`);
  applyInlineTransform(video, { offsetX, offsetY, widthAdjust, heightAdjust });
};

export const toggleOverlayDisplay = (gridOverlay, active) => {
  gridOverlay.classList.toggle('overlay-disabled', !active);
};

export const toggleVisibility = (element, visible) => {
  element.classList.toggle('concealed', !visible);
  element.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

export const setControlsEnabled = (playBtn, moveBtn, enabled) => {
  playBtn.disabled = !enabled;
  moveBtn.disabled = !enabled;
};

