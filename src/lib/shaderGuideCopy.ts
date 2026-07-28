export type ShaderGuideLocale = 'en' | 'it';

export function resolveShaderGuideLocale(): ShaderGuideLocale {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => language.toLowerCase().startsWith('it')) ? 'it' : 'en';
}

export const SHADER_GUIDE_COPY = {
  en: {
    documentTitle: 'GLSL shaders: a beginner’s prompting guide | Mapshroom',
    nav: {
      what: 'What is GLSL?',
      recipe: 'Prompt recipe',
      errors: 'Fix errors',
      open: 'Open Mapshroom',
    },
    copy: {
      action: 'Copy prompt',
      copied: 'Copied ✓',
      status: 'Prompt copied to your clipboard.',
    },
    hero: {
      eyebrow: 'Shader guide · zero coding required',
      title: 'Turn an idea into',
      emphasis: 'moving light.',
      lead:
        'You do not need to know GLSL to make a shader. Learn what to describe, how to guide the AI one decision at a time, and what to do when the code gets confused.',
      cta: 'Build your first prompt',
      duration: 'Read time · 8 minutes',
      shaderName: 'CHROMATIC FLUID SCULPTURE',
      shaderComment: '// five layers of warped light',
      shaderStatus: 'RUNNING',
      shaderMeta: '5 LAYERS · FBM · DOMAIN WARP',
    },
    facts: [
      { number: '01', title: 'Shader', detail: 'A tiny program for pixels' },
      { number: '02', title: 'GLSL', detail: 'The language a graphics card reads' },
      { number: '03', title: 'Inputs', detail: 'Your image, position, size, and time' },
      { number: '04', title: 'Output', detail: 'A new picture, redrawn live' },
    ],
    intro: {
      eyebrow: 'First things first',
      title: 'What is a GLSL shader?',
      beforeShader:
        'Imagine giving every pixel on the screen the same tiny instruction: “look at the original image, check where you are, check the time, then choose a color.” The graphics card repeats that instruction for thousands of pixels at once, many times per second. That instruction is a ',
      shaderWord: 'shader',
      afterShader: '.',
      beforeGlsl: '',
      glslWord: 'GLSL',
      afterGlsl:
        ' is simply the language used to write it. Mapshroom connects the image, clock, controls, and screen for you, so you can focus on the visual idea.',
      pipeline: [
        {
          label: 'INPUT',
          title: 'Your image',
          body: 'Each pixel arrives with a color and a position.',
        },
        {
          label: 'INSTRUCTION',
          title: 'The shader',
          body: 'It moves, mixes, masks, colors, and reacts to time.',
        },
        {
          label: 'OUTPUT',
          title: 'Moving light',
          body: 'The result is redrawn live on your subject.',
        },
      ],
      terms: [
        {
          code: 'uv',
          title: 'Where am I?',
          body: 'The position of a pixel: left, right, top, or bottom.',
        },
        {
          code: 'time',
          title: 'What moment is it?',
          body: 'A clock that makes waves, pulses, and motion possible.',
        },
        {
          code: 'resolution',
          title: 'How large is the screen?',
          body: 'Width and height, used to keep shapes in proportion.',
        },
        {
          code: 'uniform',
          title: 'What can I control?',
          body: 'A named value Mapshroom can turn into a slider or color control.',
        },
      ],
      reassuranceStrong: 'You do not have to memorize these.',
      reassurance:
        'They are useful words for diagnosing a result, not a test you must pass before creating.',
    },
    recipe: {
      eyebrow: 'The prompting recipe',
      title: 'Prompt the picture,',
      emphasis: 'not the program.',
      lead:
        'A useful prompt reads like art direction. Describe what should remain, what should change, how it moves, and what you want to adjust later. Let Mapshroom handle the GLSL structure.',
      steps: [
        {
          number: '01',
          title: 'Protect the starting point',
          body:
            'Say what must stay visible. This prevents the AI from replacing your image with an unrelated full-screen pattern.',
          example: '“Keep the original subject recognizable and preserve transparency.”',
        },
        {
          number: '02',
          title: 'Name one visual effect',
          body:
            'Start with one clear transformation: outlines, ripples, pixels, glow, displacement, trails, or color bands.',
          example: '“Add soft contour lines around the brightest edges.”',
        },
        {
          number: '03',
          title: 'Describe movement with a verb',
          body:
            'Use words such as drift, pulse, rotate, crawl, expand, flicker, or follow. Add a direction and a pace.',
          example: '“Make the lines drift upward slowly, like warm air.”',
        },
        {
          number: '04',
          title: 'Choose color and mood',
          body:
            'Give the AI a small palette and an atmosphere. Two colors are often easier to control than “make it colorful.”',
          example: '“Use mint green lines with a subtle coral glow.”',
        },
        {
          number: '05',
          title: 'Ask for the controls',
          body:
            'Controls let you art-direct the result after generation, without rewriting the shader.',
          example: '“Add sliders for speed, line width, glow, and color.”',
        },
      ],
      formula: 'SUBJECT + EFFECT + MOTION + COLOR + CONTROLS',
      promptLabel: 'A strong first prompt',
      prompt: `Keep the original subject recognizable and preserve its transparency.
Add soft contour lines around the brightest edges.
Make the lines drift upward slowly, like warm air.
Use mint green for the lines and a subtle coral glow.
Add controls for speed, line width, glow, and color.
Keep the shader smooth and lightweight.`,
      whyStrong: 'Why this works:',
      why:
        'every sentence makes one decision. If the result is close, change only the sentence that is wrong.',
    },
    workflow: {
      eyebrow: 'Inside Mapshroom',
      title: 'From sentence to shader, step by step.',
      lead:
        'Mapshroom includes the current shader and the required code format when it asks the AI. Your job is to describe the look and judge the result.',
      steps: [
        {
          number: '01',
          title: 'Load an image',
          body: 'Choose the subject you want the effect to react to.',
        },
        {
          number: '02',
          title: 'Open Shader',
          body: 'Start from a preset or the current shader in the code panel.',
        },
        {
          number: '03',
          title: 'Write what you want',
          body: 'Use the five-part recipe above, then press Generate.',
        },
        {
          number: '04',
          title: 'Judge one thing at a time',
          body: 'Check the subject, effect, motion, color, and controls in that order.',
        },
        {
          number: '05',
          title: 'Refine with follow-ups',
          body: 'Ask for one specific change while keeping everything else.',
        },
        {
          number: '06',
          title: 'Save the good version',
          body: 'Keep a working version before a large mix or experiment.',
        },
      ],
      vagueLabel: 'VAGUE FOLLOW-UP',
      vague: '“Make it better and faster.”',
      directLabel: 'DIRECTABLE FOLLOW-UP',
      direct:
        '“Keep the composition and colors. Double only the upward drift speed. Do not change the transparency.”',
    },
    mix: {
      eyebrow: 'Mixing shaders',
      title: 'Yes, you can paste other code inside.',
      body1:
        'GLSL from another shader can be used as material for a new one. Paste it into Mapshroom’s code editor, or include it in your AI conversation, then explain which part you want to keep: its movement, colors, mask, texture, or shape.',
      strong: 'Do not simply place two complete shaders one after another.',
      body2:
        ' They may define the same names or use different structures. Ask the AI to integrate them and return one complete replacement shader.',
      checklist: [
        'Choose which shader is the base.',
        'Name the exact feature to borrow from the other.',
        'Say where or when the two effects should blend.',
        'Ask it to keep useful controls and rename conflicts.',
      ],
      promptLabel: 'Prompt for mixing two shaders',
      prompt: `Use my current shader as the base.
Integrate the pasted shader as a second effect — do not place two complete shaders one after another.
Keep the base shader's colors and transparency.
Use the new shader only to add its ripple movement.
Blend the ripple into bright image areas, rename any conflicting uniforms, and return one complete Mapshroom shader.

PASTED SHADER:
[paste the other GLSL code here]`,
    },
    errors: {
      eyebrow: 'When generation goes wrong',
      title: 'An error is feedback,',
      titleSecond: 'not a dead end.',
      beforeFix:
        'AI writes code by prediction, so a missing bracket, unsupported function, or conflicting name can happen. Mapshroom keeps the last valid render, retries generated GLSL once, and shows ',
      fix: 'Fix Error',
      afterFix: ' when the compiler still needs help.',
      loop: [
        {
          number: '01',
          title: 'Copy the exact error',
          body: 'Do not paraphrase the compiler message.',
        },
        {
          number: '02',
          title: 'Keep the broken code',
          body: 'The AI needs to see what produced it.',
        },
        {
          number: '03',
          title: 'Restate the rules',
          body: 'WebGL 1.0, one complete Mapshroom shader.',
        },
        {
          number: '04',
          title: 'Ask for the smallest fix',
          body: 'Preserve the look instead of redesigning it.',
        },
      ],
      promptLabel: 'Repair prompt for any chat LLM',
      prompt: `Fix this shader with the smallest possible change.
Preserve its current look, colors, controls, and transparency.
It must use WebGL 1.0 GLSL, texture2D(), and one processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) function.
Do not add void main() or gl_FragColor.
Return one complete replacement shader.

COMPILER ERROR:
[paste the exact error here]

BROKEN GLSL:
[paste the complete shader here]`,
      troubleshooting: [
        {
          label: 'BLACK OR INVISIBLE',
          title: 'Reframe the output',
          body:
            '“Sample the original texture, preserve its alpha, and keep the subject visible before adding the effect.”',
        },
        {
          label: 'TOO SLOW OR FLICKERY',
          title: 'Simplify the work',
          body:
            '“Keep one effect, remove expensive loops, and make the motion smooth and lightweight.”',
        },
        {
          label: 'LOOKS WRONG',
          title: 'Describe what you observe',
          body:
            '“The glow covers the whole image. Restrict it to bright edges and keep dark areas unchanged.”',
        },
        {
          label: 'WRONG CODE FORMAT',
          title: 'Repeat the contract',
          body:
            '“Return one complete WebGL 1.0 shader with processColor(), texture2D(), and no main().”',
        },
      ],
    },
    anywhere: {
      eyebrow: 'One workflow, any AI',
      title: 'Use it inside the app or in any chat LLM.',
      options: [
        {
          label: 'MAPSHROOM',
          title: 'The shortest path',
          body:
            'Pick an AI option in the Shader panel and press Generate. Mapshroom automatically adds the current GLSL, its required structure, and the technical contract.',
        },
        {
          label: 'CHATGPT · PERPLEXITY',
          title: 'The guided hand-off',
          body:
            'Choose either chat in Mapshroom. It prepares the full request, opens the chat, and lets you paste the returned shader back into the app.',
        },
        {
          label: 'ANY OTHER CHAT LLM',
          title: 'The same conversation',
          body:
            'Paste your current shader, your visual request, and the Mapshroom shader rules. Ask for one complete GLSL code block, then paste that code into Mapshroom.',
        },
      ],
      loopStrong: 'The durable loop',
      loop:
        'Describe → generate → observe → change one thing → save a version. Better shaders come from clearer feedback, not from one magical prompt.',
    },
    cta: {
      eyebrow: 'YOU ALREADY KNOW ENOUGH TO BEGIN',
      title: 'Describe the light you want to see.',
      lead: 'Mapshroom will help you turn it into a shader.',
      open: 'Open Mapshroom',
      tutorial: 'Read the projection tutorial',
    },
    footer: {
      tagline: 'Free forever · Open source forever',
      why: 'Why it is free',
    },
  },
  it: {
    documentTitle: 'Shader GLSL: guida al prompting per iniziare | Mapshroom',
    nav: {
      what: 'Cos’è GLSL?',
      recipe: 'Formula del prompt',
      errors: 'Correggi errori',
      open: 'Apri Mapshroom',
    },
    copy: {
      action: 'Copia prompt',
      copied: 'Copiato ✓',
      status: 'Prompt copiato negli appunti.',
    },
    hero: {
      eyebrow: 'Guida agli shader · non serve programmare',
      title: 'Trasforma un’idea in',
      emphasis: 'luce in movimento.',
      lead:
        'Non devi conoscere GLSL per creare uno shader. Impara cosa descrivere, come guidare l’AI una scelta alla volta e come reagire quando il codice si confonde.',
      cta: 'Costruisci il primo prompt',
      duration: 'Tempo di lettura · 8 minuti',
      shaderName: 'SCULTURA FLUIDA CROMATICA',
      shaderComment: '// cinque livelli di luce deformata',
      shaderStatus: 'ATTIVO',
      shaderMeta: '5 LIVELLI · FBM · DOMAIN WARP',
    },
    facts: [
      { number: '01', title: 'Shader', detail: 'Un piccolo programma per i pixel' },
      { number: '02', title: 'GLSL', detail: 'Il linguaggio letto dalla scheda grafica' },
      { number: '03', title: 'Input', detail: 'Immagine, posizione, dimensione e tempo' },
      { number: '04', title: 'Output', detail: 'Una nuova immagine ridisegnata dal vivo' },
    ],
    intro: {
      eyebrow: 'Partiamo dall’inizio',
      title: 'Cos’è uno shader GLSL?',
      beforeShader:
        'Immagina di dare a ogni pixel dello schermo la stessa piccola istruzione: “guarda l’immagine originale, controlla dove ti trovi, controlla il tempo e scegli un colore”. La scheda grafica ripete questa istruzione per migliaia di pixel insieme, molte volte al secondo. Quell’istruzione è uno ',
      shaderWord: 'shader',
      afterShader: '.',
      beforeGlsl: '',
      glslWord: 'GLSL',
      afterGlsl:
        ' è semplicemente il linguaggio usato per scriverlo. Mapshroom collega per te immagine, tempo, controlli e schermo, così puoi concentrarti sull’idea visiva.',
      pipeline: [
        {
          label: 'INPUT',
          title: 'La tua immagine',
          body: 'Ogni pixel arriva con un colore e una posizione.',
        },
        {
          label: 'ISTRUZIONE',
          title: 'Lo shader',
          body: 'Muove, mescola, maschera, colora e reagisce al tempo.',
        },
        {
          label: 'OUTPUT',
          title: 'Luce in movimento',
          body: 'Il risultato viene ridisegnato dal vivo sul soggetto.',
        },
      ],
      terms: [
        {
          code: 'uv',
          title: 'Dove mi trovo?',
          body: 'La posizione di un pixel: sinistra, destra, alto o basso.',
        },
        {
          code: 'time',
          title: 'In quale momento?',
          body: 'Un orologio che rende possibili onde, pulsazioni e movimento.',
        },
        {
          code: 'resolution',
          title: 'Quanto è grande lo schermo?',
          body: 'Larghezza e altezza, usate per mantenere le forme proporzionate.',
        },
        {
          code: 'uniform',
          title: 'Cosa posso controllare?',
          body: 'Un valore con nome che Mapshroom trasforma in slider o controllo colore.',
        },
      ],
      reassuranceStrong: 'Non devi memorizzare questi termini.',
      reassurance:
        'Sono parole utili per capire un risultato, non un esame da superare prima di creare.',
    },
    recipe: {
      eyebrow: 'La formula del prompting',
      title: 'Descrivi l’immagine,',
      emphasis: 'non il programma.',
      lead:
        'Un prompt utile sembra una direzione artistica. Descrivi cosa deve restare, cosa deve cambiare, come si muove e cosa vuoi regolare dopo. Lascia che Mapshroom gestisca la struttura GLSL.',
      steps: [
        {
          number: '01',
          title: 'Proteggi il punto di partenza',
          body:
            'Dichiara cosa deve restare visibile. Così l’AI non sostituirà la tua immagine con un pattern a pieno schermo senza relazione.',
          example: '“Mantieni riconoscibile il soggetto originale e conserva la trasparenza.”',
        },
        {
          number: '02',
          title: 'Scegli un solo effetto visivo',
          body:
            'Inizia con una trasformazione chiara: contorni, increspature, pixel, bagliore, deformazione, scie o bande di colore.',
          example: '“Aggiungi contorni morbidi intorno ai bordi più luminosi.”',
        },
        {
          number: '03',
          title: 'Descrivi il movimento con un verbo',
          body:
            'Usa parole come fluttuare, pulsare, ruotare, scorrere, espandere o seguire. Aggiungi direzione e velocità.',
          example: '“Fai salire lentamente le linee, come aria calda.”',
        },
        {
          number: '04',
          title: 'Scegli colore e atmosfera',
          body:
            'Dai all’AI una palette piccola e un’atmosfera. Due colori sono spesso più facili da controllare di “rendilo colorato”.',
          example: '“Usa linee verde menta con un bagliore corallo leggero.”',
        },
        {
          number: '05',
          title: 'Chiedi i controlli',
          body:
            'I controlli ti permettono di dirigere il risultato dopo la generazione, senza riscrivere lo shader.',
          example: '“Aggiungi slider per velocità, spessore, bagliore e colore.”',
        },
      ],
      formula: 'SOGGETTO + EFFETTO + MOVIMENTO + COLORE + CONTROLLI',
      promptLabel: 'Un buon primo prompt',
      prompt: `Mantieni riconoscibile il soggetto originale e conserva la sua trasparenza.
Aggiungi contorni morbidi intorno ai bordi più luminosi.
Fai salire lentamente le linee, come aria calda.
Usa verde menta per le linee e un bagliore corallo leggero.
Aggiungi controlli per velocità, spessore delle linee, bagliore e colore.
Mantieni lo shader fluido e leggero.`,
      whyStrong: 'Perché funziona:',
      why:
        'ogni frase prende una sola decisione. Se il risultato è quasi giusto, modifica soltanto la frase che non funziona.',
    },
    workflow: {
      eyebrow: 'Dentro Mapshroom',
      title: 'Dalla frase allo shader, passo dopo passo.',
      lead:
        'Quando interroga l’AI, Mapshroom include lo shader corrente e il formato di codice richiesto. Il tuo compito è descrivere l’aspetto e valutare il risultato.',
      steps: [
        {
          number: '01',
          title: 'Carica un’immagine',
          body: 'Scegli il soggetto a cui vuoi far reagire l’effetto.',
        },
        {
          number: '02',
          title: 'Apri Shader',
          body: 'Parti da un preset o dallo shader attuale nel pannello del codice.',
        },
        {
          number: '03',
          title: 'Scrivi ciò che vuoi',
          body: 'Usa la formula in cinque parti e premi Genera.',
        },
        {
          number: '04',
          title: 'Valuta una cosa alla volta',
          body: 'Controlla nell’ordine soggetto, effetto, movimento, colore e controlli.',
        },
        {
          number: '05',
          title: 'Perfeziona con richieste successive',
          body: 'Chiedi una modifica precisa mantenendo invariato tutto il resto.',
        },
        {
          number: '06',
          title: 'Salva la versione buona',
          body: 'Conserva una versione funzionante prima di un mix o di un esperimento importante.',
        },
      ],
      vagueLabel: 'RICHIESTA VAGA',
      vague: '“Rendilo più bello e più veloce.”',
      directLabel: 'RICHIESTA DIRIGIBILE',
      direct:
        '“Mantieni composizione e colori. Raddoppia soltanto la velocità del movimento verso l’alto. Non cambiare la trasparenza.”',
    },
    mix: {
      eyebrow: 'Mescolare shader',
      title: 'Sì, puoi incollare altro codice.',
      body1:
        'Il GLSL di un altro shader può diventare materiale per uno nuovo. Incollalo nell’editor di Mapshroom o nella conversazione con l’AI, poi indica quale parte vuoi mantenere: movimento, colori, maschera, texture o forma.',
      strong: 'Non mettere semplicemente due shader completi uno dopo l’altro.',
      body2:
        ' Potrebbero definire gli stessi nomi o usare strutture diverse. Chiedi all’AI di integrarli e restituire un unico shader completo.',
      checklist: [
        'Scegli quale shader sarà la base.',
        'Indica la caratteristica precisa da prendere dall’altro.',
        'Spiega dove o quando i due effetti devono fondersi.',
        'Chiedi di conservare i controlli utili e rinominare i conflitti.',
      ],
      promptLabel: 'Prompt per mescolare due shader',
      prompt: `Usa il mio shader attuale come base.
Integra lo shader incollato come secondo effetto: non mettere due shader completi uno dopo l’altro.
Mantieni i colori e la trasparenza dello shader di base.
Usa il nuovo shader soltanto per aggiungere il suo movimento a increspature.
Fondi le increspature nelle aree luminose dell’immagine, rinomina gli uniform in conflitto e restituisci un unico shader Mapshroom completo.

SHADER INCOLLATO:
[incolla qui l’altro codice GLSL]`,
    },
    errors: {
      eyebrow: 'Quando la generazione non funziona',
      title: 'Un errore è un’informazione,',
      titleSecond: 'non un vicolo cieco.',
      beforeFix:
        'L’AI scrive codice per previsione, quindi possono comparire una parentesi mancante, una funzione non supportata o un nome in conflitto. Mapshroom conserva l’ultimo rendering valido, riprova una volta il GLSL generato e mostra ',
      fix: 'Correggi errore',
      afterFix: ' quando il compilatore ha ancora bisogno di aiuto.',
      loop: [
        {
          number: '01',
          title: 'Copia l’errore esatto',
          body: 'Non riscrivere il messaggio del compilatore con parole tue.',
        },
        {
          number: '02',
          title: 'Conserva il codice rotto',
          body: 'L’AI deve vedere cosa ha prodotto l’errore.',
        },
        {
          number: '03',
          title: 'Ripeti le regole',
          body: 'WebGL 1.0, un unico shader Mapshroom completo.',
        },
        {
          number: '04',
          title: 'Chiedi la correzione minima',
          body: 'Conserva l’aspetto invece di riprogettarlo.',
        },
      ],
      promptLabel: 'Prompt di correzione per qualsiasi chat LLM',
      prompt: `Correggi questo shader con la modifica più piccola possibile.
Mantieni l’aspetto attuale, i colori, i controlli e la trasparenza.
Deve usare GLSL WebGL 1.0, texture2D() e una sola funzione processColor(sampler2D tex, vec2 uv, float time, vec2 resolution).
Non aggiungere void main() o gl_FragColor.
Restituisci un unico shader sostitutivo completo.

ERRORE DEL COMPILATORE:
[incolla qui l’errore esatto]

GLSL ROTTO:
[incolla qui lo shader completo]`,
      troubleshooting: [
        {
          label: 'NERO O INVISIBILE',
          title: 'Riformula l’output',
          body:
            '“Campiona la texture originale, conserva il suo alpha e mantieni visibile il soggetto prima di aggiungere l’effetto.”',
        },
        {
          label: 'TROPPO LENTO O INSTABILE',
          title: 'Semplifica il lavoro',
          body:
            '“Mantieni un solo effetto, rimuovi i loop costosi e rendi il movimento fluido e leggero.”',
        },
        {
          label: 'ASPETTO SBAGLIATO',
          title: 'Descrivi ciò che osservi',
          body:
            '“Il bagliore copre tutta l’immagine. Limitalo ai bordi luminosi e lascia invariate le aree scure.”',
        },
        {
          label: 'FORMATO CODICE ERRATO',
          title: 'Ripeti il contratto',
          body:
            '“Restituisci un unico shader WebGL 1.0 completo con processColor(), texture2D() e senza main().”',
        },
      ],
    },
    anywhere: {
      eyebrow: 'Un flusso, qualsiasi AI',
      title: 'Usalo nell’app o in qualsiasi chat LLM.',
      options: [
        {
          label: 'MAPSHROOM',
          title: 'Il percorso più breve',
          body:
            'Scegli un’opzione AI nel pannello Shader e premi Genera. Mapshroom aggiunge automaticamente il GLSL attuale, la struttura richiesta e il contratto tecnico.',
        },
        {
          label: 'CHATGPT · PERPLEXITY',
          title: 'Il passaggio guidato',
          body:
            'Scegli una delle due chat in Mapshroom. L’app prepara la richiesta completa, apre la chat e ti permette di incollare la risposta shader dentro Mapshroom.',
        },
        {
          label: 'QUALSIASI ALTRA CHAT LLM',
          title: 'La stessa conversazione',
          body:
            'Incolla lo shader attuale, la richiesta visiva e le regole shader di Mapshroom. Chiedi un unico blocco di codice GLSL completo, poi incollalo in Mapshroom.',
        },
      ],
      loopStrong: 'Il ciclo che funziona',
      loop:
        'Descrivi → genera → osserva → cambia una cosa → salva una versione. Gli shader migliori nascono da feedback più chiari, non da un unico prompt magico.',
    },
    cta: {
      eyebrow: 'SAI GIÀ ABBASTANZA PER INIZIARE',
      title: 'Descrivi la luce che vuoi vedere.',
      lead: 'Mapshroom ti aiuterà a trasformarla in uno shader.',
      open: 'Apri Mapshroom',
      tutorial: 'Leggi il tutorial di projection mapping',
    },
    footer: {
      tagline: 'Gratis per sempre · Open source per sempre',
      why: 'Perché è gratis',
    },
  },
} as const;
