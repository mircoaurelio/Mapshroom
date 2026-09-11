export const ASSET_DRAG_TYPE = 'application/x-mapshroom-asset-id';

export interface ImageTransfer {
  files: File[];
  assetId: string | null;
  html: string;
  uriList: string;
  text: string;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', bmp: 'image/bmp',
};

export function imageFileType(file: Pick<File, 'type' | 'name'>): string | null {
  if (file.type.startsWith('image/')) return file.type;
  if (file.type && file.type !== 'application/octet-stream') return null;
  return IMAGE_EXTENSIONS[file.name.split('.').at(-1)?.toLowerCase() ?? ''] ?? null;
}

// DataTransfer becomes unreadable after the paste/drop event returns. Copy it first.
export function captureImageTransfer(data: DataTransfer): ImageTransfer {
  const files = Array.from(data.files);
  if (!files.length) {
    for (const item of Array.from(data.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  return {
    files,
    assetId: data.getData(ASSET_DRAG_TYPE) || null,
    html: data.getData('text/html'),
    uriList: data.getData('text/uri-list'),
    text: data.getData('text/plain'),
  };
}

export function canDropImage(data: DataTransfer): boolean {
  return Array.from(data.types).some((type) =>
    ['Files', ASSET_DRAG_TYPE, 'text/uri-list', 'text/html', 'text/plain'].includes(type),
  );
}

export function imageSourceUrl(value: string): string | null {
  const text = value.trim();
  if (!text || /\s/.test(text)) return null;
  try {
    const url = new URL(text);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
    if (url.protocol === 'data:' && /^data:image\//i.test(text)) return text;
  } catch { /* Plain text is left to the normal paste handler. */ }
  return null;
}

export function getTransferredImageUrl(transfer: ImageTransfer): string | null {
  // A linked image often carries the page URL in uri-list and its real image in HTML.
  if (transfer.html) {
    const doc = new DOMParser().parseFromString(transfer.html, 'text/html');
    const image = doc.querySelector('img');
    const source = imageSourceUrl(image?.getAttribute('src') ?? '');
    if (source) return source;
  }
  for (const line of transfer.uriList.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const source = imageSourceUrl(line);
    if (source) return source;
  }
  return imageSourceUrl(transfer.text);
}

export function hasImageTransfer(transfer: ImageTransfer): boolean {
  return Boolean(transfer.assetId || transfer.files.some(imageFileType) || getTransferredImageUrl(transfer));
}

export function startAssetImageDrag(data: DataTransfer, assetId: string) {
  data.clearData();
  data.setData(ASSET_DRAG_TYPE, assetId);
  data.effectAllowed = 'copy';
}

export async function readClipboardImages(): Promise<ImageTransfer> {
  if (!navigator.clipboard?.read) {
    throw new Error('Use Ctrl+V (⌘V on Mac) to paste an image here, or drag an image file into Assets.');
  }
  const transfer: ImageTransfer = { files: [], assetId: null, html: '', uriList: '', text: '' };
  let items: ClipboardItems;
  try {
    items = await navigator.clipboard.read();
  } catch {
    throw new Error('Clipboard access was not granted. Use Ctrl+V (⌘V on Mac) to paste your image, or allow clipboard access and retry.');
  }
  for (const item of items) {
    const type = item.types.find((type) => type.startsWith('image/'));
    if (type) {
      const blob = await item.getType(type);
      const extension = Object.keys(IMAGE_EXTENSIONS).find((key) => IMAGE_EXTENSIONS[key] === type) ?? 'png';
      transfer.files.push(new File([blob], `Pasted image ${Date.now()}-${transfer.files.length + 1}.${extension}`, { type }));
    } else {
      if (item.types.includes('text/html')) transfer.html = await (await item.getType('text/html')).text();
      if (item.types.includes('text/plain')) transfer.text = await (await item.getType('text/plain')).text();
    }
  }
  return transfer;
}

export async function fetchImageFile(source: string): Promise<File> {
  const url = imageSourceUrl(source);
  if (!url) throw new Error('Use an image file or a direct HTTP(S) image URL.');
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'omit', mode: 'cors', signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error('This website could not provide the image. Use “Copy image” on the original, or download it and drag the file here.');
  }
  if (!response.ok) throw new Error('The image could not be downloaded. Try “Copy image” or download the file first.');
  const blob = await response.blob();
  let name = 'Website image';
  if (!url.startsWith('data:')) {
    try { name = decodeURIComponent(new URL(url).pathname.split('/').at(-1) || name); } catch { /* Use a readable default. */ }
  }
  const type = imageFileType({ name, type: blob.type });
  if (!type || !blob.size) throw new Error('That link does not contain an image. Copy the image itself or use its direct image URL.');
  if (!/\.[a-z0-9]+$/i.test(name)) {
    name += `.${Object.keys(IMAGE_EXTENSIONS).find((key) => IMAGE_EXTENSIONS[key] === type) ?? 'png'}`;
  }
  return new File([blob], name, { type });
}

export async function validateImageFile(file: File): Promise<File> {
  const type = imageFileType(file);
  if (!type || !file.size) throw new Error(`“${file.name}” is not a supported image.`);
  const normalized = file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
  const url = URL.createObjectURL(normalized);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
  } catch {
    throw new Error(`“${file.name}” could not be opened as an image.`);
  } finally {
    URL.revokeObjectURL(url);
  }
  return normalized;
}
