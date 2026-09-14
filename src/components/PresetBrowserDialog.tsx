import { useEffect, useState } from 'react';
import type { SavedShader, ShaderTemplate } from '../types';
import { ShaderThumbnail } from './ShaderThumbnail';

const TEMPLATE_ORDER: ShaderTemplate[] = ['sculpture', 'stage', 'drawing'];
const TEMPLATE_LABELS: Record<ShaderTemplate, string> = {
  stage: 'Stage',
  drawing: 'Drawing',
  sculpture: 'Sculpture',
};
type PresetBrowserCategory =
  | ShaderTemplate
  | 'paintings'
  | 'audio-reactive';
const PRESET_CATEGORY_ORDER: PresetBrowserCategory[] = [
  'sculpture',
  'stage',
  'drawing',
  'paintings',
  'audio-reactive',
];
const PRESET_CATEGORY_LABELS: Record<PresetBrowserCategory, string> = {
  ...TEMPLATE_LABELS,
  paintings: 'Paintings',
  'audio-reactive': 'Audio Reactive',
};
const PAINTING_PRESET_GROUPS = new Set([
  'Ink Halos',
  'Ink Flow',
  'Patina Flow',
  'Organic Motion',
  'Masks & Contrast',
]);
const TEMPLATE_SEARCH_ALIASES: Record<ShaderTemplate, string[]> = {
  stage: ['stage', 'stages', 'projection', 'projections', 'mapping', 'palco', 'proiezione'],
  drawing: ['drawing', 'drawings', 'illustration', 'sketch', 'disegno', 'disegni'],
  sculpture: [
    'sculpture',
    'sculptures',
    'statue',
    'statues',
    'statua',
    'scultura',
    'sculture',
    'object',
    'objects',
  ],
};
const GROUP_ORDER: Record<ShaderTemplate, string[]> = {
  stage: [
    'Halos',
    'Scanners',
    'Lights',
    'Geometry',
    'Dots & Grids',
    'Spirals',
    'Organic Motion',
    'Eyes & Entities',
    'Fractals',
    'Masks & Contrast',
    'Experimental',
  ],
  drawing: [
    'Base',
    'Ink Halos',
    'Ink Flow',
    'Scanner Bands',
    'Op Art',
    'Crosshatch Ritual',
  ],
  sculpture: [
    'Base',
    'Relief Halos',
    'Chrome Relief',
    'Laser Relief',
    'Structural Relief',
    'Patina Flow',
    'Recovered Timeline',
    'Recovered Online',
    'Imported',
    'Saved',
    'Halos',
    'Scanners',
    'Lights',
    'Geometry',
    'Dots & Grids',
    'Spirals',
    'Organic Motion',
    'Eyes & Entities',
    'Fractals',
    'Masks & Contrast',
    'Experimental',
  ],
};
const FAVORITE_PRESETS_STORAGE_KEY = 'mapshroom-v3:favorite-shaders';

function loadFavoritePresetIds(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITE_PRESETS_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch { return new Set(); }
}

function saveFavoritePresetIds(ids: Set<string>) {
  try { localStorage.setItem(FAVORITE_PRESETS_STORAGE_KEY, JSON.stringify([...ids].sort())); }
  catch { /* Favorites remain usable for this session when storage is unavailable. */ }
}

export type PresetSelectionAction = 'replace-current' | 'create-new';

interface PresetBrowserDialogProps {
  open: boolean;
  presets: SavedShader[];
  activeShaderId: string;
  assetUrl: string | null;
  currentShaderName: string;
  canReplaceCurrent: boolean;
  onSelect: (shaderId: string, action: PresetSelectionAction) => void;
  onClose: () => void;
}

function getPresetGroup(preset: SavedShader): string {
  if (preset.group?.trim()) {
    return preset.group;
  }

  return 'Saved';
}

function isTimelineLinkedPreset(preset: SavedShader): boolean {
  return Boolean(
    preset.isTemporary ||
      preset.ownerTimelineStepId ||
      getPresetGroup(preset) === 'Timeline',
  );
}

function getPresetDisplayGroup(
  preset: SavedShader,
  presetById: Map<string, SavedShader>,
): string {
  if (!isTimelineLinkedPreset(preset)) {
    return getPresetGroup(preset);
  }

  const sourcePreset = preset.sourceShaderId
    ? presetById.get(preset.sourceShaderId)
    : null;
  const sourceGroup = sourcePreset ? getPresetGroup(sourcePreset) : '';
  return sourceGroup && sourceGroup !== 'Timeline' ? sourceGroup : 'Saved';
}

function getPresetTemplate(preset: SavedShader): ShaderTemplate {
  return preset.template ?? 'sculpture';
}

function getPresetTemplates(preset: SavedShader): ShaderTemplate[] {
  const templates = preset.templates?.filter((template) => TEMPLATE_ORDER.includes(template));
  return templates?.length ? templates : [getPresetTemplate(preset)];
}

function isAudioReactivePreset(
  preset: SavedShader,
  presetById: Map<string, SavedShader>,
): boolean {
  return Boolean(
    preset.audioReactiveBindings ||
      getPresetDisplayGroup(preset, presetById) === 'Audio Reactive',
  );
}

function matchesPresetCategory(
  preset: SavedShader,
  category: PresetBrowserCategory,
  presetById: Map<string, SavedShader>,
): boolean {
  const isAudioReactive = isAudioReactivePreset(preset, presetById);
  if (category === 'audio-reactive') {
    return isAudioReactive;
  }
  if (isAudioReactive) {
    return false;
  }
  if (category === 'paintings') {
    return PAINTING_PRESET_GROUPS.has(
      getPresetDisplayGroup(preset, presetById),
    );
  }

  return getPresetTemplates(preset).includes(category);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getEditDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function scoreSearchToken(token: string, value: string): number {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) {
    return -1;
  }
  if (normalizedValue === token) {
    return 100;
  }
  if (normalizedValue.startsWith(token)) {
    return 82;
  }

  const words = normalizedValue.split(' ').filter(Boolean);
  if (words.some((word) => word === token)) {
    return 76;
  }
  if (words.some((word) => word.startsWith(token))) {
    return 68;
  }
  if (normalizedValue.includes(token)) {
    return 58;
  }
  if (token.length < 3) {
    return -1;
  }

  const maximumDistance = token.length >= 7 ? 2 : 1;
  const closestDistance = words.reduce(
    (distance, word) =>
      Math.abs(word.length - token.length) <= maximumDistance
        ? Math.min(distance, getEditDistance(token, word))
        : distance,
    Number.POSITIVE_INFINITY,
  );

  return closestDistance <= maximumDistance ? 40 - closestDistance * 8 : -1;
}

function getPresetSearchScore(preset: SavedShader, searchTokens: string[]): number | null {
  const presetTemplates = getPresetTemplates(preset);
  const fields = [
    { value: preset.name, weight: 35 },
    { value: preset.group ?? '', weight: 18 },
    {
      value: presetTemplates
        .flatMap((template) => [
          TEMPLATE_LABELS[template],
          ...TEMPLATE_SEARCH_ALIASES[template],
        ])
        .join(' '),
      weight: 15,
    },
    { value: preset.description ?? '', weight: 6 },
    { value: preset.id, weight: 2 },
  ];

  let totalScore = 0;
  for (const token of searchTokens) {
    const bestFieldScore = fields.reduce((bestScore, field) => {
      const tokenScore = scoreSearchToken(token, field.value);
      return tokenScore < 0 ? bestScore : Math.max(bestScore, tokenScore + field.weight);
    }, -1);

    if (bestFieldScore < 0) {
      return null;
    }
    totalScore += bestFieldScore;
  }

  return totalScore;
}

function sortGroups(
  category: PresetBrowserCategory,
  left: string,
  right: string,
): number {
  const order =
    category === 'audio-reactive'
      ? ['Audio Reactive']
      : category === 'paintings'
        ? [...PAINTING_PRESET_GROUPS]
        : GROUP_ORDER[category];
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right);
  }
  if (leftIndex === -1) {
    return 1;
  }
  if (rightIndex === -1) {
    return -1;
  }

  return leftIndex - rightIndex;
}

function PreviewCard({ preset, displayGroup, isTimelineLinked, isActive, isFavorite, onToggleFavorite, onSelect }: {
  preset: SavedShader; displayGroup: string; isTimelineLinked: boolean; isActive: boolean;
  isFavorite: boolean; onToggleFavorite: () => void; onSelect: () => void;
}) {
  return (
    <article className={`preset-preview-card ${isActive ? 'preset-preview-card-active' : ''}`}
      role="button" tabIndex={0} onClick={onSelect} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); }
      }}>
      <div className="preset-preview-shell"><ShaderThumbnail shader={preset} /></div>
      <div className="preset-preview-meta">
        <div className="preset-preview-header">
          <span className="preset-preview-name">{preset.name}</span>
          <span className="preset-preview-header-actions">
            {isTimelineLinked ? (
              <span
                className="preset-timeline-symbol"
                role="img"
                aria-label="Linked to timeline"
                title="Linked to timeline"
              >
                <i />
                <i />
                <i />
              </span>
            ) : null}
            {preset.audioReactiveBindings ? (
              <span
                className="preset-audio-symbol"
                role="img"
                aria-label="Audio Reactive preset"
                title="Audio Reactive preset"
              >
                <i />
                <i />
                <i />
              </span>
            ) : null}
            <button
              type="button"
              className={`preset-favorite-button ${
                isFavorite ? 'preset-favorite-button-active' : ''
              }`}
              aria-label={
                isFavorite
                  ? `Remove ${preset.name} from favorites`
                  : `Add ${preset.name} to favorites`
              }
              aria-pressed={isFavorite}
              title={isFavorite ? 'Remove favorite' : 'Add favorite'}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            >
              ★
            </button>
            <span className="preset-preview-tag">
              {isActive ? 'Active' : isFavorite ? 'Favorite' : displayGroup}
            </span>
          </span>
        </div>
        <p className="preset-preview-copy">
          {preset.description ?? 'Shader preset ready to load into the stage.'}
        </p>
      </div>
    </article>
  );
}

export function PresetBrowserDialog({
  open,
  presets,
  activeShaderId,
  currentShaderName,
  canReplaceCurrent,
  onSelect,
  onClose,
}: PresetBrowserDialogProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<PresetBrowserCategory>('sculpture');
  const [favoritePresetIds, setFavoritePresetIds] = useState<Set<string>>(() =>
    loadFavoritePresetIds(),
  );
  useEffect(() => {
    if (!open) {
      return;
    }

    const currentPreset = presets.find((preset) => preset.id === activeShaderId);
    const currentCategory: PresetBrowserCategory =
      currentPreset?.audioReactiveBindings
        ? 'audio-reactive'
        : currentPreset
          ? getPresetTemplates(currentPreset)[0]
          : 'sculpture';
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setActiveCategory(currentCategory);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, presets, activeShaderId]);

  if (!open) return null;

  const handleClose = () => {
    setPendingId(null);
    setQuery('');
    setIsSearchOpen(false);
    onClose();
  };
  const toggleFavoritePreset = (presetId: string) => {
    setFavoritePresetIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(presetId)) {
        nextIds.delete(presetId);
      } else {
        nextIds.add(presetId);
      }
      saveFavoritePresetIds(nextIds);
      return nextIds;
    });
  };
  const selectedCategory = PRESET_CATEGORY_ORDER.includes(activeCategory)
    ? activeCategory
    : 'sculpture';
  const normalizedQuery = normalizeSearchText(query);
  const searchTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const presetOrder = new Map(presets.map((preset, index) => [preset.id, index]));
  const presetById = new Map(presets.map((preset) => [preset.id, preset]));
  const sortMostRecentFirst = (left: SavedShader, right: SavedShader) =>
    (presetOrder.get(right.id) ?? -1) - (presetOrder.get(left.id) ?? -1);
  const searchScores = new Map<string, number>();
  const filteredPresets = presets.filter((preset) => {
    if (
      !normalizedQuery &&
      !matchesPresetCategory(preset, selectedCategory, presetById)
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const score = getPresetSearchScore(preset, searchTokens);
    if (score === null) {
      return false;
    }
    searchScores.set(preset.id, score);
    return true;
  });
  const sortSearchResults = (left: SavedShader, right: SavedShader) =>
    normalizedQuery
      ? (searchScores.get(right.id) ?? 0) - (searchScores.get(left.id) ?? 0) ||
        sortMostRecentFirst(left, right)
      : sortMostRecentFirst(left, right);
  const favoritePresets = filteredPresets
    .filter((preset) => favoritePresetIds.has(preset.id))
    .sort(sortSearchResults);
  const groupedPresets = Array.from(
    [...filteredPresets]
      .sort(sortSearchResults)
      .filter((preset) => !favoritePresetIds.has(preset.id))
      .reduce((groups, preset) => {
        const group = getPresetDisplayGroup(preset, presetById);
        const items = groups.get(group) ?? [];
        items.push(preset);
        groups.set(group, items);
        return groups;
      }, new Map<string, SavedShader[]>()),
  )
    .sort(([left], [right]) =>
      normalizedQuery ? 0 : sortGroups(selectedCategory, left, right),
    )
    .map(([group, items]) => ({
      group,
      items: [...items].sort(sortSearchResults),
    }));
  const renderPresetCard = (preset: SavedShader) => (
    <PreviewCard
      key={preset.id}
      preset={preset}
      displayGroup={getPresetDisplayGroup(preset, presetById)}
      isTimelineLinked={isTimelineLinkedPreset(preset)}
      isActive={preset.id === activeShaderId}
      isFavorite={favoritePresetIds.has(preset.id)}
      onToggleFavorite={() => toggleFavoritePreset(preset.id)}
      onSelect={() => setPendingId(preset.id)}
    />
  );
  const pendingPreset = pendingId
    ? presets.find((preset) => preset.id === pendingId) ?? null
    : null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section className="dialog-panel preset-browser-panel" role="dialog" aria-modal="true">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Presets</span>
            <h2 className="dialog-title">Shader Library</h2>
          </div>
          <div className="preset-browser-header-actions">
            <button
              type="button"
              className="ghost-button preset-browser-search-toggle"
              aria-pressed={isSearchOpen}
              aria-label={isSearchOpen ? 'Hide preset search' : 'Search presets'}
              onClick={() => {
                setIsSearchOpen((currentValue) => {
                  const nextOpen = !currentValue;
                  if (!nextOpen) {
                    setQuery('');
                  }
                  return nextOpen;
                });
              }}
            >
              Search
            </button>
            <button type="button" className="ghost-button" onClick={handleClose}>
              Close
            </button>
          </div>
        </header>

        <div className="dialog-body preset-browser-body">
          <div className="preset-browser-toolbar">
            <div className="field-inline-label">
              <span>Preset Browser</span>
              <small>
                {filteredPresets.length} results
                {normalizedQuery
                  ? ' across all categories · updates automatically'
                  : ` in ${PRESET_CATEGORY_LABELS[selectedCategory]}`}
              </small>
            </div>
            {isSearchOpen ? (
              <div className="preset-browser-search-shell">
                <input
                  type="search"
                  className="text-field preset-browser-search"
                  placeholder="Type to search all presets..."
                  aria-label="Search shader presets"
                  autoComplete="off"
                  autoFocus
                  value={query}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                />
                {query ? (
                  <button
                    type="button"
                    className="preset-browser-search-clear"
                    aria-label="Clear shader search"
                    title="Clear search"
                    onClick={() => setQuery('')}
                  >
                    x
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="preset-category-row" role="tablist" aria-label="Preset collections">
              {PRESET_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`preset-category-chip ${
                    category === selectedCategory ? 'preset-category-chip-active' : ''
                  } ${
                    category === 'audio-reactive'
                      ? 'preset-category-chip-audio-reactive'
                      : ''
                  }`}
                  role="tab"
                  aria-selected={category === selectedCategory}
                  onClick={() => setActiveCategory(category)}
                >
                  {PRESET_CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>

          {favoritePresets.length === 0 && groupedPresets.length === 0 ? (
            <p className="empty-copy">No presets match this filter.</p>
          ) : (
            <div className="preset-group-stack">
              {favoritePresets.length > 0 ? (
                <section className="preset-group preset-group-favorites">
                  <div className="preset-group-header">
                    <strong className="preset-group-title">Favorites</strong>
                    <span className="preset-group-count">{favoritePresets.length}</span>
                  </div>
                  <div className="preset-preview-grid">
                    {favoritePresets.map(renderPresetCard)}
                  </div>
                </section>
              ) : null}

              {groupedPresets.map(({ group, items }) => (
                <section
                  className={`preset-group ${
                    group === 'Audio Reactive' ? 'preset-group-audio-reactive' : ''
                  }`}
                  key={group}
                >
                  <div className="preset-group-header">
                    <strong className="preset-group-title">{group}</strong>
                    <span className="preset-group-count">{items.length}</span>
                  </div>
                  <div className="preset-preview-grid">
                    {items.map(renderPresetCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {pendingPreset ? (
          <div
            className="preset-confirm-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPendingId(null);
              }
            }}
          >
            <section
              className="preset-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="preset-confirm-title"
              aria-describedby="preset-confirm-copy"
            >
              <span className="panel-eyebrow">Use preset</span>
              <h3 id="preset-confirm-title">{pendingPreset.name}</h3>
              <p id="preset-confirm-copy">
                Would you like to replace the current shader{' '}
                <strong>&ldquo;{currentShaderName}&rdquo;</strong> with this preset, or create a
                new shader in the timeline?
              </p>
              <p className="preset-confirm-note">
                Replacing keeps the current timeline position and timing. Creating new adds an
                editable shader at the end of the timeline.
              </p>
              <div className="preset-confirm-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canReplaceCurrent}
                  title={
                    canReplaceCurrent
                      ? 'Replace the current timeline shader'
                      : 'There is no current timeline shader to replace'
                  }
                  onClick={() => {
                    onSelect(pendingPreset.id, 'replace-current');
                    handleClose();
                  }}
                >
                  Replace Current Shader
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onSelect(pendingPreset.id, 'create-new');
                    handleClose();
                  }}
                >
                  Create New Shader
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPendingId(null)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
