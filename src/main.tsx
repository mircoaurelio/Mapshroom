import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { captureInstallPrompt } from './lib/pwaInstall';
import { installRangePressMotion } from './lib/rangePressMotion';
import './index.css';

captureInstallPrompt();

const disposeRangePressMotion = installRangePressMotion();

if (import.meta.hot) {
  import.meta.hot.dispose(disposeRangePressMotion);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
