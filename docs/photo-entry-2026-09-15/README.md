# Photo: layout iniziale e rinomina diretta

Ripristinato il layout del riferimento per la schermata di caricamento: percorso Photo / Analysis / Effects, area principale di upload, card “A good photo” e anteprime delle quattro generazioni.

- Nuovo testo: “Take a photo from the same perspective as your projector.”
- Schema vettoriale nella card: posizione dell'obiettivo del proiettore e del telefono, con la stessa direzione verso la superficie.
- Le preferenze di generazione restano disponibili nella sezione “Generation settings”. Il testo sull'automatismo riflette la preferenza salvata.
- La schermata delle generazioni conserva miniature scorrevoli, card compatte e controlli esistenti.
- Il nome si modifica cliccando il titolo in alto o il nome nell'anteprima ingrandita. Invio e uscita dal campo salvano; Esc annulla; un nome vuoto mantiene quello precedente. I riferimenti agli asset e alle generazioni rimangono basati sugli stessi ID.

Verifiche: build TypeScript/Vite, lint dei componenti modificati, schema contenuto nella card a 1600 px e 390 px senza overflow orizzontale, rinomina con Invio e Tab, Esc senza chiusura della libreria, persistenza dopo ricaricamento. Screenshot del componente reale nello stato vuoto, in una pagina locale di verifica: [Photo](./photo-entry.png).
