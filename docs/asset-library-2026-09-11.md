# Asset library refresh

Implementation of the approved desktop/mobile media library, prepared for the existing Cloudflare deployment at mapshroom.dev.

- Source assets occupy a large two-column grid. Image and video captions always sit below their previews; thumbnails contain the complete image. Long names wrap to two lines, with the full name retained in the title and accessible text.
- Generated versions have explicit source metadata in the project document. Ready results are available independently; older/manual outputs stay accessible under More versions. Legacy images without source metadata remain ordinary uploads.
- Background, segmentation and depth are selected initially. The Outputs menu adds color/grayscale gradients and edges, with manual single-zone masks in the surfaces editor. Auto-generation is separate, initially off and saved locally; only new uploaded originals trigger it.
- A worker processes one source batch at a time, saving each result before continuing. Surface outputs share analysis/refinement. Completed blobs persist in the existing asset store. Cancellation terminates the worker and keeps completed versions. Opening an editor cancels an active background queue before another processing session starts.
- Segmentation suggestions use border darkness, transparency, green dominance and color variation. These are heuristics, not semantic recognition or a claim of optimal parameters. Adjust opens the existing editor with the suggested method/settings and requested output selected.
- Desktop: up to 24 MP output, ORMBG q8 for general backgrounds, Depth Anything V2 Small q8 for depth. Existing alpha and connected dark-background extraction avoid AI when applicable. The source photo's RGB guides depth; output alpha is applied afterwards.
- Mobile: up to 3 MP / 2048 px working outputs, 640 px zone analysis. AI is initially off and can be tried manually on supported devices; automatic mobile imports never start AI. Low-memory/unsupported profiles cannot enable AI. The original file is retained, and generated dimensions appear when selected. The older mask editor receives a smaller mobile working copy and opens without automatic AI removal.
- Library thumbnails are decoded sequentially, reduced to 384 px, reused while open and released on close/removal. The main stage's existing URL cache is separate and unchanged.

Validation: full unit suite, TypeScript/production build, secret scan, real browser generation and project reload. Isolated browser checks covered grouped saves, compare, cancellation, non-recursive automatic imports, mixed proportions and widths 320–1024 px. The real ORMBG and depth pipelines were exercised. Mobile layout/profile checks used browser emulation: the iPhone 15 Pro Max crash still requires testing on the physical device.

Known limits: segmentation remains heuristic and can merge neighboring features. Single-zone masks require selecting a zone. Adjust is disabled while the queue is active to avoid simultaneous editors/models. A browser/WebKit process kill cannot be recovered inside the terminated page; the next load reports interrupted processing and retains previously saved outputs.

## Approved compact layout

The asset grid takes most of the desktop dialog, with generated versions in one narrow column on the right. There is no persistent duplicate original preview. Expand opens a contained large preview with comparison/download and dimensions; the information button also reveals metadata on demand. Ready is a small check next to each output title. Use and Adjust overlay the preview on hover or keyboard focus, and stay visible on touch devices. Empty and processing outputs keep Create/Cancel accessible. The footer retains the separate auto-generate preference and the mapping actions.

Phones stack the asset grid and a two-column output grid in one scrollable body; the footer remains available. Browser checks of this layout at 1366×900 and 390×844 covered asset proportions, captions below images, expansion, metadata, background generation, hover/focus/touch actions, comparison and renaming. Desktop and mobile checks of the actual workspace also verified saved depth editing. Unit tests (145), secret scan, shader compilation and the production build passed.

## Reopen saved depth maps

Depth Adjust passes the saved depth asset to the editor and retains the original photo separately for comparison or explicit regeneration. Opening initializes the editable field from the saved raster with neutral adjustments, preserving the initial appearance and alpha without inference or autosaving. Save depth changes updates the same asset ID, name and source grouping. New inference remains an explicit Regenerate action; it is disabled if the original is missing. RGB exports retain their exact raster at neutral settings; further adjustments recover the approximate field from the editor's color palette. Mobile editing retains the existing working-copy limits.

Regression checks cover pixel/alpha preservation, neutral controls, existing result identity, RGB reopening and missing-original behavior. A browser test of the actual WorkspaceRoute opens a stored depth map, changes it, saves it, verifies there is one updated version and reopens the saved changes with zero model requests.
