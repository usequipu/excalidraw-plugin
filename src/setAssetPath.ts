// Runs before the Excalidraw bundle is imported (see index.tsx).
//
// Points Excalidraw at the plugin's sibling `fonts/` directory. Excalidraw
// reads `window.EXCALIDRAW_ASSET_PATH` at module evaluation time and joins
// it with each `./fonts/...` URI; setting it before the bundle evaluates is
// what stops `createUrls` from throwing on every text element.
//
// IMPORTANT: derive the asset path by slicing `import.meta.url` rather than
// passing it through `new URL()`. Vite's build pipeline rewrites
// `new URL('./', import.meta.url)` into `new URL('data:...,<source>', ...)`
// — it treats `./` as a resolvable asset reference and inlines the importing
// file as a base64 data URL. That made `EXCALIDRAW_ASSET_PATH` resolve to a
// `data:` URL and Excalidraw's `new URL(font, dataUrl)` threw "Invalid URL"
// for every glyph. Plain string slicing dodges the transform.
//
// CSS is inlined into the JS bundle by `vite-plugin-css-injected-by-js`
// (configured in vite.config.ts), so we no longer need a runtime <link>
// injection here.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}

if (typeof window !== 'undefined') {
  window.EXCALIDRAW_ASSET_PATH = import.meta.url.replace(/[^/]*$/, '');
}

export {};
