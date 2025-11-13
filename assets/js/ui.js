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

export const toggleTimelinePanel = (panel, open) => {
  toggleVisibility(panel, open);
  panel.setAttribute('data-open', open ? 'true' : 'false');
};

export const setToggleState = (button, active) => {
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
};

export const setFadeSliderEnabled = (slider, enabled) => {
  slider.disabled = !enabled;
};

export const updateFadeDurationDisplay = (element, durationMs) => {
  if (!element) {
    return;
  }

  if (Number.isNaN(durationMs)) {
    element.textContent = '—';
    return;
  }

  if (durationMs >= 1000) {
    const seconds = durationMs / 1000;
    const decimals = seconds % 1 === 0 ? 0 : 1;
    element.textContent = `${seconds.toFixed(decimals)}s`;
    return;
  }

  element.textContent = `${durationMs}ms`;
};

export const renderTimelineGrid = (grid, videos, activeId, onSelect) => {
  if (!grid) {
    return;
  }

  grid.setAttribute('data-empty', videos.length === 0 ? 'true' : 'false');

  if (!videos.length) {
    grid.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();

  videos.forEach((entry) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'timeline-item';
    item.dataset.videoId = entry.id;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `Play ${entry.displayName || entry.name || 'video'}`);

    if (entry.id === activeId) {
      item.classList.add('is-active');
      item.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
    }

    const preview = document.createElement('video');
    preview.src = entry.url;
    preview.muted = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.preload = 'metadata';

    preview.addEventListener(
      'canplay',
      () => {
        try {
          const playPromise = preview.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } catch (error) {
          console.debug('Preview autoplay blocked.', error);
        }
      },
      { once: true },
    );

    const label = document.createElement('div');
    label.className = 'timeline-item-label';

    const title = document.createElement('strong');
    title.textContent = entry.displayName || entry.name || 'Untitled video';
    label.appendChild(title);

    if (entry.secondaryLabel) {
      const subtitle = document.createElement('span');
      subtitle.textContent = entry.secondaryLabel;
      label.appendChild(subtitle);
    }

    if (typeof onSelect === 'function') {
      item.addEventListener('click', () => {
        onSelect(entry.id);
      });
    }

    item.append(preview, label);
    fragment.appendChild(item);
  });

  grid.replaceChildren(fragment);
};


