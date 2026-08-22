import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackUiClick } from '../lib/analytics';
import { isPwaInstalled, isStandaloneApp, onAppInstalled } from '../lib/pwaInstall';

interface InstallAppButtonProps {
  className?: string;
  onOpenProBeta: () => void;
}

export function InstallAppButton({
  className = '',
  onOpenProBeta,
}: InstallAppButtonProps) {
  const navigate = useNavigate();
  const [installed, setInstalled] = useState(() => isStandaloneApp());

  useEffect(() => {
    let cancelled = false;

    void isPwaInstalled().then((isInstalled) => {
      if (!cancelled) {
        setInstalled(isInstalled);
      }
    });

    const unsubscribeInstalled = onAppInstalled(() => {
      setInstalled(true);
    });

    return () => {
      cancelled = true;
      unsubscribeInstalled();
    };
  }, []);

  const handleInstall = () => {
    if (installed) {
      trackUiClick('open_pro_beta', { source: 'installed_app' });
      onOpenProBeta();
      return;
    }

    trackUiClick('install_app', { dest: 'download' });
    navigate('/download');
  };

  return (
    <div className={`install-app-control ${className}`.trim()}>
      <button
        type="button"
        className={`primary-button install-app-button ${
          installed ? 'install-app-button-installed' : ''
        }`}
        title={
          installed
            ? 'Mapshroom is installed. Click to explore the Pro beta.'
            : 'Download the Windows desktop app'
        }
        onClick={handleInstall}
      >
        <span className="install-app-status-dot" aria-hidden="true">
          {installed ? '✓' : '↓'}
        </span>
        {installed ? 'App installed' : 'Download'}
      </button>
    </div>
  );
}
