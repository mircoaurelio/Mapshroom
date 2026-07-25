import fs from 'node:fs';
import { createServer } from 'vite';

const summaryPath =
  process.argv[2] ?? '.tmp-shader-import/shadertoexport-import-summary.json';
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { shaderPresetList } = await server.ssrLoadModule(
    '/src/shaders/presets/index.ts',
  );
  const ids = new Set(shaderPresetList.map((preset) => preset.id));
  if (ids.size !== shaderPresetList.length) {
    throw new Error(
      `Shader catalog contains ${shaderPresetList.length - ids.size} duplicate IDs.`,
    );
  }

  const missingGeneratedIds = summary.presets
    .map((preset) => preset.id)
    .filter((id) => !ids.has(id));
  if (missingGeneratedIds.length) {
    throw new Error(
      `Generated presets missing from the app catalog: ${missingGeneratedIds.join(', ')}`,
    );
  }

  const resultCounts = { sculpture: 0, stage: 0, drawing: 0 };
  for (const preset of shaderPresetList) {
    for (const template of preset.templates ?? [preset.template]) {
      resultCounts[template] += 1;
    }
  }

  const query = 'precise 3 target eyes with realistic blink';
  const exampleMatches = shaderPresetList.filter((preset) => {
    const templates = preset.templates ?? [preset.template];
    const haystack = [
      preset.name,
      preset.description,
      preset.group,
      ...templates,
      preset.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return templates.includes('sculpture') && haystack.includes(query);
  });
  if (exampleMatches.length !== 1) {
    throw new Error(
      `Expected one Sculpture search result for "${query}", found ${exampleMatches.length}.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        catalogPresets: shaderPresetList.length,
        uniqueIds: ids.size,
        importedPresets: summary.presets.length,
        visibleResultsByTab: resultCounts,
        exampleMatch: {
          id: exampleMatches[0].id,
          name: exampleMatches[0].name,
          templates: exampleMatches[0].templates ?? [exampleMatches[0].template],
        },
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
