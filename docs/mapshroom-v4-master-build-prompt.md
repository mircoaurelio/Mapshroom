# Master prompt — costruzione completa di Mapshroom V4

Istruzioni d'uso: passa all'agente tutto il testo compreso tra **INIZIO PROMPT** e **FINE PROMPT**. Il prompt presume che l'agente abbia accesso al repository Mapshroom e deve essere eseguito come obiettivo di lunga durata, non come richiesta di una risposta teorica.

---

## INIZIO PROMPT

Sei il principal engineer, product architect e graphics engineer responsabile della costruzione end-to-end di **Mapshroom V4**. Nel parlato il progetto può essere chiamato anche “Mapstream”: considera i due nomi riferiti alla stessa applicazione, ma usa **Mapshroom** nel codice e nella documentazione.

Il tuo compito non è creare una demo né proporre soltanto un'architettura. Devi:

1. analizzare completamente Mapshroom V3 e le intenzioni presenti nel repository;
2. trasformare requisiti, audit e intenzioni in un backlog verificabile;
3. costruire progressivamente Mapshroom V4;
4. mantenere la parità funzionale con V3 senza perdere comportamenti;
5. migliorare renderer, shader, layer, timeline, audio reactive, Web desktop e Web mobile, predisponendo senza implementare ora Studio offline;
6. verificare continuamente il risultato fino a una release utilizzabile;
7. consegnare la V4 completa e realmente funzionante, non soltanto scaffold, mockup, TODO o vertical slice incompiute.

La V4 deve essere immediatamente riconoscibile come evoluzione di Mapshroom V3: conserva linguaggio visivo, semplicità, canvas-first experience e interazioni riuscite, ma ripensa con maggiore intenzione gerarchia, flussi, responsive, accessibilità, consistenza e progressive disclosure. “Molto simile” non significa copiare i difetti architetturali o ogni posizione pixel; significa mantenere identità e memoria muscolare mentre il design diventa più chiaro e coerente.

Lavora in autonomia finché l'obiettivo non è realmente completato. Se il lavoro supera una sessione o il contesto disponibile, salva sempre stato, decisioni, evidenze e prossimo task nel repository, quindi riprendi da lì senza rifare l'audit da zero.

## Decisioni prodotto già approvate — non richiederle di nuovo

- La release oggetto di questo prompt è **Mapshroom V4 Web**, completa su Web desktop e Web mobile.
- La pubblicazione online effettiva è fuori scope e verrà decisa in seguito: prepara una build production-ready, ma non eseguire deploy e non modificare infrastruttura/cloud.
- Windows offline, macOS installabile e app native Android/iOS restano nella direzione architetturale, ma non sono gate della release Web e non vanno implementati in questa esecuzione salvo nuova richiesta esplicita.
- Lavora nello stesso repository con migrazione strangler; mantieni V3 eseguibile e non creare un secondo prodotto scollegato.
- Non fermarti per approvazioni di fase: continua automaticamente dal backlog alla build Web completa. Fermati soltanto per nuova autorità, credenziali/costi, azioni irreversibili o una decisione prodotto davvero non deducibile.
- Stack approvato: React/TypeScript per UI, Rust/WASM nei motori e confini costosi, `wgpu`/WebGPU dove utile, WebGL2 come fallback, adapter GLSL legacy.
- La UI deve restare circa **80% riconoscibile come Mapshroom V3**, ma con design, gerarchia, responsive e consistenza migliorati.
- I pannelli desktop devono essere dockable e personalizzabili: spostamento a sinistra/destra/basso, riordino, resize, collapse/hide, layout salvato localmente e reset al default. Sul mobile si personalizzano ordine/visibilità delle azioni senza rompere il canvas mirror-first.
- Il workflow familiare V3 descritto nella sezione E è un requisito di prodotto. Layer e timeline vanno ripensati perché la loro esperienza attuale non è abbastanza affidabile/chiara; non usare questo come motivo per perdere le feature V3.
- Tutorial, tour e onboarding editoriale sono un deferimento approvato: inventariali e preservane gli asset, ma non bloccare la release Web per ricostruirli.
- Baseline utente nota: computer con 32 GB RAM e circa 2 GB VRAM; iPhone 15 Pro; proiettore dichiarato “180p”. Non indovinare quest'ultimo dato: rileva la risoluzione quando possibile e testa almeno 720p e 1080p finché non viene confermata.
- La riduzione adattiva della qualità è approvata se visibile, reversibile e non altera geometria/mapping o stato del progetto.
- Mantieni editor shader manuale, sistema di tag/word-tag per prompt e libreria, handoff ChatGPT/Perplexity con URL parametrizzata e Share che genera/importa una URL di progetto.

## A. Fonti di verità e ordine di priorità

All'inizio individua la root reale del repository e leggi integralmente, se presenti:

- `docs/mapshroom-v4-product-architecture-spec.md`;
- questo master prompt;
- `README.md` e tutta la documentazione prodotto/tecnica rilevante;
- eventuali `AGENTS.md`, istruzioni locali e skill del repository;
- tipi, config, route, componenti, renderer, shader, preset, worker, test, script, app standalone e workflow CI.

Usa questo ordine per risolvere conflitti:

1. requisiti espliciti di questo prompt;
2. specifica V4 già presente nel repository;
3. comportamento V3 effettivamente funzionante e verificato;
4. test V3;
5. intenzioni tecniche/prodotto trovate nel codice e nei documenti;
6. copy marketing o roadmap non collegata.

Non assumere che una lista precedente sia completa. Il codice eseguibile è la fonte di verità per le feature presenti. Una feature citata soltanto in un tipo, commento, roadmap, pulsante disabilitato o teaser è un'**intenzione**, non una feature implementata: registrala comunque, ma classificala correttamente.

Se una decisione cambierebbe il prodotto in modo sostanziale, crea un ADR con opzioni, evidenze e raccomandazione. Non eliminare o deprecare una funzione V3 senza approvazione esplicita del proprietario del prodotto.

## B. Regole operative non negoziabili

### B1. Protezione del lavoro esistente

- Controlla subito branch, worktree e file modificati/non tracciati.
- Tutte le modifiche preesistenti appartengono all'utente: non sovrascriverle, non ripulirle e non includerle accidentalmente nei tuoi rollback.
- Non usare reset distruttivi.
- Quando devi “tornare indietro”, annulla esclusivamente le tue modifiche della slice corrente con una patch mirata o un revert sicuro.
- Non committare segreti, modelli binari o asset non autorizzati.
- Non cambiare dipendenze, formati persistenti o toolchain senza motivazione e verifica.

### B2. Prima capire, poi modificare

Non iniziare la riscrittura dopo aver letto pochi file. Prima completa audit, baseline, matrice di parità e piano incrementale. Puoi correggere solo problemi bloccanti necessari a eseguire la baseline.

Per ogni slice di sviluppo dichiara nel backlog:

- requisito/feature ID;
- comportamento V3 da conservare;
- intenzione V4;
- file/moduli previsti;
- test e benchmark attesi;
- rischio e strategia di rollback;
- criterio di completamento.

### B3. Cambi minimi e architettura scalabile

“Pochissimo codice” significa **minima complessità e minima superficie di modifica**, non minificazione, one-liner illeggibili o un altro file gigante.

Applica queste regole:

- riusa prima di aggiungere;
- elimina duplicazione quando puoi provarne l'equivalenza;
- preferisci dati/registri/schema a lunghi rami condizionali;
- una sola implementazione del renderer, della risoluzione timeline, dell'analisi audio e del modello parametri;
- interfacce piccole e stabili tra moduli;
- niente wrapper senza valore e niente astrazioni speculative;
- niente god component, god service o CSS globale crescente;
- componenti e use case focalizzati;
- shader/preset come dati lazy-loadable, non enormi sorgenti TypeScript importati tutti all'avvio;
- codice generato soltanto quando riproducibile, validato e non modificato a mano;
- un nuovo concetto architetturale deve sostituire complessità esistente, non aggiungersi semplicemente sopra;
- misura largest-file size, duplicazione, bundle iniziale e numero di moduli toccati per feature.

Se una modifica locale richiede patch ripetute in molti punti, fermati: probabilmente manca un confine o una API. Torna al modello, aggiorna TODO/ADR e crea il punto di estensione più piccolo possibile.

### B4. Loop di correzione e ripensamento

Per ogni slice usa questo ciclo:

**Inspect → Specify → Implement minimally → Verify → Compare with V3 → Measure → Integrate.**

Se fallisce:

1. raccogli l'errore e crea una riproduzione minima;
2. identifica se la causa è locale, di modello dati o di confine architetturale;
3. non accumulare workaround;
4. dopo due tentativi locali falliti, interrompi la patch;
5. annulla solo la tua slice non valida;
6. aggiorna TODO e ADR con la causa;
7. ridisegna il confine o suddividi il task;
8. riparti dalla modifica più piccola che risolve la causa.

Non dichiarare completata una feature soltanto perché compila.

## C. Audit completo V3 e ricerca delle intenzioni

### C1. Copertura repository

Mappa almeno:

- entry point e route;
- desktop, responsive e mobile UI;
- tipi e schema progetto;
- storage, IndexedDB, localStorage, share link e session sync;
- asset image/video e relativi blob;
- Mask Studio, depth, drawing, crop, wand e worker;
- shader editor, generatori AI, provider cloud/local e handoff esterni;
- tag/word-tag del prompt AI, categorie e loro effetto sul prompt preparato;
- tutti i preset e i bundled project;
- parser uniform e slider;
- audio reactive, BPM, beat, band, input microfono/system audio;
- MIDI e output sync;
- timeline e tutti i mode;
- layer/compositing interno;
- mapping, corner pin, grid, move, rotation e precision;
- output window, fullscreen e screen selection;
- export MP4, shader bundle e mapping JSON;
- PWA/installazione/offline reale;
- Slicer OBJ;
- analytics/privacy;
- test, benchmark, script, CI e configurazione di deploy esistente, senza pubblicare;
- API/config presenti ma non usate;
- dead code e documentazione non più allineata.

Non limitarti ai nomi dei componenti. Segui callback, stato persistito, messaggi tra iframe/Worker/window, formati di export e fallback.

### C2. Intenzioni da cercare

Cerca sistematicamente:

- `TODO`, `FIXME`, `stub`, `future`, `roadmap`, `coming soon`, `Pro`, `beta`, `reserved`;
- campi di tipo/config non consumati;
- route o componenti non collegati;
- pulsanti teaser/disabilitati;
- feature descritte nel tutorial/marketing ma non complete;
- test o benchmark che anticipano una feature;
- script di import/migrazione;
- fallback legacy;
- nomi come `tracks`, `markers`, `export`, `video generation`, `Runway`;
- commenti che descrivono una prossima architettura;
- storico Git rilevante, soltanto in lettura, quando aiuta a chiarire perché esiste una scelta.

### C3. Artefatti di audit obbligatori

Crea o aggiorna documenti compatti, indicizzati con ID stabili:

1. `docs/v4/V3_FEATURE_INVENTORY.md`;
2. `docs/v4/V3_INTENT_INVENTORY.md`;
3. `docs/v4/V4_PARITY_MATRIX.md`;
4. `docs/v4/V4_TODO.md`;
5. `docs/v4/STATUS.md`;
6. `docs/v4/adr/` per le decisioni reali.

La matrice di parità deve avere per ogni feature:

- ID;
- categoria;
- stato V3: present/partial/stub/intent/absent;
- evidenza con file e, quando utile, test o screenshot;
- comportamento osservabile;
- destinazione V4;
- Web/Mobile/Studio support;
- test di parità;
- stato implementazione;
- rischio;
- decisione di migrazione/deprecazione.

Mantieni anche un registro machine-readable minimale, per esempio JSON, YAML o TypeScript data-only, dal quale generare checklist/capability UI. Non duplicare manualmente la stessa lista in molti documenti.

## D. Baseline obbligatoria prima della V4

Esegui V3 e conserva evidenze riproducibili:

- build, lint e test disponibili;
- dimensione bundle e moduli principali;
- tempi cold/warm start;
- FPS e frame time con 1 shader, transizione, pin/composite e video;
- memoria con immagini/video rappresentativi;
- shader compile success/failure e last-known-good;
- output window e mapping;
- export MP4 e bundle shader;
- flussi mobile esistenti;
- mask/depth benchmark già presenti;
- screenshot desktop/mobile dei percorsi principali;
- progetti fixture con ogni timeline mode.

Se una baseline non passa già in V3, segnala `pre-existing`, documenta la riproduzione e non attribuirla alla V4.

Costruisci un piccolo corpus di fixture non proprietarie:

- immagine con sfondo semplice;
- immagine con bordi complessi/trasparenza;
- depth map;
- region map;
- video corto;
- shader semplice, pesante, audio reactive, multi-input e volutamente invalido;
- progetto con mapping distorto;
- progetto per ogni timeline mode e transizione.

## E. Promessa prodotto V4

Il flusso familiare da preservare non è un wizard obbligatorio, ma questo percorso continuo e non distruttivo:

**Apri/importa in Assets → scegli ruolo e varianti (color/mask/depth/regions) → posiziona e mappa con Move/Output → crea o modifica lo shader con AI o editor manuale → parametrizza con slider/tag/input live → inserisci in layer e timeline → proietta, condividi o esporta.**

L'utente può cambiare ordine e tornare a ogni passaggio senza perdere stato. Il mapping può avvenire prima della creazione dello shader, come in V3; non forzare una pipeline lineare che obblighi a completare Create prima di vedere Move/Output.

Non introdurre un node editor visibile. Il render graph può esistere internamente.

La UI deve restare estremamente semplice, coerente con l'estetica Mapshroom V3 e leggermente migliorata in gerarchia, chiarezza, accessibilità e responsiveness. Non fare un redesign estraneo al prodotto.

Superfici principali, mantenute vicine alla memoria d'uso V3:

1. **Assets / Create** — import/camera, Famiglia asset e varianti coordinate;
2. **Shader** — prompt AI, handoff, editor manuale avanzato, tag, slider e input live;
3. **Move / Mapping / Output** — posizione diretta sul canvas, calibrazione e proiezione;
4. **Layers / Composer** — ordine, opacity, blend, mix e trasformazioni per istanza;
5. **Timeline** — tempo, sequenza, clip, transizioni e automazioni supportate;
6. **Share / Export** — URL progetto, package e output compatibili.

Le superfici sono separabili nell'esperienza ma condividono lo stesso progetto e lo stesso canvas. Non duplicare asset o shader nel passaggio tra Assets, Shader, Composer e Timeline. Non introdurre un nuovo Start obbligatorio: un eventuale wizard futuro deve accelerare questo workflow, non sostituirlo.

Il layout desktop parte da un preset V3-like semplice. Pannelli e blocchi possono essere agganciati a sinistra, destra o in basso, riordinati, ridimensionati, collassati e nascosti. Persisti queste preferenze per dispositivo/profilo, non dentro il contenuto creativo condiviso, salvo un export esplicito del layout. Fornisci sempre `Reset layout` e impedisci configurazioni che rendano irraggiungibile il canvas o i comandi di recupero.

Il pairing telefono-computer è opzionale. Il Web mobile deve poter completare autonomamente il percorso essenziale: creare/modificare uno shader, salvare un Visual, comporre layer, fare mapping touch e proiettare se il telefono è collegato a un display/proiettore.

Preserva il modello mobile mirror-first di V3. Il percorso P0 usa una sola superficie: canvas e controlli vivono nello stesso viewport del telefono e il proiettore duplica/mirrors quello schermo. Non richiedere una output window, un secondo stream, un secondo browser, pairing o API multi-display. La UI deve essere un overlay a ingombro minimo sopra il canvas, con fondi molto trasparenti e tre stati verificabili: `full` per l'editing corrente, `bar` per i controlli essenziali e `hidden` per il canvas completamente pulito. Un comando Hide la disattiva subito; un tap intenzionale sul canvas richiama soltanto la barra minima. Il fatto che la UI visibile appaia temporaneamente anche sul proiettore duplicato è un compromesso accettato in favore della semplicità. Dual-screen e pairing sono enhancement opt-in.

## F. Modello dati minimo V4

Implementa uno schema versionato e migrabile che distingua almeno:

- Project;
- AssetFamily;
- AssetVariant/Artifact;
- derivation/provenance;
- EffectDefinition;
- ParameterSchema;
- VisualDefinition;
- VisualInstance;
- Composition;
- Layer;
- Clip;
- AutomationTrack;
- LiveBinding;
- OutputSurface;
- ExportPreset;
- CapabilityProfile.

Una **AssetFamily** riunisce senza confonderli:

- original;
- cutout;
- alpha matte;
- depth;
- region ID map;
- styled/diffusion variant;
- painted/manual correction;
- proxy;
- thumbnail.

Ogni derivata conserva parent, ricetta, modello/versione, parametri, checksum, data e possibilità di rigenerazione. L'originale è immutabile.

Una **VisualDefinition** contiene effetto, slot semantici, parametri/preset, binding live, compatibilità e fallback. Una **VisualInstance** contiene solo override di layer/clip, transform, mix, tempo e automazioni.

Implementa migrazioni sequenziali e fixture `V3 → V4`. Un progetto con versione precedente non deve essere semplicemente scartato.

## G. Asset preparation e AI

Il wizard deve poter:

- importare o scattare da webcam/camera;
- conservare l'originale;
- rimuovere lo sfondo e renderlo nero/trasparente;
- correggere con penna erase/restore;
- usare crop, Smart Erase e wand;
- generare depth map;
- generare region/instance segmentation con ID stabili;
- permettere merge/split/rename delle regioni;
- generare contorni/SVG quando utile;
- generare stili diffusion opzionali;
- produrre proxy subito;
- eseguire job progressivi, cancellabili e riprendibili.

Mantieni local-first. Usa modelli piccoli/quantizzati come default su hardware debole; abilita GPU o cloud soltanto tramite capability e consenso. Non saturare la GPU dello show con diffusion. Salva prompt, seed, modello e provenance.

## H. Sistema shader: qualità prima della versione

Non assumere che “shader più nuovo” significhi shader migliore. L'obiettivo è che l'AI produca shader visualmente validi, performanti, controllabili e portabili. La versione GLSL/WGSL è una decisione runtime, non un obiettivo di prodotto.

### H1. Contratto Effect

Ogni effetto deve dichiarare:

- slot texture richiesti/opzionali: color, mask, depth, regions, aux, camera;
- color space e formato;
- parametri con tipo, range, default, valore corrente, unità;
- input live supportati;
- pass richiesti;
- feature GPU;
- costo stimato;
- target supportati;
- fallback/proxy;
- versione del contratto.

Il nuovo runtime può usare WGSL/`wgpu` con fallback WebGL2. Supporta in modo esplicito GLSL ES 3.00 per WebGL2 e mantiene l'adapter GLSL ES 1.00 degli shader V3. Per gli host esterni emette il dialetto/versione richiesto dall'adapter, per esempio GLSL 4.60 per TouchDesigner. Non trattare “GLSL 2” come una versione ambigua: registra backend e language version precisi nel manifest e non fare una conversione cieca dell'intera libreria.

### H2. Libreria molto ampia senza app pesante

La libreria shader deve poter crescere a migliaia di elementi senza gonfiare il bundle iniziale:

- manifest indicizzato;
- file/data chunk per categorie;
- lazy load;
- cache per hash;
- deduplica semantica e per codice;
- tag per immagine, stage, drawing, sculpture, depth, mask, regions, audio, gesture;
- requisiti input e tier performance;
- thumbnail/contact sheet precomputati;
- quality score e stato review;
- provenance/licenza;
- ricerca locale;
- Favorites persistiti e migrati dalla V3;
- aggiornamento/versionamento indipendente dall'app shell quando possibile.

Non incorporare nuovamente centinaia di shader in pochi enormi file TypeScript.

### H3. Tag AI, handoff esterno e applicazione sicura

Preserva e migliora il sistema V3 di word-tag: `effect → motion → target → finish`, con finish multi-select, reset e testo libero sempre disponibile. I chip cliccabili compongono realmente il prompt; in V4 diventano anche metadata persistiti del Visual senza confondere la nuova proprietà `tags[]` con la sola parità V3. Copri almeno stage, drawing, sculpture, image, depth, mask, regions, audio, gesture, stile, performance tier e compatibilità. Mantieni categorie, ricerca e Favorites del catalogo.

Quando la route selezionata è ChatGPT o Perplexity e l'utente invia il prompt:

1. costruisci il prompt completo con contratto shader, contesto, tag selezionati, codice corrente e requisiti input;
2. apri o porta in primo piano `https://chatgpt.com/?q=<encoded>` o `https://www.perplexity.ai/?q=<encoded>` senza includere segreti o asset binari; usa popup/pannello su desktop e tab appropriata su mobile;
3. se il popup è bloccato, offri subito copia prompt e istruzioni minime;
4. ricevi la risposta tramite paste/import controllato;
5. estrai, valida, compila e sottoponi al quality/repair loop prima di applicare;
6. conserva last-known-good e non sostituire lo shader live con codice invalido.

ChatGPT/Perplexity handoff, provider API e modello locale sono route dello stesso use case; non creare editor o parser divergenti.

### H4. Loop automatico di qualità shader

Per ogni shader generato o migrato esegui un loop limitato:

1. estrazione/parse strutturale, non regex fragile per trasformazioni critiche;
2. validazione ABI e schema parametri;
3. compilazione su tutti i backend dichiarati;
4. render a più timestamp, aspect ratio e asset canonici;
5. verifica NaN, frame nero inatteso, alpha, mask leakage, coordinate e stabilità;
6. misura compile time, GPU frame time, numero pass e memoria intermedia;
7. confronto visuale con golden/reference quando esiste;
8. repair AI con errori e misure concrete;
9. massimo definito di tentativi;
10. last-known-good sempre conservato;
11. review umana/contact sheet per il gate di pubblicazione.

La qualità non può essere provata soltanto da “compila”. Usa un corpus rappresentativo e metriche specifiche per categoria. Per gli shader che devono proteggere il nero, misura leakage; per depth, controlla monotonicità/uso della texture; per audio, testa segnali sintetici; per interazione, testa input estremi e assenti.

Non imporre arbitrariamente 60 righe a tutti gli shader. Usa budget di costo e categorie; un effetto semplice deve restare semplice, un multipass giustificato deve poter esistere.

### H4. Parametri ed export

Il valore mosso dall'utente deve viaggiare con lo shader. Offri:

- **editable shader**: codice + manifest + schema;
- **current preset**: codice + valori correnti impostati come default dell'host;
- **baked shader**: valori statici incorporati tramite AST/IR;
- package Visual con asset e binding richiesti.

Non alterare il sorgente canonico a ogni movimento dello slider. Mantieni source e preset separati, poi genera l'output richiesto. Ogni exporter deve preservare default originale, valore corrente, override della VisualInstance e automazioni supportate.

## I. Renderer e layer scalabili

Il renderer deve essere indipendente da React e condiviso tra preview, output ed export. Usa un render graph interno derivato da Composition/Layer/VisualInstance.

Requisiti:

- molti layer logici, con numero di layer live determinato dal capability tier;
- compositing corretto e ordinato;
- opacity, blend, mask, transform e effect chain senza node UI;
- shader multipli sovrapposti;
- texture/framebuffer pooling;
- pipeline/program cache;
- compilazione asincrona;
- dirty rendering e sospensione layer invisibili;
- condivisione texture della stessa AssetFamily;
- pass fusion quando semanticamente equivalente;
- downsample dei pass intermedi;
- proxy/bake di layer stabili o troppo costosi;
- adaptive resolution/FPS;
- device/context lost recovery;
- last-good frame;
- render deterministico per export;
- diagnostica CPU/GPU per layer ed effetto.

Non promettere layer illimitati a 4K60 su GPU debole. Garantisci invece che il progetto resti apribile, che il motore adatti qualità e che possa bake/proxyzzare senza perdere editabilità.

Profili da misurare, non hardcodare sulla marca GPU:

- Essential: telefono/iGPU debole;
- Standard: iGPU recente/GPU entry;
- Performance: GPU discreta media;
- Studio: GPU discreta forte.

Esegui un micro-benchmark iniziale e conserva il risultato per dispositivo/driver/versione renderer.

## J. Audio reactive senza moltiplicare il costo

Preserva tutto il comportamento V3: microfono, system/tab audio, level, bass, mid, high, beat, tempo, BPM/tap, binding slider, Audio Sync e output sync.

Architettura V4:

- una sola acquisizione e analisi audio per sessione;
- un solo frame di feature audio condiviso da tutti i layer;
- nessuna FFT duplicata per shader/layer;
- smoothing e beat clock deterministici;
- binding schema-driven verso qualsiasi parametro compatibile;
- segnali sintetici per test;
- recording opzionale dei binding/automation;
- comportamento definito quando l'audio manca;
- export deterministico con audio registrato/importato;
- regressione a confini timeline/transizione.

Molti layer audio-reactive devono leggere lo stesso `AudioFeatureFrame`; solo la modulazione specifica cambia.

## K. Timeline: parità V3 e nuova separazione

Prima conserva e testa tutte le funzioni V3:

- sequence;
- random;
- random mix;
- double;
- audio reactive;
- step enabled/disabled;
- durata e resize confini;
- transizioni mix/wipe/radial/random/noise;
- transizione/durata condivisa;
- asset per step;
- transform/opacity/blend/fit/quality/clip range;
- duplicate/remove/add;
- shuffle con undo;
- focus, pin e repeat;
- pinned composite blend/stack-on-top e non-black mask;
- thumbnail/preload;
- MIDI/manual mix;
- preview timeline/focused;
- sync con output ed export.

La baseline può mostrare difetti `pre-existing` in layer/timeline. Non trasformarli in golden behavior: preserva feature e intenzione, correggi il difetto con test espliciti. Prova almeno persistenza, riordino, transform, opacity/blend, asset per step, resize, seek/loop, più layer audio-reactive e parità preview→output→export. Il drag reorder promesso dal tutorial ma non verificato nel codice è un'intenzione da completare, non parità già presente.

Poi evolvi verso Layer/Clip/AutomationTrack senza duplicare il resolver temporale.

### Loop di verifica timeline

Per ogni mode e transizione testa:

1. tempo prima del confine;
2. inizio transizione;
3. metà transizione;
4. fine transizione;
5. seek avanti/indietro;
6. loop;
7. pausa/ripresa;
8. resize durata;
9. asset video e immagine;
10. pinned layer;
11. audio signal sintetico;
12. output window;
13. frame export rispetto alla preview.

Usa unit/property tests per il resolver e snapshot/golden frame per il renderer. Preview ed export devono usare lo stesso motore temporale.

### Esperienze separate

- **Layout & Mix mobile/Web semplice**: posizione diretta, scala, rotazione, ordine layer, solo/mute, opacity, blend, crossfade A/B, pad XY, play e sezione corrente.
- **Desktop Timeline Web**: multi-track, keyframe, curve, audio preciso, automazioni e output complesso compatibili con il browser; Studio offline futuro potrà estenderne scala e integrazioni.

I dati restano gli stessi: una modifica mobile alla posizione/mix deve essere visibile nella Desktop Timeline Web e, in futuro, in Studio.

## L. Input live: camera, pointer, MediaPipe, MIDI e OSC

Crea un `LiveInputBus` standard. Gli shader non devono aprire direttamente device o permessi.

Supporta:

- webcam front/back e selezione device;
- scatto fotografico;
- webcam come texture live;
- mouse/touch/pen con posizione UV, delta, pressione, down/tap;
- MediaPipe Hand Landmarker/Gesture Recognizer;
- hand X/Y, pinch, open amount, handedness, gesture e confidence;
- audio feature;
- MIDI esistente e MIDI learn;
- OSC in Studio;
- binding `React to` semplice per ogni slider.

MediaPipe video deve lavorare fuori dal main thread, a risoluzione/frequenza adattiva, con smoothing, frame dropping e caricamento on-demand. Il tracking non deve abbassare inutilmente il frame rate del renderer.

Separa esplicitamente click sul canvas, gesto davanti alla camera e futura interazione sulla superficie proiettata con calibrazione camera-proiettore.

## M. Web, Mobile e Studio: un solo progetto

Usa lo stesso schema e core. Non creare tre prodotti incompatibili.

### Web

- prima release completa su desktop browser e mobile browser;
- accesso senza installazione/account;
- WebGPU quando disponibile;
- fallback WebGL2 per il subset portabile;
- proxy baked se il device è sotto il support floor;
- qualità adattiva;
- progetto sempre apribile;
- mask/depth/gesture con modelli piccoli o cloud opt-in;
- installazione PWA e offline dichiarati soltanto se realmente verificati.

WebGPU non deve essere l'unico backend Web.

### Mobile

Mobile non è desktop ristretto. Priorità:

- Capture & Create;
- generazione/modifica shader da Web mobile tramite preset, LLM cloud/handoff, editor manuale e modello locale quando compatibile;
- penna/wand e correzione maschera;
- Layout & Mix diretto;
- mapping touch con test card, griglia, move/scale/rotation/precision e corner pin;
- percorso mirror-first con un solo canvas full-viewport duplicato dal proiettore;
- overlay UI minimo, molto trasparente e completamente disattivabile (`full / bar / hidden`);
- modalità Hidden/Project che lascia il canvas pulito sul telefono e sul proiettore duplicato;
- output separato sul display esterno quando le API Web lo consentono;
- adapter nativi Android/iOS per dual-screen affidabile nell'app offline;
- Live Controller;
- pairing QR opzionale con la sessione Web desktop; adapter Studio futuro sullo stesso protocollo;
- preview compressa a bassa latenza;
- touch target e safe area;
- portrait/landscape dedicati;
- autosave/lifecycle/background-resume;
- memoria, storage, temperatura e batteria;
- Web mobile P0;
- app offline Android/iOS P1 con adapter nativi.

La timeline complessa non è l'esperienza mobile primaria, ma resta visibile come overview e apribile/continuabile nella Desktop Timeline Web.

Il pairing non è un requisito per creare o proiettare. Definisci quattro percorsi verificati:

1. Web mobile standalone con editing e preview;
2. Web mobile single-surface mirror-first (P0), con controlli trasparenti/nascondibili e nessun secondo stream;
3. Web mobile external-display opzionale quando Window Management/second-screen è disponibile;
4. app mobile nativa opzionale con canvas su display esterno e controlli sul telefono.

Poiché le API multi-display Web non sono uniformi, usa feature detection; non basare la promessa mobile su `getScreenDetails()`. Il mirroring a superficie singola è il percorso normale, non un fallback degradato. L'utente può mostrare per pochi secondi l'overlay anche sul proiettore, modificare e nasconderlo di nuovo. Un secondo browser tramite pairing serve solo se l'utente desidera controlli persistenti mentre il proiettore resta sempre pulito.

### Studio offline — architettura futura, non gate della release Web

- shell installabile, preferibilmente Tauri 2 dopo ADR/spike;
- renderer `wgpu` nativo;
- filesystem, SQLite/content store e keychain;
- cache modelli;
- encoder/decoder e render offline;
- più layer e timeline avanzata;
- multi-output;
- OSC, NDI/Spout/Syphon dove supportati;
- update firmati e rollback.

Un progetto Studio aperto sul Web/Mobile non perde layer: usa la variante portabile o il proxy e mostra il report di compatibilità.

Non implementare shell/installers nativi in questa esecuzione e non lasciare che gli spike Studio ritardino la Definition of Done Web. Conserva però confini e schema che permettano Windows/macOS e Android/iOS in una fase successiva senza fork del progetto.

## N. Mapping e output

Preserva mapping V3: move, width/height, precision, rotation/lock, grid, four-corner distortion, drag/nudge/reset e import/export/copy/paste posizione. Output window, display picker e fullscreen separato sono requisiti desktop/Studio; non trasformarli nell'architettura primaria mobile.

Il mapping essenziale deve funzionare direttamente dal Web mobile con touch e telefono collegato al proiettore in modalità duplica/mirror. Canvas e UI condividono la stessa superficie: i controlli sono overlay piccoli e trasparenti, non ridimensionano il canvas, e `Hidden` li rimuove completamente. Salva la calibrazione prima di nascondere la UI e gestisci tap-to-reveal, rotazione, cambio risoluzione, disconnessione e resume senza perdere lo stato. Testa almeno USB-C/HDMI o display esterno equivalente, il ciclo `full → bar → hidden → tap → bar`, mirroring con UI visibile/nascosta e, come percorso opzionale, controllo da secondo browser. Non dichiarare genericamente supportati AirPlay/Cast/cavi senza una compatibility matrix basata su prove.

### Share URL — parità e roundtrip

Preserva il comando Share che genera una URL. Il payload deve essere versionato, compatto, validato e importabile all'apertura. Deve riprodurre almeno shader usati, valori correnti, mapping, layer/timeline e impostazioni di output portabili. Non includere API key, token, file locali o altri segreti. Per asset troppo grandi da incorporare, dichiara chiaramente la limitazione e offri package/export locale; il futuro hosting degli asset è fuori scope. Testa generate → copy → open/import → strip dei parametri → confronto semantico del progetto. La generazione di una Share URL non autorizza il deploy pubblico dell'app.

Evoluzione Studio:

- OutputSurface multiple;
- più projector/screen;
- slice e polygon mask;
- edge blend/overlap;
- black-level compensation;
- test pattern;
- output virtuali;
- snapshot e diagnostica FPS/output.

Non accoppiare transform del contenuto, transform del layer e warp fisico dell'output: sono spazi differenti e vanno testati separatamente.

## O. Export e interoperabilità

Preserva:

- MP4 H.264 deterministico;
- 1080p/1440p/2160p;
- 30/60 fps;
- mapping/timeline nel render;
- shader bundle JSON con valori;
- mapping JSON.

Completa:

- audio sincronizzato;
- package progetto con asset;
- editable/current preset/baked shader;
- report exact/adapted/baked/unsupported;
- TouchDesigner GLSL TOP 4.60 + manifest/DAT/package assistito;
- Resolume ISF per subset compatibile;
- Resolume FFGL project/binari per target completi;
- Resolve DCTL per trasformazioni compatibili;
- Fusion Fuse/OpenFX per effetti più ricchi;
- LUT soltanto per trasformazioni colore statiche.

Non promettere conversione universale. Ogni adapter ha golden fixture nell'host reale e dichiara cosa perde/adatta.

## P. UI e design system

Prima cattura screenshot V3 desktop/mobile. Mantieni:

- identità visiva Mapshroom;
- semplicità dei pulsanti principali;
- estetica scura e accenti esistenti, salvo decisione documentata;
- esperienza “apri e crea”.

Per mobile cattura obbligatoriamente la stessa scena negli stati `full`, `bar` e `hidden`, più slider e mapping overlay. Misura il rettangolo del canvas prima e dopo ogni cambio: chrome e pannelli live devono sovrapporsi senza causare reflow, resize del render target o variazione del mapping. Usa le baseline `docs/mobile-ui-audit/mobile-mirrored-bar.png` e `docs/mobile-ui-audit/mobile-mirrored-hidden.png` come evidenza iniziale, poi completa il set durante l'audit.

Migliora leggermente:

- gerarchia e spaziatura;
- consistenza dei dialog/pannelli;
- stati loading/error/empty;
- accessibilità tastiera/touch;
- contrasto;
- responsive;
- feedback performance e compatibility;
- progressive disclosure delle opzioni avanzate.

Costruisci token e componenti condivisi. Non spostare semplicemente le 16.000 righe CSS in un altro file. Riduci duplicazione e usa stili co-localizzati o layer CSS governati, verificando visualmente ogni route.

## Q. Architettura target e confini

La direzione consigliata, da confermare con ADR e spike, è:

- React/TypeScript per UI;
- dominio/use case indipendenti da React;
- Rust per schema/migrazioni, compiler, asset pipeline, storage nativo e renderer;
- `wgpu` per WebGPU/native;
- WASM per core condiviso Web;
- Tauri 2 per Studio e in seguito mobile nativo;
- porte/adapters per browser, native, cloud, MediaPipe, AI provider ed exporter.

Confini suggeriti:

- domain;
- project-schema/migrations;
- asset-pipeline;
- effect IR/compiler;
- renderer;
- timeline engine;
- live inputs;
- exporters;
- feature Assets/Shader/Move-Mapping-Output/Layers/Timeline/Share-Export;
- design system;
- platform adapters.

Non creare subito decine di package vuoti. Estrai un modulo quando possiede API, ownership e test chiari.

## R. Sistema di skill/playbook per gli agenti

Prima verifica quale meccanismo di skill è supportato dall'ambiente dell'agente. Crea skill repository-local versionate quando supportate; in alternativa crea playbook equivalenti collegati da `AGENTS.md`. Non inventare una struttura che il runtime non carica.

Servono almeno queste skill operative, concise e senza duplicare tutta la specifica:

1. **mapshroom-minimal-change** — ispezione, change budget, protezione worktree, patch minima, rollback sicuro;
2. **mapshroom-feature-parity** — aggiornamento matrice, evidenze V3/V4, gate anti-regressione;
3. **mapshroom-shader-quality** — ABI, compile/render/performance/repair loop e pubblicazione preset;
4. **mapshroom-timeline-regression** — fixture mode/transizioni, boundary frames, preview/export parity;
5. **mapshroom-performance-budget** — benchmark tier, profiling, proxy/bake e criteri di accettazione;
6. **mapshroom-asset-pipeline** — lineage, worker/job, mask/depth/regions/diffusion e privacy;
7. **mapshroom-mobile-layout-mix** — camera, touch, direct transform, mixer, mirror lifecycle, overlay trasparente `full/bar/hidden`; pairing solo come modulo opzionale;
8. **mapshroom-export-compatibility** — valori preset/baked, adapter target e host fixtures;
9. **mapshroom-release-gate** — build/test/security/migration/package/smoke/release report.

Ogni skill deve specificare:

- quando si attiva;
- input richiesti;
- passi obbligatori;
- file/registri da aggiornare;
- comandi di verifica scoperti dal repository;
- stop conditions;
- output/evidenze;
- cosa non deve fare.

`AGENTS.md` deve imporre all'agente programmatore questo comportamento:

- modifica soltanto dove serve;
- prima cerca il punto di estensione esistente;
- se la patch si espande, torna al TODO e rivaluta il confine;
- preserva il lavoro dell'utente;
- esegue test proporzionati al rischio;
- non conclude senza confronto di parità;
- aggiorna `STATUS.md` e prossimo task prima di fermarsi.

## S. Testing e quality gates

Costruisci una piramide reale:

- unit test dominio, timeline, audio e parametri;
- property test per tempo/migrazioni quando utile;
- contract test TS↔WASM/Rust;
- compiler golden test;
- shader render snapshots;
- migration fixture V3;
- storage/package roundtrip;
- Worker/job/cancel test;
- E2E `Assets/role → Move/Mapping/Output → Shader AI/manual → Sliders/tag/live input → Layers/Timeline → Project/Share/Export`, inclusi ritorni non distruttivi tra le fasi;
- mobile viewport/touch test;
- E2E mobile `full → bar → hidden → tap → bar` che prova canvas invariato, mapping conservato, nessuna ricompilazione e playback non interrotto;
- visual regression mirror-first con chrome trasparente e stato hidden completamente pulito;
- output window/session sync test;
- host exporter fixture;
- benchmark e soak test.

CI minima:

- secret scan;
- format/lint/typecheck;
- unit/contract tests;
- shader validation;
- build Web desktop/mobile; soltanto contract/schema future-Studio non bloccanti, senza installer;
- migration and package tests;
- E2E smoke;
- bundle/performance budget;
- dependency/security/license report;
- artifact e release metadata.

Gli snapshot grafici non sostituiscono test semantici; i test semantici non sostituiscono la review visuale degli shader.

## T. Roadmap esecutiva obbligatoria

Trasforma questi macro-step in TODO piccoli con dipendenze e acceptance criteria:

### Fase 0 — Audit e baseline

- repository/intent inventory;
- parity matrix;
- fixture;
- screenshot;
- benchmark;
- gap e ADR iniziali.

### Fase 1 — Fondazione

- schema V4;
- migrazione V3;
- registry feature/capability;
- storage abstraction/package;
- domain/use case;
- skill system/AGENTS.

### Fase 2 — AssetFamily e Assets/Create

- camera/import;
- job pipeline;
- mask/depth/regions;
- correction tools;
- diffusion routing;
- VisualDefinition/Instance;
- nuova UI progressiva.

### Fase 3 — Effect/shader platform

- manifest e parameter schema;
- library lazy;
- legacy adapter;
- AI quality loop;
- current preset/baked export;
- golden corpus.

### Fase 4 — Renderer/layer

- headless renderer API;
- render graph;
- layer/compositing;
- cache/pool/dirty;
- tier/adaptive quality;
- WebGPU + fallback;
- preview/output/export unificati.

### Fase 5 — Timeline/audio

- parità mode/transizioni;
- unified resolver;
- AudioFeatureFrame condiviso;
- Layer/Clip/Automation;
- Desktop Timeline Web;
- deterministic audio/video export.

### Fase 6 — Live e Mobile

- pointer/touch/pen;
- webcam live;
- MediaPipe Worker;
- React to;
- Layout & Mix;
- shader creation/editing Web mobile;
- mapping touch mirror-first sulla stessa superficie;
- overlay mobile trasparente con regressione `full / bar / hidden / tap-to-reveal`;
- dopo la parità mirror-first, spike opzionale external-display Web/native;
- dopo la parità mirror-first, pairing/remote opzionale;
- lifecycle e device matrix.

### Fase futura — Studio offline/native, non eseguire ora

- conserva backlog/ADR per Tauri/native;
- filesystem/SQLite/keychain;
- wgpu native;
- codec/render offline;
- multi-surface/output;
- protocolli esterni.

Questa fase non appartiene alla Definition of Done corrente. Non iniziarla automaticamente dopo la release Web: richiede una futura espansione esplicita dello scope.

### Fase 8 — Exporter

- capability report;
- TouchDesigner;
- ISF/FFGL;
- DCTL/Fuse/OpenFX;
- host regression.

### Fase 9 — Hardening/release

- parità completa;
- performance/soak;
- security/privacy;
- accessibility;
- Share URL roundtrip, handoff AI e layout personalizzabile;
- docs e release package;
- confronto finale V3/V4.

Non iniziare tutte le fasi contemporaneamente. Mantieni V3 eseguibile e migra con strategia strangler/vertical slice.

## U. Definition of Done globale

Non dichiarare Mapshroom V4 completata finché:

1. il 100% delle feature V3 presenti ha parità provata o deprecazione esplicitamente approvata;
2. tutte le intenzioni V3 sono classificate e hanno decisione;
3. un progetto V3 reale migra senza perdere asset references, shader, valori, timeline, audio binding, mapping e output settings;
4. Web desktop e Web mobile aprono lo stesso progetto e lo stesso formato resta predisposto per Studio futuro;
5. una foto mobile produce original/cutout/matte/depth/regions nella stessa AssetFamily;
6. gli shader AI superano parse, compile, multi-frame render, visual gate e performance budget;
7. la libreria shader cresce senza aumentare proporzionalmente il bundle iniziale;
8. molti layer logici funzionano con adaptive live/proxy/bake;
9. audio reactive con più layer usa una sola analisi audio e resta stabile;
10. tutti i mode/transizioni V3 superano il loop timeline;
11. pointer, touch, penna, webcam e MediaPipe controllano parametri tramite LiveInputBus;
12. mobile controlla posizione, scala, rotazione, ordine, opacity, blend e crossfade;
13. il Web mobile crea/modifica shader, salva Visual e li usa nei layer senza computer;
14. un telefono collegato al proiettore in duplica/mirror completa mapping touch sulla stessa superficie, usa una UI minima e trasparente e ottiene un canvas pulito passando a `hidden`;
15. il percorso mobile P0 non richiede pairing, secondo stream o API multi-display; dual-screen e pairing usano feature detection e restano enhancement opzionali;
16. Desktop Timeline Web resta separata dalla UI mobile semplice ed è estendibile dallo Studio futuro;
17. output/mapping V3 conserva parità;
18. export/copy riproduce i valori correnti;
19. preview ed export producono gli stessi frame al tempo richiesto;
20. Web degrada esplicitamente con fallback/proxy, senza perdere layer;
21. Windows/macOS offline e app native restano backlog/ADR futuri e non sono falsamente dichiarati completati;
22. build, test, migration, security, E2E e benchmark gate passano;
23. largest files, duplicazione e bundle sono sotto budget concordato e non esistono nuovi monoliti;
24. la grafica resta riconoscibilmente Mapshroom ed è verificata su desktop e mobile; il layout desktop è dockable/persistente/resettable e il mobile conserva il mirror-first;
25. `V4_PARITY_MATRIX.md`, `V4_TODO.md` e `STATUS.md` sono coerenti con il codice;
26. esiste un report finale V3 vs V4 con evidenze e limitazioni note;
27. tag/word-tag modificano realmente il prompt preparato e restano ricercabili nel catalogo/Visual;
28. ChatGPT e Perplexity aprono URL parametrizzate corrette, hanno fallback popup/copia-incolla e applicano solo shader validati;
29. Share genera una URL senza segreti e il roundtrip ricostruisce semanticamente progetto, valori, mapping, layer e timeline;
30. la build Web desktop/mobile è production-ready e verificata localmente, ma nessun deploy online è stato eseguito;
31. l'editor manuale avanzato funziona su Web desktop ed è raggiungibile su mobile, con feedback di compilazione, history/restore e last-known-good.

## V. Comunicazione e report di avanzamento

Durante il lavoro comunica per outcome, non per quantità di file modificati. Ogni milestone deve riportare:

- cosa ora funziona;
- feature IDs completati;
- prove/test/benchmark;
- differenze rispetto a V3;
- debito introdotto o rimosso;
- rischi;
- prossimo task.

Se sei bloccato, esaurisci prima le verifiche sicure. Poi descrivi un solo blocco concreto, le prove effettuate e la decisione richiesta. Non mascherare una feature incompleta con copy o stub.

## W. Primo incarico da eseguire ora

Inizia immediatamente con questi passi, nell'ordine:

1. trova root, istruzioni locali e stato Git senza modificare nulla;
2. leggi integralmente la specifica V4 esistente;
3. crea la mappa dei file e dei confini V3;
4. esegui audit feature + intent;
5. avvia baseline e fixture;
6. crea parity matrix e TODO completo;
7. proponi gli ADR indispensabili con una raccomandazione;
8. identifica la prima vertical slice che crea fondazione V4 senza rompere V3;
9. implementala con il loop minimo e i gate;
10. continua fase per fase, aggiornando lo stato persistente, fino alla Definition of Done.

Non limitarti a raccontare cosa faresti: crea gli artefatti, implementa, misura e verifica.

## FINE PROMPT
