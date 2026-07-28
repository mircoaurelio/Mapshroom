import type { DrawingAtelierSpec } from './builders';
import { buildDrawingAtelierPreset } from './builders';

const drawingSpecs: DrawingAtelierSpec[] = [
  {
    id: 'atelier_ink_constellation_engine',
    name: 'Ink Constellation Engine',
    group: 'Atelier · Animated Linework',
    description:
      'Extracted ink becomes a black-field constellation of stellar nodes, orbital connections, and traveling signal bursts.',
    speed: 0.42,
    intensity: 1.34,
    scale: 1.04,
    lineThreshold: 0.73,
    lineGain: 1.34,
    darkPaper: true,
    accentA: [0.04, 0.2, 0.65],
    accentB: [0.0, 0.88, 1.0],
    accentC: [1.0, 0.32, 0.72],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    vec2 starPoint = point * 7.2;
    vec2 cell = floor(starPoint);
    vec2 local = fract(starPoint) - 0.5;
    vec2 anchor = atelier_hash22(cell) - 0.5;
    float star = 1.0 - smoothstep(0.018, 0.08, length(local - anchor));
    float twinkle = pow(0.5 + 0.5 * sin(
        time * (1.3 + atelier_hash21(cell)) + atelier_hash21(cell + 4.0) * 12.0
    ), 5.0);
    star *= twinkle;

    float nearestLink = 1.0;
    for (int neighborIndex = 0; neighborIndex < 4; neighborIndex++) {
        float indexValue = float(neighborIndex);
        vec2 direction = vec2(
            cos(indexValue * ATELIER_PI * 0.5),
            sin(indexValue * ATELIER_PI * 0.5)
        );
        vec2 target = direction + atelier_hash22(cell + direction) - 0.5;
        vec2 segment = target - anchor;
        vec2 fromAnchor = local - anchor;
        float segmentAmount = clamp(dot(fromAnchor, segment) / max(dot(segment, segment), 0.001), 0.0, 1.0);
        nearestLink = min(nearestLink, length(fromAnchor - segment * segmentAmount));
    }
    float links = 1.0 - smoothstep(0.012, 0.038, nearestLink);
    links *= step(0.44, atelier_hash21(cell));
    float signal = pow(0.5 + 0.5 * sin(
        dot(starPoint, vec2(0.42, 0.67)) - time * 1.4
    ), 9.0);
    vec3 constellation = mix(accent_a, accent_b, signal);
    vec3 result = constellation * links * (0.38 + signal * 0.72);
    result += mix(accent_b, accent_c, twinkle) * star * 1.25;
    result += accent_c * edge * 0.22 + accent_b * ink * 0.08;
    return result;
}`,
  },
  {
    id: 'atelier_electric_copperplate_etching',
    name: 'Electric Copperplate Etching',
    group: 'Atelier · Animated Linework',
    description:
      'Copperplate hatching is electrified into directional cross-strokes, oxidized sparks, and traveling engraved highlights.',
    speed: 0.5,
    intensity: 1.26,
    scale: 1.1,
    lineThreshold: 0.75,
    lineGain: 1.28,
    darkPaper: true,
    accentA: [0.12, 0.035, 0.015],
    accentB: [0.95, 0.32, 0.08],
    accentC: [0.08, 0.92, 0.68],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    vec2 tangent = normalize(vec2(-gradient.y, gradient.x) + vec2(0.0001));
    float orientation = atan(tangent.y, tangent.x);
    vec2 hatchPoint = atelier_rot(-orientation * 0.36) * point;
    float hatchA = pow(0.5 + 0.5 * sin(
        hatchPoint.x * 78.0 + hatchPoint.y * 19.0 - time * 1.2
    ), 16.0);
    float hatchB = pow(0.5 + 0.5 * sin(
        hatchPoint.x * 31.0 - hatchPoint.y * 71.0 + time * 0.84
    ), 19.0);
    float engraving = atelier_sat(hatchA * 0.72 + hatchB * 0.58);
    engraving *= 0.44 + ink * 0.56;

    float currentCoordinate = dot(point, normalize(vec2(0.73, -0.41)));
    currentCoordinate += atelier_fbm(point * 3.5) * 0.42 - time * 0.7;
    float current = pow(0.5 + 0.5 * sin(currentCoordinate * 12.0), 11.0);
    float oxidation = smoothstep(0.48, 0.78, atelier_ridged(point * 4.1 + time * 0.04));
    float sparks = pow(atelier_hash21(floor(point * 82.0 + time)), 42.0);
    sparks *= edge;
    vec3 copper = mix(accent_a, accent_b, engraving);
    copper = mix(copper, accent_c, oxidation * 0.54);
    vec3 result = copper * (0.18 + engraving * 0.62 + current * 0.56);
    result += vec3(1.0, 0.76, 0.32) * current * edge * 0.66;
    result += accent_c * sparks * 1.4;
    return result;
}`,
  },
  {
    id: 'atelier_calligraphic_smoke_memory',
    name: 'Calligraphic Smoke Memory',
    group: 'Atelier · Animated Linework',
    description:
      'Ink contours exhale layered calligraphic smoke, with filament memory and soft spectral knots confined to the drawing.',
    speed: 0.32,
    intensity: 1.3,
    scale: 1.06,
    lineThreshold: 0.76,
    lineGain: 1.32,
    darkPaper: true,
    accentA: [0.06, 0.12, 0.34],
    accentB: [0.34, 0.72, 1.0],
    accentC: [0.86, 0.3, 1.0],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    vec2 smokePoint = point * 2.7;
    float flowA = atelier_fbm(smokePoint + vec2(time * 0.12, -time * 0.08));
    float flowB = atelier_fbm(
        atelier_rot(1.24) * smokePoint * 1.3 + vec2(-time * 0.07, time * 0.1) + 7.0
    );
    vec2 warped = smokePoint + vec2(flowA - 0.5, flowB - 0.5) * 1.9;
    float filamentA = atelier_line(
        sin(warped.x * 3.2 + warped.y * 1.1) + cos(warped.y * 2.7 - time * 0.44),
        0.17
    );
    float filamentB = atelier_line(
        cos(warped.x * 2.5 - warped.y * 1.7 + time * 0.31) - sin(warped.y * 3.8),
        0.13
    );
    float filaments = atelier_sat(filamentA * 0.72 + filamentB * 0.64);
    float memory = exp(-4.6 * abs(flowA - flowB));
    float pulse = pow(0.5 + 0.5 * sin(
        warped.y * 4.0 - time * 0.72 + flowA * 6.0
    ), 7.0);
    vec3 smoke = mix(accent_a, accent_b, flowA);
    smoke = mix(smoke, accent_c, flowB * 0.52 + pulse * 0.3);
    vec3 result = smoke * filaments * (0.25 + memory * 0.52);
    result += mix(accent_b, vec3(0.9, 0.96, 1.0), pulse) * memory * pulse * 0.55;
    result += accent_c * edge * 0.2 + accent_b * ink * 0.06;
    return result;
}`,
  },
  {
    id: 'atelier_blueprint_ghost_anatomy',
    name: 'Blueprint Ghost Anatomy',
    group: 'Atelier · Animated Linework',
    description:
      'A dark architectural blueprint reveals measurement arcs, sectional ticks, and ghosted construction anatomy inside linework.',
    speed: 0.28,
    intensity: 1.24,
    scale: 1.0,
    lineThreshold: 0.76,
    lineGain: 1.3,
    darkPaper: true,
    accentA: [0.01, 0.1, 0.28],
    accentB: [0.0, 0.68, 1.0],
    accentC: [0.72, 0.94, 1.0],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    float gridFineX = atelier_line(fract(point.x * 18.0) - 0.5, 0.045);
    float gridFineY = atelier_line(fract(point.y * 18.0) - 0.5, 0.045);
    float gridMajorX = atelier_line(fract(point.x * 4.5) - 0.5, 0.025);
    float gridMajorY = atelier_line(fract(point.y * 4.5) - 0.5, 0.025);
    float grid = (gridFineX + gridFineY) * 0.16 + (gridMajorX + gridMajorY) * 0.34;
    grid *= 0.35 + ink * 0.65;

    float radius = length(point);
    float angle = atan(point.y, point.x);
    float measureArcA = atelier_line(radius - 0.28 - 0.025 * sin(time * 0.22), 0.01);
    float measureArcB = atelier_line(radius - 0.54, 0.009);
    float tickGate = step(0.66, fract((angle / ATELIER_TAU + 0.5) * 36.0));
    float arcs = (measureArcA + measureArcB) * tickGate;
    vec2 cursor = vec2(
        sin(time * 0.31) * 0.6,
        cos(time * 0.24) * 0.34
    );
    float locator = atelier_line(length(point - cursor) - 0.055, 0.01);
    locator += atelier_line(point.x - cursor.x, 0.006) * smoothstep(0.12, 0.0, abs(point.y - cursor.y));
    locator += atelier_line(point.y - cursor.y, 0.006) * smoothstep(0.12, 0.0, abs(point.x - cursor.x));
    float reveal = 0.5 + 0.5 * sin(
        point.x * 4.0 + point.y * 2.1 - time * 0.54
    );
    vec3 blueprint = mix(accent_a, accent_b, reveal);
    vec3 result = blueprint * (grid * 0.36 + ink * 0.18);
    result += accent_c * arcs * 0.78;
    result += vec3(0.88, 0.98, 1.0) * locator * 0.9;
    result += accent_b * edge * (0.28 + reveal * 0.18);
    return result;
}`,
  },
  {
    id: 'atelier_living_oil_impasto',
    name: 'Living Oil Impasto',
    group: 'Atelier · Animated Painting',
    description:
      'Pigment becomes animated impasto: bristle ridges, wet-on-wet color currents, and moving gallery light preserve clean paper.',
    speed: 0.74,
    intensity: 1.06,
    scale: 1.04,
    lineThreshold: 0.68,
    lineGain: 1.12,
    darkPaper: false,
    accentA: [0.08, 0.14, 0.46],
    accentB: [0.96, 0.18, 0.12],
    accentC: [1.0, 0.72, 0.08],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    vec2 pigmentPoint = point * 3.2;
    vec2 flow = vec2(
        atelier_fbm(pigmentPoint + vec2(time * 0.38, -time * 0.22)),
        atelier_fbm(pigmentPoint + vec2(-time * 0.27, time * 0.31) + 8.0)
    );
    vec2 brushPoint = pigmentPoint + (flow - 0.5) * 2.35;
    float bristleA = pow(0.5 + 0.5 * sin(
        brushPoint.x * 24.0 + brushPoint.y * 5.0 - time * 1.42
    ), 12.0);
    float bristleB = pow(0.5 + 0.5 * cos(
        brushPoint.y * 27.0 - brushPoint.x * 4.0 + time * 1.16
    ), 14.0);
    float bristles = bristleA * 0.58 + bristleB * 0.42;
    float wetMix = atelier_fbm(brushPoint * 0.7 + vec2(time * 0.31, -time * 0.18));
    float wetEdge = 1.0 - smoothstep(0.035, 0.14, abs(flow.x - flow.y));
    float impastoRidge = smoothstep(0.72, 0.94, atelier_ridged(
        brushPoint * vec2(0.72, 1.34) + vec2(time * 0.24, -time * 0.17)
    ));
    vec3 sourcePigment = pow(max(sourceColor, vec3(0.0)), vec3(0.72));
    vec3 palettePigment = atelier_palette(
        fract(wetMix + sourceColor.r * 0.3 - sourceColor.b * 0.2 + time * 0.14),
        accent_a,
        accent_b,
        accent_c
    );
    vec3 mixedPigment = mix(sourcePigment, palettePigment, 0.5 + wetMix * 0.32);
    float galleryLight = 0.55 + 0.45 * sin(
        dot(point, normalize(vec2(0.72, 0.48))) * 3.8 - time * 1.08
    );
    float bristleSpecular = bristles * pow(galleryLight, 5.0);
    vec3 result = mixedPigment * (0.38 + bristles * 0.24 + galleryLight * 0.24);
    result += mix(accent_c, vec3(1.0), galleryLight) *
        (bristles * edge * 0.28 + impastoRidge * 0.32);
    result += mix(accent_b, accent_c, wetMix) * wetEdge * 0.22;
    result += vec3(1.0, 0.82, 0.48) * impastoRidge *
        (0.12 + galleryLight * 0.38);
    result += mix(vec3(1.0, 0.9, 0.68), accent_c, wetMix) *
        bristleSpecular * 0.68;
    result += sourcePigment * pigment * 0.13;
    return result;
}`,
  },
  {
    id: 'atelier_cubist_chromatic_recomposition',
    name: 'Cubist Chromatic Recomposition',
    group: 'Atelier · Animated Painting',
    description:
      'Painted regions split into shifting angular planes whose color logic, facet light, and seams continuously recompose the image.',
    speed: 0.58,
    intensity: 1.08,
    scale: 1.0,
    lineThreshold: 0.7,
    lineGain: 1.1,
    darkPaper: false,
    accentA: [0.08, 0.22, 0.58],
    accentB: [0.95, 0.16, 0.1],
    accentC: [1.0, 0.74, 0.12],
    effect: `
vec3 atelier_inkMaterial(
    vec2 point,
    float time,
    float ink,
    float edge,
    float pigment,
    vec2 gradient,
    vec3 sourceColor
) {
    vec2 facetPoint = atelier_rot(sin(time * 0.48) * 0.14) * point * 4.6;
    facetPoint += vec2(
        sin(time * 1.15 + point.y * 1.8),
        cos(time * 0.93 + point.x * 1.5)
    ) * 0.54;
    vec2 facets = atelier_voronoi(facetPoint);
    float seam = 1.0 - smoothstep(0.018, 0.09, facets.y - facets.x);
    vec2 cell = floor(facetPoint);
    float cellSeed = atelier_hash21(cell);
    float planePhase = fract(cellSeed + time * 0.19);
    vec3 cubistPalette = atelier_palette(
        planePhase,
        accent_a,
        accent_b,
        accent_c
    );
    vec3 sourcePlane = sourceColor;
    if (cellSeed < 0.33) {
        sourcePlane = sourceColor.brg;
    } else if (cellSeed < 0.66) {
        sourcePlane = sourceColor.gbr;
    }
    float planeLight = 0.56 + 0.44 * sin(
        cellSeed * 12.0 + dot(point, vec2(1.2, -0.7)) * 2.0 + time * 0.92
    );
    float offsetPortrait = 0.5 + 0.5 * sin(
        point.x * 3.0 - point.y * 2.1 + cellSeed * 7.0
    );
    vec3 plane = mix(sourcePlane, cubistPalette, 0.34 + offsetPortrait * 0.22);
    plane *= 0.62 + planeLight * 0.38;
    vec3 seamColor = mix(vec3(0.08, 0.06, 0.1), accent_c, edge * 0.35);
    vec3 result = mix(plane, seamColor, seam * 0.72);
    result += cubistPalette * edge * 0.16;
    result += accent_c * pow(planeLight, 6.0) * pigment * 0.12;
    return result;
}`,
  },
];

export const atelierDrawingPresetList = drawingSpecs.map(buildDrawingAtelierPreset);
