# Shader preview performance and release integration

This integration restores the editor's 1920×1080 pixel budget, direct canvas animation in the preset catalog, asynchronous deduplicated preview compilation, and bounded optional GPU diagnostics. It preserves the later manual shader-selection fix. Export keeps a fixed render budget. Experimental adaptive quality remains opt-in.

Open `/?performance=1` or `/#/?performance=1` for diagnostics. The canonical URL now retains the outer render options and the stage also reads hash-route options. No project contents or GPU measurements are sent to a server by this diagnostic panel.

The September 14 investigation ran 58 local trials on Intel Graphics using the real renderer and timeline. A large Aliens + Leaves preview ran at 10–11 FPS with the previous 4800×2700 buffer and 54–57 FPS with the capped 1920×1080 buffer. This improvement trades preview resolution for lower GPU cost. Shader costs also depend on image content and parameters: five Aliens ran at 21–24 FPS on a largely non-black source and 60 FPS on the black-backed statue in these tests.

Double remains an unresolved performance issue. Repeated tests produced multi-second stalls, up to about 12 seconds, with nested timeline programs and speculative compilation. This integration does not claim to fix Double or provide a universal 60 FPS guarantee.

The integrated performance and project-persistence release passed 164 tests and a production TypeScript/Vite build. The new runtime-option tests verify both query locations and canonical redirects.
