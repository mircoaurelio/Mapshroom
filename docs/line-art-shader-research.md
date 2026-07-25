# Line-Art Shader Research

## Input profile

The target artwork is black line work on a mostly white background, with dense contour detail, large negative-space paper regions, and a strong central symmetry. That means the best default effects are the ones that:

- preserve contour readability
- react well to high luminance contrast
- use edges, thresholds, halftone logic, and mild UV warps
- avoid muddy full-frame color washes that bury the drawing

## Recommended default families

These 20 presets were selected as the strongest defaults for this image class:

1. Ink Aura Bloom: halo around dark contours
2. Spectral Contour Split: chromatic edge separation
3. Duotone Relic: ink and paper remap
4. Halftone Temple: print-style dot conversion
5. Crosshatch Shade: procedural etched shading
6. Engraved Emboss: bevel and relief from neighboring luminance
7. Poster Threshold: tonal banding for graphic poster looks
8. Inverted Neon: dark stage with bright line traces
9. Ritual Kaleidoscope: mirrored radial geometry
10. Oracle Ripple: controlled radial waves from the center
11. Noise Mirage: subtle procedural distortion
12. Radial Crown: circular aura around central symbols
13. Pixel Shrine: chunky pixel treatment with contour preservation
14. Scanline Apparition: CRT-like stripe modulation
15. Marble Drift: fluid marbled distortion
16. Monochrome Bleed: analog ink bleed / dilation
17. Solar Outline: warm contour extraction
18. Strobe Contour: rhythmic flashing contour palette
19. Ink Bloom: bloom from the darkest lines
20. Vortex Ink: central twist warp

## Why these fit this artwork

- Edge-aware effects work because the image already contains strong black contour boundaries.
- Threshold, posterize, halftone, and hatch effects work because the background is close to white and the subject lines are naturally separable.
- Glow, aberration, and bloom effects work because dark lines become clean masks for colored treatments.
- Geometry and ripple effects work because the composition is symmetrical and centered.
- Mild displacement effects work better than heavy painterly effects because the original drawing detail should stay legible when projected.

## Source basis

These choices are informed by the following shader references and then adapted specifically for monochrome line art:

- WebGL Fundamentals, image-processing kernels for edge detect, blur, emboss, sharpen:
  [https://webglfundamentals.org/webgl/lessons/webgl-image-processing-continued.html](https://webglfundamentals.org/webgl/lessons/webgl-image-processing-continued.html)
- The Book of Shaders, shaping functions:
  [https://thebookofshaders.com/05/](https://thebookofshaders.com/05/)
- The Book of Shaders, patterns:
  [https://thebookofshaders.com/09/](https://thebookofshaders.com/09/)
- The Book of Shaders, fBM / layered noise:
  [https://thebookofshaders.com/13/](https://thebookofshaders.com/13/)

## Notes

The final preset pack is an inference from those techniques rather than a direct copy of any one tutorial. The goal here is not to ship a generic “shader sampler,” but a line-art-first library that makes projection mapping art immediately usable on black-ink / white-ground source material.
