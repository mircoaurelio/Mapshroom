import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import {
  prepareOfflineAvailability,
  reportOfflineRegistrationError,
} from './lib/offlineAvailability';
import { captureInstallPrompt } from './lib/pwaInstall';
import './index.css';

captureInstallPrompt();

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateServiceWorker(true);
  },
  onOfflineReady() {
    void prepareOfflineAvailability();
  },
  onRegisterError(error) {
    reportOfflineRegistrationError(error);
  },
});

void prepareOfflineAvailability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
