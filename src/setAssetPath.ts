// Runs before the Excalidraw bundle is imported (see index.tsx).
//
// Two side effects:
// 1. Point Excalidraw at the plugin's sibling `fonts/` directory.
//    `import.meta.url` resolves to `quipu-plugin://excalidraw-plugin/index.js`
//    at runtime, so `./` is the plugin root where vite.config.ts copied the
//    234 woff2 files. The Excalidraw bundle reads this global at module
//    evaluation time, which is why this assignment must land first.
// 2. Inject the plugin's CSS. Vite lib mode emits `excalidraw-plugin.css`
//    as a sibling of `index.js` but does not auto-inject it. Without the
//    stylesheet the canvas renders unstyled.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}

if (typeof window !== 'undefined') {
  // Slice import.meta.url instead of `new URL('./', import.meta.url)` —
  // Vite's lib build rewrites the latter into `new URL('data:...,<source>', ...)`,
  // which makes EXCALIDRAW_ASSET_PATH a `data:` URL and throws "Invalid URL"
  // when Excalidraw resolves font paths against it.
  const pluginRoot = import.meta.url.replace(/[^/]*$/, '');
  window.EXCALIDRAW_ASSET_PATH = pluginRoot;

  if (typeof document !== 'undefined') {
    const href = pluginRoot + 'excalidraw-plugin.css';
    const existing = document.querySelector(`link[href="${href}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

export {};
