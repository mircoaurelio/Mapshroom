import { resolveAppLocale, type AppLocale } from './privacyCopy';

export type WhyLocale = AppLocale;

export { resolveAppLocale as resolveWhyLocale };

export type AudienceIconName =
  | 'events'
  | 'shops'
  | 'artists'
  | 'culture'
  | 'creators'
  | 'coders';

type WhyCopy = {
  documentTitle: string;
  languageLabel: string;
  navManifesto: string;
  navTutorial: string;
  navOpenWorkspace: string;
  eyebrow: string;
  heroTitle: string;
  heroEmphasis: string;
  heroLead: string;
  heroNote: string;
  heroCta: string;
  desktopVisualAria: string;
  beforeLabel: string;
  afterLabel: string;
  visualAria: string;
  visualSteps: Array<{ number: string; label: string }>;
  visualCaption: string;
  visualMission: string;
  principlesLabel: string;
  principles: Array<{ value: string; label: string }>;
  freedom: {
    kicker: string;
    title: string;
    paragraphs: string[];
    quote: string;
  };
  audience: {
    kicker: string;
    title: string;
    intro: string;
    nicheValue: string;
    nicheLabel: string;
    storyAria: string;
    scrollCue: string;
    professions: {
      kicker: string;
      title: string;
      body: string;
      statement: string;
    };
    market: {
      kicker: string;
      title: string;
      body: string;
      mappingLabel: string;
      potentialLabel: string;
      thesis: string;
    };
    mapAria: string;
    cards: Array<{ icon: AudienceIconName; title: string; body: string }>;
  };
  return: {
    kicker: string;
    title: string;
    facts: Array<{ label: string; value: string; detail: string }>;
    paragraphs: string[];
    quote: string;
    loopAria: string;
    loop: string[];
    loopCenter: string;
  };
  setup: {
    kicker: string;
    title: string;
    body: string;
    metricLabel: string;
    metricValue: string;
    steps: string[];
    direction: string;
  };
  bet: {
    kicker: string;
    title: string;
    bodyBefore: string;
    bodyStrong: string;
    bodyAfter: string;
    price: string;
    priceLabel: string;
  };
  outcomes: {
    kicker: string;
    title: string;
    intro: string;
    items: Array<{ number: string; title: string; body: string }>;
  };
  closing: {
    kicker: string;
    title: string;
    lead: string;
    openWorkspace: string;
    readTutorial: string;
    viewSource: string;
  };
  footerTagline: string;
  footerWorkspace: string;
};

export const WHY_COPY: Record<WhyLocale, WhyCopy> = {
  en: {
    documentTitle: 'Why Mapshroom is free — Mapshroom',
    languageLabel: 'Language',
    navManifesto: 'The manifesto',
    navTutorial: 'Tutorial',
    navOpenWorkspace: 'Open Mapshroom',
    eyebrow: 'Why Mapshroom is free',
    heroTitle: 'Free forever.',
    heroEmphasis: 'Open source forever.',
    heroLead:
      'Mapshroom exists to reduce setup time, so more of the process can go into artistic production.',
    heroNote:
      'It is free and open source because a tool gets more valuable when more people can use it, change it, and build on it.',
    heroCta: 'Read the mission ↓',
    desktopVisualAria: 'An animated reveal from a photographed subject to a projected artwork',
    beforeLabel: 'A starting point',
    afterLabel: 'What we build on it',
    visualAria: 'A three-step example from photographing a subject to creating a projected artwork',
    visualSteps: [
      { number: '01', label: 'Capture' },
      { number: '02', label: 'Map' },
      { number: '03', label: 'Create' },
    ],
    visualCaption: 'From projector setup to artistic production.',
    visualMission: 'Setup ↓  Art ↑',
    principlesLabel: 'The Mapshroom promise',
    principles: [
      { value: '€0', label: 'Software licence' },
      { value: 'OPEN', label: 'Study it, fork it, extend it' },
      { value: 'LOCAL', label: 'Your work stays yours' },
      { value: '∞', label: 'More people, more possibilities' },
    ],
    freedom: {
      kicker: '02 / The premise',
      title: 'Software can be copied. Ideas should compound.',
      paragraphs: [
        'I believe software today cannot afford not to be free: free to use, study, change, and extend. Anyone could take Mapshroom, build on it, clone it, or try to make it their own.',
        'That is not the risk. The real risk would be never creating the tool at all—or keeping it behind a wall where too few people can help it become what it could be.',
      ],
      quote: 'The real value is not owning this tool. It is making sure this tool exists.',
    },
    audience: {
      kicker: '03 / The first bet',
      title: 'Projection mapping is the small visible circle. The real market is much bigger.',
      intro:
        'Even if Mapshroom reaches only 5% of today’s projection-mapping users, that group is only the seed inside a huge market of artists who want less setup and more time to create.',
      nicheValue: '5%',
      nicheLabel: 'of professional crews',
      storyAria: 'A scroll-driven view that begins with professional users and zooms out to the much larger potential market',
      scrollCue: 'Scroll to zoom out',
      professions: {
        kicker: '01 / The people already in reach',
        title: 'Many professions. One shared need: less setup.',
        body:
          'Event crews, visual artists, cultural spaces, shops, creators, and coders all want the same thing: less time inside the process and more time making the work.',
        statement: 'Less process. More art.',
      },
      market: {
        kicker: '02 / Now zoom out',
        title: 'This market is much bigger than projection mapping.',
        body:
          'The 5% is only the seed. Around it is a huge community of artists who want the process to disappear so the work can begin.',
        mappingLabel: 'Professional crews',
        potentialLabel: 'A huge community of artists who want less process and more time to create.',
        thesis: 'The 5% is the seed of a much larger market.',
      },
      mapAria:
        'A yellow circle marked 5 percent begins inside a professional-crew circle, then grows into a much larger community of artists who want less process and more time to create',
      cards: [
        {
          icon: 'events',
          title: 'Events & live spaces',
          body: 'Organisers producing events, installations, stages, weddings, exhibitions, and temporary spaces.',
        },
        {
          icon: 'shops',
          title: 'Shops & windows',
          body: 'Independent shops, window displays, restaurants, pop-ups, and retail spaces looking for visual impact.',
        },
        {
          icon: 'artists',
          title: 'Artists & illustrators',
          body: 'Artists, illustrators, designers, and graffiti writers who want to make a surface come alive.',
        },
        {
          icon: 'culture',
          title: 'Culture & learning',
          body: 'Museums, schools, workshops, galleries, theatres, and community spaces.',
        },
        {
          icon: 'creators',
          title: 'Online creators',
          body: 'People looking for a new way to transform photos, animate images, and create visual content.',
        },
        {
          icon: 'coders',
          title: 'Coders & explorers',
          body: 'People who write shaders, prototype ideas, learn by remixing, or simply want somewhere to experiment.',
        },
      ],
    },
    return: {
      kicker: '04 / Free and local-first',
      title: 'The local app is free. No registration. Your files stay yours.',
      facts: [
        {
          label: 'The price',
          value: '€0',
          detail: 'The complete local workflow is free to open and use.',
        },
        {
          label: 'Access',
          value: 'No registration',
          detail: 'Nothing stands between an idea and the first projection.',
        },
        {
          label: 'The model',
          value: 'Local-first',
          detail: 'Images and projects can stay on your machine instead of leaving it just to begin.',
        },
        {
          label: 'My direct return',
          value: 'Nothing',
          detail: 'The return is participation: more users, shaders, experiments, and shared possibilities.',
        },
      ],
      paragraphs: [
        'The complete local workflow costs €0. Open the app and start creating without making an account.',
        'Local-first matters because access should be immediate and private. Your images and projects do not need to leave your computer just to use the tool.',
        'I get no direct return from that first local use. The return I care about is participation: more people creating more shaders, experiments, fixes, and unexpected possibilities for everyone.',
      ],
      quote: 'Free to start. Local by default. Shared only when you choose.',
      loopAria: 'A shared loop: more people create more shaders, which create more possibilities',
      loop: ['More people', 'More shaders', 'More ideas', 'Better tools'],
      loopCenter: 'Shared\nvalue',
    },
    setup: {
      kicker: '01 / The mission',
      title: 'Reduce setup time. Protect time for art.',
      body:
        'Mapshroom is not here to make artists better at configuration. It is here to make configuration disappear. Every minute saved between picking up a projector and starting the mapping is a minute returned to artistic production.',
      metricLabel: 'The direction',
      metricValue: 'Less setup. More making.',
      steps: ['Connect', 'Load', 'Map', 'Create', 'Project'],
      direction: 'Setup time → 0 · Artistic time → ∞',
    },
    bet: {
      kicker: '05 / The second bet',
      title: 'Powerful projection mapping should not require a powerful budget.',
      bodyBefore: 'The bet is simple: you should not need software that costs ',
      bodyStrong: '€800 every year',
      bodyAfter:
        ' to make a small, medium, or large-scale projection-mapping installation. The complexity of the idea should not dictate the height of the paywall.',
      price: '€800',
      priceLabel: 'every year, before the first image reaches the wall',
    },
    outcomes: {
      kicker: '06 / If the bet is right',
      title: 'Two things can happen.',
      intro:
        'Open tools do more than remove a price. They change who gets to participate—and what the rest of the market must do next.',
      items: [
        {
          number: '01',
          title: 'An enabling tool',
          body: 'More people can start, more shaders can be shared, and a common visual language can grow for everyone.',
        },
        {
          number: '02',
          title: 'A reason to innovate',
          body: 'Established companies are pushed to build better products and open projection mapping to a much wider public.',
        },
      ],
    },
    closing: {
      kicker: 'The invitation',
      title: 'Use it. Break it. Build on it. Share what you discover.',
      lead:
        'The only way to know whether this bet is true is to let as many people as possible try it.',
      openWorkspace: 'Open Mapshroom',
      readTutorial: 'Start with the tutorial',
      viewSource: 'View the source',
    },
    footerTagline: 'Free forever. Open source forever.',
    footerWorkspace: 'Open workspace',
  },
  it: {
    documentTitle: 'Perché Mapshroom è gratis — Mapshroom',
    languageLabel: 'Lingua',
    navManifesto: 'Il manifesto',
    navTutorial: 'Tutorial',
    navOpenWorkspace: 'Apri Mapshroom',
    eyebrow: 'Perché Mapshroom è gratis',
    heroTitle: 'Gratis per sempre.',
    heroEmphasis: 'Open source per sempre.',
    heroLead:
      'Mapshroom esiste per ridurre il tempo di setup, così una parte sempre più grande del processo può andare alla produzione artistica.',
    heroNote:
      'È gratis e open source perché uno strumento acquista valore quando più persone possono usarlo, modificarlo e costruirci sopra.',
    heroCta: 'Leggi la missione ↓',
    desktopVisualAria: 'Una transizione animata dalla fotografia del soggetto a un’opera proiettata',
    beforeLabel: 'Un punto di partenza',
    afterLabel: 'Quello che ci costruiamo sopra',
    visualAria: 'Un esempio in tre passaggi, dalla fotografia del soggetto alla creazione di un’opera proiettata',
    visualSteps: [
      { number: '01', label: 'Cattura' },
      { number: '02', label: 'Mappa' },
      { number: '03', label: 'Crea' },
    ],
    visualCaption: 'Dal setup del proiettore alla produzione artistica.',
    visualMission: 'Setup ↓  Arte ↑',
    principlesLabel: 'La promessa di Mapshroom',
    principles: [
      { value: '€0', label: 'Licenza software' },
      { value: 'OPEN', label: 'Studialo, copialo, estendilo' },
      { value: 'LOCAL', label: 'Il tuo lavoro resta tuo' },
      { value: '∞', label: 'Più persone, più possibilità' },
    ],
    freedom: {
      kicker: '02 / Il principio',
      title: 'Il software si può copiare. Le idee devono moltiplicarsi.',
      paragraphs: [
        'Credo che oggi il software non possa più permettersi di non essere libero: libero da usare, studiare, modificare e far evolvere. Chiunque potrebbe prendere Mapshroom, costruirci sopra, copiarlo o provare a farlo proprio.',
        'Non è questo il rischio. Il vero rischio sarebbe non creare affatto questo strumento, oppure chiuderlo dietro un muro dove troppo poche persone possano aiutarlo a diventare ciò che potrebbe essere.',
      ],
      quote: 'Il vero valore non è possedere questo strumento. È fare in modo che esista.',
    },
    audience: {
      kicker: '03 / La prima scommessa',
      title: 'Il projection mapping è il piccolo cerchio visibile. Il mercato reale è molto più grande.',
      intro:
        'Anche se Mapshroom raggiungesse solo il 5% di chi usa già software di projection mapping, quel gruppo sarebbe soltanto il seme dentro un mercato enorme di artisti che vuole meno setup e più tempo per creare.',
      nicheValue: '5%',
      nicheLabel: 'delle crew professionali',
      storyAria: 'Una visualizzazione legata allo scroll che parte dagli utenti professionali e si allarga fino al mercato potenziale molto più grande',
      scrollCue: 'Scorri per allargare lo sguardo',
      professions: {
        kicker: '01 / Le persone già raggiungibili',
        title: 'Tante professioni. Un solo bisogno: meno setup.',
        body:
          'Crew di eventi, artisti visivi, spazi culturali, negozi, creator e coder vogliono la stessa cosa: meno tempo dentro il processo e più tempo per creare.',
        statement: 'Meno processo. Più arte.',
      },
      market: {
        kicker: '02 / Ora allarghiamo lo sguardo',
        title: 'Questo mercato è molto più grande del projection mapping.',
        body:
          'Il 5% è soltanto il seme. Intorno c’è una comunità enorme di artisti che vuole far sparire il processo per iniziare a creare.',
        mappingLabel: 'Crew professionali',
        potentialLabel: 'Una comunità enorme di artisti che vuole meno processo e più tempo per creare.',
        thesis: 'Il 5% è il seme di un mercato molto più grande.',
      },
      mapAria:
        'Un cerchio giallo con il 5 per cento nasce dentro il cerchio delle crew professionali e cresce fino a rappresentare una comunità molto più grande di artisti che vuole meno processo e più tempo per creare',
      cards: [
        {
          icon: 'events',
          title: 'Eventi e spazi live',
          body: 'Chi organizza eventi, installazioni, palchi, matrimoni, mostre e spazi temporanei.',
        },
        {
          icon: 'shops',
          title: 'Negozi e vetrine',
          body: 'Negozi indipendenti, vetrine, ristoranti, pop-up e spazi retail che cercano un impatto visivo.',
        },
        {
          icon: 'artists',
          title: 'Artisti e illustratori',
          body: 'Chi fa arte, disegno, illustrazione, design e writing e vuole dare vita a una superficie.',
        },
        {
          icon: 'culture',
          title: 'Cultura e formazione',
          body: 'Musei, scuole, workshop, gallerie, teatri e spazi di comunità.',
        },
        {
          icon: 'creators',
          title: 'Creator online',
          body: 'Chi cerca un modo nuovo per modificare foto, animare immagini e creare contenuti visivi.',
        },
        {
          icon: 'coders',
          title: 'Coder ed esploratori',
          body: 'Chi scrive shader, prototipa idee, impara remixando o vuole semplicemente sperimentare.',
        },
      ],
    },
    return: {
      kicker: '04 / Gratis e local-first',
      title: 'L’app locale è gratuita. Nessuna registrazione. I tuoi file restano tuoi.',
      facts: [
        {
          label: 'Il prezzo',
          value: '€0',
          detail: 'Il flusso locale completo è gratuito da aprire e usare.',
        },
        {
          label: 'L’accesso',
          value: 'Nessuna registrazione',
          detail: 'Niente si mette tra un’idea e la prima proiezione.',
        },
        {
          label: 'Il modello',
          value: 'Local-first',
          detail: 'Immagini e progetti possono restare sul tuo computer invece di lasciarlo solo per iniziare.',
        },
        {
          label: 'Il mio ritorno diretto',
          value: 'Niente',
          detail: 'Il ritorno è la partecipazione: più utenti, shader, esperimenti e possibilità condivise.',
        },
      ],
      paragraphs: [
        'Il flusso locale completo costa zero euro. Apri l’app e inizi a creare senza dover registrare un account.',
        'Local-first conta perché l’accesso deve essere immediato e privato. Immagini e progetti non devono lasciare il computer solo per usare lo strumento.',
        'Io non ottengo un ritorno diretto da quel primo utilizzo locale. Il ritorno che mi interessa è la partecipazione: più persone creano più shader, esperimenti, correzioni e possibilità inattese per tutti.',
      ],
      quote: 'Gratis per iniziare. Locale per scelta. Condiviso solo quando vuoi.',
      loopAria: 'Un ciclo condiviso: più persone creano più shader, che generano più possibilità',
      loop: ['Più persone', 'Più shader', 'Più idee', 'Strumenti migliori'],
      loopCenter: 'Valore\ncondiviso',
    },
    setup: {
      kicker: '01 / La missione',
      title: 'Ridurre il setup. Proteggere il tempo per l’arte.',
      body:
        'Mapshroom non serve a rendere gli artisti più bravi nella configurazione. Serve a far scomparire la configurazione. Ogni minuto risparmiato tra il momento in cui prendi un proiettore e quello in cui inizi il mapping è un minuto restituito alla produzione artistica.',
      metricLabel: 'La direzione',
      metricValue: 'Meno setup. Più creazione.',
      steps: ['Collega', 'Carica', 'Mappa', 'Crea', 'Proietta'],
      direction: 'Tempo di setup → 0 · Tempo per l’arte → ∞',
    },
    bet: {
      kicker: '05 / La seconda scommessa',
      title: 'Un projection mapping potente non dovrebbe richiedere un budget potente.',
      bodyBefore: 'La scommessa è semplice: non dovrebbe servire un software da ',
      bodyStrong: '800 euro ogni anno',
      bodyAfter:
        ' per realizzare un’installazione di projection mapping piccola, media o grande. La complessità dell’idea non dovrebbe determinare l’altezza del paywall.',
      price: '€800',
      priceLabel: 'ogni anno, prima ancora che la prima immagine arrivi sulla parete',
    },
    outcomes: {
      kicker: '06 / Se la scommessa è giusta',
      title: 'Possono succedere due cose.',
      intro:
        'Gli strumenti aperti non eliminano soltanto un prezzo. Cambiano chi può partecipare—e ciò che il resto del mercato è costretto a fare.',
      items: [
        {
          number: '01',
          title: 'Uno strumento abilitante',
          body: 'Più persone possono iniziare, più shader possono essere condivisi e può crescere un linguaggio visivo comune.',
        },
        {
          number: '02',
          title: 'Un motivo per innovare',
          body: 'Le grandi aziende sono spinte a costruire prodotti migliori e ad aprire il projection mapping a un pubblico molto più ampio.',
        },
      ],
    },
    closing: {
      kicker: 'L’invito',
      title: 'Usalo. Rompilo. Costruiscici sopra. Condividi quello che scopri.',
      lead:
        'L’unico modo per sapere se questa scommessa è vera è permettere a più persone possibile di provarla.',
      openWorkspace: 'Apri Mapshroom',
      readTutorial: 'Inizia dal tutorial',
      viewSource: 'Guarda il codice',
    },
    footerTagline: 'Gratis per sempre. Open source per sempre.',
    footerWorkspace: 'Apri il workspace',
  },
};
