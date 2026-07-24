import { resolveAppLocale, type AppLocale } from './privacyCopy';

export type WhyLocale = AppLocale;

export { resolveAppLocale as resolveWhyLocale };

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
  beforeLabel: string;
  afterLabel: string;
  visualCaption: string;
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
    cards: Array<{ title: string; body: string }>;
  };
  return: {
    kicker: string;
    title: string;
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
      'This is not a launch offer, a limited plan, or a door into a subscription. It is the premise Mapshroom is built on.',
    heroNote: 'A tool gets more valuable when more people can use it, change it, and build on it.',
    heroCta: 'Read the bet ↓',
    beforeLabel: 'A starting point',
    afterLabel: 'What we build on it',
    visualCaption: 'One tool. Infinite interpretations.',
    principlesLabel: 'The Mapshroom promise',
    principles: [
      { value: '€0', label: 'Software licence' },
      { value: 'OPEN', label: 'Study it, fork it, extend it' },
      { value: 'LOCAL', label: 'Your work stays yours' },
      { value: '∞', label: 'More people, more possibilities' },
    ],
    freedom: {
      kicker: '01 / The premise',
      title: 'Software can be copied. Ideas should compound.',
      paragraphs: [
        'I believe software today cannot afford not to be free: free to use, study, change, and extend. Anyone could take Mapshroom, build on it, clone it, or try to make it their own.',
        'That is not the risk. The real risk would be never creating the tool at all—or keeping it behind a wall where too few people can help it become what it could be.',
      ],
      quote: 'The real value is not owning this tool. It is making sure this tool exists.',
    },
    audience: {
      kicker: '02 / The first bet',
      title: 'Projection mapping is a niche. Visual imagination is not.',
      intro:
        'Most projection-mapping products speak to a small, specialised market. Perhaps only 5% of that niche will ever adopt Mapshroom. But the same tool could unlock a much larger public.',
      nicheValue: '5%',
      nicheLabel: 'Even a fraction of today’s niche can seed something much bigger.',
      cards: [
        {
          title: 'Events & spaces',
          body: 'People producing events, installations, stages, exhibitions, and temporary spaces.',
        },
        {
          title: 'Artists & image-makers',
          body: 'Artists, illustrators, designers, graffiti writers, and anyone who wants to make a surface come alive.',
        },
        {
          title: 'Online creators',
          body: 'People looking for a new way to transform photos, animate images, and create visual content.',
        },
        {
          title: 'Coders & explorers',
          body: 'People who write shaders, prototype ideas, learn by remixing, or simply want somewhere to experiment.',
        },
      ],
    },
    return: {
      kicker: '03 / What do I get?',
      title: 'Nothing—and that is the point.',
      paragraphs: [
        'There is no licence fee waiting at the end of this page. The return I care about is participation.',
        'The more people use Mapshroom, the more shaders, experiments, fixes, and unexpected uses can emerge. Every contribution makes the tool richer for the next person—including people like me who want to use those shaders.',
      ],
      quote: 'We all get richer—not in money, but in possibilities.',
      loopAria: 'A shared loop: more people create more shaders, which create more possibilities',
      loop: ['More people', 'More shaders', 'More ideas', 'Better tools'],
      loopCenter: 'Shared\nvalue',
    },
    setup: {
      kicker: '04 / The goal',
      title: 'Make the distance from projector to image disappear.',
      body:
        'The core measure is setup time: from the moment you pick up a projector to the moment the mapping is ready. That interval should keep getting smaller, while the set of things you can do keeps getting larger.',
      metricLabel: 'Target setup time',
      metricValue: 'Less. Then less again.',
      steps: ['Connect', 'Load', 'Map', 'Create', 'Project'],
      direction: 'Setup time → 0',
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
      'Non è un’offerta di lancio, un piano limitato o l’ingresso verso un abbonamento. È il principio su cui è costruito Mapshroom.',
    heroNote:
      'Uno strumento acquista valore quando più persone possono usarlo, modificarlo e costruirci sopra.',
    heroCta: 'Leggi la scommessa ↓',
    beforeLabel: 'Un punto di partenza',
    afterLabel: 'Quello che ci costruiamo sopra',
    visualCaption: 'Uno strumento. Infinite interpretazioni.',
    principlesLabel: 'La promessa di Mapshroom',
    principles: [
      { value: '€0', label: 'Licenza software' },
      { value: 'OPEN', label: 'Studialo, copialo, estendilo' },
      { value: 'LOCAL', label: 'Il tuo lavoro resta tuo' },
      { value: '∞', label: 'Più persone, più possibilità' },
    ],
    freedom: {
      kicker: '01 / Il principio',
      title: 'Il software si può copiare. Le idee devono moltiplicarsi.',
      paragraphs: [
        'Credo che oggi il software non possa più permettersi di non essere libero: libero da usare, studiare, modificare e far evolvere. Chiunque potrebbe prendere Mapshroom, costruirci sopra, copiarlo o provare a farlo proprio.',
        'Non è questo il rischio. Il vero rischio sarebbe non creare affatto questo strumento, oppure chiuderlo dietro un muro dove troppo poche persone possano aiutarlo a diventare ciò che potrebbe essere.',
      ],
      quote: 'Il vero valore non è possedere questo strumento. È fare in modo che esista.',
    },
    audience: {
      kicker: '02 / La prima scommessa',
      title: 'Il projection mapping è una nicchia. L’immaginazione visiva no.',
      intro:
        'La maggior parte dei prodotti di projection mapping parla a un mercato piccolo e specializzato. Forse solo il 5% di quella nicchia adotterà Mapshroom. Ma lo stesso strumento potrebbe aprirsi a un pubblico molto più grande.',
      nicheValue: '5%',
      nicheLabel: 'Anche una frazione della nicchia di oggi può dare inizio a qualcosa di molto più grande.',
      cards: [
        {
          title: 'Eventi e spazi',
          body: 'Chi organizza eventi, installazioni, palchi, mostre e spazi temporanei.',
        },
        {
          title: 'Artisti e creativi',
          body: 'Chi fa arte, disegno, design, writing e vuole dare vita a una superficie.',
        },
        {
          title: 'Creator online',
          body: 'Chi cerca un modo nuovo per modificare foto, animare immagini e creare contenuti visivi.',
        },
        {
          title: 'Coder ed esploratori',
          body: 'Chi scrive shader, prototipa idee, impara remixando o vuole semplicemente sperimentare.',
        },
      ],
    },
    return: {
      kicker: '03 / Che cosa ci guadagno?',
      title: 'Niente. Ed è proprio questo il punto.',
      paragraphs: [
        'Non c’è un costo di licenza nascosto alla fine di questa pagina. Il ritorno che mi interessa è la partecipazione.',
        'Più persone usano Mapshroom, più shader, esperimenti, correzioni e utilizzi inattesi possono nascere. Ogni contributo rende lo strumento più ricco per la persona successiva—anche per persone come me, che quegli shader vogliono usarli.',
      ],
      quote: 'Diventiamo tutti più ricchi: non di denaro, ma di possibilità.',
      loopAria: 'Un ciclo condiviso: più persone creano più shader, che generano più possibilità',
      loop: ['Più persone', 'Più shader', 'Più idee', 'Strumenti migliori'],
      loopCenter: 'Valore\ncondiviso',
    },
    setup: {
      kicker: '04 / L’obiettivo',
      title: 'Far scomparire la distanza tra il proiettore e l’immagine.',
      body:
        'La misura fondamentale è il tempo di setup: da quando prendi un proiettore a quando il mapping è pronto. Questo intervallo deve diventare sempre più piccolo, mentre gli strumenti e le possibilità devono continuare a crescere.',
      metricLabel: 'Tempo di setup ideale',
      metricValue: 'Meno. Poi ancora meno.',
      steps: ['Collega', 'Carica', 'Mappa', 'Crea', 'Proietta'],
      direction: 'Tempo di setup → 0',
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
