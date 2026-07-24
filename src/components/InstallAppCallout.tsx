import { useEffect, useState } from 'react';
import { trackUiClick } from '../lib/analytics';
import {
  getOfflineAvailability,
  onOfflineAvailabilityChange,
  prepareOfflineAvailability,
  type OfflineAvailabilitySnapshot,
} from '../lib/offlineAvailability';
import {
  getDeferredInstallPrompt,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';

type InstallPlatform = 'ios' | 'android' | 'desktop';

interface InstallAppButtonProps {
  className?: string;
}

function detectInstallPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

function getManualInstallCopy(platform: InstallPlatform): {
  title: string;
  body: string;
} {
  if (platform === 'ios') {
    return {
      title: 'Install Mapshroom on this device',
      body: 'In Safari, tap Share, choose Add to Home Screen, enable Open as Web App, then tap Add.',
    };
  }

  if (platform === 'android') {
    return {
      title: 'Use the browser install command',
      body: 'Open the browser menu and choose Install app or Add to Home screen.',
    };
  }

  return {
    title: 'Use the browser install command',
    body: 'Use the install icon in the address bar. If it is not visible yet, reload Mapshroom once while online.',
  };
}

export function InstallAppButton({ className = '' }: InstallAppButtonProps) {
  const [offlineAvailability, setOfflineAvailability] =
    useState<OfflineAvailabilitySnapshot>(() => getOfflineAvailability());
  const [installAvailable, setInstallAvailable] = useState(() =>
    Boolean(getDeferredInstallPrompt()),
  );
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [manualHelpVisible, setManualHelpVisible] = useState(false);
  const [platform] = useState<InstallPlatform>(() => detectInstallPlatform());
  const manualCopy = getManualInstallCopy(platform);

  useEffect(() => {
    const unsubscribeOffline = onOfflineAvailabilityChange(setOfflineAvailability);
    const unsubscribeAvailable = onInstallAvailable(() => {
      setInstallAvailable(true);
      setManualHelpVisible(false);
    });
    const unsubscribeInstalled = onAppInstalled(() => {
      setInstalled(true);
      setManualHelpVisible(false);
    });

    void prepareOfflineAvailability();

    return () => {
      unsubscribeOffline();
      unsubscribeAvailable();
      unsubscribeInstalled();
    };
  }, []);

  const handleInstall = async () => {
    if (offlineAvailability.status === 'error') {
      setManualHelpVisible(false);
      void prepareOfflineAvailability({ forceUpdate: true });
      return;
    }

    if (offlineAvailability.status !== 'ready') {
      return;
    }

    if (!getDeferredInstallPrompt()) {
      setManualHelpVisible(true);
      return;
    }

    setInstalling(true);
    trackUiClick('install_offline');

    try {
      const outcome = await promptInstall();

      if (outcome === 'accepted') {
        setInstalled(true);
        trackUiClick('install_offline', { outcome: 'accepted' });
      } else {
        setInstallAvailable(false);
        setManualHelpVisible(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (
    installed ||
    isStandaloneApp() ||
    offlineAvailability.status === 'unsupported'
  ) {
    return null;
  }

  const preparing =
    offlineAvailability.status === 'checking' ||
    offlineAvailability.status === 'preparing';
  const buttonLabel = installing
    ? 'Opening installer…'
    : preparing
      ? 'Preparing offline…'
      : offlineAvailability.status === 'error'
        ? 'Retry offline setup'
        : 'Install app';

  return (
    <div className={`install-app-control ${className}`.trim()}>
      <button
        type="button"
        className={`primary-button install-app-button install-app-button-${offlineAvailability.status}`}
        disabled={preparing || installing}
        title={offlineAvailability.message}
        aria-expanded={manualHelpVisible}
        onClick={() => void handleInstall()}
      >
        <span className="install-app-status-dot" aria-hidden="true" />
        {buttonLabel}
      </button>

      {manualHelpVisible ? (
        <aside
          className="install-app-manual-help"
          role="dialog"
          aria-label={manualCopy.title}
        >
          <strong>{manualCopy.title}</strong>
          <p>{manualCopy.body}</p>
          {!installAvailable ? (
            <small>Mapshroom is already ready for offline use on this browser.</small>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setManualHelpVisible(false)}
          >
            Close
          </button>
        </aside>
      ) : null}
    </div>
  );
}
