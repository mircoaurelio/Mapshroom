import type { MaskedAtelierSpec } from './builders';
import { buildMaskedAtelierPreset } from './builders';

const sculptureSpecs: MaskedAtelierSpec[] = [
  {
    id: 'atelier_mercury_reliquary',
    name: 'Mercury Reliquary',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Liquid Metals',
    description:
      'A circulating mercury skin with relief-driven rivulets, liquid beads, and moving gallery reflections; pure black remains projector black.',
    speed: 0.58,
    intensity: 1.28,
    scale: 1.08,
    reliefDepth: 12.5,
    blackCut: 0.025,
    detail: 1.18,
    accentA: [0.03, 0.045, 0.065],
    accentB: [0.72, 0.84, 0.96],
    accentC: [0.45, 0.94, 0.88],
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
    vec2 flowPoint = point * (1.38 + detail * 0.18);
    float lowFlow = atelier_fbm(flowPoint * 1.1 + vec2(time * 0.32, -time * 0.18));
    float crossFlow = atelier_fbm(
        atelier_rot(1.17) * flowPoint * 1.4 + vec2(-time * 0.21, time * 0.26) + 7.4
    );
    float riverCenterA = -0.48 + sin(point.y * 2.2 + time * 1.18) * 0.24;
    riverCenterA += (lowFlow - 0.5) * 0.46;
    float riverCenterB = 0.44 + cos(point.y * 2.8 - time * 0.83) * 0.19;
    riverCenterB += (crossFlow - 0.5) * 0.38;
    float riverA = 1.0 - smoothstep(0.055, 0.19, abs(point.x - riverCenterA));
    float riverB = 1.0 - smoothstep(0.045, 0.15, abs(point.x - riverCenterB));
    float merger = 1.0 - smoothstep(
        0.07,
        0.24,
        abs(point.x - sin(point.y * 1.2 - time * 0.72) * 0.12)
    );
    merger *= smoothstep(0.64, 0.9, lowFlow + crossFlow * 0.4);
    float rivulet = atelier_sat(riverA + riverB * 0.82 + merger * 0.64);

    vec2 beadPoint = point * vec2(3.8, 3.1) + vec2(0.0, -time * 0.74);
    vec2 beadCell = floor(beadPoint);
    vec2 beadLocal = fract(beadPoint) - 0.5;
    vec2 beadCenter = (atelier_hash22(beadCell) - 0.5) * 0.54;
    float beadRadius = 0.08 + atelier_hash21(beadCell + 3.7) * 0.15;
    float beads = 1.0 - smoothstep(
        beadRadius,
        beadRadius + 0.055,
        length(beadLocal - beadCenter)
    );
    beads *= step(0.64, atelier_hash21(beadCell));
    beads *= smoothstep(0.24, 0.66, lowFlow);

    vec3 movingLight = normalize(vec3(
        sin(time * 0.92) * 0.72,
        cos(time * 0.67) * 0.48,
        0.72
    ));
    float specular = pow(
        max(dot(reflect(-movingLight, normal), vec3(0.0, 0.0, 1.0)), 0.0),
        38.0
    );
    float gallerySweep = pow(0.5 + 0.5 * sin(
        normal.x * 7.0 + point.y * 2.3 - time * 1.62 + lowFlow * 2.2
    ), 5.0);
    float liquidBody = atelier_sat(rivulet + beads * 0.82);
    vec3 dryStone = accent_a + sourceColor * 0.022;
    vec3 silver = mix(vec3(0.11, 0.14, 0.18), accent_b, gallerySweep);
    silver = mix(silver, accent_c, beads * 0.38 + max(curvature, 0.0) * 0.12);
    vec3 result = dryStone * (0.72 + luma * 0.18);
    result += silver * liquidBody * (0.46 + gallerySweep * 0.72);
    result += vec3(0.95, 1.0, 1.0) * specular * liquidBody * 1.15;
    result += accent_c * edge * liquidBody * 0.09;
    return result;
}`,
  },
  {
    id: 'atelier_kintsugi_singularity',
    name: 'Kintsugi Singularity',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Fracture Rituals',
    description:
      'A porcelain void repaired by propagating gold fracture fronts, granular lacquer, and relief-locked glints.',
    speed: 0.46,
    intensity: 1.22,
    scale: 1.02,
    reliefDepth: 13.8,
    blackCut: 0.023,
    detail: 1.3,
    accentA: [0.018, 0.015, 0.025],
    accentB: [1.0, 0.58, 0.08],
    accentC: [1.0, 0.9, 0.45],
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
    vec2 crackedPoint = point * (4.2 + detail * 1.1);
    crackedPoint += vec2(
        atelier_fbm(point * 2.1 + time * 0.07),
        atelier_fbm(point * 2.3 - time * 0.06 + 8.0)
    ) * 0.55;
    vec2 cells = atelier_voronoi(crackedPoint);
    float fractureDistance = cells.y - cells.x;
    float hairline = 1.0 - smoothstep(0.018, 0.095, fractureDistance);
    float secondary = 1.0 - smoothstep(0.02, 0.085, abs(fract(
        crackedPoint.x * 0.36 + crackedPoint.y * 0.21 + atelier_fbm(crackedPoint * 0.31)
    ) - 0.5));
    secondary *= smoothstep(0.38, 0.72, atelier_ridged(crackedPoint * 0.45));
    float propagation = fract(time * 0.115);
    float cellPhase = fract(atelier_hash21(floor(crackedPoint)) * 0.72 + length(point) * 0.21);
    float arrival = smoothstep(propagation - 0.12, propagation + 0.04, cellPhase);
    arrival = max(arrival, smoothstep(0.88, 0.98, propagation) * smoothstep(0.12, 0.0, cellPhase));
    float cracks = atelier_sat((hairline + secondary * 0.38) * arrival);

    float goldDust = pow(atelier_hash21(floor(crackedPoint * 7.0 + time)), 18.0) * cracks;
    vec3 porcelain = mix(vec3(0.018, 0.02, 0.032), vec3(0.22, 0.24, 0.29), luma * 0.7);
    porcelain *= 0.7 + 0.3 * max(normal.z, 0.0);
    porcelain += vec3(0.07, 0.08, 0.11) * atelier_sat(-curvature);
    vec3 gold = mix(accent_b, accent_c, 0.35 + 0.65 * sin(time * 1.4 + cells.x * 11.0) * 0.5);
    gold *= 0.65 + 1.6 * pow(max(dot(normalize(vec3(-0.4, 0.5, 0.8)), normal), 0.0), 12.0);
    vec3 result = mix(porcelain, gold, cracks);
    result += accent_c * goldDust * 1.7;
    result += accent_b * edge * 0.09 * (1.0 - cracks);
    return result;
}`,
  },
  {
    id: 'atelier_bioluminescent_mycelium',
    name: 'Bioluminescent Mycelium',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Living Networks',
    description:
      'Branching mycelial vessels grow along inferred relief, carrying asynchronous cyan and violet nutrient pulses.',
    speed: 0.54,
    intensity: 1.3,
    scale: 1.12,
    reliefDepth: 11.6,
    blackCut: 0.024,
    detail: 1.34,
    accentA: [0.005, 0.018, 0.025],
    accentB: [0.0, 0.94, 0.68],
    accentC: [0.54, 0.18, 1.0],
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
    vec2 growthPoint = point * (3.1 + detail);
    vec2 warp = vec2(
        atelier_fbm(growthPoint * 0.47 + vec2(time * 0.08, 3.2)),
        atelier_fbm(growthPoint * 0.51 + vec2(8.1, -time * 0.06))
    );
    growthPoint += (warp - 0.5) * 2.25;
    float fieldA = atelier_ridged(growthPoint * vec2(0.68, 1.18));
    float fieldB = atelier_ridged(atelier_rot(1.047) * growthPoint * vec2(0.58, 1.3) + 5.7);
    float network = fieldA * 0.62 + fieldB * 0.5;
    float persistentBranch = smoothstep(0.64, 0.82, network);
    float growthCoordinate = fract(
        growthPoint.y * 0.055 + warp.x * 0.24 - time * 0.34
    );
    float growthHead = 1.0 - smoothstep(0.0, 0.2, growthCoordinate);
    float growthWake = 1.0 - smoothstep(0.2, 0.94, growthCoordinate);
    float branches = persistentBranch * (0.24 + growthWake * 0.66 + growthHead * 1.25);
    float vesselCoordinate = growthPoint.y * 0.52 + warp.x * 4.8 - time * 2.8;
    float pulse = pow(0.5 + 0.5 * sin(vesselCoordinate * 5.2), 11.0);
    pulse *= persistentBranch;

    vec2 sporeGrid = floor(growthPoint * 1.7);
    vec2 sporeLocal = fract(growthPoint * 1.7) - 0.5;
    vec2 sporeCenter = atelier_hash22(sporeGrid) - 0.5;
    float spore = 1.0 - smoothstep(0.025, 0.095, length(sporeLocal - sporeCenter));
    spore *= pow(0.5 + 0.5 * sin(time * 2.1 + atelier_hash21(sporeGrid) * 17.0), 5.0);
    spore *= smoothstep(0.46, 0.78, warp.y);

    vec3 tissue = accent_a * (0.75 + 0.25 * luma) + sourceColor * 0.018;
    vec3 vesselColor = mix(accent_b, accent_c, warp.x * 0.8 + pulse * 0.2);
    vesselColor *= 0.22 + 0.68 * branches + pulse * 1.9;
    vec3 result = tissue + vesselColor * branches;
    result += mix(accent_c, vec3(0.8, 1.0, 0.9), spore) * spore * 1.4;
    result += accent_b * edge * 0.12;
    result += accent_c * atelier_sat(curvature) * branches * 0.16;
    return result;
}`,
  },
  {
    id: 'atelier_cathedral_glass_caustics',
    name: 'Cathedral Glass Caustics',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Refractive Relics',
    description:
      'Animated stained-glass facets, dark lead seams, and refracted caustic light locked to sculptural relief.',
    speed: 0.42,
    intensity: 1.2,
    scale: 1.06,
    reliefDepth: 10.8,
    blackCut: 0.022,
    detail: 1.16,
    accentA: [0.015, 0.025, 0.05],
    accentB: [0.05, 0.55, 1.0],
    accentC: [1.0, 0.18, 0.38],
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
    vec2 glassPoint = point * (3.0 + detail * 1.2);
    glassPoint += vec2(
        sin(point.y * 2.2 + time * 0.23),
        cos(point.x * 1.7 - time * 0.19)
    ) * 0.22;
    vec2 cellDistances = atelier_voronoi(glassPoint);
    vec2 cellId = floor(glassPoint);
    float lead = 1.0 - smoothstep(0.025, 0.11, cellDistances.y - cellDistances.x);
    float cellSeed = atelier_hash21(cellId);
    float huePhase = fract(cellSeed + time * 0.035 + broadRelief * 0.14);
    vec3 glass = atelier_palette(huePhase, accent_b, accent_c, vec3(0.95, 0.75, 0.18));
    float causticA = pow(0.5 + 0.5 * sin(
        glassPoint.x * 2.2 + glassPoint.y * 1.4 + time * 1.35 + cellSeed * 8.0
    ), 6.0);
    float causticB = pow(0.5 + 0.5 * cos(
        glassPoint.y * 2.8 - glassPoint.x * 0.9 - time * 0.92 + curvature * 4.0
    ), 9.0);
    float refraction = causticA * 0.72 + causticB * 0.58;
    float facetLight = 0.38 + 0.55 * max(dot(
        normal,
        normalize(vec3(sin(time * 0.31), cos(time * 0.27), 0.8))
    ), 0.0);
    vec3 result = glass * (0.28 + luma * 0.32 + refraction * 1.25) * facetLight;
    result = mix(result, accent_a * 0.18, lead * 0.94);
    result += vec3(0.7, 0.86, 1.0) * pow(refraction, 3.0) * (1.0 - lead) * 0.46;
    result += mix(accent_b, accent_c, huePhase) * edge * 0.1;
    return result;
}`,
  },
  {
    id: 'atelier_obsidian_aurora_skin',
    name: 'Obsidian Aurora Skin',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Dark Minerals',
    description:
      'Polished volcanic glass carrying layered aurora curtains through highlights, ridges, and concave relief.',
    speed: 0.36,
    intensity: 1.38,
    scale: 1.14,
    reliefDepth: 14.2,
    blackCut: 0.026,
    detail: 1.2,
    accentA: [0.002, 0.004, 0.012],
    accentB: [0.0, 0.88, 0.7],
    accentC: [0.52, 0.08, 1.0],
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
    vec2 auroraPoint = point;
    float drift = atelier_fbm(vec2(point.x * 1.3 + time * 0.1, point.y * 0.8));
    float curtainA = atelier_line(
        point.x * 1.2 + 0.9 + sin(point.y * 2.3 - time * 1.18) * 0.3 +
            drift * 0.58 + sin(time * 0.74) * 0.16,
        0.2
    );
    float curtainB = atelier_line(
        point.x * 1.3 - 0.9 - cos(point.y * 3.1 + time * 0.96) * 0.24 -
            drift * 0.48 + cos(time * 0.63) * 0.18,
        0.16
    );
    float curtainC = atelier_line(
        point.x * 2.3 + 0.03 + sin(point.y * 1.6 + time * 0.82 + 2.0) * 0.38 +
            drift * 0.36 + sin(time * 0.51 + point.y) * 0.14,
        0.125
    );
    float curtain = curtainA * 0.65 + curtainB * 0.78 + curtainC * 0.52;
    curtain *= 0.45 + 0.55 * smoothstep(-0.7, 0.9, point.y + drift * 0.4);
    float shimmer = pow(0.5 + 0.5 * sin(
        point.y * 17.0 + drift * 9.0 - time * 1.7
    ), 7.0);
    shimmer *= curtain;

    vec3 reflected = reflect(normalize(vec3(point * 0.24, -1.0)), normal);
    float glassSpecular = pow(atelier_sat(reflected.z), 13.0);
    float horizon = pow(1.0 - abs(normal.y), 5.0);
    vec3 aurora = mix(accent_b, accent_c, atelier_sat(point.y * 0.34 + drift));
    aurora = mix(aurora, vec3(0.75, 0.96, 1.0), shimmer);
    vec3 obsidian = accent_a + vec3(0.012, 0.018, 0.035) * (0.3 + luma);
    vec3 result = obsidian + aurora * curtain * (0.34 + 0.52 * luma);
    result += aurora * shimmer * 0.8;
    result += vec3(0.62, 0.72, 0.9) * glassSpecular * (0.23 + horizon * 0.42);
    result += accent_b * edge * 0.075;
    return result;
}`,
  },
  {
    id: 'atelier_ferrofluid_crown',
    name: 'Ferrofluid Crown',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Magnetic Matter',
    description:
      'A black ferrofluid membrane forms animated magnetic spikes and interference crowns across the object surface.',
    speed: 0.52,
    intensity: 1.32,
    scale: 1.08,
    reliefDepth: 13.4,
    blackCut: 0.024,
    detail: 1.28,
    accentA: [0.002, 0.005, 0.008],
    accentB: [0.02, 0.72, 0.92],
    accentC: [0.84, 0.95, 1.0],
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
    vec2 gridScale = vec2(5.3 + detail * 0.9, 4.2 + detail * 0.6);
    vec2 gridPoint = point * gridScale;
    vec2 cell = floor(gridPoint);
    vec2 local = fract(gridPoint) - 0.5;
    vec2 cellPosition = (cell + 0.5) / gridScale;
    vec2 magnetA = vec2(0.58 * sin(time * 0.82), 0.38 * cos(time * 0.61));
    vec2 magnetB = vec2(-0.62 * cos(time * 0.67), 0.34 * sin(time * 0.93));
    vec2 toA = magnetA - cellPosition;
    vec2 toB = magnetB - cellPosition;
    vec2 fieldVector = toA / (dot(toA, toA) + 0.08) -
        toB / (dot(toB, toB) + 0.08);
    float fieldAngle = atan(fieldVector.y, fieldVector.x);
    vec2 needlePoint = atelier_rot(-fieldAngle) * local;
    float fieldStrength = clamp(length(fieldVector) * 0.12, 0.0, 1.0);
    float needleLength = 0.2 + fieldStrength * 0.25;
    float needleWidth = 0.025 + (needleLength - needlePoint.x) * 0.105;
    float needleDistance = max(
        abs(needlePoint.x) - needleLength,
        abs(needlePoint.y) - needleWidth
    );
    float needle = 1.0 - smoothstep(0.0, 0.045, needleDistance);
    float bulb = 1.0 - smoothstep(
        0.09 + fieldStrength * 0.05,
        0.16 + fieldStrength * 0.05,
        length(needlePoint + vec2(needleLength * 0.72, 0.0))
    );
    float inversion = 0.5 + 0.5 * sin(time * 1.18 + atelier_hash21(cell) * 5.0);
    float crown = atelier_sat(needle * (0.46 + inversion * 0.54) + bulb * 0.72);
    float fieldPhase = fract(fieldAngle / ATELIER_TAU + 0.5);
    float crossSection = sqrt(max(
        0.0,
        1.0 - pow(clamp(abs(needlePoint.y) / max(needleWidth, 0.02), 0.0, 1.0), 2.0)
    ));
    float axialShape = smoothstep(
        needleLength,
        -needleLength * 0.74,
        needlePoint.x
    );
    float spikeHeight = crown * crossSection * (0.42 + axialShape * 0.58);
    vec3 spikeNormal = normalize(vec3(
        -needlePoint.x / max(needleLength, 0.05),
        -needlePoint.y / max(needleWidth * 2.8, 0.06),
        0.78 + spikeHeight
    ));

    vec3 lightDirection = normalize(vec3(
        sin(time * 0.7),
        cos(time * 0.53),
        0.74
    ));
    float blackSpecular = pow(max(dot(reflect(-lightDirection, normal), vec3(0.0, 0.0, 1.0)), 0.0), 42.0);
    float spikeSpecular = pow(max(
        dot(reflect(-lightDirection, spikeNormal), vec3(0.0, 0.0, 1.0)),
        0.0
    ), 26.0);
    float rim = pow(1.0 - max(normal.z, 0.0), 3.2);
    vec3 fluid = accent_a + vec3(0.008, 0.012, 0.016) * (0.28 + luma * 0.3);
    vec3 magneticLight = mix(
        vec3(0.025, 0.045, 0.055),
        mix(accent_b, accent_c, fieldPhase),
        spikeSpecular * 0.74 + crossSection * 0.12
    );
    vec3 result = fluid + magneticLight * spikeHeight * (0.2 + luma * 0.18);
    result += vec3(0.94, 0.985, 1.0) * spikeSpecular * spikeHeight * 1.45;
    result += vec3(0.34, 0.66, 0.76) * crossSection * crown * 0.09;
    result += vec3(0.9, 0.97, 1.0) * blackSpecular * (0.12 + crown * 0.64);
    result += accent_b * rim * 0.055 + accent_c * edge * crown * 0.04;
    return result;
}`,
  },
  {
    id: 'atelier_alchemical_vein_reactor',
    name: 'Alchemical Vein Reactor',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Living Networks',
    description:
      'A reaction-diffusion vessel with circulating plasma veins, catalytic glyph rings, and heat pooling in concavity.',
    speed: 0.64,
    intensity: 1.26,
    scale: 1.1,
    reliefDepth: 12.2,
    blackCut: 0.024,
    detail: 1.26,
    accentA: [0.012, 0.006, 0.025],
    accentB: [1.0, 0.18, 0.04],
    accentC: [0.14, 0.95, 0.48],
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
    vec2 reactorPoint = point * (2.9 + detail * 0.65);
    float reagentA = atelier_fbm(reactorPoint + vec2(time * 0.21, -time * 0.14));
    float reagentB = atelier_fbm(
        atelier_rot(1.1) * reactorPoint * 1.17 + vec2(-time * 0.16, time * 0.19) + 9.3
    );
    float reaction = abs(reagentA - reagentB);
    float membrane = 1.0 - smoothstep(0.045, 0.18, reaction);
    float branch = smoothstep(0.61, 0.9, atelier_ridged(
        reactorPoint + vec2(reagentA, reagentB) * 2.3
    ));
    float vessels = atelier_sat(membrane * 0.78 + branch * 0.58);
    float pulsePath = reactorPoint.x * 0.46 + reactorPoint.y * 0.29;
    pulsePath += (reagentA - reagentB) * 5.0 - time * 1.25;
    float pulse = pow(0.5 + 0.5 * sin(pulsePath * 4.2), 9.0) * vessels;

    float radius = length(point);
    float angle = atan(point.y, point.x);
    float glyphRing = atelier_line(radius - 0.48 - 0.06 * sin(time * 0.38), 0.014);
    glyphRing *= step(0.38, fract((angle / ATELIER_TAU + 0.5) * 24.0 + time * 0.06));
    float innerGlyph = atelier_line(radius - 0.25, 0.01);
    innerGlyph *= 0.5 + 0.5 * sin(angle * 12.0 - time * 1.1);
    float glyphs = atelier_sat(glyphRing + innerGlyph);

    float heat = atelier_sat(-curvature * 0.7 + broadRelief * 0.35 + reagentA * 0.4);
    vec3 cold = mix(accent_a, accent_c * 0.38, reagentB);
    vec3 hot = mix(accent_b, vec3(1.0, 0.84, 0.2), pulse);
    vec3 result = cold * (0.18 + luma * 0.22);
    result += mix(accent_c, hot, heat) * vessels * (0.46 + pulse * 1.28);
    result += vec3(1.0, 0.72, 0.24) * glyphs * (0.55 + 0.45 * sin(time * 1.8));
    result += hot * edge * 0.085;
    return result;
}`,
  },
  {
    id: 'atelier_holographic_scarab_shell',
    name: 'Holographic Scarab Shell',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Diffractive Armor',
    description:
      'Bilateral scarab armor splits the surface into diffractive wing plates, micro-lattices, and a luminous central carapace.',
    speed: 0.34,
    intensity: 1.18,
    scale: 1.04,
    reliefDepth: 11.8,
    blackCut: 0.023,
    detail: 1.22,
    accentA: [0.014, 0.02, 0.055],
    accentB: [0.0, 0.82, 0.92],
    accentC: [0.96, 0.14, 0.72],
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
    vec2 shellPoint = vec2(abs(point.x), point.y);
    vec2 upperWingPoint = (shellPoint - vec2(0.3, 0.2)) / vec2(0.52, 0.44);
    vec2 lowerWingPoint = (shellPoint - vec2(0.34, -0.27)) / vec2(0.58, 0.38);
    float diagonalHinge = atelier_line(
        shellPoint.y + shellPoint.x * 0.62 - 0.03 - sin(time * 0.63) * 0.055,
        0.025
    );
    diagonalHinge *= smoothstep(0.08, 0.74, shellPoint.x);
    float wingAngle = atan(shellPoint.y, shellPoint.x - 0.16);
    float platePhase = fract(
        wingAngle / ATELIER_TAU * 7.0 +
        length(shellPoint) * 1.34 +
        time * 0.035
    );
    float radialPlate = 1.0 - smoothstep(
        0.018,
        0.07,
        min(platePhase, 1.0 - platePhase)
    );
    radialPlate *= smoothstep(0.12, 0.82, shellPoint.x);
    float plateSeam = atelier_sat(diagonalHinge + radialPlate * 0.82);
    vec2 latticePoint = shellPoint * vec2(7.0, 5.4);
    vec2 latticeCell = fract(latticePoint) - 0.5;
    float lattice = atelier_line(atelier_hexDistance(latticeCell) - 0.34, 0.045);
    lattice *= smoothstep(0.1, 0.74, shellPoint.x) * 0.28;
    float carapace = smoothstep(0.11, 0.0, shellPoint.x);
    carapace *= smoothstep(1.1, 0.14, abs(point.y));
    float spine = atelier_line(shellPoint.x, 0.017) * (0.5 + 0.5 * sin(point.y * 38.0 - time));

    vec3 viewVector = normalize(vec3(point * 0.25, 1.0));
    float diffraction = dot(normal, viewVector) * 1.6 + curvature * 0.22;
    diffraction += wingAngle * 0.42 + shellPoint.x * 1.7 - time * 1.18;
    vec3 iridescence = atelier_palette(
        fract(diffraction),
        accent_b,
        accent_c,
        vec3(0.72, 0.96, 0.28)
    );
    float upperFill = smoothstep(1.08, 0.16, length(upperWingPoint));
    float lowerFill = smoothstep(1.08, 0.16, length(lowerWingPoint));
    float wingFill = max(upperFill, lowerFill);
    plateSeam *= wingFill;
    float upperDome = sqrt(max(
        0.0,
        1.0 - min(dot(upperWingPoint, upperWingPoint), 1.0)
    ));
    float lowerDome = sqrt(max(
        0.0,
        1.0 - min(dot(lowerWingPoint, lowerWingPoint), 1.0)
    ));
    float plateFacet = 0.52 + 0.48 * cos(platePhase * ATELIER_TAU);
    float hingePhase = 0.5 + 0.5 * sin(time * 2.0 + wingAngle * 2.0);
    float plateLight = 0.22 + 0.72 * pow(max(normal.z, 0.0), 2.0);
    vec3 result = accent_a * (0.72 + luma * 0.12);
    vec3 upperColor = mix(accent_b, accent_c, hingePhase);
    vec3 lowerColor = mix(accent_c, vec3(0.18, 0.92, 0.82), 1.0 - hingePhase);
    result *= 1.0 - wingFill * (1.0 - plateFacet) * 0.48;
    result += upperColor * upperFill * upperDome * plateLight *
        (0.22 + hingePhase * 0.42);
    result += lowerColor * lowerFill * lowerDome * plateLight *
        (0.2 + (1.0 - hingePhase) * 0.4);
    result += iridescence * wingFill * plateLight * 0.18;
    result += mix(iridescence, vec3(0.86, 0.96, 1.0), hingePhase) *
        plateSeam * (0.32 + max(upperDome, lowerDome) * 0.38);
    result += iridescence * lattice * 0.22;
    result += mix(accent_c, vec3(0.88, 1.0, 1.0), carapace) * carapace * 0.58;
    result += vec3(1.0) * spine * 0.4 + iridescence * edge * 0.08;
    return result;
}`,
  },
  {
    id: 'atelier_porcelain_storm_archive',
    name: 'Porcelain Storm Archive',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Atmospheric Ceramics',
    description:
      'Cloud strata drift beneath translucent porcelain while branching lightning records itself into cracks and edges.',
    speed: 0.4,
    intensity: 1.16,
    scale: 1.12,
    reliefDepth: 13.0,
    blackCut: 0.023,
    detail: 1.2,
    accentA: [0.025, 0.035, 0.07],
    accentB: [0.28, 0.62, 1.0],
    accentC: [0.92, 0.96, 1.0],
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
    vec2 cloudPoint = point * vec2(1.55, 2.35);
    float cloudA = atelier_fbm(cloudPoint + vec2(time * 0.18, -time * 0.04));
    float cloudB = atelier_fbm(
        cloudPoint * 1.83 + vec2(-time * 0.11, time * 0.07) + 8.0
    );
    float cloudBody = smoothstep(0.33, 0.78, cloudA * 0.66 + cloudB * 0.46);
    float stormFront = smoothstep(0.1, 0.82, cloudA - cloudB * 0.42 + 0.31);

    vec2 boltPoint = point * (5.8 + detail);
    float boltWarp = atelier_fbm(vec2(
        boltPoint.y * 0.82 - time * 0.42,
        boltPoint.x * 0.31
    ));
    float boltCenter = sin(boltPoint.y * 0.62 + time * 0.7) * 0.8;
    boltCenter += (boltWarp - 0.5) * 3.2;
    float bolt = atelier_line(boltPoint.x - boltCenter, 0.055);
    float fork = atelier_line(
        boltPoint.x + boltPoint.y * 0.28 - boltCenter * 0.72,
        0.035
    );
    bolt = atelier_sat(bolt + fork * smoothstep(0.48, 0.78, cloudB));
    float strikeEnvelope = pow(0.5 + 0.5 * sin(time * 0.83), 18.0);
    bolt *= 0.12 + strikeEnvelope * 1.8;

    vec3 porcelain = mix(
        vec3(0.04, 0.055, 0.095),
        vec3(0.48, 0.57, 0.7),
        luma * 0.58 + max(normal.z, 0.0) * 0.2
    );
    vec3 storm = mix(accent_a, accent_b, stormFront);
    vec3 result = mix(porcelain, storm, cloudBody * 0.62);
    result += accent_b * cloudB * cloudBody * 0.34;
    result += accent_c * bolt * (0.85 + edge);
    result += accent_b * atelier_sat(-curvature) * 0.13;
    result += accent_c * edge * 0.055;
    return result;
}`,
  },
  {
    id: 'atelier_lunar_fossil_tides',
    name: 'Lunar Fossil Tides',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Geological Memory',
    description:
      'Pearly fossil chambers and tidal sediment lines surface from the object as if moonlit stone were breathing.',
    speed: 0.28,
    intensity: 1.24,
    scale: 1.08,
    reliefDepth: 12.7,
    blackCut: 0.023,
    detail: 1.24,
    accentA: [0.018, 0.027, 0.045],
    accentB: [0.38, 0.7, 0.88],
    accentC: [0.95, 0.72, 0.48],
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
    vec2 fossilField = point * vec2(2.25, 1.72);
    vec2 fossilCell = floor(fossilField);
    vec2 fossilPoint = fract(fossilField) - 0.5;
    fossilPoint -= (atelier_hash22(fossilCell) - 0.5) * 0.22;
    float fossilRadius = length(fossilPoint);
    float fossilAngle = atan(fossilPoint.y, fossilPoint.x);
    float spiralCoordinate = log(fossilRadius + 0.055) * 2.9 - fossilAngle * 1.35;
    float spiral = atelier_line(
        sin(spiralCoordinate * 2.65 - time * 0.56),
        0.16
    );
    spiral *= smoothstep(0.48, 0.08, fossilRadius);
    float chamberWalls = atelier_line(
        sin(fossilAngle * (8.0 + mod(fossilCell.x + fossilCell.y, 3.0)) +
            log(fossilRadius + 0.07) * 2.2),
        0.2
    );
    chamberWalls *= smoothstep(0.46, 0.1, fossilRadius);
    float shellWall = atelier_sat(spiral + chamberWalls * 0.48);
    float chamberGlow = pow(1.0 - smoothstep(0.08, 0.42, fossilRadius), 2.0);

    float strataNoise = atelier_fbm(point * vec2(0.78, 2.6) + vec2(time * 0.08, 0.0));
    float strataCoordinate = point.y * 9.2 + strataNoise * 4.4 - time * 0.62;
    float strata = pow(0.5 + 0.5 * sin(strataCoordinate), 13.0);
    float tideFront = fract(point.x * 0.11 + point.y * 0.19 - time * 0.16);
    float tide = smoothstep(0.08, 0.34, tideFront) * (1.0 - smoothstep(0.64, 0.94, tideFront));
    float nacrePhase = dot(normal.xy, vec2(0.73, -0.52)) + tide * 0.35 + time * 0.11;
    vec3 nacre = atelier_palette(
        fract(nacrePhase),
        accent_b,
        vec3(0.72, 0.48, 0.9),
        accent_c
    );
    vec3 stone = mix(accent_a, vec3(0.14, 0.18, 0.24), luma * 0.68);
    stone *= 0.72 + 0.24 * max(normal.z, 0.0);
    vec3 result = stone + nacre * shellWall * (0.52 + tide * 0.92);
    result += mix(accent_b, accent_c, tide) * chamberGlow * (0.12 + tide * 0.56);
    result += accent_c * strata * (0.16 + 0.22 * atelier_sat(curvature));
    result += nacre * edge * 0.06;
    return result;
}`,
  },
  {
    id: 'atelier_liquid_chrome_tectonics',
    name: 'Liquid Chrome Tectonics',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: 'Atelier · Kinetic Metallurgy',
    description:
      'Monumental chrome plates drift over deep black faults while liquid metal wells, reflects, and sends spectral pressure through the mapped relief.',
    speed: 0.36,
    intensity: 1.26,
    scale: 1.03,
    reliefDepth: 15.6,
    blackCut: 0.026,
    detail: 1.08,
    accentA: [0.003, 0.006, 0.01],
    accentB: [0.08, 0.58, 0.82],
    accentC: [1.0, 0.66, 0.18],
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
    vec2 drift = vec2(
        sin(time * 0.41) * 0.19,
        cos(time * 0.33) * 0.14
    );
    vec2 platePoint = atelier_rot(0.18 + sin(time * 0.12) * 0.05) *
        point * (2.05 + detail * 0.14) + drift;
    platePoint += vec2(
        atelier_noise(point * 0.72 + time * 0.08),
        atelier_noise(point * 0.72 - time * 0.065 + 9.3)
    ) * 0.22;

    vec2 tectonicDistance = atelier_voronoi(platePoint);
    float faultDistance = tectonicDistance.y - tectonicDistance.x;
    float fault = 1.0 - smoothstep(0.025, 0.12, faultDistance);
    float faultCore = 1.0 - smoothstep(0.008, 0.042, faultDistance);
    float plateInterior = smoothstep(0.07, 0.21, faultDistance);
    float plateDome = sqrt(max(
        0.0,
        1.0 - pow(clamp(tectonicDistance.x / 0.72, 0.0, 1.0), 2.0)
    ));

    vec2 shadowDistance = atelier_voronoi(platePoint + vec2(0.085, -0.11));
    float shiftedFault = 1.0 - smoothstep(
        0.035,
        0.14,
        shadowDistance.y - shadowDistance.x
    );
    float faultShadow = max(shiftedFault - fault, 0.0);
    float pressure = atelier_fbm(point * 0.94 + vec2(time * 0.11, -time * 0.045));
    pressure = smoothstep(0.36, 0.82, pressure + broadRelief * 0.16);
    float pressureFront = atelier_line(
        sin(point.x * 2.2 - point.y * 1.3 + time * 0.72 + pressure * 4.0),
        0.16
    );
    pressureFront *= plateInterior;

    vec3 lightDirection = normalize(vec3(
        sin(time * 0.47) * 0.72,
        cos(time * 0.39) * 0.58,
        0.82
    ));
    float mirror = pow(max(
        dot(reflect(-lightDirection, normal), vec3(0.0, 0.0, 1.0)),
        0.0
    ), 34.0);
    float grazing = pow(1.0 - max(normal.z, 0.0), 2.6);
    float metalPhase = fract(
        dot(normal.xy, vec2(0.63, -0.78)) * 0.7 +
        tectonicDistance.x * 0.82 + time * 0.075
    );
    vec3 chrome = atelier_palette(
        metalPhase,
        vec3(0.055, 0.075, 0.092),
        vec3(0.68, 0.82, 0.9),
        accent_b
    );
    chrome *= 0.18 + plateDome * 0.56 + mirror * 0.92;

    float moltenPulse = 0.5 + 0.5 * sin(
        point.x * 5.2 + point.y * 3.1 - time * 1.7 + pressure * 8.0
    );
    vec3 faultLight = mix(accent_b, accent_c, moltenPulse);
    vec3 result = accent_a * (0.38 + luma * 0.08);
    result *= 1.0 - faultShadow * 0.88;
    result += chrome * plateInterior * (0.56 + luma * 0.18);
    result += vec3(0.9, 0.96, 1.0) * mirror * plateInterior * 0.8;
    result += faultLight * fault * (0.14 + moltenPulse * 0.42);
    result += vec3(0.005, 0.008, 0.012) * faultCore;
    result += mix(accent_b, accent_c, pressure) * pressureFront *
        (0.18 + pressure * 0.46);
    result += vec3(0.46, 0.72, 0.86) * grazing * plateInterior * 0.18;
    result += faultLight * edge * plateInterior * 0.07;
    return result;
}`,
  },
];

export const atelierSculpturePresetList = sculptureSpecs.map(buildMaskedAtelierPreset);
