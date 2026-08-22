import { invokeDesktop, isTauri } from './runtime.ts';

export interface DesktopSaveFilter {
  name: string;
  extensions: string[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to encode file contents.'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function browserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveTextFile(options: {
  defaultFileName: string;
  contents: string;
  filters?: DesktopSaveFilter[];
}): Promise<string | null> {
  if (!isTauri()) {
    browserDownload(
      options.defaultFileName,
      new Blob([options.contents], { type: 'application/json' }),
    );
    return options.defaultFileName;
  }

  return invokeDesktop<string | null>('save_text_dialog', {
    request: {
      defaultFileName: options.defaultFileName,
      contents: options.contents,
      filters: options.filters,
    },
  });
}

export async function saveBlobFile(options: {
  defaultFileName: string;
  blob: Blob;
  filters?: DesktopSaveFilter[];
}): Promise<string | null> {
  if (!isTauri()) {
    browserDownload(options.defaultFileName, options.blob);
    return options.defaultFileName;
  }

  const base64Contents = await blobToBase64(options.blob);
  return invokeDesktop<string | null>('save_bytes_dialog', {
    request: {
      defaultFileName: options.defaultFileName,
      base64Contents,
      filters: options.filters,
    },
  });
}

export async function openExternalUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid external URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http(s) external links are allowed.');
  }

  if (!isTauri()) {
    window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    return;
  }
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(parsed.toString());
}
