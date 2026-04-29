import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Ships @excalidraw/excalidraw's `fonts/` directory alongside the plugin bundle.
// Excalidraw resolves font URLs against `window.EXCALIDRAW_ASSET_PATH` (set in
// src/index.tsx) at runtime. Without this copy, the 234 woff2 files that the
// canvas needs to render text would 404 under the quipu-plugin:// loader.
function copyExcalidrawFonts(): Plugin {
  const fromDir = resolve(__dirname, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts');
  const toDir = resolve(__dirname, 'dist/fonts');
  return {
    name: 'quipu-copy-excalidraw-fonts',
    apply: 'build',
    async closeBundle() {
      await rm(toDir, { recursive: true, force: true });
      await cp(fromDir, toDir, { recursive: true });
    },
  };
}

export default defineConfig({
  // CSS is inlined into the JS bundle so it applies at module-evaluation time.
  // A `<link>` tag would load asynchronously, and Excalidraw measures its
  // container layout at mount; the chrome (toolbar, panels, theme) ends up
  // rendered as default block flow if CSS hasn't applied by then.
  plugins: [react(), cssInjectedByJsPlugin(), copyExcalidrawFonts()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.browser': 'true',
    'process.version': JSON.stringify(''),
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: true,
  },
});
