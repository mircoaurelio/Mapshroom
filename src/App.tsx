import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { BootScreenController } from './components/BootScreenController';
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
const TutorialRoute = lazy(() =>
  import('./routes/TutorialRoute').then((module) => ({ default: module.TutorialRoute })),
);
const WhyRoute = lazy(() =>
  import('./routes/WhyRoute').then((module) => ({ default: module.WhyRoute })),
);
const ShaderRoute = lazy(() =>
  import('./routes/ShaderRoute').then((module) => ({ default: module.ShaderRoute })),
);
const CreatorChallengeRoute = lazy(() =>
  import('./routes/CreatorChallengeRoute').then((module) => ({
    default: module.CreatorChallengeRoute,
  })),
);

const PUBLIC_ROUTE_PATHS: Record<string, string> = {
  '/tutorial': '/tutorial/',
  '/why': '/why/',
  '/shader': '/shader/',
  '/creatorchallenge': '/creatorchallenge/',
};

function CanonicalRouteUrl() {
  const location = useLocation();

  useEffect(() => {
    const pathname = PUBLIC_ROUTE_PATHS[location.pathname] ?? '/';
    if (location.pathname === '/shader') {
      const cleanUrl = `${pathname}${location.search}`;
      if (
        window.location.pathname !== pathname ||
        window.location.search !== location.search ||
        window.location.hash
      ) {
        window.history.replaceState(window.history.state, '', cleanUrl);
      }
      return;
    }

    const hash = `#${location.pathname}${location.search}`;
    if (window.location.pathname === pathname && window.location.hash === hash) {
      return;
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${pathname}${hash}`,
    );
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <HashRouter>
      <CanonicalRouteUrl />
      <BootScreenController />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<WorkspaceRoute />} />
          <Route path="/output/:sessionId" element={<OutputRoute />} />
          <Route path="/download" element={<DownloadRoute />} />
          <Route path="/privacy" element={<PrivacyRoute />} />
          <Route path="/tutorial" element={<TutorialRoute />} />
          <Route path="/why" element={<WhyRoute />} />
          <Route path="/shader" element={<ShaderRoute />} />
          <Route path="/creatorchallenge" element={<CreatorChallengeRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <AnalyticsConsentBanner />
    </HashRouter>
  );
}
