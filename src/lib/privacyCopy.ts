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
    title: 'Free. No login. Your art stays on your PC.',
    lead:
      'Mapshroom is free. There is no account, no registration, and no cloud vault of your work — projects, shaders, images, prompts, and API keys never leave this device unless you export or share them yourself.',
    ask:
      'We still need a little signal to learn what to improve. If you Accept optional analytics, we do not take your artistic work or identity — only anonymous product hints:',
    bullets: [
      'Which features get used (export, share, presets, and similar)',
      'Rough return visits and country at the edge — never a precise location',
      'Whether an AI provider or local model is set up — never the key, prompt, or shader code',
    ],
    privacyBeforeLink: 'Full detail in the ',
    privacyLink: 'Privacy',
    privacyAfterLink: ' note. Decline anytime; the app keeps working either way.',
    decline: 'Decline',
    accept: 'Accept analytics',
  },
  it: {
    dialogLabel: 'Consenso analytics',
    title: 'Gratuita. Nessun login. La tua arte resta sul PC.',
    lead:
      'Mapshroom è gratuita. Non c’è account, non c’è registrazione e non c’è un cloud che conserva i tuoi lavori — progetti, shader, immagini, prompt e chiavi API non lasciano questo dispositivo, a meno che tu non esporti o condivida qualcosa tu stesso.',
    ask:
      'Ci serve però un piccolo segnale per capire cosa migliorare. Se Accetti le analytics opzionali, non prendiamo il tuo lavoro artistico né la tua identità — solo indizi di prodotto anonimi:',
    bullets: [
      'Quali funzioni usi (export, share, preset e simili)',
      'Ritorni approssimativi e paese a livello edge — mai la posizione precisa',
      'Se hai configurato un provider AI o un modello locale — mai la chiave, il prompt o il codice shader',
    ],
    privacyBeforeLink: 'Dettagli nella nota sulla ',
    privacyLink: 'Privacy',
    privacyAfterLink: '. Puoi rifiutare in qualsiasi momento; l’app funziona comunque.',
    decline: 'Rifiuta',
    accept: 'Accetta analytics',
  },
} as const;

export const PRIVACY_PAGE_COPY = {
  en: {
    eyebrow: 'Mapshroom Pocket',
    title: 'Privacy',
    intro:
      'Mapshroom is free, with no login and no registration. Your creative work is meant to stay on this machine: projects, shaders, assets, prompts, and API keys live in browser storage unless you explicitly share or export them. We do not need to collect your artistic work to run the app.',
    promisesTitle: 'What stays with you',
    promises: [
      'No account, no registration, no password — ever.',
      'Projects, shaders, images, and prompts stay on your PC by default.',
      'API keys you paste for cloud models stay in this browser only.',
      'You can decline analytics and keep using Mapshroom fully.',
    ],
    analyticsTitle: 'Optional usage analytics',
    analyticsIntroBefore:
      'If you accept analytics, Mapshroom sends anonymous product events so we can see what to improve. Events go through a first-party Cloudflare Worker on mapshroom.dev and are stored in ',
    analyticsIntroAfter:
      '. Accepting never means uploading your art, prompts, shader source, project files, or API keys.',
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
      ' collect prompts, shader source, project files, API keys, emails, or accounts — because Mapshroom has no login and does not need your artistic work.',
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
      'Mapshroom è gratuita, senza login e senza registrazione. Il lavoro creativo resta su questa macchina: progetti, shader, asset, prompt e chiavi API vivono nello storage del browser, a meno che tu non li condivida o esporti esplicitamente. Non abbiamo bisogno di raccogliere il tuo lavoro artistico per far funzionare l’app.',
    promisesTitle: 'Cosa resta con te',
    promises: [
      'Nessun account, nessuna registrazione, nessuna password — mai.',
      'Progetti, shader, immagini e prompt restano sul tuo PC di default.',
      'Le chiavi API che incolli per i modelli cloud restano solo in questo browser.',
      'Puoi rifiutare le analytics e continuare a usare Mapshroom al completo.',
    ],
    analyticsTitle: 'Analytics di utilizzo opzionali',
    analyticsIntroBefore:
      'Se accetti le analytics, Mapshroom invia eventi di prodotto anonimi per capire cosa migliorare. Gli eventi passano da un Worker Cloudflare di prima parte su mapshroom.dev e sono salvati in ',
    analyticsIntroAfter:
      '. Accettare non significa mai caricare la tua arte, i prompt, il codice shader, i file di progetto o le chiavi API.',
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
      ' raccogliamo prompt, codice shader, file di progetto, chiavi API, email o account — perché Mapshroom non ha login e non ha bisogno del tuo lavoro artistico.',
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
