import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StageRenderer } from '../components/StageRenderer';
import { parseUniforms } from '../lib/shader';
import { createSessionSync } from '../lib/sessionSync';
import { loadProjectDocument } from '../lib/storage';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import type { ProjectDocument } from '../types';

export function OutputRoute() {
  const { sessionId = '' } = useParams();
  const storedProject = useMemo(
    () => (sessionId ? loadProjectDocument(sessionId) : null),
    [sessionId],
  );
  const [liveProject, setLiveProject] = useState<ProjectDocument | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const sync = createSessionSync(sessionId, (incomingProject) => {
      setLiveProject(incomingProject);
    });

    return () => sync.destroy();
  }, [sessionId]);

  const project = liveProject?.sessionId === sessionId ? liveProject : storedProject;

  const activeAsset = useMemo(() => {
    if (!project) {
      return null;
    }

    const activeId = project.playback.activeAssetId || project.library.activeAssetId;
    return project.library.assets.find((asset) => asset.id === activeId) ?? null;
  }, [project]);

  const activeAssetUrl = useAssetObjectUrl(activeAsset);
  const uniformDefinitions = useMemo(
    () => (project ? parseUniforms(project.studio.activeShaderCode) : {}),
    [project],
  );

  if (!project) {
    return (
      <div className="output-waiting-screen">
        <div className="output-waiting-card">
          <span className="panel-eyebrow">Output</span>
          <h1>Waiting for a live session</h1>
          <p>Open the desktop workspace and launch the dedicated output window again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="output-route">
      <StageRenderer
        asset={activeAsset}
        assetUrl={activeAssetUrl}
        shaderCode={project.studio.activeShaderCode}
        uniformDefinitions={uniformDefinitions}
        uniformValues={project.studio.uniformValues}
        stageTransform={project.mapping.stageTransform}
        transport={project.playback.transport}
        isOutputOnly
      />
    </div>
  );
}
