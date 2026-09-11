# Surface mapping

Shared, browser-local processing for Media library → Surfaces & gradients and the standalone Region Lab. The lab re-exports these modules; changes and regression tests exercise the same algorithms used in the application.

- Shape: automatic distance maxima, seeded watershed and region merging.
- Color: compact SLIC-like proposals, adjacency merging and boundary smoothing.
- Optional PiDiNet: the same proposals with learned edge evidence during merging. This is an experimental research option, not a semantic object detector.
- Lighting: per-zone distance, per-zone direction or a continuous direction across the subject. Texture affects shading only; it never changes region IDs.

Analysis runs at up to 960 px on the longest side in a cancellable Web Worker. Lighting previews reuse its labels in a separate worker, keeping pixel processing off the UI thread. The preview queue allows one active render and replaces pending work with the latest settings; obsolete replies never paint over a newer selection. Dropdowns use the app's themed in-page menus with keyboard navigation and viewport-aware positioning. PNG creation runs in another worker at the source dimensions (up to 24 MP), clips outputs to original alpha/black pixels, and interpolates gradients only within the same zone. Full-size exports do not imply full-size segmentation precision. Outputs use black outside the subject for projection mapping.

The main UI saves a new PNG through the existing asset storage and selects it in the library. It never replaces the source. Shape and Color fetch no model/runtime assets. Static `new URL` references bundle the optional CNN files for both Vite entrypoints and subpath builds; fetching happens only when CNN is selected.

## Optional assets and attribution

PiDiNet ONNX: https://huggingface.co/bdck/PiDiNet_ONNX/tree/6b3f899da74e697a7d2c2e7cba10cfce057d6e55

PiDiNet original authors: Zhuo Su et al., https://github.com/hellozhuo/pidinet (ICCV 2021). The upstream license restricts use to research and requests contacting the authors for commercial use. See `assets/models/PIDINET-LICENSE.txt`; the conversion's MIT metadata is not treated as clearing this restriction.

Full weights plus graph: 3,025,562 bytes. Tiny (Region Lab): 393,650 bytes. ONNX Runtime Web: `1.22.0-dev.20250409-89f8206ba4`, single-threaded WASM, MIT. Runtime modules plus WASM: 11,202,271 bytes. See `assets/vendor/ONNX-RUNTIME-LICENSE.txt`.

Run `npm run test:regions`, `npm run build:regions` and `npm run build:desktop` to check the shared engine and both entrypoints. User-provided sample photos remain exclusive to the standalone lab.
