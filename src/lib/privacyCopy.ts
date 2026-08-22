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
    dialogLabel: 'Optional analytics',
    title: 'Optional anonymous analytics',
    lead:
      'Help improve Mapshroom with anonymous product hints. Art, prompts, keys, and email stay on this device. You can keep using the app either way.',
    privacyBeforeLink: 'Details in ',
    privacyLink: 'Privacy',
    privacyAfterLink: '.',
    later: 'Later',
    decline: 'Decline',
    accept: 'Accept',
  },
  it: {
    dialogLabel: 'Analytics opzionali',
    title: 'Analytics anonime opzionali',
    lead:
      'Aiutaci a migliorare Mapshroom con indizi di prodotto anonimi. Arte, prompt, chiavi ed email restano su questo dispositivo. Puoi usare l’app in ogni caso.',
    privacyBeforeLink: 'Dettagli nella ',
    privacyLink: 'Privacy',
    privacyAfterLink: '.',
    later: 'Dopo',
    decline: 'Rifiuta',
    accept: 'Accetta',
  },
} as const;

export const PRIVACY_PAGE_COPY = {
  en: {
    eyebrow: 'Mapshroom',
    title: 'Privacy',
    intro:
      'Mapshroom is free and local-first. Creative work stays on your machine by default. You can optionally verify an email for the Windows desktop beta download, newsletter, feedback replies, and support. Analytics remain separate and opt-in.',
    promisesTitle: 'What stays with you',
    promises: [
      'No password account and no cloud vault of your projects by default.',
      'Projects, shaders, images, and prompts stay on your PC unless you export or share them.',
      'API keys you paste for cloud models stay in this browser / OS keyring only.',
      'You can decline analytics and keep using Mapshroom fully.',
    ],
    emailTitle: 'Optional email profile',
    emailIntro:
      'When you request the desktop beta, subscribe to the newsletter, join the Pro waitlist, or leave feedback with an email, we store and process that address to:',
    emailBullets: [
      'Verify ownership via a one-time link (passwordless)',
      'Deliver the Windows beta download after verification',
      'Send the newsletter only if you separately opt in and confirm',
      'Respond to feedback or support requests you initiate',
    ],
    emailLegal:
      'Legal bases: contract / legitimate interest for download verification and abuse prevention; consent for marketing emails. Marketing consent is optional, unchecked by default, and can be withdrawn anytime from your profile or unsubscribe link. Download-only emails may be retained for a limited period for support and abuse prevention, then deleted or anonymized. Newsletter subscribers are kept until unsubscribe or deletion. Minimal consent evidence (timestamp, copy version, source) is retained as required.',
    analyticsTitle: 'Optional usage analytics',
    analyticsIntroBefore:
      'If you accept analytics, Mapshroom sends anonymous product events so we can see what to improve. Events go through a first-party Cloudflare Worker on mapshroom.dev and are stored in ',
    analyticsIntroAfter:
      '. Accepting never means uploading your art, prompts, shader source, project files, API keys, or email address to analytics.',
    bullets: [
      'Anonymous visitor ID (localStorage), optionally linked to an opaque verified profile ID after consent',
      'Feature and button usage (for example export, share, presets, download funnel steps)',
      'Whether an AI provider or local model is configured (not the key itself)',
      'LLM request counts (provider / success / fail — never the prompt text)',
      'Country derived at the edge (not precise location)',
      'Surface (web / PWA / desktop), app version, locale, and campaign UTM tags',
    ],
    neverCollectBefore: 'We do ',
    neverCollectEmphasis: 'not',
    neverCollectAfter:
      ' collect prompts, shader source, project files, or API keys. Analytics never receives your email.',
    choiceTitle: 'Your choice',
    choiceIntro:
      'Analytics are off until you Accept. You can change your mind anytime below. Declining or withdrawing stops new events; an anonymous ID may remain in local storage until you clear site data. Email preferences and deletion are available from your profile page after verification.',
    decline: 'Decline analytics',
    accept: 'Accept analytics',
    currentChoice: 'Current choice:',
    choiceGranted: 'Accepted',
    choiceDenied: 'Declined',
    choiceNone: 'Not chosen yet',
    processorsTitle: 'Processors',
    processorsBody:
      'Hosting, edge Worker, and database: Cloudflare. Transactional email delivery: Brevo. Product analytics processor: PostHog (EU region). See their privacy documentation for processor terms. International transfers may occur under each processor’s safeguards.',
    back: 'Back to workspace',
  },
  it: {
    eyebrow: 'Mapshroom',
    title: 'Privacy',
    intro:
      'Mapshroom è gratuita e local-first. Il lavoro creativo resta sulla tua macchina di default. Puoi verificare opzionalmente un’email per il download della beta Windows, newsletter, risposte al feedback e supporto. Le analytics restano separate e opt-in.',
    promisesTitle: 'Cosa resta con te',
    promises: [
      'Nessun account con password e nessun cloud dei tuoi progetti di default.',
      'Progetti, shader, immagini e prompt restano sul PC salvo export o condivisione.',
      'Le chiavi API per i modelli cloud restano in questo browser / keyring OS.',
      'Puoi rifiutare le analytics e continuare a usare Mapshroom al completo.',
    ],
    emailTitle: 'Profilo email opzionale',
    emailIntro:
      'Quando richiedi la beta desktop, ti iscrivi alla newsletter, entri in lista Pro o lasci feedback con email, memorizziamo e trattiamo quell’indirizzo per:',
    emailBullets: [
      'Verificare la titolarità con un link monouso (senza password)',
      'Consegnare il download della beta Windows dopo la verifica',
      'Inviare la newsletter solo se acconsenti separatamente e confermi',
      'Rispondere a feedback o richieste di supporto che avvii tu',
    ],
    emailLegal:
      'Basi giuridiche: contratto / interesse legittimo per verifica download e prevenzione abusi; consenso per email di marketing. Il consenso marketing è opzionale, deselezionato di default e revocabile dal profilo o dal link di disiscrizione. Le email solo-download possono essere conservate per un periodo limitato per supporto e prevenzione abusi, poi cancellate o anonimizzate. Gli iscritti alla newsletter restano fino a disiscrizione o cancellazione. Conserviamo evidenza minima del consenso (timestamp, versione testo, sorgente) dove richiesto.',
    analyticsTitle: 'Analytics di utilizzo opzionali',
    analyticsIntroBefore:
      'Se accetti le analytics, Mapshroom invia eventi di prodotto anonimi per capire cosa migliorare. Gli eventi passano da un Worker Cloudflare di prima parte su mapshroom.dev e sono salvati in ',
    analyticsIntroAfter:
      '. Accettare non significa mai caricare arte, prompt, codice shader, file di progetto, chiavi API o l’email nelle analytics.',
    bullets: [
      'ID visitatore anonimo (localStorage), eventualmente collegato a un ID profilo opaco dopo il consenso',
      'Uso di funzioni e pulsanti (export, share, preset, passi del funnel download)',
      'Se è configurato un provider AI o un modello locale (non la chiave)',
      'Conteggi delle richieste LLM (provider / successo / errore — mai il testo del prompt)',
      'Paese derivato a livello edge (non la posizione precisa)',
      'Surface (web / PWA / desktop), versione app, locale e tag UTM di campagna',
    ],
    neverCollectBefore: '',
    neverCollectEmphasis: 'Non',
    neverCollectAfter:
      ' raccogliamo prompt, codice shader, file di progetto o chiavi API. Le analytics non ricevono mai la tua email.',
    choiceTitle: 'La tua scelta',
    choiceIntro:
      'Le analytics sono disattivate finché non Accetti. Puoi cambiare idea in qualsiasi momento qui sotto. Rifiutare o revocare interrompe i nuovi eventi; un ID anonimo può restare nel local storage finché non cancelli i dati del sito. Preferenze email e cancellazione sono disponibili nella pagina profilo dopo la verifica.',
    decline: 'Rifiuta analytics',
    accept: 'Accetta analytics',
    currentChoice: 'Scelta attuale:',
    choiceGranted: 'Accettate',
    choiceDenied: 'Rifiutate',
    choiceNone: 'Non ancora scelta',
    processorsTitle: 'Responsabili del trattamento',
    processorsBody:
      'Hosting, Worker edge e database: Cloudflare. Invio email transazionali: Brevo. Processore analytics di prodotto: PostHog (regione EU). Consulta la loro documentazione privacy. Possono verificarsi trasferimenti internazionali secondo le garanzie di ciascun processore.',
    back: 'Torna al workspace',
  },
} as const;
