import fs from 'node:fs';

function summarize(file) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const steps = p.timeline?.stub?.shaderSequence?.steps ?? [];
  const used = [...new Set([p.studio.activeShaderId, ...steps.map((s) => s.shaderId)].filter(Boolean))];
  const byId = Object.fromEntries((p.studio.savedShaders || []).map((s) => [s.id, s]));
  console.log('\n===', p.name, p.sessionId, '===');
  console.log('file bytes', fs.statSync(file).size);
  console.log('assets', (p.library?.assets || []).map((a) => a.name || a.id).join(', '));
  console.log('steps', steps.length, 'unique shaders', used.length);
  console.log('active', byId[p.studio.activeShaderId]?.name || p.studio.activeShaderId);
  for (const id of used.slice(0, 40)) {
    const s = byId[id];
    console.log(`- ${s?.name || '(missing/preset)'} | ${id} | code=${s?.code?.length ?? 0}`);
  }
  if (used.length > 40) console.log(`... +${used.length - 40} more`);
}

summarize('.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json');
summarize('.tmp-mondadori-ls/project-55d9c948-3718-40b2-b968-ff417d600179.json');
