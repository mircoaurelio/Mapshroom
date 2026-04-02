import { useMemo, useState } from 'react';
import type { SavedShader } from '../types';

interface ShaderPresetLibraryProps {
  presets: SavedShader[];
  activeShaderId: string;
  onSelectShader: (shaderId: string) => void;
}

const GROUP_ORDER = ['Glow', 'Color', 'Graphic', 'Geometry', 'Motion', 'Saved'];

function getPresetGroup(preset: SavedShader): string {
  if (preset.group?.trim()) {
    return preset.group;
  }
  return preset.id.startsWith('default_') ? 'Default' : 'Saved';
}

function sortGroups(left: string, right: string): number {
  const leftIndex = GROUP_ORDER.indexOf(left);
  const rightIndex = GROUP_ORDER.indexOf(right);

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

export function ShaderPresetLibrary({
  presets,
  activeShaderId,
  onSelectShader,
}: ShaderPresetLibraryProps) {
  const [query, setQuery] = useState('');

  const filteredPresets = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return presets;
    }

    return presets.filter((preset) => {
      const haystack = [preset.name, preset.description, preset.group, preset.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [presets, query]);

  const groupedPresets = useMemo(() => {
    const groups = new Map<string, SavedShader[]>();

    for (const preset of filteredPresets) {
      const group = getPresetGroup(preset);
      const existing = groups.get(group) ?? [];
      existing.push(preset);
      groups.set(group, existing);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => sortGroups(left, right))
      .map(([group, items]) => ({
        group,
        items: [...items].sort((left, right) => left.name.localeCompare(right.name)),
      }));
  }, [filteredPresets]);

  return (
    <div className="preset-library">
      <div className="preset-library-toolbar">
        <div className="field-inline-label">
          <span>Preset Library</span>
          <small>{filteredPresets.length} presets</small>
        </div>
        <input
          className="text-field preset-library-search"
          placeholder="Find a preset..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {groupedPresets.length === 0 ? (
        <p className="empty-copy">No presets match this search.</p>
      ) : (
        <div className="preset-group-stack">
          {groupedPresets.map(({ group, items }) => (
            <section className="preset-group" key={group}>
              <div className="preset-group-header">
                <strong className="preset-group-title">{group}</strong>
                <span className="preset-group-count">{items.length}</span>
              </div>
              <div className="preset-grid preset-grid-library" role="list" aria-label={`${group} shader presets`}>
                {items.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="listitem"
                    className={`preset-card ${
                      preset.id === activeShaderId ? 'preset-card-active' : ''
                    }`}
                    onClick={() => onSelectShader(preset.id)}
                  >
                    <div className="preset-card-header">
                      <strong>{preset.name}</strong>
                      <span className="preset-card-tag">
                        {preset.id === activeShaderId ? 'Active' : group}
                      </span>
                    </div>
                    <p className="preset-card-copy">
                      {preset.description ?? 'Shader preset ready to load into the stage.'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
