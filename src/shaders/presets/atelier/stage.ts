import type { MaskedAtelierSpec } from './builders';
import { buildMaskedAtelierPreset } from './builders';

const stageSpecs: MaskedAtelierSpec[] = [
  {
    id: 'atelier_celestial_orrery_facade',
    name: 'Celestial Orrery Facade',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Architectural Cosmology',
    description:
      'A clockwork sky of eccentric orbits, moons, and brass meridians travels across architecture without illuminating its black apertures.',
    speed: 0.32,
    intensity: 1.22,
    scale: 0.96,
    reliefDepth: 10.8,
    blackCut: 0.12,
    detail: 1.12,
    accentA: [0.012, 0.025, 0.055],
    accentB: [0.12, 0.68, 1.0],
    accentC: [1.0, 0.55, 0.08],
    effect: `
float atelier_orbit(vec2 point, vec2 radii, float angle, float width) {
    vec2 orbitPoint = atelier_rot(angle) * point / radii;
    return atelier_line(length(orbitPoint) - 1.0, width);
}

vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 center = point + vec2(
        sin(time * 0.17) * 0.08,
        cos(time * 0.13) * 0.05
    );
    float orbitA = atelier_orbit(center, vec2(0.78, 0.31), 0.24 + time * 0.08, 0.018);
    float orbitB = atelier_orbit(center, vec2(0.52, 0.62), -0.67 + time * 0.055, 0.014);
    float orbitC = atelier_orbit(center, vec2(1.08, 0.47), 0.98 - time * 0.043, 0.012);
    float meridians = atelier_line(length(center) - 0.42, 0.012);
    meridians += atelier_line(length(center) - 0.86, 0.01);

    vec2 moonA = atelier_rot(time * 0.37) * vec2(0.64, 0.0);
    vec2 moonB = atelier_rot(-time * 0.29 + 1.7) * vec2(0.0, 0.47);
    vec2 moonC = atelier_rot(time * 0.21 + 3.1) * vec2(0.88, 0.0);
    float bodyA = 1.0 - smoothstep(0.035, 0.07, length(center - moonA));
    float bodyB = 1.0 - smoothstep(0.025, 0.055, length(center - moonB));
    float bodyC = 1.0 - smoothstep(0.02, 0.045, length(center - moonC));
    float bodies = bodyA + bodyB + bodyC;
    float gear = 0.5 + 0.5 * sin(
        atan(center.y, center.x) * 24.0 + time * 0.8
    );
    gear *= atelier_line(length(center) - 0.21, 0.024);

    float architecture = atelier_sat(orbitA + orbitB + orbitC + meridians * 0.62 + gear);
    vec3 midnight = accent_a + sourceColor * 0.045;
    vec3 brass = mix(accent_c, vec3(1.0, 0.9, 0.48), max(curvature, 0.0));
    vec3 celestial = mix(accent_b, brass, 0.35 + 0.35 * sin(time * 0.7 + length(center) * 8.0));
    vec3 result = midnight * (0.7 + luma * 0.36);
    result += celestial * architecture * (0.42 + 0.48 * max(normal.z, 0.0));
    result += mix(brass, vec3(0.8, 0.95, 1.0), bodyA) * bodies * 1.15;
    result += accent_b * edge * 0.085;
    return result;
}`,
  },
  {
    id: 'atelier_brutalist_light_quarry',
    name: 'Brutalist Light Quarry',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Architectural Excavation',
    description:
      'Monumental light slabs excavate depth terraces from façades, with moving cast shadows and mineral dust.',
    speed: 0.38,
    intensity: 1.17,
    scale: 1.0,
    reliefDepth: 15.0,
    blackCut: 0.025,
    detail: 1.08,
    accentA: [0.018, 0.016, 0.014],
    accentB: [0.9, 0.38, 0.08],
    accentC: [0.95, 0.9, 0.72],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 quarryPoint = atelier_rot(-0.08) * point;
    float terraceHeight = floor((luma + broadRelief * 0.16) * 5.0) / 5.0;
    vec2 blockPoint = quarryPoint * vec2(3.2, 2.35);
    vec2 blockCell = floor(blockPoint);
    vec2 blockLocal = fract(blockPoint) - 0.5;
    float blockSeed = atelier_hash21(blockCell);
    vec2 blockScale = vec2(0.3 + blockSeed * 0.13, 0.22 + fract(blockSeed * 7.1) * 0.2);
    float block = 1.0 - smoothstep(
        0.0,
        0.035,
        max(abs(blockLocal.x) - blockScale.x, abs(blockLocal.y) - blockScale.y)
    );
    vec2 shadowLocal = blockLocal - vec2(0.08, -0.07);
    float shadowBlock = 1.0 - smoothstep(
        0.0,
        0.045,
        max(abs(shadowLocal.x) - blockScale.x, abs(shadowLocal.y) - blockScale.y)
    );
    float castShadow = max(shadowBlock - block, 0.0);
    float boxDistance = max(
        abs(blockLocal.x) - blockScale.x,
        abs(blockLocal.y) - blockScale.y
    );
    float blockBevel = 1.0 - smoothstep(0.012, 0.09, abs(boxDistance));
    float blockFace = clamp(
        (blockLocal.x + blockScale.x) / max(blockScale.x * 2.0, 0.001),
        0.0,
        1.0
    );
    float blockHeight = sqrt(max(
        0.0,
        1.0 - pow(clamp(blockLocal.y / max(blockScale.y, 0.01), -1.0, 1.0), 2.0)
    ));
    float slabStep = floor((quarryPoint.x + 1.8) * 2.15);
    float slabAxis = quarryPoint.y + slabStep * 0.12 -
        sin(time * 0.45 + slabStep * 0.32) * 0.18;
    float megaSlab = 1.0 - smoothstep(0.1, 0.19, abs(slabAxis));
    float megaShadow = 1.0 - smoothstep(0.12, 0.24, abs(slabAxis + 0.11));
    megaShadow = max(megaShadow - megaSlab, 0.0);
    float slabCore = 1.0 - smoothstep(0.0, 0.11, abs(slabAxis));
    float excavationCenter = sin(time * 0.86) * 0.82;
    float excavationCut = 1.0 - smoothstep(
        0.12,
        0.28,
        abs(quarryPoint.x + terraceHeight * 0.34 - excavationCenter)
    );
    float floorCut = 1.0 - smoothstep(
        0.08,
        0.19,
        abs(quarryPoint.y - cos(time * 0.53) * 0.28 + terraceHeight * 0.18)
    );
    float stepEdge = 1.0 - smoothstep(0.025, 0.11, min(
        fract((luma + broadRelief * 0.08) * 5.0),
        1.0 - fract((luma + broadRelief * 0.08) * 5.0)
    ));
    float dust = pow(atelier_noise(point * 26.0 + vec2(time * 0.18, -time * 0.08)), 18.0);
    dust *= excavationCut;

    vec3 stone = mix(vec3(0.004, 0.004, 0.005), vec3(0.085, 0.072, 0.058), terraceHeight);
    stone *= 0.28 + block * (0.24 + blockSeed * 0.2);
    vec3 cutLight = mix(accent_b, accent_c, floorCut + max(curvature, 0.0) * 0.2);
    vec3 result = stone;
    result *= 1.0 - castShadow * 0.76;
    result *= 1.0 - megaShadow * 0.84;
    result += cutLight * excavationCut * block *
        (0.16 + blockHeight * 0.34 + blockFace * 0.18);
    result += accent_c * blockBevel * block * excavationCut * 0.42;
    result += mix(accent_b * 0.22, accent_c, slabCore) * megaSlab *
        (0.18 + slabCore * 0.7);
    result += vec3(1.0, 0.78, 0.38) * atelier_line(slabAxis, 0.025) * 0.38;
    result += accent_c * floorCut * stepEdge * 0.42;
    result += accent_b * stepEdge * block * 0.14;
    result += accent_c * dust * 0.44;
    result += accent_b * edge * excavationCut * 0.06;
    return result;
}`,
  },
  {
    id: 'atelier_neon_rain_topography',
    name: 'Neon Rain Topography',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Atmospheric Cartography',
    description:
      'Rain filaments descend through animated elevation contours, pooling color in concave architectural relief.',
    speed: 0.56,
    intensity: 1.26,
    scale: 1.02,
    reliefDepth: 12.4,
    blackCut: 0.025,
    detail: 1.2,
    accentA: [0.004, 0.012, 0.024],
    accentB: [0.0, 0.78, 1.0],
    accentC: [1.0, 0.08, 0.66],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    float terrainA = atelier_noise(point * 0.82 + vec2(time * 0.1, -time * 0.035));
    float terrainB = atelier_noise(
        atelier_rot(0.65) * point * 1.55 + vec2(-time * 0.045, time * 0.065) + 7.4
    );
    float elevation = terrainA * 0.61 + terrainB * 0.27 +
        luma * 0.1 + broadRelief * 0.035;
    float contourPhase = fract(elevation * 5.0);
    float contours = 1.0 - smoothstep(
        0.045,
        0.17,
        min(contourPhase, 1.0 - contourPhase)
    );
    float majorContour = 1.0 - smoothstep(
        0.045,
        0.17,
        abs(fract(elevation * 2.5) - 0.5)
    );

    vec2 rainPoint = point * vec2(8.0 + detail * 1.5, 3.6);
    float columnSeed = atelier_hash21(vec2(floor(rainPoint.x), 4.2));
    float rainHead = fract(rainPoint.y * 0.19 + time * (0.34 + columnSeed * 0.42) + columnSeed);
    float streak = pow(1.0 - rainHead, 8.0);
    float thinness = 1.0 - smoothstep(0.025, 0.13, abs(fract(rainPoint.x) - 0.5));
    float rain = streak * thinness * step(0.48, columnSeed);
    float splash = atelier_line(fract(rainPoint.y * 0.31 - time * 0.22 + columnSeed) - 0.5, 0.055);
    splash *= 1.0 - smoothstep(0.08, 0.46, abs(fract(rainPoint.x * 0.5) - 0.5));
    splash *= smoothstep(0.08, 0.62, atelier_sat(-curvature));

    float basin = smoothstep(0.5, 0.74, terrainA) *
        smoothstep(0.42, 0.7, terrainB);
    float pool = atelier_sat(-curvature * 0.48 - broadRelief * 0.16 + basin * 0.82);
    float runoff = atelier_line(
        sin(point.x * 7.0 + elevation * 13.0 - time * 1.6),
        0.14
    );
    runoff *= smoothstep(0.08, 0.7, pool) * (0.4 + rain);
    vec3 terrain = accent_a * (0.4 + luma * 0.12) + sourceColor * 0.005;
    vec3 contourColor = mix(accent_b, accent_c, elevation);
    vec3 result = terrain * (0.72 + luma * 0.2);
    result += contourColor * contours * (0.34 + majorContour * 0.4);
    result += mix(accent_b, vec3(0.76, 0.96, 1.0), rain) * rain * 1.06;
    result += accent_c * splash * 0.46 + accent_b * pool * 0.17;
    result += accent_c * runoff * 0.48;
    result += accent_b * edge * 0.06;
    return result;
}`,
  },
  {
    id: 'atelier_solar_flare_tessellation',
    name: 'Solar Flare Tessellation',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Stellar Architecture',
    description:
      'A tessellated stellar surface channels flare fronts through cell walls and throws controlled coronal fire over relief.',
    speed: 0.44,
    intensity: 1.24,
    scale: 1.06,
    reliefDepth: 11.5,
    blackCut: 0.024,
    detail: 1.18,
    accentA: [0.04, 0.006, 0.002],
    accentB: [1.0, 0.12, 0.015],
    accentC: [1.0, 0.86, 0.18],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 solarPoint = point * (3.9 + detail);
    solarPoint += vec2(
        atelier_fbm(solarPoint * 0.34 + time * 0.07),
        atelier_fbm(solarPoint * 0.37 - time * 0.06 + 8.0)
    ) * 0.72;
    vec2 cells = atelier_voronoi(solarPoint);
    float wall = 1.0 - smoothstep(0.025, 0.12, cells.y - cells.x);
    float core = 1.0 - smoothstep(0.08, 0.58, cells.x);
    float ignition = fract(
        atelier_hash21(floor(solarPoint)) + time * 0.12 + length(point) * 0.17
    );
    float flareCell = pow(1.0 - ignition, 7.0) * core;
    float wave = atelier_line(
        length(point - vec2(sin(time * 0.23), cos(time * 0.19)) * 0.25) -
            fract(time * 0.09) * 1.65,
        0.045
    );
    float corona = pow(0.5 + 0.5 * sin(
        atan(point.y, point.x) * 11.0 + length(point) * 19.0 - time * 0.78
    ), 9.0);
    corona *= smoothstep(0.17, 0.72, length(point));

    float heat = atelier_sat(wall * 0.52 + flareCell * 1.2 + wave * 0.8);
    vec3 ember = mix(accent_a, accent_b, core * 0.58 + luma * 0.24);
    vec3 flame = mix(accent_b, accent_c, pow(heat, 0.55));
    vec3 result = ember * (0.7 + core * 0.28);
    result += flame * wall * (0.28 + flareCell * 0.7);
    result += accent_c * flareCell * 1.12;
    result += accent_b * corona * wave * 0.52;
    result += accent_c * max(curvature, 0.0) * heat * 0.12;
    result += accent_b * edge * 0.055;
    return result;
}`,
  },
  {
    id: 'atelier_quantum_rose_engine',
    name: 'Quantum Rose Engine',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Spatial Machines',
    description:
      'Interlocked rose folds open into a spatial engine whose petals phase, refract, and reorganize across the mapped subject.',
    speed: 0.35,
    intensity: 1.2,
    scale: 1.0,
    reliefDepth: 11.2,
    blackCut: 0.024,
    detail: 1.14,
    accentA: [0.012, 0.006, 0.04],
    accentB: [0.17, 0.58, 1.0],
    accentC: [1.0, 0.12, 0.58],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 folded = point;
    float foldEnergy = 0.0;
    for (int foldIndex = 0; foldIndex < 5; foldIndex++) {
        float indexValue = float(foldIndex);
        folded = abs(folded) - vec2(0.24 + indexValue * 0.018, 0.17);
        folded = atelier_rot(0.72 + sin(time * 0.17 + indexValue) * 0.08) * folded;
        folded *= 1.17;
        foldEnergy += exp(-4.2 * abs(length(folded) - 0.29)) / (1.0 + indexValue);
    }
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float opening = 0.16 + 0.12 * sin(time * 0.74);
    vec2 petalPointA = atelier_rot(time * 0.34) * point / vec2(0.68, 0.19 + opening);
    vec2 petalPointB = atelier_rot(time * 0.34 + ATELIER_PI / 3.0) * point /
        vec2(0.68, 0.19 + opening);
    vec2 petalPointC = atelier_rot(time * 0.34 - ATELIER_PI / 3.0) * point /
        vec2(0.68, 0.19 + opening);
    float petalA = atelier_line(length(petalPointA) - 1.0, 0.055);
    float petalB = atelier_line(length(petalPointB) - 1.0, 0.055);
    float petalC = atelier_line(length(petalPointC) - 1.0, 0.055);
    float fillA = smoothstep(1.02, 0.36, length(petalPointA));
    float fillB = smoothstep(1.02, 0.36, length(petalPointB)) * (1.0 - fillA * 0.28);
    float fillC = smoothstep(1.02, 0.36, length(petalPointC)) *
        (1.0 - max(fillA, fillB) * 0.24);
    float domeA = sqrt(max(0.0, 1.0 - min(dot(petalPointA, petalPointA), 1.0)));
    float domeB = sqrt(max(0.0, 1.0 - min(dot(petalPointB, petalPointB), 1.0)));
    float domeC = sqrt(max(0.0, 1.0 - min(dot(petalPointC, petalPointC), 1.0)));
    float petalVolume = fillA * domeA + fillB * domeB + fillC * domeC;
    float petalShadow = max(fillA - fillB, 0.0) * (1.0 - domeA) +
        max(fillB - fillC, 0.0) * (1.0 - domeB);
    float petals = atelier_sat(petalA + petalB + petalC);
    float innerRose = atelier_line(
        radius - 0.19 - 0.05 * cos(angle * 9.0 - time * 1.2),
        0.028
    );
    float phaseRings = pow(0.5 + 0.5 * sin(
        length(folded) * 34.0 - time * 0.83 + curvature * 3.0
    ), 11.0);
    float foldRidge = smoothstep(0.72, 1.05, foldEnergy);
    float engine = atelier_sat(foldRidge * 0.38 + petals + innerRose + phaseRings * petals * 0.62);

    float chromaPhase = fract(
        angle / ATELIER_TAU + radius * 0.7 - time * 0.025 + broadRelief * 0.1
    );
    vec3 quantum = atelier_palette(
        chromaPhase,
        accent_b,
        accent_c,
        vec3(0.38, 0.96, 0.78)
    );
    vec3 voidBody = accent_a * (0.42 + luma * 0.08) + sourceColor * 0.004;
    vec3 result = voidBody;
    result *= 1.0 - petalShadow * 0.72;
    vec3 petalColorA = atelier_palette(
        fract(chromaPhase + 0.0),
        accent_b,
        accent_c,
        vec3(0.38, 0.96, 0.78)
    );
    vec3 petalColorB = atelier_palette(
        fract(chromaPhase + 0.31),
        accent_b,
        accent_c,
        vec3(0.38, 0.96, 0.78)
    );
    vec3 petalColorC = atelier_palette(
        fract(chromaPhase + 0.62),
        accent_b,
        accent_c,
        vec3(0.38, 0.96, 0.78)
    );
    result += petalColorA * fillA * (0.06 + domeA * 0.44);
    result += petalColorB * fillB * (0.08 + domeB * 0.52);
    result += petalColorC * fillC * (0.1 + domeC * 0.6);
    result += quantum * engine * (0.2 + petalVolume * 0.2);
    result += vec3(0.88, 0.96, 1.0) * phaseRings * petals * 0.72;
    result += vec3(1.0, 0.82, 0.96) * pow(petalVolume / 3.0, 3.0) * 0.68;
    result += quantum * edge * 0.075;
    return result;
}`,
  },
  {
    id: 'atelier_architectural_xray_choir',
    name: 'Architectural X-Ray Choir',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Structural Spectra',
    description:
      'Several spectral depth voices reveal edges, cavities, and load-bearing rhythm as a coordinated architectural x-ray.',
    speed: 0.48,
    intensity: 1.18,
    scale: 1.0,
    reliefDepth: 16.0,
    blackCut: 0.026,
    detail: 1.16,
    accentA: [0.003, 0.012, 0.02],
    accentB: [0.0, 0.9, 1.0],
    accentC: [0.72, 0.2, 1.0],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    float depth = luma + curvature * 0.09 + broadRelief * 0.06;
    float voiceA = atelier_band(fract(depth * 1.8 + time * 0.22), 0.5, 0.2);
    float voiceB = atelier_band(fract(depth * 3.1 - time * 0.17), 0.5, 0.16);
    float voiceC = atelier_band(fract((depth + broadRelief * 0.1) * 4.4 + time * 0.11), 0.5, 0.12);
    float choir = atelier_sat(voiceA * 0.42 + voiceB * 0.54 + voiceC * 0.22);

    float verticalRibs = atelier_line(
        abs(fract(point.x * (3.2 + detail * 0.7)) - 0.5) - 0.31,
        0.06
    );
    float diagonalBraceA = atelier_line(
        fract((point.x + point.y * 0.58) * 1.65) - 0.5,
        0.075
    );
    float diagonalBraceB = atelier_line(
        fract((point.x - point.y * 0.58) * 1.65) - 0.5,
        0.075
    );
    float structure = atelier_sat(
        verticalRibs * 0.55 + (diagonalBraceA + diagonalBraceB) * 0.35
    );
    structure *= smoothstep(0.02, 0.36, edge + abs(curvature) * 0.5);

    float cavityArcA = atelier_line(
        length(point - vec2(-0.34, 0.0)) - 0.46 - sin(time * 0.48) * 0.05,
        0.025
    );
    float cavityArcB = atelier_line(
        length(point - vec2(0.38, 0.02)) - 0.55 - cos(time * 0.4) * 0.06,
        0.025
    );
    float sparseBeam = 1.0 - smoothstep(
        0.06,
        0.16,
        abs(point.x - sin(time * 0.62) * 0.74)
    );
    float resonance = 0.5 + 0.5 * sin(
        point.y * 5.0 + time * 1.45 + depth * 7.0
    );
    vec3 spectral = mix(accent_b, accent_c, voiceB + resonance * 0.25);
    vec3 tissue = accent_a * (0.7 + luma * 0.16) + sourceColor * 0.01;
    vec3 result = tissue;
    result += spectral * choir * (0.26 + edge * 0.2);
    result += mix(accent_b, vec3(0.88, 1.0, 1.0), resonance) * structure * 0.52;
    result += accent_c * (cavityArcA + cavityArcB) * (0.24 + choir) * 0.68;
    result += vec3(0.78, 0.96, 1.0) * sparseBeam * voiceA * 0.46;
    result += accent_c * atelier_sat(-curvature) * voiceC * 0.18;
    result += accent_b * edge * 0.08;
    return result;
}`,
  },
  {
    id: 'atelier_moorish_plasma_lattice',
    name: 'Moorish Plasma Lattice',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Sacred Geometry',
    description:
      'An eightfold architectural lattice carries plasma through interlaced stars and curved arabesque channels.',
    speed: 0.4,
    intensity: 1.2,
    scale: 1.04,
    reliefDepth: 11.3,
    blackCut: 0.024,
    detail: 1.18,
    accentA: [0.006, 0.016, 0.026],
    accentB: [0.02, 0.9, 0.66],
    accentC: [0.72, 0.14, 1.0],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 tilePoint = fract(point * (0.82 + detail * 0.08)) - 0.5;
    vec2 starPoint = atelier_kaleido(tilePoint, 8.0);
    float angle = atan(starPoint.y, starPoint.x);
    float radius = length(starPoint);
    float starBoundary = 0.29 + 0.1 * cos(angle * 8.0);
    float star = atelier_line(radius - starBoundary, 0.028);
    float innerStar = atelier_line(radius - 0.17 - 0.045 * cos(angle * 8.0 + ATELIER_PI / 8.0), 0.022);
    float interlaceA = atelier_line(
        sin(tilePoint.x * 6.4) + cos(tilePoint.y * 6.4 + time * 0.72),
        0.22
    );
    float interlaceB = atelier_line(
        cos(tilePoint.x * 6.4 - time * 0.61) - sin(tilePoint.y * 6.4),
        0.22
    );
    vec2 macroStarPoint = atelier_kaleido(point, 8.0);
    float macroAngle = atan(macroStarPoint.y, macroStarPoint.x);
    float macroRadius = length(macroStarPoint);
    float macroStar = atelier_line(
        macroRadius - 0.58 - 0.18 * cos(macroAngle * 8.0 + time * 0.24),
        0.035
    );
    float lattice = atelier_sat(
        star + innerStar + (interlaceA + interlaceB) * 0.42 + macroStar * 0.72
    );

    float plasmaCoordinate = point.x * 1.9 + point.y * 1.3;
    plasmaCoordinate += atelier_fbm(point * 2.6 + time * 0.08) * 3.8 - time * 0.74;
    float plasma = pow(0.5 + 0.5 * sin(plasmaCoordinate * 4.2), 6.0);
    plasma *= lattice;
    float nodes = pow(1.0 - smoothstep(0.01, 0.075, radius), 2.0);

    vec3 darkTile = accent_a + sourceColor * 0.038;
    vec3 current = mix(accent_b, accent_c, plasma);
    vec3 result = darkTile * (0.72 + luma * 0.22);
    result += current * lattice * (0.31 + plasma * 0.72);
    result += vec3(0.88, 1.0, 0.76) * nodes * (0.35 + plasma);
    result += current * max(curvature, 0.0) * 0.12;
    result += accent_b * edge * 0.055;
    return result;
}`,
  },
  {
    id: 'atelier_cosmic_curtain_collapse',
    name: 'Cosmic Curtain Collapse',
    template: 'stage',
    templates: ['stage', 'sculpture'],
    group: 'Atelier · Spatial Atmospheres',
    description:
      'Deep-space ribbons fall, fold, and collapse into luminous knots while the mapped object retains precise negative space.',
    speed: 0.3,
    intensity: 1.28,
    scale: 1.0,
    reliefDepth: 12.0,
    blackCut: 0.025,
    detail: 1.22,
    accentA: [0.002, 0.004, 0.018],
    accentB: [0.16, 0.28, 1.0],
    accentC: [1.0, 0.12, 0.62],
    effect: `
vec3 atelier_material(
    vec2 point,
    float time,
    float luma,
    float edge,
    float curvature,
    float broadRelief,
    vec3 normal,
    vec3 sourceColor
) {
    vec2 curtainPoint = point * vec2(1.7 + detail * 0.18, 1.0);
    float flowA = atelier_fbm(curtainPoint * 1.3 + vec2(time * 0.09, -time * 0.12));
    float flowB = atelier_fbm(
        atelier_rot(0.72) * curtainPoint * 1.6 + vec2(-time * 0.07, time * 0.08) + 6.0
    );
    float rawA = curtainPoint.x + 1.28 +
        sin(curtainPoint.y * 2.4 - time * 1.08) * 0.34 +
        (flowA - 0.5) * 0.58 + sin(time * 0.63) * 0.18;
    float rawB = curtainPoint.x * 1.05 - 1.14 -
        cos(curtainPoint.y * 3.1 + time * 0.92) * 0.28 -
        (flowB - 0.5) * 0.5 + cos(time * 0.71) * 0.2;
    float rawC = curtainPoint.x * 1.72 + 0.28 +
        sin(curtainPoint.y * 1.8 + time * 0.76 + 2.0) * 0.42 +
        (flowA - flowB) * 0.38 + sin(time * 0.48) * 0.12;
    float rawD = curtainPoint.x * 2.05 - 0.44 +
        cos(curtainPoint.y * 2.2 - time * 0.64) * 0.31 +
        (flowB - 0.5) * 0.34;
    float ribbonA = atelier_line(rawA, 0.18);
    float ribbonB = atelier_line(rawB, 0.15);
    float ribbonC = atelier_line(rawC, 0.11);
    float ribbonD = atelier_line(rawD, 0.085);
    float shadeA = sqrt(max(0.0, 1.0 - pow(clamp(abs(rawA) / 0.18, 0.0, 1.0), 2.0)));
    float shadeB = sqrt(max(0.0, 1.0 - pow(clamp(abs(rawB) / 0.15, 0.0, 1.0), 2.0)));
    float shadeC = sqrt(max(0.0, 1.0 - pow(clamp(abs(rawC) / 0.11, 0.0, 1.0), 2.0)));
    float shadeD = sqrt(max(0.0, 1.0 - pow(clamp(abs(rawD) / 0.085, 0.0, 1.0), 2.0)));
    float frontRibbon = ribbonC + ribbonD * 0.72;
    float rearRibbon = (ribbonA * 0.66 + ribbonB * 0.72) * (1.0 - frontRibbon * 0.52);
    float ribbons = atelier_sat(rearRibbon + frontRibbon);
    float rearShade = max(shadeA * ribbonA, shadeB * ribbonB);
    float frontShade = max(shadeC * ribbonC, shadeD * ribbonD);
    float rearSpec = atelier_line(rawA, 0.026) + atelier_line(rawB, 0.021);
    float frontSpec = atelier_line(rawC, 0.018) + atelier_line(rawD, 0.014);

    vec2 knotPoint = point - vec2(
        sin(time * 0.19) * 0.22,
        cos(time * 0.16) * 0.16
    );
    float knotRadius = length(knotPoint);
    float knot = exp(-8.0 * knotRadius);
    knot *= 0.5 + 0.5 * sin(atan(knotPoint.y, knotPoint.x) * 7.0 + time * 0.55);
    float collapseWave = atelier_line(
        knotRadius - 0.34 - 0.09 * sin(time * 0.31),
        0.035
    );
    float stars = pow(atelier_hash21(floor(point * 75.0)), 38.0);
    stars *= 0.4 + 0.6 * sin(time + atelier_hash21(floor(point * 75.0)) * 11.0);

    vec3 space = accent_a * (0.46 + luma * 0.08) + sourceColor * 0.003;
    vec3 ribbonColor = mix(accent_b, vec3(0.32, 0.54, 1.0), flowA);
    vec3 result = space * (0.72 + luma * 0.22);
    result += ribbonColor * rearRibbon * (0.1 + rearShade * 0.9);
    result += mix(accent_c, vec3(1.0, 0.58, 0.9), flowB) * frontRibbon *
        (0.12 + frontShade * 0.98);
    result += vec3(0.58, 0.76, 1.0) * rearSpec * rearRibbon * 0.46;
    result += vec3(1.0, 0.82, 0.94) * frontSpec * frontRibbon * 0.64;
    result += vec3(0.86, 0.9, 1.0) * knot * 0.82;
    result += accent_c * collapseWave * ribbons * 0.4;
    result += vec3(0.7, 0.82, 1.0) * stars * 0.35;
    result += ribbonColor * edge * 0.055;
    return result;
}`,
  },
];

export const atelierStagePresetList = stageSpecs.map(buildMaskedAtelierPreset);
