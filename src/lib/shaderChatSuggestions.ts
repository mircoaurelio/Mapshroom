export const SHADER_CHAT_SUGGESTIONS = [
  'A slow, flowing ocean of purple light',
  'Water reflections flowing across the surface',
  'A liquid marble texture',
  'Shifting waves of sand',
  'A galaxy of tiny glowing dots',
  'Neon geometry on a dark background',
  'Fine lines with a clean, elegant style',
  'A kaleidoscope of pastel colors',
  'Soft shapes that slowly transform',
  'A futuristic architectural texture',
  'Warm colors like a sunset in motion',
  'Metallic reflections and chrome details',
  'An abstract forest of organic shapes',
  'Expanding concentric rings',
  'A moving stained glass effect',
  'A waterfall of colorful pixels',
  'Intertwining threads of light',
  'A hypnotic black and white vortex',
  'An icy surface with blue glimmers',
  'Clouds of color blending together',
  'An origami-inspired geometric pattern',
  'Slowly moving northern lights',
  'A spreading ink texture',
  'Glowing crystals with irregular shapes',
  'A luminous grid with a sense of depth',
] as const;

const STORAGE_KEY = 'mapshroom-chat-suggestions';
const SUGGESTION_COUNT = 5;
let sessionSuggestions: string[] | undefined;

export function pickShaderChatSuggestions(previous: readonly string[] = [], random = Math.random): string[] {
  const candidates = SHADER_CHAT_SUGGESTIONS.filter(text => !previous.includes(text));
  // Recover if an older stored selection happens to contain the whole catalog.
  const pool: string[] = candidates.length >= SUGGESTION_COUNT ? candidates : [...SHADER_CHAT_SUGGESTIONS];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [pool[index], pool[next]] = [pool[next], pool[index]];
  }
  return pool.slice(0, SUGGESTION_COUNT);
}

export function getShaderChatSuggestions(): string[] {
  if (sessionSuggestions) return sessionSuggestions;
  let previous: string[] = [];
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(stored)) previous = stored.filter((text): text is string => typeof text === 'string');
  } catch {
    // Suggestions also work when browser storage is unavailable.
  }
  sessionSuggestions = pickShaderChatSuggestions(previous);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionSuggestions));
  } catch {
    // Keep the selection stable for this opening even without storage.
  }
  return sessionSuggestions;
}
