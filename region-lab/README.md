# Mapshroom Region Lab

MVP locale per caricare una fotografia, separare superfici e applicare gradienti, senza cliccare preventivamente sulle singole parti. Pagina Vite indipendente, con motore condiviso con il pannello **Media library → Surfaces & gradients** di Mapshroom (`src/lib/surfaceMapping/`).

## Superfici e gradienti (modalità iniziale)

La nuova modalità confronta **Forma · Silhouette**, **Colore · Superfici** e **PiDiNet · Superfici** (opzionale). Il confronto dettagliato precedente resta selezionabile in “Cosa vuoi separare?”. Sono inclusi sia la pianta sia il palco forniti dall'utente.

- **Forma** individua massimi persistenti della distanza dal bordo della sagoma e separa i volumi con watershed. Non legge la decorazione interna: utile per lobi o foglie uniti da colli stretti, meno affidabile per pannelli sovrapposti senza variazioni di sagoma. Non aggiunge pesi.
- **Colore** filtra la texture con convoluzione normalizzata dalla maschera, genera proposte SLIC compatte e unisce gerarchicamente regioni confinanti fino al budget richiesto. Il costo considera colore medio, contrasto sul confine e dimensione. Il bilanciamento delle aree evita che poche decorazioni minuscole consumino il budget lasciando una sola regione dominante.
- **PiDiNet** legge la fotografia originale; i bordi della CNN guidano il costo di unione delle proposte ottenute dal colore semplificato. I contorni non devono essere completamente chiusi per contribuire alla separazione. Può restituire meno zone dell'obiettivo se le proposte iniziali sono meno numerose.
- **Zone desiderate** è un limite obiettivo, non un numero di oggetti riconosciuti. Componenti scollegate restano separate. Il metodo Forma non forza divisioni quando non trova massimi persistenti sufficienti.
- **Ignora texture** regola la scala della media locale, la rimozione di minuscole isole/fori opachi e una regolarizzazione a maggioranza dei bordi interni. Sagoma e fori grandi rimangono vincoli. Non equivale a segmentazione semantica.

La sfumatura è indipendente dagli ID: distanza normalizzata dal bordo al centro, gradiente lineare per regione o gradiente lineare globale. Palette, direzione, contributo della texture originale e sfumatura del bordo si aggiornano senza ripetere la segmentazione. La texture non genera nuovi frammenti. Il campo luminoso è sintetico, **non una stima della profondità**.

**Gradiente PNG** esporta il colore risultante; **Campo grigio PNG** esporta il valore di luce moltiplicato per la sfumatura del bordo in scala di grigi a 8 bit. Entrambi interpolano all'interno dello stesso ID, senza mescolare zone adiacenti, e ritagliano sulla trasparenza/soglia di nero della foto nativa. Non inventano nuovi contorni. Gli export degli ID rimangono nearest-neighbor. Le anteprime delle schede sono centrate sul soggetto con lo stesso ritaglio per tutti; Ispeziona e gli export conservano le coordinate originali.

Da `MapshroomV3`, con le dipendenze del progetto già installate:

```sh
npm run dev:regions
```

Aprire http://127.0.0.1:5187/ in un browser desktop moderno. È disponibile anche la fotografia della pianta fornita per questo esperimento. Le analisi partono automaticamente al caricamento; le modifiche ai parametri richiedono **Confronta i metodi**.

## Metodi e download

| Metodo nel confronto dettagliato | Cosa confronta | Pesi |
| --- | --- | ---: |
| Colori · Lab | K-means in Lab + componenti connesse | 0 |
| Superpixel · SLIC | Colore e vicinanza spaziale | 0 |
| Regioni · Grafo | Unione adattiva di pixel confinanti | 0 |
| Bordi · Canny | Gradiente, soppressione non massima, isteresi + crescita delle regioni | 0 |
| PiDiNet Tiny | CNN per bordi + crescita delle regioni | 393.650 byte |
| PiDiNet | CNN per bordi + crescita delle regioni | 3.025.562 byte |

Le CNN sono disattivate inizialmente. Quando vengono richieste, viene caricato il runtime WASM condiviso (~11,2 MB, inclusi i moduli JS): circa **14,6 MB complessivi** per entrambe le reti e il motore, oltre alla pagina e alla foto di esempio. I file sono inclusi in `src/lib/surfaceMapping/assets/`, condivisi con l'app, e impacchettati da Vite con URL locali. Nessuna chiamata a servizi di inferenza, nessun caricamento della fotografia su server, nessuna dipendenza da Transformers.js per questa pagina.

ONNX Runtime usa WASM SIMD, CPU e un singolo thread dentro un Web Worker: nessuna GPU dedicata né WebGPU richiesti. I modelli vengono eseguiti uno dopo l'altro. Le sessioni vengono rilasciate dopo l'inferenza; i file vengono conservati in memoria per le analisi successive e nella Cache API quando disponibile. Interrompere termina il worker. Il server locale deve restare acceso; non è una PWA offline.

## Lettura dei risultati

- **Regioni** assegna un colore a ogni area connessa. Gli ID/colori non corrispondono tra metodi o analisi differenti.
- **Bordi** mostra i contorni delle regioni per Lab/SLIC/Grafo, i bordi binari per Canny, e l'intensità dell'output CNN per PiDiNet. Queste rappresentazioni non sono identiche.
- **Sull'originale** sovrappone le regioni alla fotografia.
- **Ispeziona** permette zoom, confronto a tendina con l'originale ed eventuale selezione di una regione già prodotta. I clic servono solo a ispezionare/esportare, non sono necessari per segmentare.
- Il cursore **Dettaglio** modifica parametri specifici di ciascun metodo: non è una misura universale della granularità.
- **Escludi quasi nero** rimuove pixel con `max(R,G,B) <= soglia`; `0` disattiva questa esclusione. Pixel con alfa <= 127 rimangono esclusi. Su fotografie senza fondo nero può convenire usare 0. Non è un modello di rimozione dello sfondo.

I tempi distinguono preparazione comune, caricamento/sessione, inferenza e costruzione delle regioni. La prima CNN sostiene anche l'avvio del runtime; non confrontare i tempi di caricamento come se fossero solo velocità del modello. Il report JSON contiene impostazioni e tempi; le dimensioni di trasferimento si riferiscono ai file binari espliciti e non misurano la rete reale o i moduli JavaScript. Non viene inventato un punteggio di accuratezza senza maschere annotate di riferimento.

## Export e projection mapping

**Mappa ID PNG** conserva un ID intero per pixel: `ID = R + 256*G + 65536*B`, con 0 per lo sfondo escluso. È una mappa dati: può sembrare quasi nera in un visualizzatore. Non usare compressione JPEG, gestione colore o interpolazione bilineare su questa texture nell'integrazione con Mapshroom. Usare campionamento nearest e spazio dati lineare, poi associare un colore/effetto all'ID.

**Mappa colori PNG** esporta i colori di anteprima delle regioni, per valutarle visivamente. **Bordi PNG** esporta l'immagine dei bordi in scala di grigi. **Maschera selezionata** esporta 255 per la regione scelta e 0 per tutto il resto.

Tutti gli export mantengono le dimensioni della foto originale, con ingrandimento nearest-neighbor dalla risoluzione di analisi (384/640/1024 px sul lato lungo, mai ingrandita in ingresso). **Questo conserva le coordinate ma non recupera dettagli persi durante la riduzione.** Il confronto a tendina mostra la foto originale alla sua risoluzione nativa per rendere visibile il limite.

Le regioni sono proposte geometriche, non un riconoscimento semantico di ogni foglia: nervature, ombre e variegature possono frammentare la foglia, mentre bordi interrotti possono fondere parti diverse. Nessuno di questi metodi è un sostituto equivalente di Nano Banana con istruzioni testuali. Il laboratorio serve a decidere se i metodi leggeri sono sufficienti per le immagini reali prima dell'integrazione nel mapper. Non applica ancora trasformazioni camera/proiettore né tracking di oggetti in movimento.

## Verifiche e build

```sh
npm run test:regions
npm run build:regions
```

I test verificano separazione delle regioni, sfondo, bordi, codifica degli ID, coordinate dell'export e inferenza di **entrambe le reti con il runtime WASM distribuito**, eseguito da Node. Non sostituiscono una verifica interattiva nel browser. La build indipendente viene scritta in `dist-region-lab/`; `npm run build` verifica anche il pannello integrato. Le fotografie di esempio restano esclusive del laboratorio.

Fonti, revisioni e licenze: [public/SOURCES.md](public/SOURCES.md). PiDiNet viene incluso come esperimento locale di ricerca; vedere la clausola commerciale nella licenza originale prima di integrarlo in un prodotto distribuito.
