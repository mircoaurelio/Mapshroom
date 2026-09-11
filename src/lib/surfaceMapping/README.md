# Surface mapping

Shared, browser-local processing for Media library → Surfaces & gradients and the standalone Region Lab. The lab re-exports these modules; changes and regression tests exercise the same algorithms used in the application.

- Shape: automatic distance maxima, seeded watershed and region merging.
- Color: compact SLIC-like proposals, adjacency merging and boundary smoothing.
- Optional PiDiNet: the same proposals with learned edge evidence during merging. This is an experimental research option, not a semantic object detector.
- Lighting: per-zone distance, per-zone direction or a continuous direction across the subject. Texture affects shading only; it never changes region IDs.

Analysis defaults to the maximum 960 px on the longest side in a cancellable Web Worker. Photo texture defaults to 100%, and Image & precision starts expanded (and can be collapsed).

A second pass refines the label boundaries using spatial votes and original-photo color guidance. It considers only existing IDs in a narrow boundary band, with bounded color influence to avoid splitting photo texture into new zones. Gradients are interpolated within each zone before applying luminance from the original pixels, preserving detail that the smaller analysis image averaged away. Masks, edges, colored zones and gradients use the same refined labels. Original transparency, including partial alpha, is retained as coverage against the black projection background.

The preview worker prepares this refinement once per analysis at up to 2048 px / 3 MP, then reuses it for lighting changes. It also sends its label map once for accurate click selection. The preview queue allows one active render and replaces pending work with the latest settings; obsolete replies never paint over a newer selection. Dropdowns use the app's themed in-page menus with keyboard navigation and viewport-aware positioning. PNG creation runs the same refinement and rendering in another worker at the source dimensions (up to 24 MP). Export and preview can differ slightly when their resolution differs. Refinement improves sampling and texture detail, not semantic accuracy: it cannot repair an incorrectly identified object or recover details absent from the source photo.

The main UI saves a new PNG through the existing asset storage and selects it in the library. It never replaces the source. Shape and Color fetch no model/runtime assets. Static `new URL` references bundle the optional CNN files for both Vite entrypoints and subpath builds; fetching happens only when CNN is selected.

## Optional assets and attribution

PiDiNet ONNX: https://huggingface.co/bdck/PiDiNet_ONNX/tree/6b3f899da74e697a7d2c2e7cba10cfce057d6e55

PiDiNet original authors: Zhuo Su et al., https://github.com/hellozhuo/pidinet (ICCV 2021). The upstream license restricts use to research and requests contacting the authors for commercial use. See `assets/models/PIDINET-LICENSE.txt`; the conversion's MIT metadata is not treated as clearing this restriction.

Full weights plus graph: 3,025,562 bytes. Tiny (Region Lab): 393,650 bytes. ONNX Runtime Web: `1.22.0-dev.20250409-89f8206ba4`, single-threaded WASM, MIT. Runtime modules plus WASM: 11,202,271 bytes. See `assets/vendor/ONNX-RUNTIME-LICENSE.txt`.

Run `npm run test:regions`, `npm run build:regions` and `npm run build:desktop` to check the shared engine and both entrypoints. User-provided sample photos remain exclusive to the standalone lab.
