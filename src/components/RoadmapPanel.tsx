import { FutureCard } from './FutureCard';
import { PanelSection } from './PanelSection';

export function RoadmapPanel() {
  return (
    <PanelSection title="Release Track" eyebrow="Roadmap">
      <div className="future-grid">
        <FutureCard
          version="V3.1"
          title="Export and Video Gen"
          body="The render/export pipeline and generated-video ingestion stay reserved in the document model and output engine."
        />
        <FutureCard
          version="V3.2"
          title="Timeline"
          body="Timeline hooks already live in the project document and transport layer so sequencing can land without rewriting the renderer."
        />
      </div>
    </PanelSection>
  );
}
