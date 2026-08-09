# Mapshroom V3 · WebGL2 transition todo and evals

## Milestone: official GLSL ES 3.00 shader path

- [x] Make `webgl2` the renderer, preview, preset browser and validation context.
- [x] Keep one documented WebGL1 compatibility adapter for eligible legacy bodies.
- [x] Normalize legacy calls (`texture2D`, `texture2DProj`, `textureCube`) without rewriting comments.
- [x] Migrate the GLSL ES 3.00 reserved identifier `active` together with its uniform values and audio binding.
- [x] Persist `sourceProfile: glsl300` and `minimumTarget` on shaders and shader versions.
- [x] Normalize old local projects during load and canonicalize again during save.
- [x] Normalize project-share payloads during export and import; preserve minimum runtime metadata.
- [x] Export shader bundles as format v2 with shader ABI, source profile and runtime.
- [x] Canonicalize copied code; validate and canonicalize pasted and AI-generated code.
- [x] Require GLSL ES 3.00 / WebGL2 in built-in, API and external-chat prompts.
- [x] Require 3–6 annotated AI uniforms and reject generated shaders without valid slider metadata.
- [x] Mark official presets as GLSL ES 3.00 and distinguish WebGL2-only presets from fallback-compatible presets.

## Milestone: Depth Lab

- [x] Add ten depth-map presets with editable uniforms.
- [x] Give every preset a default audio-reactive binding.
- [x] Demonstrate `textureSize`, `texelFetch`, integer texel coordinates, unsigned bitwise operations and core derivatives.
- [x] Add a bundled ten-step Statue Depth project.
- [x] Add a direct project URL (`#/?project=bundled-webgl2-depth-lab-statue`).
- [x] Add an animated visual-eval grid using the bundled Statue Depth image.

## Automated eval gates

- [x] Type-check the application source independently from deployment tooling.
- [x] Unit-test compiler/profile migration and reserved-name migration.
- [x] Contract-test AI prompts, clipboard, storage, share and shader-bundle export boundaries.
- [x] Catalog-test exactly ten unique, parametrized, audio-reactive WebGL2-only depth shaders.
- [x] Browser smoke-test every official preset on WebGL2.
- [x] Browser smoke-test every eligible preset through the WebGL1 fallback adapter; WebGL2-only presets are explicit skips.
- [x] Browser-render all ten Depth Lab presets on the same depth-map fixture.
- [x] Production build and lint regression check.

## Next incremental refactoring after this milestone

- [ ] Extract project normalization from `WorkspaceRoute` into versioned migration modules (`v3 -> current`).
- [ ] Extract shader commands (apply, save, duplicate, restore version) into a reducer/service with fixture tests.
- [ ] Extract project/share/export serializers behind one `ShaderDocumentCodec`.
- [ ] Move AI job orchestration out of the route and retain the same shader contract at its boundary.
- [ ] Add Resolume and TouchDesigner exporters as separate adapters over the canonical GLSL 300 shader document.
- [ ] Add deterministic image snapshots for a small curated shader set; keep compile/link evals for the full catalog.
