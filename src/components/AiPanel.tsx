import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AiGenerationRoute } from '../lib/aiRoute';
import { PanelSection } from './PanelSection';

const SHADER_PROMPT_PLACEHOLDERS = [
  'Morph slow chrome waves into the depth map, affect only non-black pixels, keep pure black unchanged, and add depth, threshold, speed, center X/Y/Z, and gloss controls',
  'Fill green regions with repeating glossy 3D bulb-eyes, preserve every other color, and add hue tolerance, eye size, spacing, blink speed, iris color, and light X/Y/Z controls',
  'Use the current grayscale image as a depth map to morph animated contour lines around its relief; affect only non-black pixels and expose depth, spacing, thickness, speed, and two colors',
  'Turn red regions into molten veins that branch toward bright areas, leave all other colors untouched, and add hue tolerance, heat, crack scale, flow speed, glow, and blend controls',
  'Morph a moving spotlight into the depth map so it follows the surface relief, affect only non-black pixels, and add light X/Y/Z, depth strength, ambient light, gloss, and shadow softness',
  'Detect the subject silhouette and draw two animated rims around it, using separate inner and outer colors plus controls for width, softness, travel speed, glow, and background blend',
  'Treat luminance as a depth map and morph horizontal scanlines around the raised surface; affect only non-black pixels and add relief, line density, distortion, speed, contrast, and color controls',
  'Send warm colors outward and cool colors inward from a movable center, preserving the source between waves and exposing center X/Y, radius, speed, softness, distortion, and effect mix',
  'Morph liquid-metal reflections into the depth map, affect only non-black pixels, preserve transparency, and add depth, reflection scale, speed, light X/Y/Z, contrast, and brightness controls',
  'Build a perspective grid aimed at a movable vanishing point, bend its intersections with source luminance, and add vanishing X/Y, perspective depth, spacing, line width, speed, and glow controls',
  'Read the image as a depth map and morph near, middle, and far regions into different moving color bands; affect only non-black pixels and expose depth thresholds, softness, speed, and palette controls',
  'Replace a selected color range with rounded animated pixel cells, preserve colors outside the mask, and add target color, tolerance, cell size, roundness, spacing, pulse speed, and blend controls',
  'Morph a seamless radial pulse into the depth map so deeper areas respond later, affect only non-black pixels, and add loop duration, depth delay, center X/Y/Z, wave width, speed, and glow controls',
  'Grow procedural vines from the silhouette toward bright pixels, keep the source visible beneath them, and expose branch density, thickness, growth speed, curl, glow, seed, and vine color controls',
  'Use the depth map to morph a chrome relief that changes from flat to deeply sculpted; affect only non-black pixels and add morph amount, depth, light X/Y/Z, gloss, threshold, and blend controls',
  'Turn bright regions into floating 3D spheres whose size follows luminance, preserve darker regions, and add brightness threshold, sphere size, spacing, depth, rotation speed, light position, and color',
  'Morph soft bioluminescent skin into the depth map, affect only non-black pixels, and expose relief strength, pulse speed, edge glow, threshold softness, base color, highlight color, and brightness',
  'Convert strong image edges into moving electric dashes while preserving the interior, with controls for sensitivity, dash length, gap, thickness, direction, speed variation, glow, and two colors',
  'Morph animated elevation rings into the depth map and let each ring follow the relief; affect only non-black pixels and add depth, spacing, width, travel speed, center X/Y, and contour color',
  'Cover the visible subject with hexagonal tiles that tilt at different times, preserve transparency, and add cell size, border width, depth, delay randomness, rotation speed, light X/Y/Z, and color',
  'Treat the grayscale texture as a depth map and morph colored fog into its distant areas; affect only non-black pixels and expose depth threshold, fog density, movement speed, softness, tint, and blend',
  'Create a deterministic seamless loop where noisy regions move at different speeds and directions, with controls for seed, loop seconds, region scale, delay range, speed variation, intensity, and pause',
  'Morph an iridescent oil-slick reflection into the depth map, affect only non-black pixels, and add depth influence, color frequency, distortion scale, motion speed, gloss, threshold, and effect blend',
  'Transform only blue regions into moving water caustics, keep the remaining image unchanged, and expose hue tolerance, ripple scale, refraction, travel direction, speed, highlights, and mask softness',
  'Morph a crystalline frost pattern into the depth map so raised details freeze first, affect only non-black pixels, and add depth sensitivity, crystal scale, growth speed, refraction, edge glow, and tint',
  'Split strong edges into offset red, green, and blue echoes, animate the offsets in a seamless loop, and add channel distance, edge threshold, line softness, pulse speed, brightness, and blend controls',
  'Use the current texture as a depth map and morph pixel blocks from shallow to extruded relief; affect only non-black pixels and expose block size, depth, spacing, rotation, speed, light X/Y/Z, and contrast',
  'Turn low-saturation regions into drifting colored fog while preserving vivid colors, with controls for saturation threshold, noise scale, direction, speed, opacity, edge softness, and two fog colors',
  'Morph a virtual light sweep into the depth map so it wraps around the surface, affect only non-black pixels, and add depth, start X/Y, end X/Y, light Z, width, softness, speed, and light color',
  'Rebuild the subject as breathing halftone dots whose size follows luminance, preserving the original alpha and exposing dot scale, minimum size, maximum size, spacing, pulse speed, and two colors',
  'Morph a rotating tunnel into the depth map and let its radius react to surface height; affect only non-black pixels and add depth, center X/Y/Z, radius, twist, speed, threshold, and glow controls',
  'Apply glossy plasma only to pixels darker than a controllable threshold, preserve brighter details, and expose mask softness, plasma scale, flow direction, speed, glow, color, and source blend',
  'Use luminance as a depth map to morph mirrored waves across the relief without mirroring the source; affect only non-black pixels and add depth, symmetry axis, center X/Y, speed, width, and color controls',
  'Transform the visible subject into animated Voronoi stained glass, keep the background untouched, and add cell scale, border width, refraction, distortion speed, light direction, palette, and source mix',
  'Morph a field of glossy 3D droplets into the depth map so their size follows relief, affect only non-black pixels, and add depth, droplet scale, spacing, wobble, gloss, light X/Y/Z, and tint controls',
  'Make a scanner travel forward and backward with smooth acceleration, selecting only a chosen luminance range and exposing range width, scan width, softness, speed, easing, color, and trail glow',
  'Morph animated marble veins into the depth map so they wrap around raised details, affect only non-black pixels, and expose depth, vein scale, turbulence, flow speed, stone color, vein color, and gloss',
  'Fold only the subject into a rotating kaleidoscope while leaving the background unchanged, with controls for segment count, center X/Y, rotation speed, zoom, distortion, edge feathering, and blend',
  'Morph a soft halo into the depth map and delay it by distance from the effect center; affect only non-black pixels and add depth, center X/Y/Z, radius, delay, softness, pulse speed, and halo color',
  'Turn highlights into moving holographic foil while shadows retain the original image, and add highlight threshold, rainbow density, direction, speed, gloss, flicker, mask softness, and effect blend',
  'Use the grayscale input as a depth map and morph topographic light bands over its surface; affect only non-black pixels and expose depth, band count, width, travel speed, light X/Y/Z, and two colors',
  'Break the subject into mosaic tiles that flip at different times, preserve its silhouette and alpha, and add tile size, flip depth, delay randomness, rotation direction, speed, shadow strength, and tint',
  'Morph a faceted crystal surface into the depth map and make raised areas catch the light first; affect only non-black pixels and add depth, facet scale, light X/Y/Z, rotation, refraction, and brightness',
  'Reveal the image with moving light rays that inherit each source pixel color, preserve unlit regions, and expose ray angle, width, density, speed, softness, color influence, brightness, and blend',
  'Morph a field of soft metaballs into the depth map so they merge across the relief, affect only non-black pixels, and add depth, blob scale, count, softness, speed, threshold, two colors, and light Z',
  'Push grid intersections away from two movable centers and let both centers orbit independently, with controls for center A X/Y, center B X/Y, force, radius, damping, grid spacing, speed, and glow',
  'Morph a projector-safe neon relief into the depth map, affect only non-black pixels, preserve alpha and pure black, and add depth, threshold softness, glow, maximum brightness, gamma, speed, and color',
  'Apply an aged metallic patina that spreads from dark edges toward brighter regions, preserving the source beneath it and exposing growth speed, noise scale, edge attraction, metal color, patina color, and blend',
  'Use the depth map to morph concentric 3D rings out of the surface, affect only non-black pixels, and add depth, center X/Y/Z, ring spacing, height, sequence delay, rotation, speed, glow, and brightness limit',
  'Create a lightweight projection shader that keeps circles aspect-correct, animates a color-selective radial wave, preserves alpha, and exposes target color, tolerance, center X/Y, scale, speed, glow, and output limit',
] as const;

const PROMPT_ROTATION_INTERVAL_MS = 8_000;

const AI_ROUTE_OPTIONS: Array<{
  value: AiGenerationRoute;
  label: string;
  note: string;
  mark: string;
  icon?: string;
}> = [
  { value: 'chatgpt', label: 'ChatGPT', note: 'Free handoff', mark: 'G', icon: 'chatgpt.svg' },
  {
    value: 'perplexity',
    label: 'Perplexity',
    note: 'Free handoff',
    mark: 'P',
    icon: 'perplexity.svg',
  },
  { value: 'local', label: 'Local model', note: 'Runs on device', mark: 'L' },
  { value: 'api', label: 'API', note: 'Use your key', mark: 'API' },
];

type WordChoice = {
  id: string;
  label: string;
  prompt: string;
};

type EffectChoice = WordChoice & {
  motions: WordChoice[];
  targetIds: readonly string[];
};

type TargetChoice = WordChoice & {
  finishIds: readonly string[];
};

const WORD_EFFECTS: EffectChoice[] = [
  {
    id: 'liquid-metal',
    label: 'Liquid metal',
    prompt:
      'Transform the source into a reflective liquid-metal surface with smooth warped reflections and physically convincing highlights.',
    targetIds: ['whole-image', 'subject-only', 'bright-areas', 'dark-areas', 'color-range', 'depth-bands'],
    motions: [
      {
        id: 'flowing',
        label: 'Flowing',
        prompt: 'Animate the effect with a slow directional flow and a continuous seamless cycle.',
      },
      {
        id: 'rippling',
        label: 'Rippling',
        prompt: 'Send soft concentric ripples through the material with controllable speed, width, and strength.',
      },
      {
        id: 'melting',
        label: 'Melting',
        prompt: 'Make the material continuously melt and reform with smooth, gravity-like distortion.',
      },
      {
        id: 'swirling-metal',
        label: 'Swirling',
        prompt: 'Swirl the liquid metal around a movable center with adjustable radius, speed, and turbulence.',
      },
      {
        id: 'dripping-metal',
        label: 'Dripping',
        prompt: 'Pull the metal downward in rounded animated drips while keeping the motion seamless and controllable.',
      },
      {
        id: 'magnetic-metal',
        label: 'Magnetic',
        prompt: 'Draw the metal toward animated magnetic points with adjustable attraction, falloff, and orbit speed.',
      },
    ],
  },
  {
    id: 'neon-aura',
    label: 'Neon aura',
    prompt:
      'Wrap the source in a layered neon aura with clean emissive color separation and controlled bloom.',
    targetIds: ['whole-image', 'subject-only', 'bright-areas', 'dark-areas', 'image-edges', 'silhouette'],
    motions: [
      {
        id: 'pulsing',
        label: 'Pulsing',
        prompt: 'Pulse the glow rhythmically while keeping the brightness transition soft and stable.',
      },
      {
        id: 'travelling',
        label: 'Travelling',
        prompt: 'Move the illumination across the surface as a continuous travelling light front.',
      },
      {
        id: 'flickering',
        label: 'Flickering',
        prompt: 'Add a gentle organic flicker with controllable frequency, variation, and minimum brightness.',
      },
      {
        id: 'neon-chasing',
        label: 'Chasing',
        prompt: 'Send bright neon segments chasing around the source edges with adjustable length, speed, and spacing.',
      },
      {
        id: 'neon-shimmering',
        label: 'Shimmering',
        prompt: 'Make the aura shimmer smoothly with layered frequencies while avoiding harsh brightness jumps.',
      },
      {
        id: 'neon-waving',
        label: 'Waving',
        prompt: 'Bend the neon layers into slow travelling waves with controllable amplitude, direction, and phase.',
      },
    ],
  },
  {
    id: 'pixel-relief',
    label: 'Pixel relief',
    prompt:
      'Rebuild the source as an extruded pixel relief whose cell height follows image luminance.',
    targetIds: ['whole-image', 'subject-only', 'bright-areas', 'depth-bands', 'center-region', 'silhouette'],
    motions: [
      {
        id: 'breathing',
        label: 'Breathing',
        prompt: 'Animate the relief with a slow breathing expansion that returns perfectly to its start.',
      },
      {
        id: 'rising',
        label: 'Rising',
        prompt: 'Raise the pixel cells in staggered waves with adjustable delay, height, and direction.',
      },
      {
        id: 'rotating',
        label: 'Rotating',
        prompt: 'Rotate the pixel cells subtly in depth while maintaining an aspect-correct grid.',
      },
      {
        id: 'pixel-cascading',
        label: 'Cascading',
        prompt: 'Cascade the pixel heights across the image in ordered waves with adjustable direction and delay.',
      },
      {
        id: 'pixel-extruding',
        label: 'Extruding',
        prompt: 'Extrude and retract groups of pixel cells according to luminance with smooth depth transitions.',
      },
      {
        id: 'pixel-glitching',
        label: 'Glitching',
        prompt: 'Introduce controlled block glitches that shift selected cells while preserving a deterministic loop.',
      },
    ],
  },
  {
    id: 'contour-lines',
    label: 'Contour lines',
    prompt:
      'Trace the source with topographic contour lines that bend around luminance-derived depth.',
    targetIds: ['whole-image', 'subject-only', 'image-edges', 'depth-bands', 'silhouette', 'background-only'],
    motions: [
      {
        id: 'scanning',
        label: 'Scanning',
        prompt: 'Move the contours in a steady scanning motion with controllable direction and speed.',
      },
      {
        id: 'expanding',
        label: 'Expanding',
        prompt: 'Expand the contour bands from a movable center with even spacing and soft transitions.',
      },
      {
        id: 'orbiting',
        label: 'Orbiting',
        prompt: 'Orbit the contour field around the subject while keeping the underlying image stable.',
      },
      {
        id: 'contour-undulating',
        label: 'Undulating',
        prompt: 'Undulate the contour bands with smooth depth-driven waves and adjustable amplitude and frequency.',
      },
      {
        id: 'contour-eroding',
        label: 'Eroding',
        prompt: 'Erode and rebuild sections of the contour lines using animated noise with controlled edge softness.',
      },
      {
        id: 'contour-spiralling',
        label: 'Spiralling',
        prompt: 'Twist the contour field into a slow spiral around a movable center without distorting the source aspect.',
      },
    ],
  },
  {
    id: 'crystal-glass',
    label: 'Crystal glass',
    prompt:
      'Refract the source through a faceted crystal-glass surface with prismatic highlights and visible depth.',
    targetIds: ['whole-image', 'subject-only', 'bright-areas', 'image-edges', 'color-range', 'depth-bands'],
    motions: [
      {
        id: 'refracting',
        label: 'Refracting',
        prompt: 'Animate slow light refraction across the facets with adjustable dispersion and strength.',
      },
      {
        id: 'shattering',
        label: 'Shattering',
        prompt: 'Let the facets shatter outward and reform in a deterministic seamless sequence.',
      },
      {
        id: 'turning',
        label: 'Turning',
        prompt: 'Turn the facets gradually toward a movable light source to reveal changing highlights.',
      },
      {
        id: 'crystal-growing',
        label: 'Growing',
        prompt: 'Grow crystalline facets outward from bright regions with adjustable scale, timing, and maximum depth.',
      },
      {
        id: 'crystal-kaleidoscope',
        label: 'Kaleidoscopic',
        prompt: 'Rearrange the crystal reflections into a slowly rotating kaleidoscopic pattern with stable symmetry.',
      },
      {
        id: 'crystal-caustics',
        label: 'Caustic sweep',
        prompt: 'Sweep soft animated caustic highlights across the glass with controllable focus, speed, and intensity.',
      },
    ],
  },
  {
    id: 'color-waves',
    label: 'Color waves',
    prompt:
      'Wash the source with layered color waves while retaining recognizable image detail and tonal depth.',
    targetIds: ['whole-image', 'subject-only', 'background-only', 'color-range', 'center-region', 'depth-bands'],
    motions: [
      {
        id: 'drifting',
        label: 'Drifting',
        prompt: 'Drift the color layers smoothly in a controllable direction without moving the source image.',
      },
      {
        id: 'radiating',
        label: 'Radiating',
        prompt: 'Radiate the color waves from a movable center with adjustable spacing, speed, and softness.',
      },
      {
        id: 'folding',
        label: 'Folding',
        prompt: 'Fold the color field into itself with smooth mirrored motion and no visible loop seam.',
      },
      {
        id: 'color-spiralling',
        label: 'Spiralling',
        prompt: 'Spiral the color layers around a movable center while retaining the original image structure.',
      },
      {
        id: 'color-interference',
        label: 'Interference',
        prompt: 'Cross multiple color waves to create animated interference bands with adjustable scale and contrast.',
      },
      {
        id: 'color-surging',
        label: 'Surging',
        prompt: 'Send broad color surges through the image with smooth acceleration, controlled spacing, and a seamless cycle.',
      },
    ],
  },
  {
    id: 'volumetric-fog',
    label: 'Volumetric fog',
    prompt:
      'Fill the source with layered volumetric fog that follows image depth and keeps the original composition readable.',
    targetIds: ['whole-image', 'subject-only', 'background-only', 'dark-areas', 'depth-bands', 'center-region'],
    motions: [
      {
        id: 'fog-drifting',
        label: 'Drifting',
        prompt: 'Drift layered fog through the image with adjustable direction, speed, density, and depth separation.',
      },
      {
        id: 'fog-billowing',
        label: 'Billowing',
        prompt: 'Billow the fog in soft evolving curls with controllable scale, turbulence, and vertical rise.',
      },
      {
        id: 'fog-breathing',
        label: 'Breathing',
        prompt: 'Expand and contract the fog density in a slow seamless breathing cycle.',
      },
      {
        id: 'fog-rolling',
        label: 'Rolling',
        prompt: 'Roll broad fog banks across depth layers while preserving smooth transitions and source detail.',
      },
      {
        id: 'fog-vortex',
        label: 'Vortex',
        prompt: 'Pull the fog into a slow vortex around a movable center with adjustable radius and strength.',
      },
      {
        id: 'fog-dissolving',
        label: 'Dissolving',
        prompt: 'Dissolve and rebuild patches of fog with deterministic noise and a seamless cycle.',
      },
    ],
  },
  {
    id: 'holographic-scan',
    label: 'Holographic scan',
    prompt:
      'Render the source as a luminous holographic scan with layered color separation, fine scan structure, and stable depth.',
    targetIds: ['whole-image', 'subject-only', 'bright-areas', 'image-edges', 'color-range', 'depth-bands'],
    motions: [
      {
        id: 'holo-scanning',
        label: 'Scanning',
        prompt: 'Sweep a narrow holographic scan line across the image with adjustable direction, width, and speed.',
      },
      {
        id: 'holo-interlacing',
        label: 'Interlacing',
        prompt: 'Animate alternating holographic bands with stable spacing and controlled phase offsets.',
      },
      {
        id: 'holo-glitching',
        label: 'Glitching',
        prompt: 'Offset selected holographic slices with deterministic digital glitches and adjustable frequency.',
      },
      {
        id: 'holo-rotating',
        label: 'Rotating',
        prompt: 'Rotate the holographic color separation around the subject while keeping the image geometry stable.',
      },
      {
        id: 'holo-resolving',
        label: 'Resolving',
        prompt: 'Resolve the image progressively from noisy scan fragments into a crisp holographic surface.',
      },
      {
        id: 'holo-echoing',
        label: 'Echoing',
        prompt: 'Create fading holographic echoes that trail motion through depth with adjustable count and spacing.',
      },
    ],
  },
  {
    id: 'organic-growth',
    label: 'Organic growth',
    prompt:
      'Grow an organic branching structure across the source while using luminance and edges to guide its shape.',
    targetIds: ['subject-only', 'bright-areas', 'image-edges', 'depth-bands', 'center-region', 'silhouette'],
    motions: [
      {
        id: 'growth-branching',
        label: 'Branching',
        prompt: 'Branch the growth recursively along image features with adjustable density, reach, and thickness.',
      },
      {
        id: 'growth-blooming',
        label: 'Blooming',
        prompt: 'Bloom rounded organic forms outward from selected regions with staggered timing and soft edges.',
      },
      {
        id: 'growth-creeping',
        label: 'Creeping',
        prompt: 'Creep the structure slowly along strong edges with controllable direction and attachment strength.',
      },
      {
        id: 'growth-pulsing',
        label: 'Pulsing',
        prompt: 'Pulse the organic branches with a travelling expansion that loops seamlessly.',
      },
      {
        id: 'growth-curling',
        label: 'Curling',
        prompt: 'Curl the growing tips into animated tendrils with adjustable curvature, speed, and variation.',
      },
      {
        id: 'growth-receding',
        label: 'Receding',
        prompt: 'Grow and then recede the structure in a deterministic cycle without abrupt changes.',
      },
    ],
  },
  {
    id: 'ink-diffusion',
    label: 'Ink diffusion',
    prompt:
      'Diffuse layered ink through the source with soft fluid boundaries while retaining important image detail.',
    targetIds: ['whole-image', 'subject-only', 'background-only', 'dark-areas', 'color-range', 'center-region'],
    motions: [
      {
        id: 'ink-blooming',
        label: 'Blooming',
        prompt: 'Bloom pools of ink outward with controllable spread, edge softness, and pigment density.',
      },
      {
        id: 'ink-bleeding',
        label: 'Bleeding',
        prompt: 'Bleed ink gradually across nearby tonal regions with adjustable absorption and threshold.',
      },
      {
        id: 'ink-swirling',
        label: 'Swirling',
        prompt: 'Swirl multiple ink layers around a movable center while maintaining smooth fluid motion.',
      },
      {
        id: 'ink-dropping',
        label: 'Dropping',
        prompt: 'Introduce rounded ink drops that spread and merge with deterministic timing.',
      },
      {
        id: 'ink-separating',
        label: 'Separating',
        prompt: 'Separate pigments into flowing color channels with adjustable distance and diffusion strength.',
      },
      {
        id: 'ink-evaporating',
        label: 'Evaporating',
        prompt: 'Evaporate the ink into fine textured gaps before rebuilding it in a seamless loop.',
      },
    ],
  },
];

const WORD_TARGETS: TargetChoice[] = [
  {
    id: 'whole-image',
    label: 'Whole image',
    prompt: 'Apply the effect across the whole visible image while preserving the source alpha.',
    finishIds: ['seamless-loop', 'depth-reactive', 'bold', 'subtle', 'soft-matte', 'chromatic-split'],
  },
  {
    id: 'subject-only',
    label: 'Subject only',
    prompt: 'Apply the effect only to the visible subject and leave the background untouched.',
    finishIds: ['depth-reactive', 'high-gloss', 'soft-glow', 'bold', 'subtle', 'iridescent'],
  },
  {
    id: 'bright-areas',
    label: 'Bright areas',
    prompt: 'Restrict the effect to bright areas using an adjustable luminance threshold and soft mask edge.',
    finishIds: ['high-gloss', 'soft-glow', 'bold', 'iridescent', 'chromatic-split', 'high-contrast'],
  },
  {
    id: 'dark-areas',
    label: 'Dark areas',
    prompt: 'Restrict the effect to dark areas using an adjustable luminance threshold and soft mask edge.',
    finishIds: ['seamless-loop', 'soft-glow', 'subtle', 'monochrome', 'high-contrast', 'pastel-grade'],
  },
  {
    id: 'image-edges',
    label: 'Image edges',
    prompt: 'Apply the effect only along strong image edges with adjustable sensitivity and feathering.',
    finishIds: ['seamless-loop', 'depth-reactive', 'soft-glow', 'bold', 'iridescent', 'chromatic-split'],
  },
  {
    id: 'background-only',
    label: 'Background only',
    prompt: 'Apply the effect behind the visible subject while preserving a clean, softly feathered foreground mask.',
    finishIds: ['seamless-loop', 'soft-glow', 'subtle', 'soft-matte', 'monochrome', 'pastel-grade'],
  },
  {
    id: 'color-range',
    label: 'Color range',
    prompt: 'Apply the effect only near a selectable source color with adjustable tolerance and edge softness.',
    finishIds: ['high-gloss', 'soft-glow', 'bold', 'subtle', 'iridescent', 'chromatic-split'],
  },
  {
    id: 'depth-bands',
    label: 'Depth bands',
    prompt: 'Divide source luminance into adjustable depth bands and vary the effect smoothly across those layers.',
    finishIds: ['seamless-loop', 'depth-reactive', 'high-gloss', 'soft-glow', 'bold', 'subtle'],
  },
  {
    id: 'center-region',
    label: 'Center region',
    prompt: 'Concentrate the effect around a movable center with adjustable radius, falloff, and aspect correction.',
    finishIds: ['seamless-loop', 'soft-glow', 'bold', 'subtle', 'iridescent', 'pastel-grade'],
  },
  {
    id: 'silhouette',
    label: 'Silhouette',
    prompt: 'Confine the effect to the subject silhouette with a stable interior mask and adjustable edge feathering.',
    finishIds: ['depth-reactive', 'soft-glow', 'bold', 'soft-matte', 'monochrome', 'high-contrast'],
  },
];

const WORD_FINISHES: WordChoice[] = [
  {
    id: 'seamless-loop',
    label: 'Seamless loop',
    prompt:
      'Make every time-dependent value return exactly to its starting state so the animation loops without a visible seam.',
  },
  {
    id: 'depth-reactive',
    label: 'Depth reactive',
    prompt:
      'Interpret source luminance as a depth map and use it to drive displacement, shading, and animation timing.',
  },
  {
    id: 'high-gloss',
    label: 'High gloss',
    prompt:
      'Use stable specular highlights and adjustable roughness for a polished high-gloss finish.',
  },
  {
    id: 'soft-glow',
    label: 'Soft glow',
    prompt:
      'Add a soft threshold-controlled glow without clipping highlights or washing out the source.',
  },
  {
    id: 'bold',
    label: 'Bold',
    prompt:
      'Push contrast, depth, and color separation for a bold treatment while retaining recognizable source details.',
  },
  {
    id: 'subtle',
    label: 'Subtle',
    prompt:
      'Keep distortion and contrast restrained so fine source details remain visible in a subtle treatment.',
  },
  {
    id: 'soft-matte',
    label: 'Soft matte',
    prompt:
      'Use broad diffuse shading, restrained highlights, and softened contrast for a calm matte finish.',
  },
  {
    id: 'iridescent',
    label: 'Iridescent',
    prompt:
      'Shift color gently with surface direction and depth to create a controlled iridescent finish.',
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    prompt:
      'Reduce the result to a selectable monochrome palette while preserving luminance detail and depth readability.',
  },
  {
    id: 'chromatic-split',
    label: 'Chromatic split',
    prompt:
      'Add a restrained RGB channel split driven by edges or depth with adjustable distance and direction.',
  },
  {
    id: 'high-contrast',
    label: 'High contrast',
    prompt:
      'Increase tonal separation with controllable black and white points while avoiding clipped source detail.',
  },
  {
    id: 'pastel-grade',
    label: 'Pastel grade',
    prompt:
      'Grade the result with a soft selectable pastel palette while preserving local contrast and recognizable detail.',
  },
];

function shuffleWordChoices<T>(choices: readonly T[]): T[] {
  const shuffled = [...choices];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function buildWordShaderPrompt(
  effectId: string | null,
  motionId: string | null,
  targetId: string | null,
  finishIds: string[],
): string {
  const effect = WORD_EFFECTS.find((choice) => choice.id === effectId) ?? null;
  const motion = effect?.motions.find((choice) => choice.id === motionId) ?? null;
  const target = WORD_TARGETS.find((choice) => choice.id === targetId) ?? null;
  const finishes = WORD_FINISHES.filter((choice) => finishIds.includes(choice.id));

  return [
    effect?.prompt,
    motion?.prompt,
    target?.prompt,
    ...finishes.map((choice) => choice.prompt),
    effect
      ? 'Expose the useful parameters as annotated uniforms, preserve the source aspect ratio and alpha, and keep the output projection-safe.'
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function useShaderPromptPlaceholder(active: boolean) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleMotionPreferenceChange);
    return () => mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
  }, []);

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPhraseIndex(
        (current) => (current + 1) % SHADER_PROMPT_PLACEHOLDERS.length,
      );
    }, PROMPT_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [active, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return SHADER_PROMPT_PLACEHOLDERS[0];
  }

  return SHADER_PROMPT_PLACEHOLDERS[phraseIndex];
}

interface AiPanelProps {
  prompt: string;
  selectedRoute: AiGenerationRoute;
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  onPromptChange: (value: string) => void;
  onPromptFocus: () => void;
  onRouteChange: (route: AiGenerationRoute) => void;
  onPasteShader: () => Promise<boolean>;
  onPastePosition: () => Promise<void>;
  onSubmit: () => void;
  onFixError: () => void;
}

export function AiPanel({
  prompt,
  selectedRoute,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  onPromptChange,
  onPromptFocus,
  onRouteChange,
  onPasteShader,
  onPastePosition,
  onSubmit,
  onFixError,
}: AiPanelProps) {
  const [pasteMenuOpen, setPasteMenuOpen] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const [wordEffectId, setWordEffectId] = useState<string | null>(null);
  const [wordMotionId, setWordMotionId] = useState<string | null>(null);
  const [wordTargetId, setWordTargetId] = useState<string | null>(null);
  const [wordFinishIds, setWordFinishIds] = useState<string[]>([]);
  const [wordChoiceShuffleVersion, setWordChoiceShuffleVersion] = useState(0);
  const [visibleWordChoiceCount, setVisibleWordChoiceCount] = useState(
    WORD_EFFECTS.length,
  );
  const pasteMenuRef = useRef<HTMLDivElement>(null);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const promptFieldRef = useRef<HTMLTextAreaElement>(null);
  const wordChoiceMeasureRef = useRef<HTMLDivElement>(null);
  const scrollPromptToEndRef = useRef(false);
  const promptPointerActivationRef = useRef(false);
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);
  const hasPromptLine = prompt.split('\n').some((line) => line.trim().length > 0);
  const promptPlaceholder = useShaderPromptPlaceholder(!prompt);
  const selectedRouteOption =
    AI_ROUTE_OPTIONS.find((option) => option.value === selectedRoute) ??
    AI_ROUTE_OPTIONS[0];
  const selectedWordEffect = WORD_EFFECTS.find((choice) => choice.id === wordEffectId) ?? null;
  const selectedWordMotion =
    selectedWordEffect?.motions.find((choice) => choice.id === wordMotionId) ?? null;
  const selectedWordTarget = WORD_TARGETS.find((choice) => choice.id === wordTargetId) ?? null;
  const availableWordTargets = selectedWordEffect
    ? WORD_TARGETS.filter((choice) => selectedWordEffect.targetIds.includes(choice.id))
    : [];
  const availableWordFinishes = selectedWordTarget
    ? WORD_FINISHES.filter((choice) => selectedWordTarget.finishIds.includes(choice.id))
    : [];
  const wordBuilderStep = !selectedWordEffect
    ? 1
    : !selectedWordMotion
      ? 2
      : !selectedWordTarget
        ? 3
        : 4;
  const randomizedWordChoices = useMemo(() => {
    const choices =
      wordBuilderStep === 1
        ? WORD_EFFECTS
        : wordBuilderStep === 2
          ? selectedWordEffect?.motions ?? []
          : wordBuilderStep === 3
            ? availableWordTargets
            : availableWordFinishes;

    return shuffleWordChoices(choices);
  }, [
    wordBuilderStep,
    wordEffectId,
    wordMotionId,
    wordTargetId,
    wordChoiceShuffleVersion,
  ]);
  const visibleWordChoices = randomizedWordChoices.slice(
    0,
    visibleWordChoiceCount,
  );

  const applyWordSelection = (
    effectId: string | null,
    motionId: string | null,
    targetId: string | null,
    finishIds: string[],
  ) => {
    onPromptFocus();
    scrollPromptToEndRef.current = true;
    onPromptChange(buildWordShaderPrompt(effectId, motionId, targetId, finishIds));
  };

  const resetWordBuilder = () => {
    setWordEffectId(null);
    setWordMotionId(null);
    setWordTargetId(null);
    setWordFinishIds([]);
    setWordChoiceShuffleVersion((current) => current + 1);
    onPromptChange('');
  };

  useLayoutEffect(() => {
    const measureContainer = wordChoiceMeasureRef.current;
    if (!measureContainer) {
      return;
    }

    const fitChoicesToTwoRows = () => {
      const choiceElements = Array.from(
        measureContainer.querySelectorAll<HTMLElement>('[data-word-choice-measure]'),
      );
      const resetElement = measureContainer.querySelector<HTMLElement>(
        '[data-word-reset-measure]',
      );
      const availableWidth = measureContainer.clientWidth;
      const gap = Number.parseFloat(getComputedStyle(measureContainer).columnGap) || 0;
      const choiceWidths = choiceElements.map((element) => element.offsetWidth);
      const resetWidth = resetElement?.offsetWidth ?? 0;

      const rowsNeeded = (choiceCount: number) => {
        const widths = choiceWidths.slice(0, choiceCount);
        if (resetElement) {
          widths.push(resetWidth);
        }

        let rows = 1;
        let rowWidth = 0;
        for (const width of widths) {
          const nextWidth = rowWidth === 0 ? width : rowWidth + gap + width;
          if (rowWidth > 0 && nextWidth > availableWidth + 0.5) {
            rows += 1;
            rowWidth = width;
          } else {
            rowWidth = nextWidth;
          }
        }
        return rows;
      };

      let fittingCount = choiceWidths.length;
      while (fittingCount > 1 && rowsNeeded(fittingCount) > 2) {
        fittingCount -= 1;
      }

      setVisibleWordChoiceCount((current) =>
        current === fittingCount ? current : fittingCount,
      );
    };

    fitChoicesToTwoRows();
    const resizeObserver = new ResizeObserver(fitChoicesToTwoRows);
    resizeObserver.observe(measureContainer);
    return () => resizeObserver.disconnect();
  }, [randomizedWordChoices, wordBuilderStep]);

  useEffect(() => {
    if (!scrollPromptToEndRef.current || !promptFieldRef.current) {
      return;
    }

    scrollPromptToEndRef.current = false;
    promptFieldRef.current.scrollTop = promptFieldRef.current.scrollHeight;
  }, [prompt]);

  useEffect(() => {
    if (!pasteMenuOpen && !routeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (pasteMenuOpen && !pasteMenuRef.current?.contains(target)) {
        setPasteMenuOpen(false);
      }
      if (routeMenuOpen && !routeMenuRef.current?.contains(target)) {
        setRouteMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPasteMenuOpen(false);
        setRouteMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pasteMenuOpen, routeMenuOpen]);

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
        <div className="ai-prompt-composer">
          <textarea
            ref={promptFieldRef}
            className="prompt-field prompt-field-hero"
            aria-label="Shader prompt"
            placeholder={promptPlaceholder}
            value={prompt}
            onPointerDown={() => {
              promptPointerActivationRef.current = true;
              onPromptFocus();
              window.queueMicrotask(() => {
                promptPointerActivationRef.current = false;
              });
            }}
            onFocus={() => {
              if (!promptPointerActivationRef.current) {
                onPromptFocus();
              }
            }}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!aiLoading) {
                  onSubmit();
                }
              }
            }}
          />
          <section className="shader-word-builder" aria-label="Build a shader with words">
            <div className="shader-word-options">
              {wordBuilderStep === 1
                ? visibleWordChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="shader-word-tag"
                      onClick={() => {
                        setWordEffectId(choice.id);
                        setWordMotionId(null);
                        setWordTargetId(null);
                        setWordFinishIds([]);
                        applyWordSelection(choice.id, null, null, []);
                      }}
                    >
                      {choice.label}
                    </button>
                  ))
                : null}
              {wordBuilderStep === 2
                ? visibleWordChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="shader-word-tag"
                      onClick={() => {
                        setWordMotionId(choice.id);
                        setWordTargetId(null);
                        setWordFinishIds([]);
                        applyWordSelection(
                          selectedWordEffect?.id ?? null,
                          choice.id,
                          null,
                          [],
                        );
                      }}
                    >
                      {choice.label}
                    </button>
                  ))
                : null}
              {wordBuilderStep === 3
                ? visibleWordChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="shader-word-tag"
                      onClick={() => {
                        setWordTargetId(choice.id);
                        setWordFinishIds([]);
                        applyWordSelection(
                          selectedWordEffect?.id ?? null,
                          selectedWordMotion?.id ?? null,
                          choice.id,
                          [],
                        );
                      }}
                    >
                      {choice.label}
                    </button>
                  ))
                : null}
              {wordBuilderStep === 4
                ? visibleWordChoices.map((choice) => {
                    const isSelected = wordFinishIds.includes(choice.id);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        className={`shader-word-tag ${isSelected ? 'is-selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          const nextFinishIds = isSelected
                            ? wordFinishIds.filter((id) => id !== choice.id)
                            : [...wordFinishIds, choice.id];
                          setWordFinishIds(nextFinishIds);
                          applyWordSelection(
                            selectedWordEffect?.id ?? null,
                            selectedWordMotion?.id ?? null,
                            selectedWordTarget?.id ?? null,
                            nextFinishIds,
                          );
                        }}
                      >
                        {isSelected ? '✓ ' : ''}
                        {choice.label}
                      </button>
                    );
                  })
                : null}
              {wordBuilderStep > 1 ? (
                <button
                  type="button"
                  className="shader-word-reset-button"
                  onClick={resetWordBuilder}
                  aria-label="Start shader word selection again"
                  title="Start again"
                >
                  ↺
                </button>
              ) : null}
            </div>
            <div
              ref={wordChoiceMeasureRef}
              className="shader-word-options-measure"
              aria-hidden="true"
            >
              {randomizedWordChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="shader-word-tag"
                  data-word-choice-measure
                  tabIndex={-1}
                >
                  {wordBuilderStep === 4 && wordFinishIds.includes(choice.id)
                    ? 'âœ“ '
                    : ''}
                  {choice.label}
                </button>
              ))}
              {wordBuilderStep > 1 ? (
                <button
                  type="button"
                  className="shader-word-reset-button"
                  data-word-reset-measure
                  tabIndex={-1}
                >
                  â†º
                </button>
              ) : null}
            </div>
          </section>
          <div className="ai-prompt-composer-footer">
            <div ref={pasteMenuRef} className="ai-prompt-add-shell">
              <button
                type="button"
                className={`ai-prompt-add-button ${pasteMenuOpen ? 'active' : ''}`}
                aria-label="Load from clipboard"
                aria-haspopup="menu"
                aria-expanded={pasteMenuOpen}
                title="Load from clipboard"
                onClick={() => setPasteMenuOpen((current) => !current)}
              >
                <span aria-hidden="true">+</span>
              </button>
              {pasteMenuOpen ? (
                <div className="ai-prompt-add-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPasteShader();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">{'{}'}</span>
                    <span>
                      <strong>Paste shader</strong>
                      <small>Clipboard → code</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPastePosition();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">⌖</span>
                    <span>
                      <strong>Paste position</strong>
                      <small>Clipboard → mapping</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="ai-prompt-route-actions">
              <div
                ref={routeMenuRef}
                className="ai-prompt-route-select"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setRouteMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setRouteMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className={`ai-prompt-route-trigger ${routeMenuOpen ? 'active' : ''}`}
                  aria-label={`Shader AI model: ${selectedRouteOption.label}`}
                  aria-haspopup="listbox"
                  aria-expanded={routeMenuOpen}
                  onClick={() => setRouteMenuOpen((current) => !current)}
                >
                  <span className="ai-prompt-route-mark" aria-hidden="true">
                    {selectedRouteOption.icon ? (
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${selectedRouteOption.icon}`}
                        alt=""
                      />
                    ) : (
                      selectedRouteOption.mark
                    )}
                  </span>
                  <span>{selectedRouteOption.label}</span>
                  <span className="ai-prompt-route-chevron" aria-hidden="true">⌄</span>
                </button>
                {routeMenuOpen ? (
                  <div className="ai-prompt-route-menu" role="listbox" aria-label="Shader AI model">
                    {AI_ROUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === selectedRoute}
                        className={option.value === selectedRoute ? 'active' : ''}
                        onClick={() => {
                          onRouteChange(option.value);
                          setRouteMenuOpen(false);
                        }}
                      >
                        <span className="ai-prompt-route-mark" aria-hidden="true">
                          {option.icon ? (
                            <img
                              src={`${import.meta.env.BASE_URL}assets/icons/${option.icon}`}
                              alt=""
                            />
                          ) : (
                            option.mark
                          )}
                        </span>
                        <span className="ai-prompt-route-menu-copy">
                          <strong>{option.label}</strong>
                          <small>{option.note}</small>
                        </span>
                        {option.value === selectedRoute ? (
                          <span className="ai-prompt-route-check" aria-hidden="true">✓</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`ai-prompt-send-button ${hasPromptLine ? 'is-ready' : ''}`}
                disabled={aiLoading}
                aria-label={aiLoading ? 'Generating shader' : 'Generate shader'}
                title={aiLoading ? 'Generating…' : 'Generate shader'}
                onClick={() => onSubmit()}
              >
                <span aria-hidden="true">{aiLoading ? '…' : '↑'}</span>
              </button>
            </div>
          </div>
        </div>

        {shaderError ? (
          <div className="error-panel shader-chat-error">
            {shaderError}
            <button
              type="button"
              className="fix-error-button"
              disabled={aiLoading}
              onClick={onFixError}
            >
              {aiLoading ? 'Fixing...' : 'Fix Error'}
            </button>
          </div>
        ) : null}

        {showFeedback ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
