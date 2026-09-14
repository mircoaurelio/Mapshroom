# Static shader previews and studio cleanup

The preset library and shader timeline share static 160 × 96 WebP thumbnails on a fixed sphere/color-swatch image. Changing the stage asset no longer rebuilds thumbnails, and hovering a preset no longer changes or animates the stage. Explicit selection and timeline playback retain their existing behavior.

The packaged catalogue contains 777 presets backed by 763 unique images (1,816,174 bytes total). Identical shader code and effective uniform values share an image. Images load lazily and require no browser shader compilation. A representative frame is rendered at 1.6 seconds during generation; very dark presets retry at 3.2 and 5.6 seconds. WebP quality is 0.68. Regenerate with `npm run generate:thumbnails` after changing bundled presets; this requires Chrome, optionally selected with `CHROME_BIN`.

Custom shaders produce one frame per code/uniform combination on the same swatch. Generation is deferred until a card approaches the visible area, debounced during editing, serialized and shared across cards. Hidden/offscreen requests are deferred or cancelled. A bounded memory/CacheStorage cache holds up to 128 snapshots; the temporary WebGL renderer is released when the queue empties. Disabled storage falls back to session caching. Failed shaders show a deterministic placeholder without a render loop.

The chat has one fixed placeholder and no suggestion tags or input-filling suggestion logic. The left column no longer shows the Shader Studio heading or manual Save control. Code starts collapsed and mounts the editor only when expanded; project autosave remains available.

The release also includes the four-output asset library, faster library thumbnails and preservation of the mapped stage rectangle when replacing an image. Its reference aspect ratio survives project and mapping save/load. Existing automatic-generation preferences are retained, with new preferences initially off. Experimental shader video loops and the local automatic-enable migration are excluded.

Validation: 173 unit tests; ESLint; TypeScript and production build; secret scan; real WebGL2 and supported WebGL1 shader compilation. Browser checks cover desktop/mobile controls, lazy image previews, keyboard favorite/selection behavior, unchanged timeline thumbnails and stage bounds after an asset replacement, and shared custom-shader rendering/cache invalidation. All 777 preset thumbnails generated successfully.
