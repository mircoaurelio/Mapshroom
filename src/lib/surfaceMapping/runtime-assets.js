// Static URLs let Vite package the same assets for the app and Region Lab, including subpath builds.
// Only the optional CNN worker imports this module; no model is fetched by the default methods.
export const runtimeAssets = {
  module: new URL('./assets/vendor/ort.wasm.min.mjs', import.meta.url).href,
  glue: new URL('./assets/vendor/ort-wasm-simd-threaded.mjs', import.meta.url).href,
  wasm: new URL('./assets/vendor/ort-wasm-simd-threaded.wasm', import.meta.url).href,
};
export const modelAssets = {
  pidi: {
    graph: new URL('./assets/models/pidinet_table5.onnx', import.meta.url).href,
    weights: new URL('./assets/models/pidinet_table5.onnx.data', import.meta.url).href,
  },
  'pidi-tiny': {
    graph: new URL('./assets/models/table5_pidinet_tiny.onnx', import.meta.url).href,
    weights: new URL('./assets/models/table5_pidinet_tiny.onnx.data', import.meta.url).href,
  },
};
