import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { captureInstallPrompt } from './lib/pwaInstall';
import './index.css';

captureInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
