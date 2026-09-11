# Fonti e licenze · Region Lab

## Modelli CNN

- Architettura e codice originali: [PiDiNet, Zhuo Su e coautori](https://github.com/hellozhuo/pidinet), ICCV 2021.
- Conversione ONNX utilizzata: [bdck/PiDiNet_ONNX](https://huggingface.co/bdck/PiDiNet_ONNX/tree/6b3f899da74e697a7d2c2e7cba10cfce057d6e55), revisione fissata `6b3f899da74e697a7d2c2e7cba10cfce057d6e55`.
- Tiny: `table5_pidinet_tiny.onnx` (86.530 byte) + `.data` (307.120 byte).
- Full: `pidinet_table5.onnx` (144.170 byte) + `.data` (2.881.392 byte).
- Input RGB float32 NCHW, normalizzazione ImageNet mean/std; output `fused` già nell'intervallo [0,1]. L'MVP replica il bordo per raggiungere multipli di 8 e ritaglia l'output alle coordinate dell'input.
- Il model card della conversione riporta MIT, ma la [licenza del progetto originale](https://github.com/hellozhuo/pidinet/blob/master/LICENSE) contiene una clausola iniziale di uso per ricerca e contatto degli autori per uso commerciale. Copia inclusa: [PIDINET-LICENSE.txt](models/PIDINET-LICENSE.txt). Non assumere che il tag della conversione rimuova tale clausola.

## Runtime

- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime), distribuzione `1.22.0-dev.20250409-89f8206ba4`, già presente nelle dipendenze del progetto.
- Copiati solamente `ort.wasm.min.mjs` (48.008 byte), `ort-wasm-simd-threaded.mjs` (20.856 byte) e `ort-wasm-simd-threaded.wasm` (11.133.407 byte). Configurato per un singolo thread in un Web Worker.
- [Licenza MIT inclusa](vendor/ONNX-RUNTIME-LICENSE.txt), dal repository ufficiale ONNX Runtime.
- Non viene incluso il pacchetto Transformers.js nel laboratorio.

## Algoritmi senza pesi

Implementazioni JavaScript locali per il confronto, non binding delle librerie degli autori:

- K-means deterministico nello spazio CIE Lab, seguito da componenti 4-connesse.
- Superpixel ispirati a [SLIC dell'EPFL](https://www.epfl.ch/labs/ivrl/research/slic-superpixels/): 6 iterazioni, distanza colore/spazio; variante semplificata.
- Unione adattiva su grafo ispirata a [Felzenszwalb e Huttenlocher](https://cs.brown.edu/people/pfelzens/segment/): vicinato a 4, distanza Lab discretizzata a 0,25, soglia interna + k/dimensione. Non è una riproduzione bit-identica del loro software.
- Canny: Gaussian 3×3, Sobel, soppressione non massima in 4 direzioni e isteresi.
- Per Canny/PiDiNet: soglia dei bordi, dilatazione a croce di un pixel, componenti connesse degli interni e crescita sulle barriere. Unione finale di piccole aree confinanti. Questa euristica produce proposte di regione; non attribuisce nomi semantici.

La foto `plant.png` è il riferimento fornito dall'utente per questa valutazione locale.

## Superfici e gradienti

`stage.png` è il secondo riferimento fornito dall'utente. La modalità Superfici aggiunge implementazioni locali senza nuovi modelli: filtro medio normalizzato dalla maschera, massimi persistenti della distanza dalla sagoma, watershed con semi automatici, unione gerarchica delle regioni confinanti e regolarizzazione a maggioranza. Sono euristiche per trovare superfici, non riconoscimento semantico garantito.

I gradienti derivano da distanza dal bordo oppure coordinate proiettate su una direzione; palette e contributo della fotografia sono applicati dopo la segmentazione. Le viste termiche non sono dati di temperatura o profondità. La CNN conserva le versioni e le licenze sopra indicate.
