# Shader Version Lab

Benchmark locale e controllato fra tre famiglie: cinque shader GLSL ES 1.00/WebGL 1, cinque GLSL ES 3.00/WebGL 2 e cinque WGSL/WebGPU.

## Contratto condiviso

Ogni fragment shader riceve gli stessi valori concettuali:

- texture procedurale 16:9
- clock sincronizzato
- risoluzione effettiva del canvas
- velocità, default `1.0`
- intensità, default `0.7`
- scala, default `1.0`

In GLSL sono esposti come uniform `u_source`, `u_time`, `u_resolution`, `u_speed`, `u_intensity` e `u_scale`. In WGSL sono raccolti nella struct `Uniforms`, mentre texture e sampler hanno binding separati.

I moduli `shaders/glsl100.js`, `shaders/glsl300.js` e `shaders/wgsl.js` contengono cinque record indipendenti `{ id, title, code }` ciascuno. Il renderer non converte il codice dei campioni.

## Avvio

Da `MapshroomV3`:

```text
npm run dev
```

Poi aprire `/shader-version-benchmark/` sull'indirizzo locale indicato da Vite. WebGPU richiede un browser compatibile, un contesto sicuro (localhost va bene), accelerazione hardware e driver adeguati.

## Verifica

```text
npm run build
```

All'avvio la pagina compila automaticamente tutti i quindici shader. L'esito è esposto in `window.__shaderBenchmarkSmoke`; la Promise `window.__shaderBenchmarkSmoke.ready` si risolve al termine della compilazione asincrona WGSL. L'attributo `data-shader-smoke` dell'elemento HTML passa da `running` a `passed` o `failed`.

Le metriche `MS CPU` misurano il tempo lato CPU necessario a preparare e inviare un frame; non sono GPU timer. Gli FPS dipendono anche da refresh rate, throttling della scheda e driver. Il laboratorio serve quindi per verificare compilazione, stabilità e confronti esplorativi sullo stesso dispositivo, non per dichiarare in assoluto un backend più veloce degli altri.
