import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { initAnalytics } from './lib/analytics';

// Route-level code splitting keeps the initial download small; the heavy
// preset library and workspace UI load once the target route is known.
const WorkspaceRoute = lazy(() =>
  import('./routes/WorkspaceRoute').then((module) => ({ default: module.WorkspaceRoute })),
);
const OutputRoute = lazy(() =>
  import('./routes/OutputRoute').then((module) => ({ default: module.OutputRoute })),
);
const DownloadRoute = lazy(() =>
  import('./routes/DownloadRoute').then((module) => ({ default: module.DownloadRoute })),
);
const PrivacyRoute = lazy(() =>
  import('./routes/PrivacyRoute').then((module) => ({ default: module.PrivacyRoute })),
);

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<WorkspaceRoute />} />
          <Route path="/output/:sessionId" element={<OutputRoute />} />
          <Route path="/download" element={<DownloadRoute />} />
          <Route path="/privacy" element={<PrivacyRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <AnalyticsConsentBanner />
    </HashRouter>
  );
}
