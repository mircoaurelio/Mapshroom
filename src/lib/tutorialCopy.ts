import { resolveAppLocale, type AppLocale } from './privacyCopy';

export type TutorialLocale = AppLocale;

export { resolveAppLocale as resolveTutorialLocale };

export type TutorialCopy = {
  documentTitle: string;
  navViewSteps: string;
  navOpenWorkspace: string;
  eyebrow: string;
  heroTitleBefore: string;
  heroTitleEmphasis: string;
  heroLead: string;
  heroCta: string;
  heroDuration: string;
  heroVisualCaption: string;
  kitLabel: string;
  kit: Array<{ number: string; title: string; detail: string }>;
  stepLabel: (number: string) => string;
  clickHere: string;
  steps: {
    photograph: { title: string; body: string; tipLabel: string; tip: string };
    load: { title: string; bodyBefore: string; bodyStrong: string; bodyAfter: string; action: string };
    process: {
      title: string;
      body: string;
      videoCaption: string;
      videoAria: string;
      original: string;
      yourPhoto: string;
      click1: string;
      removeBackground: string;
      click2: string;
      depthMap: string;
    };
    projector: {
      title: string;
      bodyBefore: string;
      bodyStrong: string;
      bodyAfter: string;
      mini: [string, string, string, string];
    };
    fit: {
      title: string;
      bodyBefore: string;
      bodyStrong: string;
      bodyAfter: string;
      action: string;
      toolbarHint: string;
      cardHint: string;
    };
    shader: { title: string; bodyBefore: string; bodyStrongShader: string; bodyMid: string; bodyStrongPreset: string; bodyAfter: string; action: string };
    customize: { title: string; body: string; tipLabel: string; tip: string };
    timeline: {
      title: string;
      body: string;
      keys: [string, string, string];
    };
    export: {
      title: string;
      body: string;
      flow: Array<{ title: string; detail: string }>;
    };
  };
  ctaReady: string;
  ctaTitle: string;
  ctaLead: string;
  ctaButton: string;
  footerTagline: string;
  footerWorkspace: string;
};

export const TUTORIAL_COPY: Record<TutorialLocale, TutorialCopy> = {
  en: {
    documentTitle: 'Tutorial — Mapshroom',
    navViewSteps: 'View steps',
    navOpenWorkspace: 'Open workspace',
    eyebrow: 'Camera → Mapshroom → projector',
    heroTitleBefore: 'Projection map everything,',
    heroTitleEmphasis: 'you just need a photo.',
    heroLead: 'The app does the rest — from depth to projection.',
    heroCta: 'Start the tutorial ↓',
    heroDuration: 'About 10 minutes',
    heroVisualCaption: 'Your subject becomes the canvas.',
    kitLabel: 'What you need',
    kit: [
      { number: '01', title: 'A subject', detail: 'Sculpture or object' },
      { number: '02', title: 'A camera', detail: 'Your phone is enough' },
      { number: '03', title: 'A projector', detail: 'HDMI connection' },
      { number: '04', title: 'A USB key', detail: 'For final playback' },
    ],
    stepLabel: (number) => `Step ${number}`,
    clickHere: 'Click here',
    steps: {
      photograph: {
        title: 'Photograph the sculpture',
        body: 'Stand directly in front of the object and keep the phone level. Frame the complete shape with space around every edge.',
        tipLabel: 'Important',
        tip: 'Take the photo from as close as possible to the projector lens. Matching viewpoints makes alignment faster.',
      },
      load: {
        title: 'Load the photo into Mapshroom',
        bodyBefore: 'Open the workspace, choose ',
        bodyStrong: 'Load asset',
        bodyAfter: ' in the top bar, then pick your photo. It appears in the media library and on the stage.',
        action: 'Select the sculpture photo.',
      },
      process: {
        title: 'Remove the background and create depth',
        body: 'In the media library, select the photo. First remove the background; then generate a depth map so shaders react to the object’s shape.',
        videoCaption: 'Mask Editor — remove the background',
        videoAria: 'Removing a background in the Mapshroom Mask Editor at double speed',
        original: 'Original',
        yourPhoto: 'Your photo',
        click1: 'Click 1',
        removeBackground: 'Remove background',
        click2: 'Click 2',
        depthMap: 'Depth map',
      },
      projector: {
        title: 'Connect the projector',
        bodyBefore: 'Connect the computer to the projector with HDMI. Press ',
        bodyStrong: 'Output',
        bodyAfter: ' and move the new browser window onto the projector display.',
        mini: ['Connect HDMI', 'Click Output', 'Move the window to the projector', 'Enter full screen'],
      },
      fit: {
        title: 'Fit the projection to the object',
        bodyBefore: 'In the top bar, click ',
        bodyStrong: 'Move',
        bodyAfter: ' (right after File) to turn move mode on. Use Up, Down, Left, and Right to position the image; use W and H to resize it until the edges match. Click Move Off when you are done.',
        action: 'Turn move mode on, then align the projection.',
        toolbarHint: 'Top bar — after File',
        cardHint: 'Tap for small adjustments. Keep the object and projector still.',
      },
      shader: {
        title: 'Choose a shader',
        bodyBefore: 'Open ',
        bodyStrongShader: 'Shader',
        bodyMid: ', then ',
        bodyStrongPreset: 'Preset list',
        bodyAfter: '. Preview the styles and select one that reads clearly on the object.',
        action: 'Choose a preset.',
      },
      customize: {
        title: 'Customize the shader',
        body: 'Use the sliders on the left to change speed, intensity, scale, relief, and color. Every change appears live.',
        tipLabel: 'Start simple',
        tip: 'Set the overall look first, then add motion. High contrast usually projects better.',
      },
      timeline: {
        title: 'Customize the timeline',
        body: 'Add shader clips along the bottom timeline. Drag clips to reorder them, set the duration, and choose transitions.',
        keys: ['Drag to reorder', 'Set duration', 'Choose transition'],
      },
      export: {
        title: 'Export to USB and project',
        body: 'Export the finished timeline as a video. Copy it to a USB key, connect the key to the projector, and play it full screen on repeat.',
        flow: [
          { title: 'Export video', detail: 'Timeline toolbar' },
          { title: 'Copy to USB', detail: 'Eject safely' },
          { title: 'Plug into projector', detail: 'Select USB / Media' },
          { title: 'Play on loop', detail: 'Full screen' },
        ],
      },
    },
    ctaReady: 'Everything is ready.',
    ctaTitle: 'Text-to-shader, locally.',
    ctaLead: 'Run open models inside Mapshroom — or connect your favorite LLM.',
    ctaButton: 'Open Mapshroom →',
    footerTagline: 'Just take a photo and the app does the rest.',
    footerWorkspace: 'Workspace',
  },
  it: {
    documentTitle: 'Tutorial — Mapshroom',
    navViewSteps: 'Vedi i passi',
    navOpenWorkspace: 'Apri workspace',
    eyebrow: 'Camera → Mapshroom → proiettore',
    heroTitleBefore: 'Projection mapping reso semplice,',
    heroTitleEmphasis: 'ti basta una foto.',
    heroLead: "L'app fa il resto — dalla depth alla proiezione.",
    heroCta: 'Inizia il tutorial ↓',
    heroDuration: 'Circa 10 minuti',
    heroVisualCaption: 'Il soggetto diventa la tela.',
    kitLabel: 'Cosa ti serve',
    kit: [
      { number: '01', title: 'Un soggetto', detail: 'Scultura o oggetto' },
      { number: '02', title: 'Una camera', detail: 'Basta il telefono' },
      { number: '03', title: 'Un proiettore', detail: 'Collegamento HDMI' },
      { number: '04', title: 'Una chiavetta USB', detail: 'Per la riproduzione finale' },
    ],
    stepLabel: (number) => `Passo ${number}`,
    clickHere: 'Clicca qui',
    steps: {
      photograph: {
        title: 'Fotografa la scultura',
        body: "Mettiti frontalmente all'oggetto e tieni il telefono in piano. Inquadra tutta la forma lasciando spazio intorno ai bordi.",
        tipLabel: 'Importante',
        tip: "Scatta la foto il più vicino possibile all'obiettivo del proiettore. Allineare i punti di vista rende il mapping più veloce.",
      },
      load: {
        title: 'Carica la foto in Mapshroom',
        bodyBefore: "Apri il workspace, scegli ",
        bodyStrong: 'Load asset',
        bodyAfter: ' nella barra in alto, poi seleziona la foto. Compare nella media library e sullo stage.',
        action: 'Seleziona la foto della scultura.',
      },
      process: {
        title: 'Rimuovi lo sfondo e crea la depth',
        body: "Nella media library seleziona la foto. Prima rimuovi lo sfondo; poi genera una depth map così gli shader reagiscono alla forma dell'oggetto.",
        videoCaption: 'Mask Editor — rimuovi lo sfondo',
        videoAria: 'Rimozione dello sfondo nel Mask Editor di Mapshroom a velocità doppia',
        original: 'Originale',
        yourPhoto: 'La tua foto',
        click1: 'Click 1',
        removeBackground: 'Rimuovi sfondo',
        click2: 'Click 2',
        depthMap: 'Depth map',
      },
      projector: {
        title: 'Collega il proiettore',
        bodyBefore: 'Collega il computer al proiettore con HDMI. Premi ',
        bodyStrong: 'Output',
        bodyAfter: ' e sposta la nuova finestra del browser sul display del proiettore.',
        mini: ['Collega HDMI', 'Clicca Output', 'Sposta la finestra sul proiettore', 'Vai a schermo intero'],
      },
      fit: {
        title: "Adatta la proiezione all'oggetto",
        bodyBefore: 'Nella barra in alto, clicca ',
        bodyStrong: 'Move',
        bodyAfter: " (subito dopo File) per attivare la move mode. Usa Su, Giù, Sinistra e Destra per posizionare l'immagine; usa W e H per ridimensionarla finché i bordi coincidono. Clicca Move Off quando hai finito.",
        action: 'Attiva la move mode, poi allinea la proiezione.',
        toolbarHint: 'Barra in alto — dopo File',
        cardHint: "Tocca per piccoli aggiustamenti. Tieni fermo l'oggetto e il proiettore.",
      },
      shader: {
        title: 'Scegli uno shader',
        bodyBefore: 'Apri ',
        bodyStrongShader: 'Shader',
        bodyMid: ', poi ',
        bodyStrongPreset: 'Preset list',
        bodyAfter: ". Anteprima gli stili e scegli quello che si legge meglio sull'oggetto.",
        action: 'Scegli un preset.',
      },
      customize: {
        title: 'Personalizza lo shader',
        body: 'Usa gli slider a sinistra per cambiare velocità, intensità, scala, rilievo e colore. Ogni modifica appare in tempo reale.',
        tipLabel: 'Parti semplice',
        tip: "Definisci prima l'aspetto generale, poi aggiungi il movimento. Un contrasto alto di solito proietta meglio.",
      },
      timeline: {
        title: 'Personalizza la timeline',
        body: 'Aggiungi clip shader lungo la timeline in basso. Trascina le clip per riordinarle, imposta la durata e scegli le transizioni.',
        keys: ['Trascina per riordinare', 'Imposta durata', 'Scegli transizione'],
      },
      export: {
        title: 'Esporta su USB e proietta',
        body: 'Esporta la timeline finita come video. Copiala su una chiavetta USB, collega la chiavetta al proiettore e riproducila a schermo intero in loop.',
        flow: [
          { title: 'Esporta video', detail: 'Toolbar timeline' },
          { title: 'Copia su USB', detail: 'Espelli in sicurezza' },
          { title: 'Inserisci nel proiettore', detail: 'Seleziona USB / Media' },
          { title: 'Riproduci in loop', detail: 'Schermo intero' },
        ],
      },
    },
    ctaReady: 'Tutto pronto.',
    ctaTitle: 'Text-to-shader, in locale.',
    ctaLead: 'Esegui modelli open in Mapshroom — o collega il tuo LLM preferito.',
    ctaButton: 'Apri Mapshroom →',
    footerTagline: "Scatta una foto e l'app fa il resto.",
    footerWorkspace: 'Workspace',
  },
};
