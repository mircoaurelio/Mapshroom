import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

// Route-level code splitting keeps the initial download small; the heavy
// preset library and workspace UI load once the target route is known.
const WorkspaceRoute = lazy(() =>
  import('./routes/WorkspaceRoute').then((module) => ({ default: module.WorkspaceRoute })),
);
const OutputRoute = lazy(() =>
  import('./routes/OutputRoute').then((module) => ({ default: module.OutputRoute })),
);

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<WorkspaceRoute />} />
          <Route path="/output/:sessionId" element={<OutputRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
