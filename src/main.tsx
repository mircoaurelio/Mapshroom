import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { captureInstallPrompt } from './lib/pwaInstall';
import './index.css';

captureInstallPrompt();

registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new Event('mapshroom:offline-ready'));
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
