import { toggleVisibility } from './ui.js';

const TUTORIAL_STEPS = [
  {
    title: 'Step 1: Upload Your Photo',
    icon: '📸',
    content: `
      <div class="tutorial-step-visual">
        <div class="tutorial-icon-large">📸</div>
        <div class="tutorial-arrow">↓</div>
      </div>
      <h3>Get Started</h3>
      <p>First, you need to take or upload a photo of what you want to map. This photo will be the base for your mapping project.</p>
      <ul class="tutorial-feature-list">
        <li><span class="tutorial-icon">👆</span> Tap the "Choose Media" button at the top</li>
        <li><span class="tutorial-icon">📱</span> Select a photo from your device or take a new one</li>
        <li><span class="tutorial-icon">✨</span> Your photo will appear on the screen</li>
      </ul>
    `,
    highlightSelector: 'label.picker',
    highlightPadding: 20,
  },
  {
    title: 'Step 2: Move Your Photo',
    icon: '✋',
    content: `
      <div class="tutorial-step-visual">
        <div class="tutorial-icon-large">✋</div>
        <div class="tutorial-arrow">↓</div>
      </div>
      <h3>Position Your Content</h3>
      <p>Once your photo is loaded, you can move and adjust it using the move button. This helps you position your content exactly where you want it.</p>
      <ul class="tutorial-feature-list">
        <li><span class="tutorial-icon">👆</span> Tap the move button (hand icon) in the bottom controls</li>
        <li><span class="tutorial-icon">🔄</span> When move mode is active, you can adjust the position</li>
        <li><span class="tutorial-icon">⬆️⬇️⬅️➡️</span> Use the grid zones on screen to move your photo</li>
      </ul>
    `,
    highlightSelector: '#moveBtn',
    highlightPadding: 15,
  },
  {
    title: 'Step 3: Use Grid Zones',
    icon: '⚡',
    content: `
      <div class="tutorial-step-visual">
        <div class="tutorial-grid-demo">
          <div class="tutorial-grid-cell">↖️</div>
          <div class="tutorial-grid-cell">⬆️</div>
          <div class="tutorial-grid-cell">↗️</div>
          <div class="tutorial-grid-cell">⬅️</div>
          <div class="tutorial-grid-cell">⚡</div>
          <div class="tutorial-grid-cell">➡️</div>
          <div class="tutorial-grid-cell">↙️</div>
          <div class="tutorial-grid-cell">⬇️</div>
          <div class="tutorial-grid-cell">↘️</div>
        </div>
      </div>
      <h3>Interactive Screen Sections</h3>
      <p>The screen is divided into 9 zones (3x3 grid). Each section acts as a button to control your photo's position and size.</p>
      <ul class="tutorial-feature-list">
        <li><span class="tutorial-icon">⬆️⬇️⬅️➡️</span> Tap different zones to move your photo up, down, left, or right</li>
        <li><span class="tutorial-icon">↔️</span> Corner zones adjust the size (width and height)</li>
        <li><span class="tutorial-icon">⚡</span> The center zone: drag up/down to adjust movement precision</li>
        <li><span class="tutorial-icon">👆</span> When move mode is active, these zones become interactive</li>
      </ul>
    `,
    highlightSelector: '#grid-overlay',
    highlightPadding: 10,
  },
  {
    title: 'Step 4: Generate Content',
    icon: '✨',
    content: `
      <div class="tutorial-step-visual">
        <div class="tutorial-icon-large">✨</div>
        <div class="tutorial-arrow">↓</div>
      </div>
      <h3>AI-Powered Content Creation</h3>
      <p>You can generate new content based on your uploaded photo using AI. This lets you create variations or enhance your mapping project.</p>
      <ul class="tutorial-feature-list">
        <li><span class="tutorial-icon">✨</span> Tap the AI button (sparkle icon) in the bottom controls</li>
        <li><span class="tutorial-icon">🖼️</span> Select your photo from the playlist</li>
        <li><span class="tutorial-icon">✍️</span> Enter a prompt describing what you want to generate</li>
        <li><span class="tutorial-icon">🚀</span> Tap "Generate" to create new content</li>
      </ul>
    `,
    highlightSelector: '#aiBtn',
    highlightPadding: 15,
  },
  {
    title: 'Step 5: Build Your Timeline',
    icon: '🎬',
    content: `
      <div class="tutorial-step-visual">
        <div class="tutorial-icon-large">🎬</div>
        <div class="tutorial-arrow">↓</div>
      </div>
      <h3>Add More Photos</h3>
      <p>You can add multiple photos to create a timeline. This lets you build a sequence of images for your mapping project.</p>
      <ul class="tutorial-feature-list">
        <li><span class="tutorial-icon">🎬</span> Tap the timeline button (film icon) to view your playlist</li>
        <li><span class="tutorial-icon">➕</span> Use "Choose Media" again to add more photos</li>
        <li><span class="tutorial-icon">🖼️</span> Each photo appears as a thumbnail in the timeline</li>
        <li><span class="tutorial-icon">👆</span> Tap any thumbnail to switch between photos</li>
        <li><span class="tutorial-icon">💾</span> You can export your entire timeline as a video</li>
      </ul>
    `,
    highlightSelector: '#timelineBtn',
    highlightPadding: 15,
  },
];

export const createTutorialController = ({ elements }) => {
  const {
    tutorialOverlay,
    tutorialClose,
    tutorialNext,
    tutorialPrev,
    tutorialSkip,
    tutorialStepContent,
    tutorialProgressFill,
    tutorialStepIndicator,
    tutorialHighlight,
  } = elements;

  let currentStep = 0;
  let isActive = false;
  let highlightTimeout = null;

  const updateProgress = () => {
    const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
    tutorialProgressFill.style.width = `${progress}%`;
    tutorialStepIndicator.textContent = `${currentStep + 1} / ${TUTORIAL_STEPS.length}`;
  };

  const highlightElement = (selector, padding = 15) => {
    if (!selector) {
      tutorialHighlight.classList.remove('visible');
      tutorialHighlight.removeAttribute('data-target');
      return;
    }

    const element = document.querySelector(selector);
    if (!element) {
      tutorialHighlight.classList.remove('visible');
      tutorialHighlight.removeAttribute('data-target');
      return;
    }

    // Set data attribute for mobile CSS targeting
    if (selector === 'label.picker') {
      tutorialHighlight.setAttribute('data-target', 'picker');
    } else {
      tutorialHighlight.removeAttribute('data-target');
    }

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Calculate highlight position with padding
    const left = rect.left + scrollX - padding;
    const top = rect.top + scrollY - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    tutorialHighlight.style.left = `${left}px`;
    tutorialHighlight.style.top = `${top}px`;
    tutorialHighlight.style.width = `${width}px`;
    tutorialHighlight.style.height = `${height}px`;
    tutorialHighlight.classList.add('visible');
    
    // Ensure the highlighted element is above the backdrop and highlight
    const originalZIndex = element.style.zIndex || '';
    const originalPosition = element.style.position || '';
    
    // Store original values for cleanup
    if (!element.dataset.originalZIndex) {
      element.dataset.originalZIndex = originalZIndex;
      element.dataset.originalPosition = originalPosition;
    }
    
    element.style.position = 'relative';
    element.style.zIndex = '10001';
  };

  const showStep = (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= TUTORIAL_STEPS.length) {
      return;
    }

    currentStep = stepIndex;
    const step = TUTORIAL_STEPS[stepIndex];

    tutorialStepContent.innerHTML = step.content;
    updateProgress();

    // Update button states
    tutorialPrev.disabled = stepIndex === 0;
    if (stepIndex === TUTORIAL_STEPS.length - 1) {
      tutorialNext.textContent = 'Finish';
      tutorialNext.setAttribute('data-is-last', 'true');
    } else {
      tutorialNext.textContent = 'Next';
      tutorialNext.removeAttribute('data-is-last');
    }

    // Highlight the element after a short delay to allow content to render
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }
    highlightTimeout = setTimeout(() => {
      highlightElement(step.highlightSelector, step.highlightPadding);
    }, 100);

    // Scroll to top of content
    tutorialStepContent.scrollTop = 0;
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      showStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  };

  const openTutorial = () => {
    if (isActive) {
      return;
    }

    isActive = true;
    currentStep = 0;
    showStep(0);
    toggleVisibility(tutorialOverlay, true);
    tutorialOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus management
    setTimeout(() => {
      tutorialNext.focus();
    }, 100);
  };

  const closeTutorial = () => {
    if (!isActive) {
      return;
    }

    isActive = false;
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }
    tutorialHighlight.classList.remove('visible');
    toggleVisibility(tutorialOverlay, false);
    tutorialOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Reset z-index and position of all potentially highlighted elements
    const allSelectors = TUTORIAL_STEPS.map(step => step.highlightSelector).filter(Boolean);
    allSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element && element.dataset.originalZIndex !== undefined) {
        element.style.zIndex = element.dataset.originalZIndex;
        element.style.position = element.dataset.originalPosition;
        delete element.dataset.originalZIndex;
        delete element.dataset.originalPosition;
      } else if (element) {
        element.style.zIndex = '';
        element.style.position = '';
      }
    });

    // Return focus to settings button if it exists
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.focus();
    }
  };

  const handleKeydown = (event) => {
    if (!isActive) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeTutorial();
    } else if (event.key === 'ArrowLeft' && !tutorialPrev.disabled) {
      event.preventDefault();
      prevStep();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextStep();
    }
  };

  const handleResize = () => {
    if (!isActive) {
      return;
    }

    const step = TUTORIAL_STEPS[currentStep];
    if (step && step.highlightSelector) {
      highlightElement(step.highlightSelector, step.highlightPadding);
    }
  };

  // Event listeners
  tutorialClose.addEventListener('click', closeTutorial);
  tutorialNext.addEventListener('click', nextStep);
  tutorialPrev.addEventListener('click', prevStep);
  tutorialSkip.addEventListener('click', closeTutorial);

  // Close on backdrop click
  const backdrop = tutorialOverlay.querySelector('.tutorial-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        closeTutorial();
      }
    });
  }

  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);

  return {
    open: openTutorial,
    close: closeTutorial,
    isActive: () => isActive,
  };
};

