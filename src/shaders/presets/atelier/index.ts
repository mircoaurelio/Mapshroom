import { atelierDrawingPresetList } from './drawing';
import { atelierSculpturePresetList } from './sculpture';
import { atelierStagePresetList } from './stage';

export {
  atelierDrawingPresetList,
  atelierSculpturePresetList,
  atelierStagePresetList,
};

export const projectionAtelierCandidateList = [
  ...atelierSculpturePresetList,
  ...atelierStagePresetList,
  ...atelierDrawingPresetList,
];

/**
 * A candidate is not exposed in the preset browser until its six-frame review
 * board clears the 8/10 visual gate.
 */
export const projectionAtelierReviewScores: Readonly<Record<string, number>> = {
  atelier_alchemical_vein_reactor: 8,
  atelier_architectural_xray_choir: 8.25,
  atelier_bioluminescent_mycelium: 8,
  atelier_blueprint_ghost_anatomy: 8.25,
  atelier_calligraphic_smoke_memory: 8.25,
  atelier_cathedral_glass_caustics: 8,
  atelier_celestial_orrery_facade: 8.75,
  atelier_cubist_chromatic_recomposition: 8.25,
  atelier_electric_copperplate_etching: 8,
  atelier_holographic_scarab_shell: 8,
  atelier_ink_constellation_engine: 8.25,
  atelier_kintsugi_singularity: 8.25,
  atelier_living_oil_impasto: 8.25,
  atelier_lunar_fossil_tides: 8.25,
  atelier_mercury_reliquary: 8,
  atelier_moorish_plasma_lattice: 8,
  atelier_neon_rain_topography: 8,
  atelier_obsidian_aurora_skin: 8,
  atelier_porcelain_storm_archive: 8,
  atelier_solar_flare_tessellation: 8,
};

export const projectionAtelierPresetList = projectionAtelierCandidateList.filter(
  (preset) => (projectionAtelierReviewScores[preset.id] ?? 0) >= 8,
);

if (projectionAtelierPresetList.length < 20) {
  throw new Error(
    `Projection Atelier quality gate requires 20 reviewed presets; found ${projectionAtelierPresetList.length}.`,
  );
}
