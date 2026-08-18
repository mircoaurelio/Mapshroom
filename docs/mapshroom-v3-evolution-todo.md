# Mapshroom V3 evolution backlog

## Obiettivo

Evolvere Mapshroom V3 senza riscriverla e senza perdere funzionalita, partendo da WebGL 2 / GLSL ES 3.00 e arrivando a un motore multipass con layer semplici, asset derivati, timeline essenziale ed exporter verso altri host.

Il modello creativo resta lineare: `Asset -> Visual -> Layer/Scene -> Timeline -> Output`. Il renderer genera internamente soltanto il piano di pass necessario per eseguirlo. Non esiste un grafo general-purpose nel prodotto e l'utente vede un wizard, una striscia di layer e i controlli del Look.

## Vincoli di prodotto

- [ ] Conservare l'estetica e il workflow utile della V3.
- [ ] Conservare codice shader manuale, modifica LLM, slider, audio reactive, timeline, mapping, output, share ed export MP4.
- [ ] Mantenere la stessa esperienza concettuale su telefono e desktop.
- [ ] Rendere l'app utilizzabile su computer e telefoni deboli tramite qualita adattiva.
- [ ] Mostrare un risultato utile il prima possibile, mentre le elaborazioni lente continuano.
- [ ] Non introdurre un editor a nodi visibile.
- [ ] Non trasformare la timeline in un montaggio video professionale.
- [ ] Non rendere diffusion locale o modelli AI pesanti un requisito.
- [ ] Non riscrivere contemporaneamente UI, renderer, schema e pipeline AI.

## Ordine vincolante

```text
Baseline anti-regressione
  -> Shader ABI e compilatore
  -> WebGL 2 con parita V3
  -> Renderer indipendente da React
  -> RenderPlan multipass
  -> Layer persistenti e Scene
  -> Asset Family e preparazione automatica
  -> Shader consigliati, timeline e automazioni
  -> Exporter multi-target
```

Il refactoring di `WorkspaceRoute.tsx` procede in parallelo, ma ogni estrazione deve essere behavior-preserving e coperta da test.

---

## M0 - Baseline anti-regressione [P0]

### Inventario e fixture

- [ ] Creare una matrice delle funzionalita V3 e dei relativi controlli UI.
- [ ] Selezionare almeno un progetto reale V3 come fixture immutabile.
- [ ] Aggiungere fixture per immagine, video, shader semplice, shader pesante e shader volutamente invalido.
- [ ] Aggiungere fixture per `sequence`, `randomMix`, `double`, `audioReactive`, pinned layer e focused preview.
- [ ] Salvare fixture per mapping, four-corner distortion, slider, binding audio e asset associato allo step.
- [ ] Verificare il roundtrip salva -> chiudi -> riapri per ogni fixture.

### Test automatici

- [ ] Rendere lo smoke test shader indipendente dal plugin Cloudflare/Wrangler.
- [ ] Compilare l'intero catalogo shader in CI e riportare ID, sorgente e log degli errori.
- [ ] Aggiungere test browser per import asset, scelta shader, modifica slider, play/pausa, seek, cambio modalita timeline, pin, mapping e salvataggio.
- [ ] Aggiungere golden frame a timestamp e risoluzione fissi per shader e transizioni rappresentative.
- [ ] Confrontare preview, output window ed export allo stesso timestamp.
- [ ] Verificare che uno shader invalido mantenga visibile l'ultimo shader valido.

### Metriche iniziali

- [ ] Misurare startup, tempo compilazione shader, frame time p50/p95, memoria e numero di programmi compilati.
- [ ] Misurare singolo shader, transizione, double, pin/composite, immagine e video.
- [ ] Conservare browser, GPU, risoluzione e versione renderer insieme ai risultati.

### Definition of Done

- [ ] Ogni controllo P0 della V3 ha almeno un test o una procedura di verifica ripetibile.
- [ ] Una regressione visiva, temporale o di persistenza viene rilevata prima del merge.

---

## M1 - Shader ABI e piccolo compilatore [P0]

### Contratto canonico

- [ ] Formalizzare `Mapshroom Effect ABI v1` con entry point `processColor`.
- [ ] Definire semanticamente `time`, `resolution`, UV, orientamento Y, alpha, color space e input texture.
- [ ] Introdurre `dialect`, `abiVersion`, `entryPoint` e `capabilities` nel manifest shader.
- [ ] Interpretare gli shader V3 senza metadati come `mapshroom-effect-legacy`.
- [ ] Definire slot input semantici: `color`, `mask`, `depth`, `regions`, `alternate`, `previousFrame`.
- [ ] Distinguere input richiesti e opzionali.

### Parametri

- [ ] Trasformare `@min`, `@max` e `@default` in un manifest parametri esplicito.
- [ ] Aggiungere label, descrizione, unita, gruppo, priorita UI, animabilita e supporto audio.
- [ ] Conservare il parser delle annotazioni come adapter per gli shader legacy.
- [ ] Separare sorgente shader, default del parametro e valore corrente dell'istanza.

### Compiler API

- [ ] Creare un'API unica `compileShaderModule(module, target)`.
- [ ] Generare wrapper, vertex e fragment per `webgl2-glsl-es-300`.
- [ ] Convertire token-aware `texture2D()` in `texture()` per il solo dialetto legacy.
- [ ] Generare line mapping tra sorgente canonico e diagnostica del driver.
- [ ] Produrre un compatibility report invece di fallire silenziosamente.
- [ ] Evitare trasformazioni globali tramite regex del corpo shader.

### Definition of Done

- [ ] Nessun preset V3 deve essere riscritto o duplicato per funzionare in WebGL 2.
- [ ] Il compilatore emette sorgenti riproducibili e diagnostica riferita al sorgente originale.

---

## M2 - WebGL 2 con parita V3 [P0]

- [ ] Creare una factory comune per contesto, capability e context-loss recovery.
- [ ] Migrare `StageRenderer` a `WebGL2RenderingContext` dietro feature flag temporaneo.
- [ ] Usare `#version 300 es`, `in/out` e fragment output esplicito.
- [ ] Verificare formati render target, texture upload, video texture, framebuffer completeness e blending.
- [ ] Conservare `KHR_parallel_shader_compile` quando disponibile.
- [ ] Migrare allo stesso compilatore shader preview, preset browser, validazione, review, route pubblica e smoke test.
- [ ] Evitare compilatori o wrapper shader duplicati nei componenti.
- [ ] Eseguire il catalogo completo su WebGL 2.
- [ ] Confrontare i golden frame WebGL 1 e WebGL 2 con una soglia documentata.
- [ ] Misurare compilazione e frame time prima e dopo.
- [ ] Decidere il support floor browser/device e la durata del rollback WebGL 1.

### Definition of Done

- [ ] I progetti V3 esistenti si aprono senza migrazione manuale.
- [ ] Preview, output, timeline ed export hanno parita funzionale e visiva.
- [ ] Nessun percorso produttivo compila shader con un wrapper differente da quello centrale.

---

## M3 - Renderer indipendente da React [P0]

- [ ] Estrarre `WebGL2Engine` con lifecycle esplicito.
- [ ] Estrarre `ProgramCache` e mantenere last-known-good durante la compilazione.
- [ ] Estrarre `TextureRegistry` per immagini, video e input derivati.
- [ ] Estrarre `FramebufferPool` con riuso e limite di memoria.
- [ ] Estrarre uniform binding e modulazione audio.
- [ ] Separare resize canvas, mapping e distortion dalla composizione dei frame.
- [ ] Esporre `renderFrame({ timeSeconds, snapshot })` senza dipendere da React o `requestAnimationFrame`.
- [ ] Usare lo stesso motore per workspace, output window ed export MP4.
- [ ] Gestire context loss e ricostruzione risorse con un test dedicato.

### Definition of Done

- [ ] `StageRenderer` e un adapter UI sottile.
- [ ] L'export puo renderizzare deterministicamente anche senza avanzamento del clock UI.

---

## M4 - RenderPlan multipass interno [P0]

### Modello

- [ ] Definire una sequenza interna di pass `SourcePass`, `EffectPass`, `TransitionPass`, `CompositePass` e `OutputPass`.
- [ ] Definire input/output tipizzati e validazione degli input mancanti.
- [ ] Creare un adapter dallo stato timeline V3 a un `RenderFramePlan` immutabile.
- [ ] Generare il piano automaticamente da Visual, Layer/Scene e Timeline.
- [ ] Non introdurre routing libero, nodi, cavi o un modello a grafo persistito.

### Rimozione dei mega-shader

- [ ] Renderizzare separatamente shader A e shader B in due texture.
- [ ] Implementare transizioni come pass che campiona le due texture.
- [ ] Migrare `mix`, `wipe`, `radial`, `random` e `noise` senza concatenare i sorgenti.
- [ ] Migrare l'overlay media a un pass separato.
- [ ] Migrare pinned blend e stack-on-top a normali pass di compositing.
- [ ] Migrare `double` a due sottografi piu un pass di mix.
- [ ] Eliminare progressivamente `namespaceShaderCode` e i builder che incorporano shader completi.
- [ ] Conservare temporaneamente il percorso legacy solo per confronto e rollback.

### Compositing

- [ ] Implementare accumulazione ping-pong per un numero variabile di layer.
- [ ] Definire blend mode: normal, add, screen, multiply, difference e masked reveal.
- [ ] Formalizzare alpha straight/premultiplied e verificarlo con fixture trasparenti.
- [ ] Ottimizzare il caso a singolo layer evitando pass intermedi inutili.

### Definition of Done

- [ ] Modificare uno shader non richiede ricompilare le sue combinazioni con gli altri shader.
- [ ] Nessuna transizione o modalita double dipende dalla concatenazione dei sorgenti.

---

## M5 - Layer persistenti, semplici e Scene [P1]

### Modello dati

- [ ] Aggiungere una `composition` opzionale e migrabile al progetto V3.
- [ ] Definire `LayerInstance`: visual, input binding, transform, opacity, blend, enabled, quality e time settings.
- [ ] Consentire binding audio a opacity, blend amount, transform e parametri shader del layer.
- [ ] Migrare implicitamente il progetto corrente a un layer base senza cambiare il risultato.
- [ ] Separare layer, regioni segmentate e output mapping.
- [ ] Definire uno stack di effetti ordinato per layer senza routing manuale.

### UI

- [ ] Creare una striscia di card layer condivisa tra mobile e desktop.
- [ ] Supportare selezione, visibilita, reorder, duplica ed elimina.
- [ ] Mostrare una miniatura e un indicatore di carico per layer.
- [ ] Far agire Look, Slider e Timeline sul layer selezionato.
- [ ] Mostrare normalmente un solo Look; mettere lo stack aggiuntivo dietro `Aggiungi effetto`.
- [ ] Non trasformare automaticamente ogni regione in un layer.

### Scene

- [ ] Definire una Scene come snapshot dei layer e dei valori essenziali.
- [ ] Supportare crea, richiama, duplica, rinomina ed elimina Scene.
- [ ] Collegare Scene a cue, timeline e MIDI senza duplicare il progetto.

### Definition of Done

- [ ] Almeno tre layer possono essere ordinati, salvati, riaperti e riprodotti su mobile e desktop.
- [ ] Un progetto V3 senza `composition` continua a produrre lo stesso output.

---

## M6 - Decomposizione di WorkspaceRoute [P0, trasversale]

Ogni voce deve essere una PR behavior-preserving, senza redesign simultaneo.

- [ ] Spostare onboarding desktop/mobile e relativo copy fuori da `WorkspaceRoute.tsx`.
- [ ] Estrarre `projectMigration.ts` con `normalizeProjectDocument` e test fixture.
- [ ] Estrarre `projectCommands.ts` con operazioni pure e immutabili.
- [ ] Estrarre `shaderCommands.ts`: save, duplicate, version, last-known-good e applicazione AI.
- [ ] Estrarre `timelineCommands.ts`: add, remove, duplicate, resize, pin e shuffle.
- [ ] Estrarre `mappingCommands.ts`: transform, distortion, import/export e clipboard.
- [ ] Estrarre `useProjectSession`: load, save, library, share e session sync.
- [ ] Estrarre controller separati per asset, shader, timeline, mapping e MIDI.
- [ ] Evitare mega-hook: ogni controller deve delegare la logica a funzioni pure.
- [ ] Ridurre `WorkspaceRoute` alla composizione di layout, controller e dialog.
- [ ] Rinviare il refactoring CSS finche non esistono screenshot regression affidabili.

### Definition of Done

- [ ] Nessun modulo applicativo supera responsabilita chiaramente documentate.
- [ ] I test dei controlli UI restano verdi dopo ogni singola estrazione.

---

## M7 - Asset Family e grafo degli asset [P1]

- [ ] Estendere il modello asset con relazione a originale, parent, derivazione e versione sorgente.
- [ ] Supportare varianti `original`, `foreground`, `mask`, `depth`, `regions`, `style` e `proxy`.
- [ ] Conservare originale, maschera alpha e sfondo nero virtuale separatamente.
- [ ] Non incorporare definitivamente il nero nei pixel dell'immagine elaborata.
- [ ] Registrare modello, parametri, timestamp e versione input per ogni derivazione.
- [ ] Segnalare derivazioni stale quando cambia l'originale.
- [ ] Consentire rigenerazione senza perdere le correzioni manuali compatibili.
- [ ] Gestire job progressivi con stato pending/running/ready/error/cancelled.
- [ ] Rendere disponibili subito originale e proxy mentre depth e segmentazione continuano.

### Definition of Done

- [ ] L'app sa spiegare da quale asset e processo proviene ogni derivato.
- [ ] Sostituire l'originale non produce depth o maschere silenziosamente disallineate.

---

## M8 - Acquisizione e preparazione automatica [P1]

- [ ] Aggiungere flusso camera/import coerente su mobile e desktop.
- [ ] Generare subito un proxy ottimizzato.
- [ ] Avviare rimozione sfondo, depth e segmentazione come job indipendenti.
- [ ] Collegare i risultati alla stessa Asset Family.
- [ ] Mostrare avanzamento senza bloccare scelta Look, mapping o preview.
- [ ] Dare priorita al job necessario al Look scelto dall'utente.

### Correzione maschera non distruttiva

- [ ] Conservare maschera AI, pennellate `Mantieni` e pennellate `Rimuovi` separatamente.
- [ ] Supportare dimensione, morbidezza, undo e redo.
- [ ] Ricomporre la maschera finale senza distruggere la sorgente AI.
- [ ] Verificare penna, touch e mouse.

### Segmentazione regioni

- [ ] Separare segmentazione del soggetto da segmentazione interna in regioni.
- [ ] Generare una `Region ID Map` efficiente per gli shader.
- [ ] Conservare contorni/poligoni per editing e overlay; generare SVG solo quando utile.
- [ ] Supportare selezione, unione, rinomina e correzione di una regione.
- [ ] Provare prima bordi, componenti connesse e geometria; usare AI quando necessario.

### Definition of Done

- [ ] Una foto produce progressivamente proxy, foreground, mask, depth e region map senza duplicare il soggetto.
- [ ] Le correzioni manuali sopravvivono alla rigenerazione della maschera AI.

---

## M9 - Diffusion e varianti stilistiche [P2]

- [ ] Usare cloud come default e locale solo come capability opzionale.
- [ ] Introdurre la modalita predefinita `Mantieni struttura`.
- [ ] Condizionare la generazione con depth, contorni e regioni quando disponibili.
- [ ] Calcolare un alignment score tra originale e variante.
- [ ] Mostrare stato `allineata`, `probabilmente allineata` o `geometria modificata`.
- [ ] Rigenerare o invalidare mask, depth e regioni quando la geometria cambia troppo.
- [ ] Memorizzare i risultati per uso offline dopo la generazione.
- [ ] Impedire che inference pesante e proiezione live saturino contemporaneamente la GPU.

---

## M10 - Look consigliati, qualita e AI shader [P1]

### Catalogo e raccomandazioni

- [ ] Dichiarare per ogni Look input richiesti/opzionali, costo, supporto mobile, audio ed export.
- [ ] Analizzare le capability dell'Asset Family.
- [ ] Mostrare inizialmente 6-10 Look compatibili invece dell'intero catalogo.
- [ ] Collegare automaticamente color, depth, mask e region map.
- [ ] Rappresentare Light/Balanced/High come varianti dello stesso Look.
- [ ] Caricare catalogo e anteprime in modo lazy senza incorporare tutti i preset nel progetto.

### LLM

- [ ] Sostituire il prompt WebGL 1 con il contratto ABI e GLSL ES 3.00.
- [ ] Richiedere shader, manifest parametri, input, costo stimato e compatibility report.
- [ ] Validare struttura, compilazione, render e costo prima di applicare il risultato.
- [ ] Renderizzare a piu timestamp, aspect ratio e input canonici.
- [ ] Conservare last-known-good e confronto prima/dopo.
- [ ] Garantire undo della modifica AI con un gesto.
- [ ] Mantenere il codice accessibile, ma non come flusso principale.

---

## M11 - Parametri, audio reactive e timeline essenziale [P1]

### Parameter engine

- [ ] Definire un solo ordine di valutazione: base -> timeline -> audio/MIDI -> clamp -> shader.
- [ ] Mostrare al massimo 3-5 parametri essenziali per default.
- [ ] Raggruppare gli altri in Movimento, Colore e Avanzati.
- [ ] Conservare valore canonico, override layer e automazione separati.

### Audio reactive

- [ ] Conservare pulsante globale e pulsante per slider.
- [ ] Conservare min, max, banda semplificata e modalita automatica.
- [ ] Usare un solo `AudioFeatureFrame` condiviso da tutti i layer.
- [ ] Definire target audio con path stabile: parametro shader, opacity, blend amount, posizione, scala e rotazione del layer.
- [ ] Aggiungere modalita `replace`, `add` e `multiply`, con attack, release e smoothing.
- [ ] Mostrare il controllo audio direttamente accanto a ogni proprieta modulabile del layer selezionato.
- [ ] Testare piu layer audio-reactive senza FFT duplicate.

### Timeline

- [ ] Limitare la UI a durata loop, play/pausa, scene/clip, keyframe, transizione e repeat.
- [ ] Mostrare una traccia parametro solo dopo la prima animazione.
- [ ] Supportare `Aggiungi punto` e registrazione live dello slider.
- [ ] Usare lo stesso evaluator deterministico per preview, output ed export.
- [ ] Conservare su desktop e mobile le stesse operazioni, con layout differente.

---

## M12 - Prestazioni adattive e decisione Rust [P0/P1]

- [ ] Creare capability tier `Essential`, `Standard` e `Performance` da benchmark reali.
- [ ] Definire target di risoluzione, FPS e layer per tier.
- [ ] Ridurre dinamicamente risoluzione dei pass intermedi, non il mapping finale.
- [ ] Sospendere layer invisibili e riusare output dei layer non dirty.
- [ ] Usare proxy per asset e layer costosi mantenendo l'editabilita.
- [ ] Stimare e mostrare costo per Look/layer.
- [ ] Evitare inferenza AI pesante durante output live salvo consenso esplicito.
- [ ] Misurare memoria GPU e tempo per pass con estensioni disponibili.

### Rust: criterio, non requisito iniziale

- [ ] Mantenere React/TypeScript per UI e orchestrazione della V3.
- [ ] Portare prima WebGL2 e render graph in TypeScript per ridurre il rischio.
- [ ] Profilare parsing/compilazione shader, compositing maschere, contorni e serializzazione.
- [ ] Creare spike Rust/WASM solo per un hot path misurato.
- [ ] Accettare Rust quando il benchmark end-to-end mostra un beneficio netto dopo costo di copia e integrazione.
- [ ] Rinviare Tauri/wgpu a una futura variante Studio, senza bloccare il Web.

---

## M13 - Wizard e UI semplice [P1]

- [ ] Creare home con `Scatta`, `Importa`, `Template`, `Apri progetto`.
- [ ] Consentire ingresso diretto nel workspace corrente per utenti abituali.
- [ ] Mostrare preparazione automatica come progresso non bloccante.
- [ ] Portare l'utente da asset a Look, slider/AI, animazione e output.
- [ ] Conservare canvas prioritario e chrome mobile `full`, `bar`, `hidden`.
- [ ] Evitare pannelli vuoti e opzioni avanzate prima che siano necessarie.
- [ ] Conservare estetica, tipografia, colori e principi di interazione V3.
- [ ] Testare l'intero flusso con touch, mouse e penna.

---

## M14 - Exporter e interoperabilita [P1/P2]

- [ ] Evolvere lo shader bundle con ABI, manifest, valori, input e capability.
- [ ] Esportare sorgente editable e variante con valori baked.
- [ ] Esportare Visual, Layer/Scene e RenderPlan come manifest senza promettere portabilita totale.
- [ ] Produrre un compatibility report per layer/pass non supportati dal target.
- [ ] Implementare prima TouchDesigner GLSL TOP 4.60 con file GLSL, manifest e setup assistito.
- [ ] Implementare poi ISF con header parametri per Resolume Wire.
- [ ] Generare un progetto/patch Wire assistito e compilare solo quando Wire e disponibile.
- [ ] Trattare `.tox`, `.wired` e `.cwired` come packaging host-specific da validare nell'host.
- [ ] Rinviare FFGL binario a una pipeline C++ separata.
- [ ] Aggiungere fixture di confronto visivo Mapshroom -> host.

---

## Primo batch esecutivo

Questo e il prossimo lavoro da iniziare; non include ancora nuova UI o nuovi layer.

1. [ ] Separare lo smoke test shader da Cloudflare e renderlo ripetibile.
2. [ ] Creare fixture shader e golden frame rappresentative.
3. [ ] Formalizzare `Mapshroom Effect ABI v1` e il manifest minimo.
4. [ ] Implementare emitter GLSL ES 3.00 per gli shader legacy.
5. [ ] Centralizzare creazione contesto e compilazione programmi.
6. [ ] Migrare `StageRenderer` a WebGL 2 dietro feature flag.
7. [ ] Migrare validazione e preview allo stesso compilatore.
8. [ ] Compilare il catalogo completo e classificare le incompatibilita.
9. [ ] Confrontare rendering WebGL 1/WebGL 2 e correggere le differenze.
10. [ ] Rendere WebGL 2 il backend predefinito solo dopo la parita.

## Mappa di copertura dell'analisi precedente

| Tema emerso | Backlog |
|---|---|
| Relazioni asset, pipeline effetti e composizione | M4, M5, M7 |
| Nessun grafo general-purpose o editor a nodi | Vincoli, M4, M5 |
| Computer e telefoni deboli | M12 |
| Foto/import e preparazione automatica | M8, M13 |
| Sfondo nero non distruttivo | M7, M8 |
| Penna Mantieni/Rimuovi | M8 |
| Depth map | M7, M8 |
| Segmentazione e Region ID Map | M8 |
| SVG opzionale | M8 |
| Diffusion e allineamento | M9 |
| Shader compatibili con l'immagine | M1, M10 |
| Varianti Light/Balanced/High | M10, M12 |
| Slider da uniform | M1, M11 |
| Modifica shader tramite LLM | M10 |
| Audio reactive semplice | M11 |
| Timeline corta | M11 |
| Layer a card | M5 |
| Scene per uso live | M5 |
| Rust/WASM | M12 |
| WebGL 2 / GLSL ES 3.00 | M1, M2 |
| Workspace monolitico | M6 |
| TouchDesigner e Resolume | M14 |

## Fuori scope fino al completamento di M4

- [ ] Grafo general-purpose ed editor visuale a nodi.
- [ ] Riscrittura totale Rust/Tauri/wgpu.
- [ ] Timeline da montaggio professionale.
- [ ] Multi-output avanzato e edge blending.
- [ ] Marketplace shader.
- [ ] FFGL compilato automaticamente per ogni sistema operativo.
- [ ] Diffusion locale obbligatoria.
