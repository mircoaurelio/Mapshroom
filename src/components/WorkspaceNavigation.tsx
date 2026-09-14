import { useEffect, useRef, useState } from 'react';
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick';
import {
  advanceAssetsFirstStepToImport,
  ASSETS_FIRST_STEP_DELAY_MS,
  dismissAssetsFirstStepPermanently,
  isAssetsFirstStepDismissed,
  isAssetsImportStepPending,
  persistAssetsFirstStepElapsedMs,
  readAssetsFirstStepElapsedMs,
} from '../lib/assetsFirstStep';

import './WorkspaceNavigation.css';

export type WorkspaceSection = 'asset' | 'move' | 'output' | 'workspace';

interface WorkspaceNavigationProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  assetsFirstStepEligible: boolean;
  onboardingActive: boolean;
  onAssetsFirstStepAdvance: () => void;
}

function NavigationIcon({ section }: { section: WorkspaceSection }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {section === 'asset' ? <><rect x="3" y="3" width="15" height="15" rx="2" /><path d="m5 14 4-4 3 3 2-2 2 2M7 21h12a2 2 0 0 0 2-2V7" /><circle cx="13.5" cy="7.5" r="1" /></> :
      section === 'move' ? <><path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3" /></> :
      section === 'output' ? <><rect x="3" y="4" width="18" height="13" rx="1.5" /><path d="M12 17v4m-4 0h8" /></> :
      <><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="m10 8.5 5 3.5-5 3.5Z" fill="currentColor" stroke="none" /></>}
  </svg>;
}
function AssetsIcon() { return <NavigationIcon section="asset" />; }

export function WorkspaceNavigation({ activeSection, onSelectSection, assetsFirstStepEligible, onboardingActive, onAssetsFirstStepAdvance }: WorkspaceNavigationProps) {
  const onOpenAssets = () => onSelectSection('asset');
  const [assetsFirstStepVisible, setAssetsFirstStepVisible] = useState(false);
  const [assetsFirstStepAdvanced, setAssetsFirstStepAdvanced] = useState(() =>
    isAssetsImportStepPending(),
  );
  const assetsFirstStepRemainingMsRef = useRef(
    Math.max(
      0,
      ASSETS_FIRST_STEP_DELAY_MS - readAssetsFirstStepElapsedMs(),
    ),
  );

  useEffect(() => {
    if (
      !assetsFirstStepEligible ||
      onboardingActive ||
      assetsFirstStepVisible ||
      assetsFirstStepAdvanced ||
      isAssetsFirstStepDismissed()
    ) {
      return;
    }

    let activeStartedAt: number | null = null;
    let timeoutId: number | null = null;

    const persistElapsedTime = () => {
      const elapsedMs = Math.max(
        0,
        ASSETS_FIRST_STEP_DELAY_MS - assetsFirstStepRemainingMsRef.current,
      );
      persistAssetsFirstStepElapsedMs(elapsedMs);
    };

    const pauseTimer = () => {
      if (activeStartedAt !== null) {
        assetsFirstStepRemainingMsRef.current = Math.max(
          0,
          assetsFirstStepRemainingMsRef.current - (performance.now() - activeStartedAt),
        );
        activeStartedAt = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      persistElapsedTime();
    };

    const revealFirstStep = () => {
      assetsFirstStepRemainingMsRef.current = 0;
      activeStartedAt = null;
      timeoutId = null;
      persistElapsedTime();
      setAssetsFirstStepVisible(true);
    };

    const startTimer = () => {
      if (document.hidden || activeStartedAt !== null) {
        return;
      }

      if (assetsFirstStepRemainingMsRef.current <= 0) {
        revealFirstStep();
        return;
      }

      activeStartedAt = performance.now();
      timeoutId = window.setTimeout(
        revealFirstStep,
        assetsFirstStepRemainingMsRef.current,
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      pauseTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    assetsFirstStepAdvanced,
    assetsFirstStepEligible,
    assetsFirstStepVisible,
    onboardingActive,
  ]);

  useEffect(() => {
    if (!assetsFirstStepVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissAssetsFirstStepPermanently();
        setAssetsFirstStepVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assetsFirstStepVisible]);

  const dismissAssetsFirstStep = () => {
    dismissAssetsFirstStepPermanently();
    assetsFirstStepRemainingMsRef.current = 0;
    setAssetsFirstStepVisible(false);
  };
  const assetsGuideRef = useRef<HTMLDivElement | null>(null);
  // The Assets button closes this tip by advancing to the import step.
  useDismissOnOutsideClick(assetsGuideRef, assetsFirstStepVisible, dismissAssetsFirstStep);
  const openAssets = () => {
    if (assetsFirstStepVisible) {
      advanceAssetsFirstStepToImport();
      assetsFirstStepRemainingMsRef.current = 0;
      setAssetsFirstStepAdvanced(true);
      setAssetsFirstStepVisible(false);
      onAssetsFirstStepAdvance();
      onOpenAssets();
      return;
    }

    dismissAssetsFirstStep();
    onOpenAssets();
  };

  return <nav className="workspace-navigation" aria-label="Workspace sections">
    <div ref={assetsGuideRef} className="workspace-nav-assets">
      <button type="button" className="workspace-nav-item" aria-current={activeSection === 'asset' ? 'page' : undefined} aria-describedby={assetsFirstStepVisible ? 'assets-first-step-title' : undefined} title="Asset" onClick={openAssets}>
        <NavigationIcon section="asset" /><span>Asset</span>
      </button>
      {assetsFirstStepVisible ? (
        <aside
          className="toolbar-assets-callout"
          role="dialog"
          aria-labelledby="assets-first-step-title"
          aria-describedby="assets-first-step-description"
        >
          <span className="toolbar-assets-callout-arrow" aria-hidden="true" />
          <button
            type="button"
            className="toolbar-assets-callout-close"
            aria-label="Close first step tip"
            onClick={dismissAssetsFirstStep}
          >
            ×
          </button>
          <div className="toolbar-assets-callout-icon" aria-hidden="true">
            <AssetsIcon />
            <span>✦</span>
          </div>
          <span className="toolbar-assets-callout-kicker">Start here</span>
          <h1 id="assets-first-step-title">First step: load your content here</h1>
          <p id="assets-first-step-description">
            Add the image or video you want to transform, mask, and map.
          </p>
          <button
            type="button"
            className="primary-button toolbar-assets-callout-cta asset-browser-shine"
            onClick={openAssets}
          >
            <AssetsIcon />
            <span>Open assets</span>
          </button>
        </aside>
      ) : null}

    </div>
    {(['move', 'output', 'workspace'] as const).map(section => {
      const label = section === 'workspace' ? 'Workspace' : section === 'move' ? 'Move' : 'Output';
      return <button key={section} type="button" className="workspace-nav-item" aria-current={activeSection === section ? 'page' : undefined} title={label} data-onboarding-area={section === 'move' ? 'mapping' : undefined} onClick={() => onSelectSection(section)}>
        <NavigationIcon section={section} /><span>{label}</span>
      </button>;
    })}
  </nav>;
}
