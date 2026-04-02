import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OutputRoute } from './routes/OutputRoute';
import { WorkspaceRoute } from './routes/WorkspaceRoute';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<WorkspaceRoute />} />
        <Route path="/output/:sessionId" element={<OutputRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
