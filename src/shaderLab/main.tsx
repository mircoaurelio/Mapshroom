import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShaderLabApp } from './ShaderLabApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShaderLabApp />
  </StrictMode>,
);
