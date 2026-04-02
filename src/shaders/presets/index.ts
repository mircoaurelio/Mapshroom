import type { ShaderDefinition } from '../../types';
import { cyberGlitchShader } from './cyberGlitch';
import { crosshatchShadeShader } from './crosshatchShade';
import { duotoneRelicShader } from './duotoneRelic';
import { engravedEmbossShader } from './engravedEmboss';
import { halftoneTempleShader } from './halftoneTemple';
import { inkBloomShader } from './inkBloom';
import { invertedNeonShader } from './invertedNeon';
import { marbleDriftShader } from './marbleDrift';
import { monochromeBleedShader } from './monochromeBleed';
import { neonGlowShader } from './neonGlow';
import { noiseMirageShader } from './noiseMirage';
import { oracleRippleShader } from './oracleRipple';
import { pixelShrineShader } from './pixelShrine';
import { pixelSortShader } from './pixelSort';
import { posterThresholdShader } from './posterThreshold';
import { psychedelicBlobShader } from './psychedelicBlob';
import { psychedelicHaloShader } from './psychedelicHalo';
import { psychedelicHaloOnlyShader } from './psychedelicHaloOnly';
import { pulsingSoftHaloShader } from './pulsingSoftHalo';
import { radialCrownShader } from './radialCrown';
import { ritualKaleidoscopeShader } from './ritualKaleidoscope';
import { scanlineApparitionShader } from './scanlineApparition';
import { softPsychedelicHaloShader } from './softPsychedelicHalo';
import { solarOutlineShader } from './solarOutline';
import { strobeContourShader } from './strobeContour';
import { thermalVisionShader } from './thermalVision';
import { vortexInkShader } from './vortexInk';
import { watercolorShader } from './watercolor';

type ShaderSeed = Pick<ShaderDefinition, 'id' | 'name' | 'code'> &
  Partial<Pick<ShaderDefinition, 'description' | 'group'>>;

function withMeta(shader: ShaderSeed, description: string, group: string): ShaderDefinition {
  return {
    description,
    group,
    ...shader,
  };
}

export const shaderPresetList: ShaderDefinition[] = [
  psychedelicBlobShader,
  withMeta(
    psychedelicHaloShader,
    'Animated dark halos and echo distortion around line work.',
    'Glow',
  ),
  withMeta(
    psychedelicHaloOnlyShader,
    'Pure halo treatment that leaves the base image more intact.',
    'Glow',
  ),
  withMeta(
    softPsychedelicHaloShader,
    'A softer halo bloom with gentler motion and color drift.',
    'Glow',
  ),
  withMeta(
    pulsingSoftHaloShader,
    'Breathing halo pulses that keep the paper texture readable.',
    'Glow',
  ),
  withMeta(neonGlowShader, 'Neon edge glow for dark contours.', 'Glow'),
  withMeta(pixelSortShader, 'Pixel-sorted distortion for glitchy line work.', 'Motion'),
  withMeta(thermalVisionShader, 'False-color thermal mapping over the source.', 'Color'),
  withMeta(watercolorShader, 'Bleeding watercolor wash with soft distortions.', 'Color'),
  cyberGlitchShader,
  duotoneRelicShader,
  halftoneTempleShader,
  crosshatchShadeShader,
  engravedEmbossShader,
  posterThresholdShader,
  invertedNeonShader,
  ritualKaleidoscopeShader,
  oracleRippleShader,
  noiseMirageShader,
  radialCrownShader,
  pixelShrineShader,
  scanlineApparitionShader,
  marbleDriftShader,
  monochromeBleedShader,
  solarOutlineShader,
  strobeContourShader,
  inkBloomShader,
  vortexInkShader,
];

export const shaderPresets: Record<string, ShaderDefinition> = Object.fromEntries(
  shaderPresetList.map((shader) => [shader.id, shader]),
);
