# Shader handoff, projection entry and Double

## Behavior

- **Open in Workspace** creates a linked, editable timeline step for the chosen library shader and focuses it immediately. It uses the same insertion path as the preset browser, retaining parameters, history and assigned media. Existing steps stay in place. The selection also works while the separate Output window is open and survives a reload.
- **Move / Output entry** sizes the canvas synchronously when the media texture becomes ready. The projection preview measures its container before paint. Timeline media waits for the decoded dimensions used by its input-fit uniforms, so a portrait or landscape image cannot first appear with a square fit.
- **Double** is available beside Sequence and Random, and persists through project normalization. Two independently shuffled flows are composed through complementary, moving organic masks. Each stream compiles independently (at most its current/next shader pair), retaining its own textures, overlays, uniforms and audio bindings. Hidden regions skip the shader body. The renderer no longer builds or preloads four-shader cross-products. The masks add up to full coverage, including their soft edges.

Double can still be demanding with expensive individual shaders. These changes reduce shader program size, repeated compilation and work in hidden regions; no hardware-independent frame-rate guarantee is claimed.

## Validation

- Unit suite, production TypeScript/Vite build, secret scan and shader catalog compilation for WebGL 2 / eligible WebGL 1.
- `tests/browser/projection-entry.html`: 8 checks. Checks every painted frame from a cold Move/Output mount for portrait, square and landscape media (no settling period), then verifies Double's full brightness and complementary red/blue masks at pixel level. The initial test caught the old 1:1 input-fit frame in Output.
- `tests/browser/stage-aspect.html`: 29 geometry checks covering preserved frames, replacement, resize, per-step input, overlay, pin, Double and Double transitions.
- Manual browser checks: direct library card → Workspace without selecting first; the same action while Output is open; full Double playback with the sample statue; Move and Output navigation; save/reload retains Double and the chosen timeline shader.

Run browser fixtures through `npm exec vite -- --config vite.shader-test.config.ts`, then open the HTML paths above. Each reports its results in the page and sets `body[data-status="ok"]` on success.

## Follow-up: gradual Double playback

Double's live compilation gate was checking the unmasked transition code, while its preload queue compiled the masked code. The gate therefore held the outgoing shader throughout the mix and cut at the next step. It now checks the actual masked program. Mix progress is also isolated per stream, preventing the two independently shuffled streams from resetting each other's progress when they encounter the same shader pair.

Both streams now share the transport clock and the Clip / Mix T durations, so two incoming shaders fade in while two outgoing shaders fade out. The former 1.35x secondary clock no longer shortens one mix. At a shuffled loop boundary, the transition targets the actual first shader of the upcoming cycle, avoiding a last-frame switch to another shader.

`tests/browser/double-live-mix.html` drives the real WebGL renderer with live playback enabled through 20 deterministic transport positions. It compares the output to an independently assembled reference with two simultaneous shader pairs, including intermediate fades and loop boundaries. It failed at the first intermediate mix sample before the correction and passes afterward. The original geometry fixtures did not cover the live compilation gate.
