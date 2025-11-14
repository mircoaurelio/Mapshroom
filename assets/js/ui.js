const setRootStyle = (property, value) => {
  document.documentElement.style.setProperty(property, value);
  document.body?.style.setProperty(property, value);
};

const applyInlineTransform = (video, { offsetX, offsetY, widthAdjust, heightAdjust }, rotationLocked = false, lockedWidth = null, lockedHeight = null) => {
  if (!video) {
    return;
  }

  video.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  
  // If rotation is locked, use locked dimensions instead of viewport units
  if (rotationLocked && lockedWidth !== null && lockedHeight !== null) {
    // The wrapper is locked to lockedWidth x lockedHeight
    // Video should fill the wrapper and account for widthAdjust/heightAdjust
    // Video dimensions = wrapper size + adjustments
    const videoWidth = lockedWidth + widthAdjust;
    const videoHeight = lockedHeight + heightAdjust;
    
    video.style.width = `${videoWidth}px`;
    video.style.height = `${videoHeight}px`;
    
    // Position video to be centered in wrapper (accounting for adjustments)
    // If adjustments are positive, video is larger than wrapper, so center it
    // If adjustments are negative, video is smaller than wrapper, still center it
    video.style.position = 'absolute';
    video.style.left = `${-widthAdjust / 2}px`;
    video.style.top = `${-heightAdjust / 2}px`;
    video.style.right = '';
    video.style.bottom = '';
    video.style.inset = '';
    video.style.marginLeft = '0';
    video.style.marginTop = '0';
  } else {
    // Normal mode: use viewport units that change with device rotation
    video.style.width = `calc(100vw + ${widthAdjust}px)`;
    video.style.height = `calc(100vh + ${heightAdjust}px)`;
    // Reset to use CSS inset behavior (inset: 0 fills parent)
    video.style.position = 'absolute';
    video.style.inset = '';
    video.style.left = '';
    video.style.top = '';
    video.style.right = '';
    video.style.bottom = '';
    video.style.marginLeft = '';
    video.style.marginTop = '';
  }
};

export const updateTransformStyles = ({ offsetX, offsetY, widthAdjust, heightAdjust }, video, rotationLocked = false, lockedWidth = null, lockedHeight = null) => {
  setRootStyle('--offset-x', `${offsetX}px`);
  setRootStyle('--offset-y', `${offsetY}px`);
  setRootStyle('--width-adjust', `${widthAdjust}px`);
  setRootStyle('--height-adjust', `${heightAdjust}px`);
  applyInlineTransform(video, { offsetX, offsetY, widthAdjust, heightAdjust }, rotationLocked, lockedWidth, lockedHeight);
};

export const toggleOverlayDisplay = (gridOverlay, active) => {
  gridOverlay.classList.toggle('overlay-disabled', !active);
};

export const toggleVisibility = (element, visible) => {
  element.classList.toggle('concealed', !visible);
  element.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

export const setControlsEnabled = (buttons, enabled) => {
  if (!Array.isArray(buttons)) {
    return;
  }

  buttons.forEach((button) => {
    if (button) {
      button.disabled = !enabled;
    }
  });
};

