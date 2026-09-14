# Compact workspace navigation

Based on main at `e9bc798`, in branch `codex/compact-workspace-sidebar`.

- The desktop rail is 56 px wide. Asset, Move, Output and Workspace use 19 px icons with labels underneath. The active item uses the app accent without a tile border or edge marker. Workspace uses a video/play symbol.
- A vertical divider separates the 56 px rail from the page content. In Workspace the rail occupies only the upper area and the timeline spans the full window width, including in immersive mode. Asset, Move and Output hide the timeline and its resize handle, expanding to the available height.
- The Output icon pulses red while its projection window is open, including while browsing another section. Closing the window restores its normal color. Reduced-motion preferences use a steady red icon.
- Asset reuses the media library as an inline page on desktop. The mobile dialog remains available. Keyboard focus can move between the page and navigation.
- Move exposes the existing mapping controls beside the enlarged preview. Output provides the existing projection-window action and its status. Workspace restores the shader controls and chat. Moving between these desktop sections keeps the stage renderer mounted.
- The header keeps the brand at the far left and File, play/pause and settings on the right. Shader/preset actions and audio input selection are available under File.
- The initial Asset guide follows its new navigation trigger.

## Verification

- Production build and TypeScript passed.
- ESLint on changed TypeScript files: no errors; ten existing hook warnings in WorkspaceRoute.
- All 221 existing tests passed. Secret scan and WebGL 2 / eligible WebGL 1 shader smoke checks passed.
- Browser checks: desktop at 1280 and 1024 px, mobile at 390 px, all four sections, projection-window opening, immersive layout, Asset keyboard navigation and full-width timeline.
- The local preview runs on `http://127.0.0.1:5184/`. The production target is the existing `mapshroom` Cloudflare Worker at `https://mapshroom.dev/`.
