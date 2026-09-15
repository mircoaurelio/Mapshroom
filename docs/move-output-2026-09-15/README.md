# Move e Output

Implementazione locale nel ramo `codex/assets-grid-cutout`. Le due pagine occupano l'area principale dell'app e mantengono la navigazione laterale.

## Move

- Barra compatta con immagine di riferimento, Hide guide, stato Output e apertura della finestra. Rimosse la testata Move e la testata Move & precision / Align your image con la risoluzione.
- Anteprima dell'asset senza shader, con guida in tre passi nascondibile.
- Pad originale 3 × 3 (H−/Su/H+, Sinistra/Precisione/Destra, W−/Giù/W+) e barra degli strumenti circolari. Valori esatti X/Y, larghezza, altezza, passo e angolo sotto il pad.
- Precisione con clic sui lati, trascinamento orizzontale e frecce quando il controllo ha il focus. Ridimensionamento collegato di default, con comando Original ratio per recuperare le proporzioni native.
- Distorsione con angoli trascinabili, frecce di precisione e anteprima deformata. I quattro pad, con frecce e punto centrale trascinabile, sono ancorati agli angoli del contenitore grande dell’anteprima. Restano indipendenti da posizione, dimensioni, rotazione e distorsione dell’immagine. La barra e il pad restano disponibili durante la distorsione.
- Adatta immagine, reset inquadratura, annulla/ripeti, zoom, copia/incolla della posizione JSON, importazione da file ed esportazione.
- Frecce da tastiera nell’intera pagina Move; Ctrl/⌘ Z e Ctrl/⌘ Shift Z per annulla/ripeti. I campi di testo, i valori numerici, i pannelli JSON e gli altri controlli che gestiscono le frecce mantengono i propri tasti.
- Le modifiche aggiornano la geometria del progetto e quindi la finestra di proiezione.

## Output

- Anteprima del rendering finale della timeline, con le stesse trasformazioni della finestra Output.
- Stato della finestra, apertura, riproduzione/pausa, area sicura al 90% e sfondo della sola anteprima.
- Controlli di disponibilità asset, shader e apertura finestre; segnalazione e disattivazione delle guide di allineamento.
- Istruzioni per collegare il proiettore, scegliere il display ed entrare in fullscreen; ritorno diretto a Move.

## Geometria e compatibilità

L'anteprima renderizza nelle coordinate della finestra Output e viene ridotta via CSS. `StageRenderer` misura le dimensioni di layout, evitando che lo zoom dell'anteprima alteri scala e spostamenti. Usa le dimensioni pubblicate da Output in `outputViewport`; prima della prima apertura mostra esplicitamente una dimensione di anteprima di 1920 × 1080. Un frame senza calibrazione ricava le proporzioni dall’asset: non eredita più il 16:9 della schermata vuota o della foto precedente. Move corregge anche i vecchi frame non calibrati quando carica la foto. I frame ridimensionati, ruotati o deformati conservano invece la calibrazione durante la sostituzione dell’asset; Original ratio e Fit image permettono di tornare alle proporzioni della foto. Le modifiche vengono salvate nel progetto e condivise con Output.

Le viste desktop tradizionale e immersiva usano le nuove pagine. I controlli mobili esistenti e l'overlay Move dentro Workspace restano disponibili.

## Verifiche

- 249 test automatici superati. Inclusi geometria, recupero di frame non calibrati, conservazione della calibrazione e gestione dei tasti senza interferire con campi e angoli.
- Build TypeScript/Vite e lint dei file modificati superati.
- Browser: spostamento e scala, coordinate negative digitate, deformazione e reset degli angoli, JSON valido/non valido, annulla/ripeti, navigazione, area sicura, stato aperto/chiuso della finestra.
- Layout verificato a 1600 × 1000, 980 × 768 e 390 × 844, senza overflow orizzontale.
- Fixture con cerchio di controllo: verticale 600 × 900 → 720 × 1080, quadrata → 1080 × 1080, orizzontale 900 × 600 → 1620 × 1080, panoramica 1400 × 400 → 1920 × 548,57. Rapporti identici nella vista Output.
- Verificati nel browser: frecce con focus sulla navigazione, precisione trascinata 13 → 15, rotazione di 0,1°, annulla/ripeti, trascinamento di un angolo, JSON copiato/incollato con tutti i dati, errore su JSON non valido e proporzioni salvate dopo ricaricamento.
- La collocazione e il fullscreen su un proiettore fisico non sono stati provati in questo ambiente.

Screenshot reali dell'app: [Move](./move.png), [Output](./output.png).

Verifica su fixture verticale con cerchio non deformato: [Screenshot](./move-portrait-check.png).

### Controlli di distorsione sul contenitore

`ProjectionCornerControls` viene renderizzato sul contenitore dell’Output, fuori dal renderer trasformato. I quattro pad sono rientrati di 12 px dagli angoli; i punti centrali permettono il trascinamento e le frecce da tastiera regolano l’angolo selezionato. StageRenderer conserva i controlli incorporati per il vecchio overlay Workspace.

Gli spostamenti dei controlli sono convertiti da pixel di Output in coordinate locali dell’immagine, tenendo conto delle sue dimensioni e della rotazione. La direzione delle frecce e il passo restano coerenti con lo schermo. L’immagine viene ritagliata ai confini dell’Output: spostamenti fuori dal quadro non creano barre di scorrimento che ridimensionano l’anteprima.

Verifiche: con una foto verticale, X=480, Y=−380, larghezza=960 e rotazione=18°, le coordinate a schermo dei quattro pad restano identiche. Frecce, trascinamento e tastiera cambiano solo la distorsione; nessun duplicato dei controlli rimane sul livello dell’immagine. Due test automatici verificano direzione e passo dopo rotazione/ridimensionamento e la gestione di frame collassati.

[Immagine spostata e deformata con controlli sul contenitore](./move-fixed-distortion.png).
