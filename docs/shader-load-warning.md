# Diagnosi del carico shader e prompt di ottimizzazione

## Comportamento

L’anteprima dell’editor mostra un triangolo giallo quando rileva carico persistente. Hover, focus da tastiera o click aprono il tooltip; Escape lo chiude. Il tooltip riporta i nomi degli shader effettivamente disegnati, risoluzione, fluidità e, quando disponibile, costo GPU. I dati mostrati sono uno snapshot della finestra che ha attivato l’avviso, non un contatore aggiornato ad ogni frame.

La chat aggiunge una scheda sopra al composer, visibile anche nelle conversazioni esistenti. Si può leggere il prompt prima di usarlo. «Usa il prompt» seleziona lo shader e lo step corretti, attiva la preview focalizzata e aggiunge il testo alla bozza esistente; l’invio resta un’azione esplicita. Il prompt richiede ottimizzazioni equivalenti prima di eventuali compromessi visivi e preserva colori, dettaglio, trasparenza, maschere, movimento, controlli, audio e timeline.

Nei mix si mostra il costo totale. Le sorgenti originali seguono i layer attraverso prefissi, transizioni, pin, mix manuali e compositing: non si scambia il programma generato del mix per il codice di uno dei componenti. La chat permette di scegliere il componente e propone inizialmente quello con più indizi utilizzabili nel codice, senza presentarlo come una classifica misurata. Le revisioni cambiate, rimosse o sostituite dal fallback di compilazione non ricevono prompt basati su una vecchia diagnosi.

## Misure e limiti

- Timer GPU asincrono, al massimo cinque nuove query al secondo nel normale editor; massimo quattro query in coda. Nessun rendering aggiuntivo e nessuna attesa sincrona della GPU.
- Un secondo di assestamento, poi finestre di almeno 1,2 secondi e 12 frame. Due finestre consecutive con almeno tre campioni GPU e percentile 80 oltre 16,7 ms attivano «Shader impegnativo» o «Mix impegnativo».
- Senza conferma GPU, due finestre con intervallo medio dei frame oltre 40 ms attivano «Anteprima poco fluida», senza accusare lo shader.
- Tre finestre con intervallo medio sotto 32 ms e GPU sotto 12 ms, quando misurabile, spengono l’avviso. Cambio di codice, sorgente, identità dello shader o risoluzione, scheda nascosta, compilazione e ripristino del contesto azzerano il campionamento.
- I cicli, i punti di lettura delle texture, il rumore e le funzioni matematiche sono **indizi statici**, non cause dimostrate. I commenti GLSL sono esclusi. L’analisi non gira nel render loop.
- React riceve aggiornamenti solo quando cambia lo stato dell’avviso. Nessun rating permanente, telemetria o modifica automatica della qualità. Output, export e preview di solo mapping non mostrano il warning.

## Esperimento dei loop precalcolati

Questo branch parte da `e58a980` e non include l’esperimento dei loop. Nella copia locale originale `C:/Progetti/personal/mapshroom/MapshroomV3`, `SHADER_LOOPS_ENABLED = false` disabilita inizializzazione e preparazione; il controllo è nascosto. I sorgenti dell’esperimento e i video già salvati rimangono disponibili per riprenderlo in futuro. Le vecchie preferenze di preview leggera non vengono caricate.

## Verifica del 15 settembre 2026

Editor reale su `http://127.0.0.1:5199/`, browser Chromium integrato, nessun warning forzato:

- Zone Fractal + Hue Scanner, statua, viewport di stress 3200×1800, buffer effettivo 1831×1132: snapshot di circa **31,4 ms GPU / 23 fps**, warning presente. Tooltip con cinque cicli e cinque punti di lettura; card nella chat.
- Mix New Shader + Zone Fractal con pin: snapshot di circa **85,9 ms GPU / 14 fps**; diagnosi del mix e scelta dei due componenti. Il prompt per Zone Fractal apre lo step Zone Fractal, include il limite della misura complessiva e non avvia richieste AI.
- Il prompt conserva la bozza già scritta; Escape chiude il tooltip. Passando a New Shader senza pin scompaiono icona e card. Viewport riportato a 1280×720. Nessun errore console nella prova.
- `npm test`: 320 test superati, incluse misure persistenti, picchi isolati, recupero, GPU assente, shader molto lenti, reset delle misure e diagnosi obsolete.
- Build TypeScript/Vite riuscita. Lint mirato: zero errori; warning preesistenti nei renderer timeline e nella route.

Sono misure locali della preview e non una garanzia di prestazioni su altri dispositivi. Nessuna pubblicazione eseguita.
