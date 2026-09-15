/** Two views of the same setup: the phone lens replaces the projector lens. */
export function ProjectorPhotoDiagram() {
  return <figure className="asset-photo-camera-scheme">
    <svg viewBox="0 0 300 215" role="img" aria-label="First mark the projector lens position. Then move the projector aside and put the phone camera lens in that exact position, aimed at the same surface.">
      <rect className="photo-scheme-panel" x=".75" y=".75" width="298.5" height="213.5" rx="10" />
      <g className="photo-scheme-label">
        <text x="15" y="24">1 · PROJECTOR</text>
        <text x="270" y="24" textAnchor="middle">SURFACE</text>
        <text x="15" y="127">2 · PHONE IN THE SAME POSITION</text>
      </g>
      <g className="photo-scheme-beam">
        <path d="M86 68 260 39V96Z" />
        <path d="M86 172 260 143V200Z" />
      </g>
      <g className="photo-scheme-ray">
        <path d="M86 68 260 39M86 68 260 96M86 172 260 143M86 172 260 200" />
        <path className="photo-scheme-axis" d="M86 68H260M86 172H260" />
      </g>
      <g className="photo-scheme-target">
        <rect x="260" y="33" width="20" height="68" rx="2" />
        <rect x="260" y="137" width="20" height="68" rx="2" />
        <path d="M266 41h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8M266 145h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8m-8 9h8" />
      </g>
      <g className="photo-scheme-projector">
        <rect x="25" y="53" width="53" height="31" rx="5" />
        <path d="M78 61h8v14h-8M34 61h19m-19 6h14m-14 6h14M40 85v7m24-7v7" />
        <circle cx="65" cy="63" r="2" />
      </g>
      <g className="photo-scheme-phone">
        <rect x="76" y="160" width="28" height="44" rx="5" />
        <rect x="80" y="164" width="12" height="16" rx="3" />
        <circle cx="86" cy="172" r="3" />
        <path d="M86 198h8" />
      </g>
      <g className="photo-scheme-lens">
        <circle cx="86" cy="68" r="3" /><circle cx="86" cy="172" r="3" />
        <circle className="photo-scheme-lens-ring" cx="86" cy="68" r="8" /><circle className="photo-scheme-lens-ring" cx="86" cy="172" r="8" />
      </g>
      <text className="photo-scheme-caption" x="129" y="86">Lens position</text>
      <text className="photo-scheme-caption" x="129" y="190">Same lens position</text>
    </svg>
  </figure>;
}
