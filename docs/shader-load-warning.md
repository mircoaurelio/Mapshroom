# Shader load diagnostics and optimization prompts

## Behavior

The editor preview displays a small yellow warning icon when it detects sustained load. Hover, keyboard focus or a click opens the tooltip; Escape closes it. The tooltip identifies the shaders actually being drawn and shows the resolution, frame rate and GPU cost when available. Measurements are a snapshot of the window that triggered the warning, not a live counter.

The chat displays a suggestion above the composer, including in existing conversations. Users can read the prompt before using it. “Use prompt” selects the correct shader and timeline step, enables the focused preview and appends the text to the existing draft. Sending remains an explicit action. The prompt prioritizes equivalent optimizations before visual tradeoffs and preserves colors, detail, transparency, masks, motion, controls, audio and timeline compatibility. All interface copy and generated prompts are in English.

For mixes, the warning reports the total cost. Original sources follow the layers through namespacing, transitions, pinning, manual mixing and compositing, so generated mix code is not confused with an individual shader. The chat lets users choose a component and initially suggests the source with the most actionable code clues, without presenting this as a measured ranking. Changed, removed or compilation-fallback revisions cannot receive prompts based on stale diagnostics.

## Measurements and limitations

- Asynchronous GPU timing: at most five new queries per second in the normal editor and four pending queries. No additional rendering or synchronous GPU waits.
- One second of settling time, followed by windows of at least 1.2 seconds and 12 frames. Two consecutive windows with at least three GPU samples and an 80th percentile above 16.7 ms trigger “High shader load” or “High mix load”.
- Without GPU confirmation, two windows with a mean frame interval above 40 ms trigger “Slow preview”, without blaming the shader.
- Three windows with a mean frame interval below 32 ms and GPU time below 12 ms, when measurable, clear the warning. Changes to code, input, shader identity or resolution, hidden tabs, compilation and context restoration reset sampling.
- Loops, texture sampling calls, noise and math functions are static clues, not proven causes. GLSL comments are excluded. Code analysis does not run in the render loop.
- React receives updates only when the warning state changes. No permanent ratings, telemetry or automatic quality changes. Output, exports and mapping-only previews do not show the warning.

## Shelved precomputed loop experiment

The initial implementation used `e58a980` and was rebased onto `ec1ba57` for release, preserving the latest settings and native image-editor changes. It does not include the loop experiment. In the original local checkout at `C:/Progetti/personal/mapshroom/MapshroomV3`, `SHADER_LOOPS_ENABLED = false` disables initialization and preparation, and the control is hidden. Experiment sources and saved videos remain available for future work. Previous light-preview preferences are not loaded.

## Verification on September 15, 2026

Real editor at `http://127.0.0.1:5199/`, integrated Chromium browser, without forcing warnings:

- Zone Fractal + Hue Scanner with the statue, stress viewport 3200×1800 and actual buffer 1831×1132: approximately **31.4 ms GPU / 23 fps**, with the warning visible. The tooltip identified five loops and five image sampling calls, and the chat displayed the suggestion.
- New Shader + pinned Zone Fractal: approximately **85.9 ms GPU / 14 fps**, with mix diagnostics and both components available. The Zone Fractal prompt opens its timeline step, includes the scope of the mix measurement and does not initiate AI requests.
- Existing draft text is preserved, and Escape closes the tooltip. Switching to New Shader without pinning clears the icon and suggestion. The viewport was restored to 1280×720. No console errors during the test.
- `npm test`: 320 tests passed, including sustained load, isolated spikes, recovery, unavailable GPU timing, very slow shaders, measurement resets and stale diagnostics.
- TypeScript/Vite build succeeded. Targeted lint: zero errors, with existing warnings in the timeline renderer and workspace route.

Release checks after integration: 333 tests passed, the production build and secret scan passed, and the shader catalog compiled successfully for WebGL 2 and eligible WebGL 1 fallbacks. The publication target is the existing Cloudflare Worker at https://mapshroom.dev/.

These are local preview measurements, not performance guarantees for other devices.
