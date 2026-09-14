export const SHADER_CHAT_SUGGESTIONS = [
  'Un oceano di luce viola, lento e fluido',
  'Riflessi d’acqua che scorrono sulla superficie',
  'Una texture di marmo liquido',
  'Onde di sabbia che cambiano forma',
  'Una galassia di piccoli punti luminosi',
  'Geometrie al neon su uno sfondo scuro',
  'Linee sottili, uno stile minimal ed elegante',
  'Un caleidoscopio dai colori pastello',
  'Forme morbide che si trasformano lentamente',
  'Una texture architettonica futuristica',
  'Colori caldi, come un tramonto in movimento',
  'Riflessi metallici e dettagli cromati',
  'Una foresta astratta di forme organiche',
  'Anelli concentrici che si espandono',
  'Un effetto vetro colorato in movimento',
  'Una cascata di pixel colorati',
  'Fili di luce che si intrecciano',
  'Un vortice ipnotico in bianco e nero',
  'Una superficie di ghiaccio con bagliori blu',
  'Nuvole di colore che si mescolano',
  'Un pattern geometrico ispirato agli origami',
  'Un’aurora boreale dai movimenti lenti',
  'Una texture a inchiostro che si diffonde',
  'Cristalli luminosi dalle forme irregolari',
  'Un reticolo luminoso con un effetto di profondità',
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
