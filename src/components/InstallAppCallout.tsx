import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackUiClick } from '../lib/analytics';
import {
  getDeferredInstallPrompt,
  isPwaInstalled,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';

interface InstallAppButtonProps {
  className?: string;
  onOpenProBeta: () => void;
}

export function InstallAppButton({
  className = '',
  onOpenProBeta,
}: InstallAppButtonProps) {
  const navigate = useNavigate();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [installAvailable, setInstallAvailable] = useState(() =>
    Boolean(getDeferredInstallPrompt()),
  );

  useEffect(() => {
    let cancelled = false;

    void isPwaInstalled().then((isInstalled) => {
      if (!cancelled) {
        setInstalled(isInstalled);
      }
    });

    const unsubscribeAvailable = onInstallAvailable(() => {
      setInstallAvailable(true);
      setInstalled(false);
    });
    const unsubscribeInstalled = onAppInstalled(() => {
      setInstallAvailable(false);
      setInstalled(true);
    });

    return () => {
      cancelled = true;
      unsubscribeAvailable();
      unsubscribeInstalled();
    };
  }, []);

  const handleInstall = async () => {
    if (installed || (await isPwaInstalled())) {
      setInstalled(true);
      trackUiClick('open_pro_beta', { source: 'installed_app' });
      onOpenProBeta();
      return;
    }

    if (!getDeferredInstallPrompt()) {
      navigate('/download');
      return;
    }

    setInstalling(true);
    trackUiClick('install_app');

    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstalled(true);
        setInstallAvailable(false);
        trackUiClick('install_app', { outcome: 'accepted' });
      } else {
        navigate('/download');
      }
    } finally {
      setInstalling(false);
    }
  };

  const buttonLabel = installing
    ? 'Opening installer…'
    : installed
      ? 'App installed'
      : 'Install app';

  return (
    <div className={`install-app-control ${className}`.trim()}>
      <button
        type="button"
        className={`primary-button install-app-button ${
          installed ? 'install-app-button-installed' : ''
        }`}
        disabled={installing}
        title={
          installed
            ? 'Mapshroom is installed. Click to explore the Pro beta.'
            : installAvailable
              ? 'Install Mapshroom'
              : 'Open installation help for this device'
        }
        onClick={() => void handleInstall()}
      >
        <span className="install-app-status-dot" aria-hidden="true">
          {installed ? '✓' : '↓'}
        </span>
        {buttonLabel}
      </button>
    </div>
  );
}
