import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TimelineStageRenderer } from '../components/TimelineStageRenderer';
import { createSessionSync } from '../lib/sessionSync';
import { loadProjectDocument } from '../lib/storage';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import type { ProjectDocument } from '../types';

const FALLBACK_TIMELINE_STUB = {
  enabled: false,
  durationSeconds: 180,
  markers: [],
  tracks: [],
  shaderSequence: {
    enabled: false,
    mode: 'sequence',
    editorView: 'simple',
    stagePreviewMode: 'timeline',
    focusedStepId: null,
    pinnedStepId: null,
    singleStepLoopEnabled: false,
    randomChoiceEnabled: false,
    sharedTransitionEnabled: false,
    sharedTransitionEffect: 'mix',
    sharedTransitionDurationSeconds: 0.75,
    steps: [],
  },
} as const;

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

  const activeAssetResolution = useAssetObjectUrl(activeAsset);
  const activeAssetUrl = activeAssetResolution.url;

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
      <TimelineStageRenderer
        asset={activeAsset}
        assetUrl={activeAssetUrl}
        assetUrlStatus={activeAssetResolution.status}
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline?.stub ?? FALLBACK_TIMELINE_STUB}
        stageTransform={project.mapping.stageTransform}
        transport={project.playback.transport}
        isOutputOnly
      />
    </div>
  );
}
