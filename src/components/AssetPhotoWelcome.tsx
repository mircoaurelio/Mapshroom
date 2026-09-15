import type { ReactNode } from 'react';
import { ProjectorPhotoDiagram } from './ProjectorPhotoDiagram';
import { defaultVariantKinds, variantOptions } from '../lib/assetVariants';
import './AssetPhotoWelcome.css';

type PhotoIconName = 'upload' | 'front' | 'light' | 'clear' | 'image' | 'folder' | 'check';

function PhotoIcon({ name }: { name: PhotoIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'upload' ? <><path d="M12 16V3m-5 5 5-5 5 5M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" /></> :
      name === 'front' ? <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></> :
      name === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> :
      name === 'clear' ? <><path d="M3 8V4h4m10 0h4v4M3 16v4h4m10 0h4v-4" /><path d="m8 13 3 3 5-7" /></> :
      name === 'folder' ? <path d="M3 6h7l2 2h9v12H3V6Zm0 0V4h7l2 2" /> :
      name === 'check' ? <path d="m5 12 4 4L19 6" /> :
      <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 17 6-6 4 4 3-3 5 5" /><circle cx="16" cy="8" r="1" /></>}
  </svg>;
}

export function AssetPhotoWelcome({ importing, onChoosePhoto, onPasteImage, onOpenProject, generationOptions, automaticGeneration = true }: {
  importing: boolean;
  onChoosePhoto: () => void;
  onPasteImage: () => void;
  onOpenProject: () => void;
  generationOptions?: ReactNode;
  automaticGeneration?: boolean;
}) {
  return <div className="asset-photo-welcome">
    <div className="asset-photo-intro">
      <ol className="asset-photo-steps" aria-label="Set up your surface">
        <li aria-current="step"><span>1</span>Photo</li>
        <li><span>2</span>Analysis</li>
        <li><span>3</span>Effects</li>
      </ol>
      <button className="ghost-button asset-photo-open" type="button" onClick={onOpenProject}><PhotoIcon name="folder" />Open project</button>
    </div>
    <div className="asset-photo-layout">
      <section className="asset-photo-drop" aria-labelledby="asset-photo-title" aria-busy={importing}>
        <div className="asset-photo-frame" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="asset-photo-upload-icon"><PhotoIcon name="upload" /></div>
        <span className="asset-photo-eyebrow">Start with your surface</span>
        <h3 id="asset-photo-title">Upload a photo.<br />Make it your canvas.</h3>
        <p>Take a photo from the same perspective<br className="asset-photo-desktop-break" /> as your projector.</p>
        <button className="primary-button asset-photo-choose" type="button" onClick={onChoosePhoto} disabled={importing}><PhotoIcon name="upload" />{importing ? 'Adding your photo…' : 'Choose a photo'}</button>
        <span className="asset-photo-drop-hint">or drop it here · JPG, PNG, WebP</span>
        <button type="button" className="ghost-button asset-photo-paste" onClick={onPasteImage} disabled={importing}>Paste from clipboard</button>
        <div className="asset-photo-promises"><span><PhotoIcon name="check" />Original preserved</span><span><PhotoIcon name="check" />{automaticGeneration ? 'Versions prepared automatically' : 'Generate versions when you’re ready'}</span></div>
        {generationOptions && <details className="asset-photo-generation-settings"><summary>Generation settings</summary><div className="asset-photo-options">{generationOptions}</div></details>}
      </section>
      <aside className="asset-photo-advice" aria-labelledby="asset-photo-advice-title">
        <span className="asset-photo-eyebrow">A little preparation goes a long way</span>
        <h3 id="asset-photo-advice-title">A good photo</h3>
        <ProjectorPhotoDiagram />
        <ul>
          <li><PhotoIcon name="front" /><div><strong>Same position. Same angle.</strong><p>Move the projector aside. Place your phone’s camera lens where the projector lens was, pointing in the same direction.</p></div></li>
          <li><PhotoIcon name="light" /><div><strong>Evenly lit</strong><p>Keep details visible, without deep shadows or glare.</p></div></li>
          <li><PhotoIcon name="clear" /><div><strong>Nothing in the way</strong><p>Include the whole surface, with nothing in front.</p></div></li>
        </ul>
        <div className="asset-photo-advice-note"><PhotoIcon name="image" /><p>Your photo is the starting point.<br />The effects come next.</p></div>
      </aside>
    </div>
    <section className="asset-photo-next" aria-labelledby="asset-photo-next-title">
      <div><h3 id="asset-photo-next-title">One photo. New possibilities.</h3><p>Your generated versions will appear here after you upload a photo.</p></div>
      <div className="asset-photo-placeholders">{variantOptions.filter(option => defaultVariantKinds.includes(option.id)).map(option => <div key={option.id} className="asset-photo-placeholder"><PhotoIcon name="image" /><span>{option.title}</span><small>Waiting for your photo</small></div>)}</div>
    </section>
  </div>;
}
