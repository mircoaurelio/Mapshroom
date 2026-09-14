import type { ProjectDocument } from '../types';

function renameCode(code: string, name: string): string {
  const metadata = /\/\/[ \t]*NAME:[^\r\n]*/i;
  return metadata.test(code)
    ? code.replace(metadata, () => `// NAME: ${name}`)
    : `// NAME: ${name}\n${code}`;
}

/** Update the selected shader's metadata too, so reload and export retain its name. */
export function renameShader(project: ProjectDocument, shaderId: string, value: string): ProjectDocument {
  const name = value.replace(/\s+/g, ' ').trim();
  const shader = project.studio.savedShaders.find((item) => item.id === shaderId);
  const isActive = project.studio.activeShaderId === shaderId;
  if (!name || (!shader && !isActive)) return project;
  if ((!shader || shader.name === name) && (!isActive || project.studio.activeShaderName === name)) return project;

  return {
    ...project,
    studio: {
      ...project.studio,
      ...(isActive ? {
        activeShaderName: name,
        activeShaderCode: renameCode(project.studio.activeShaderCode, name),
      } : {}),
      savedShaders: project.studio.savedShaders.map((item) => item.id === shaderId ? {
        ...item,
        name,
        code: renameCode(item.code, name),
        ...(item.lastValidCode !== undefined ? { lastValidCode: renameCode(item.lastValidCode, name) } : {}),
        isDirty: true,
      } : item),
    },
  };
}
