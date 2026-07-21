export type AppLocale = 'en' | 'it';

export function resolveAppLocale(): AppLocale {
  const preferredLanguages =
    typeof navigator !== 'undefined'
      ? [...navigator.languages, navigator.language].filter(Boolean)
      : [];

  return preferredLanguages.some((language) => language.toLowerCase().startsWith('it'))
    ? 'it'
    : 'en';
}

export const ANALYTICS_CONSENT_COPY = {
  en: {
    dialogLabel: 'Analytics consent',
    title: 'Optional usage analytics',
    bodyBeforeLink:
      'Help improve Mapshroom with anonymous product analytics (features used, return visits, country). Creative content, prompts, and API keys stay on your device. Details in the ',
    privacyLink: 'Privacy',
    bodyAfterLink: ' note.',
    decline: 'Decline',
    accept: 'Accept',
  },
  it: {
    dialogLabel: 'Consenso analytics',
    title: 'Analytics di utilizzo opzionali',
    bodyBeforeLink:
      'Aiutaci a migliorare Mapshroom con analytics di prodotto anonime (funzioni usate, ritorni, paese). Contenuti creativi, prompt e chiavi API restano sul tuo dispositivo. Dettagli nella nota sulla ',
    privacyLink: 'Privacy',
    bodyAfterLink: '.',
    decline: 'Rifiuta',
    accept: 'Accetta',
  },
} as const;

export const PRIVACY_PAGE_COPY = {
  en: {
    eyebrow: 'Mapshroom Pocket',
    title: 'Privacy',
    intro:
      'Mapshroom is built to keep your creative work on-device. Projects, shaders, assets, and API keys live in your browser storage unless you explicitly share or export them.',
    analyticsTitle: 'Optional usage analytics',
    analyticsIntroBefore:
      'If you accept analytics, Mapshroom sends anonymous product events to help understand how the app is used. Events go through a first-party Cloudflare Worker on mapshroom.dev and are stored in ',
    analyticsIntroAfter: '.',
    bullets: [
      'Anonymous visitor ID (localStorage)',
      'Feature and button usage (for example export, share, presets)',
      'Whether an AI provider or local model is configured (not the key itself)',
      'LLM request counts (provider / success / fail — never the prompt text)',
      'Country derived at the edge (not precise location)',
    ],
    neverCollectBefore: 'We do ',
    neverCollectEmphasis: 'not',
    neverCollectAfter:
      ' collect prompts, shader source, project files, API keys, or account emails (the app has no login).',
    choiceTitle: 'Your choice',
    choiceIntro:
      'Analytics are off until you Accept. You can change your mind anytime below. Declining or withdrawing stops new events; an anonymous ID may remain in local storage until you clear site data.',
    decline: 'Decline analytics',
    accept: 'Accept analytics',
    currentChoice: 'Current choice:',
    choiceGranted: 'Accepted',
    choiceDenied: 'Declined',
    choiceNone: 'Not chosen yet',
    processorsTitle: 'Processors',
    processorsBody:
      'Hosting and edge proxy: Cloudflare. Product analytics processor: PostHog (EU region). See their privacy documentation for processor terms.',
    back: 'Back to workspace',
  },
  it: {
    eyebrow: 'Mapshroom Pocket',
    title: 'Privacy',
    intro:
      'Mapshroom è pensato per tenere il lavoro creativo sul dispositivo. Progetti, shader, asset e chiavi API restano nello storage del browser, a meno che tu non li condivida o esporti esplicitamente.',
    analyticsTitle: 'Analytics di utilizzo opzionali',
    analyticsIntroBefore:
      'Se accetti le analytics, Mapshroom invia eventi di prodotto anonimi per capire come viene usata l’app. Gli eventi passano da un Worker Cloudflare di prima parte su mapshroom.dev e sono salvati in ',
    analyticsIntroAfter: '.',
    bullets: [
      'ID visitatore anonimo (localStorage)',
      'Uso di funzioni e pulsanti (ad esempio export, share, preset)',
      'Se è configurato un provider AI o un modello locale (non la chiave)',
      'Conteggi delle richieste LLM (provider / successo / errore — mai il testo del prompt)',
      'Paese derivato a livello edge (non la posizione precisa)',
    ],
    neverCollectBefore: '',
    neverCollectEmphasis: 'Non',
    neverCollectAfter:
      ' raccogliamo prompt, codice shader, file di progetto, chiavi API o email (l’app non ha login).',
    choiceTitle: 'La tua scelta',
    choiceIntro:
      'Le analytics sono disattivate finché non Accetti. Puoi cambiare idea in qualsiasi momento qui sotto. Rifiutare o revocare interrompe i nuovi eventi; un ID anonimo può restare nel local storage finché non cancelli i dati del sito.',
    decline: 'Rifiuta analytics',
    accept: 'Accetta analytics',
    currentChoice: 'Scelta attuale:',
    choiceGranted: 'Accettate',
    choiceDenied: 'Rifiutate',
    choiceNone: 'Non ancora scelta',
    processorsTitle: 'Responsabili del trattamento',
    processorsBody:
      'Hosting e proxy edge: Cloudflare. Processore analytics di prodotto: PostHog (regione EU). Consulta la loro documentazione privacy per i termini.',
    back: 'Torna al workspace',
  },
} as const;
